import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from "zod";
import { createIfcProcessor } from "./ifc-processor";
import { 
  getOrCreateDefaultProject, 
  saveIfcModel, 
  saveIfcElements,
  listIfcModels,
  getIfcModelById,
} from "./db";
import axios from "axios";
import { iotSensors, sensorReadings, type InsertIotSensor, type IotSensor, elementComments, type InsertElementComment, ifcModels } from '../drizzle/schema';
import { getLatestReadings, simulateAllSensors, recordReading, evaluateSensorStatus } from './iot-service';
import { getDb } from './db';
import { eq, sql } from 'drizzle-orm';
import { getAllIDSTemplates, getIDSTemplateById, getIDSTemplatesByCategory } from './ids-library';
import { localAuthRouter } from './routers/local-auth-router';
import { knowledgeGraphRouter } from './routers/knowledge-graph-router';

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  localAuth: localAuthRouter,
  knowledgeGraph: knowledgeGraphRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Routers para BIM Data Processor
  bimProjects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getBimProjectsByOwner } = await import("./bim-db");
      return getBimProjectsByOwner(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createBimProject } = await import("./bim-db");
        const projectId = await createBimProject({
          name: input.name,
          description: input.description,
          ownerId: ctx.user.id,
        });
        return { id: projectId };
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getBimProjectById } = await import("./bim-db");
        return getBimProjectById(input.id);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateBimProject } = await import("./bim-db");
        const { id, ...updates } = input;
        await updateBimProject(id, updates);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteBimProject } = await import("./bim-db");
        await deleteBimProject(input.id);
        return { success: true };
      }),
    
    // Exportar todos los datos del proyecto en un archivo ZIP
    exportProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input }) => {
        const { exportProjectData } = await import("./export-service");
        
        try {
          // Generar archivo ZIP con todos los datos
          const zipBuffer = await exportProjectData(input.projectId);
          
          // Convertir buffer a base64 para transmisión
          const base64Data = zipBuffer.toString('base64');
          
          return {
            success: true,
            data: base64Data,
            filename: `project_${input.projectId}_export_${Date.now()}.zip`,
          };
        } catch (error) {
          console.error('Error exporting project:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to export project',
          });
        }
      }),
  }),

  ifcModels: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { getIfcModelsByProject } = await import("./bim-db");
        return getIfcModelsByProject(input.projectId);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getIfcModelById } = await import("./bim-db");
        return getIfcModelById(input.id);
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "processing", "completed", "failed"]),
        qualityScore: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateIfcModel } = await import("./bim-db");
        const { id, ...updates } = input;
        await updateIfcModel(id, { processingStatus: updates.status, qualityScore: updates.qualityScore });
        return { success: true };
      }),
  }),

  workflows: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { getWorkflowsByProject } = await import("./bim-db");
        return getWorkflowsByProject(input.projectId);
      }),
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        flowConfig: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createWorkflow } = await import("./bim-db");
        const workflowId = await createWorkflow({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id: workflowId };
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getWorkflowById } = await import("./bim-db");
        return getWorkflowById(input.id);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        flowConfig: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateWorkflow } = await import("./bim-db");
        const { id, ...updates } = input;
        await updateWorkflow(id, updates);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteWorkflow } = await import("./bim-db");
        await deleteWorkflow(input.id);
        return { success: true };
      }),
    // Workflows personalizados del usuario
    listCustom: protectedProcedure
      .query(async ({ ctx }) => {
        const { getWorkflowsByUser } = await import("./bim-db");
        return getWorkflowsByUser(ctx.user.id);
      }),
    saveCustom: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        flowConfig: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createWorkflow } = await import("./bim-db");
        const { getOrCreateDefaultProject } = await import("./db");
        
        // Obtener o crear proyecto por defecto
        const project = await getOrCreateDefaultProject(
          ctx.user.id,
          ctx.user.name || 'User'
        );

        const workflowId = await createWorkflow({
          projectId: project.id,
          name: input.name,
          description: input.description || null,
          flowConfig: input.flowConfig,
          createdBy: ctx.user.id,
        });
        
        return { success: true, id: workflowId };
      }),
    updateCustom: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        flowConfig: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { updateWorkflow, getWorkflowById } = await import("./bim-db");
        
        // Verificar que el workflow pertenece al usuario
        const workflow = await getWorkflowById(input.id);
        if (!workflow || workflow.createdBy !== ctx.user.id) {
          throw new Error('Workflow not found or access denied');
        }

        const { id, ...updates } = input;
        await updateWorkflow(id, updates);
        return { success: true };
      }),
    deleteCustom: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { deleteWorkflow, getWorkflowById } = await import("./bim-db");
        
        // Verificar que el workflow pertenece al usuario
        const workflow = await getWorkflowById(input.id);
        if (!workflow || workflow.createdBy !== ctx.user.id) {
          throw new Error('Workflow not found or access denied');
        }

        await deleteWorkflow(input.id);
        return { success: true };
      }),
    execute: protectedProcedure
      .input(z.object({
        workflowId: z.number(),
        config: z.object({
          nodes: z.array(z.any()),
          edges: z.array(z.any())
        })
      }))
      .mutation(async ({ input }) => {
        const { executeWorkflow } = await import("./workflow-executor");
        
        // Execute workflow and return result
        const result = await executeWorkflow(
          input.workflowId,
          input.config as any
        );
        
        return {
          success: result.status === 'success',
          executionId: result.executionId,
          duration: result.duration,
          summary: result.summary,
          errors: result.errors
        };
      }),
  }),

  ifc: router({
    processFile: protectedProcedure
      .input(z.object({
        fileUrl: z.string().url(),
        projectId: z.number().optional(),
        includeGeometry: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Descargar el archivo IFC
          const response = await axios.get(input.fileUrl, { responseType: 'arraybuffer' });
          const data = new Uint8Array(response.data);
          
          // Crear procesador y cargar modelo
          const processor = await createIfcProcessor();
          const modelID = await processor.loadModel(data);
          
          // Extraer información del modelo
          const modelInfo = processor.getModelInfo(modelID);
          const statistics = processor.getModelStatistics(modelID);
          
          // Extraer elementos con o sin geometría según el parámetro
          const includeGeometry = input.includeGeometry || false;
          const elementLimit = includeGeometry ? 50 : 100; // Menos elementos si incluimos geometría
          const elements = processor.extractAllElements(modelID, elementLimit, includeGeometry);
          
          // Guardar en base de datos
          let savedModelId: number | undefined;
          try {
            // Obtener o crear proyecto por defecto
            const project = await getOrCreateDefaultProject(
              ctx.user.id,
              ctx.user.name || 'User'
            );

            // Extraer nombre del archivo de la URL
            const fileName = input.fileUrl.split('/').pop() || 'model.ifc';

            // Guardar modelo
            savedModelId = await saveIfcModel({
              projectId: project.id,
              name: fileName,
              ifcFileUrl: input.fileUrl,
              ifcSchema: modelInfo.schema,
              elementCount: statistics.totalElements,
              statistics,
            });

            // Guardar elementos (solo metadatos, sin geometría para BD)
            const elementsForDb = elements.map(el => ({
              expressId: el.expressId,
              ifcType: el.type,
              name: el.name,
              globalId: el.globalId,
              properties: el.properties,
            }));

            await saveIfcElements(savedModelId, elementsForDb);
          } catch (dbError) {
            console.error('Error saving to database:', dbError);
            // Continuar aunque falle el guardado en BD
          }

          // Cerrar modelo
          processor.closeModel(modelID);
          
          return {
            success: true,
            schema: modelInfo.schema,
            statistics,
            elements,
            fileUrl: input.fileUrl,
            modelId: savedModelId, // ID del modelo guardado en BD
          };
        } catch (error: any) {
          console.error('Error processing IFC file:', error);
          return {
            success: false,
            error: error.message || 'Unknown error',
          };
        }
      }),
    
    extractElements: protectedProcedure
      .input(z.object({
        fileUrl: z.string().url(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get(input.fileUrl, { responseType: 'arraybuffer' });
          const data = new Uint8Array(response.data);
          
          const processor = await createIfcProcessor();
          const modelID = await processor.loadModel(data);
          const elements = processor.extractAllElements(modelID, input.limit);
          
          processor.closeModel(modelID);
          
          return { success: true, elements };
        } catch (error: any) {
          console.error('Error extracting elements:', error);
          return { success: false, error: error.message, elements: [] };
        }
      }),
    
    filterByType: protectedProcedure
      .input(z.object({
        fileUrl: z.string().url(),
        elementType: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get(input.fileUrl, { responseType: 'arraybuffer' });
          const data = new Uint8Array(response.data);
          
          const processor = await createIfcProcessor();
          const modelID = await processor.loadModel(data);
          const elements = processor.filterByType(modelID, input.elementType);
          
          processor.closeModel(modelID);
          
          return { success: true, elements };
        } catch (error: any) {
          console.error('Error filtering by type:', error);
          return { success: false, error: error.message, elements: [] };
        }
      }),
    
    getStatistics: protectedProcedure
      .input(z.object({
        fileUrl: z.string().url(),
      }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get(input.fileUrl, { responseType: 'arraybuffer' });
          const data = new Uint8Array(response.data);
          
          const processor = await createIfcProcessor();
          const modelID = await processor.loadModel(data);
          const statistics = processor.getModelStatistics(modelID);
          const modelInfo = processor.getModelInfo(modelID);
          
          processor.closeModel(modelID);
          
          return { 
            success: true, 
            schema: modelInfo.schema,
            ...statistics 
          };
        } catch (error: any) {
          console.error('Error getting statistics:', error);
          return { 
            success: false, 
            error: error.message,
            totalElements: 0,
            elementsByType: {},
          };
        }
      }),

    listSavedModels: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          // Si no se especifica projectId, obtener el proyecto por defecto del usuario
          let projectId = input.projectId;
          if (!projectId) {
            const project = await getOrCreateDefaultProject(
              ctx.user.id,
              ctx.user.name || 'User'
            );
            projectId = project.id;
          }

          const models = await listIfcModels(projectId);
          
          // Parsear statistics JSON
          const modelsWithParsedStats = models.map(model => ({
            ...model,
            statistics: model.statistics ? JSON.parse(model.statistics) : null,
          }));

          return {
            success: true,
            models: modelsWithParsedStats,
          };
        } catch (error: any) {
          console.error('Error listing saved models:', error);
          return {
            success: false,
            error: error.message,
            models: [],
          };
        }
      }),

    getSavedModel: protectedProcedure
      .input(z.object({
        modelId: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          const model = await getIfcModelById(input.modelId);
          
          if (!model) {
            return {
              success: false,
              error: 'Model not found',
            };
          }

          // Parsear statistics y properties JSON
          const modelWithParsedData = {
            ...model,
            statistics: model.statistics ? JSON.parse(model.statistics) : null,
            elements: model.elements.map(el => ({
              ...el,
              properties: el.properties ? JSON.parse(el.properties) : null,
            })),
          };

          return {
            success: true,
            model: modelWithParsedData,
          };
        } catch (error: any) {
          console.error('Error getting saved model:', error);
          return {
            success: false,
            error: error.message,
          };
        }
      }),
    
    uploadFile: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { uploadIfcFile, updateModelStatus } = await import('./ifc-storage-service');
        
        try {
          // Decode base64 file data
          const fileBuffer = Buffer.from(input.fileData, 'base64');
          
          // Validate file size (max 100MB)
          const maxSize = 100 * 1024 * 1024;
          if (fileBuffer.length > maxSize) {
            throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
          }
          
          // Upload to S3 and create database record
          const result = await uploadIfcFile({
            projectId: input.projectId,
            fileName: input.fileName,
            fileBuffer,
            description: input.description,
          });
          
          // Mark as processing
          await updateModelStatus(result.modelId, 'processing');
          
          return {
            success: true,
            modelId: result.modelId,
            fileUrl: result.ifcFileUrl,
            fileSize: result.fileSize,
          };
        } catch (error: any) {
          console.error('Error uploading IFC file:', error);
          return {
            success: false,
            error: error.message,
          };
        }
      }),
      
    getFileUrl: protectedProcedure
      .input(z.object({
        modelId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getIfcFileUrl } = await import('./ifc-storage-service');
        
        const url = await getIfcFileUrl(input.modelId);
        
        if (!url) {
          return {
            success: false,
            error: 'Model not found or file URL not available',
          };
        }
        
        return {
          success: true,
          fileUrl: url,
        };
      }),
  }),

  // Router para analíticas
  analytics: router({
    getOverview: protectedProcedure.query(async ({ ctx }) => {
      const { getAnalyticsOverview } = await import('./analytics-db');
      return getAnalyticsOverview(ctx.user.id);
    }),
  }),

  // Router para reportes
  reports: router({
    generateWorkflowReport: protectedProcedure
      .input(z.object({
        workflowName: z.string(),
        executedAt: z.string(),
        executionTime: z.number(),
        statistics: z.object({
          totalElements: z.number(),
          elementsByType: z.record(z.string(), z.number()),
          schema: z.string(),
        }),
        validations: z.object({
          passed: z.number(),
          failed: z.number(),
          details: z.array(z.object({
            rule: z.string(),
            status: z.enum(['passed', 'failed']),
            message: z.string(),
          })),
        }).optional(),
        logs: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { generateWorkflowReport } = await import('./pdf-generator');
        const pdfBuffer = await generateWorkflowReport(input);
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `workflow-report-${Date.now()}.pdf`,
        };
      }),

    /**
     * Generate consolidated report data
     */
    generateConsolidated: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { generateConsolidatedReportData } = await import('./consolidated-report-generator');
        return await generateConsolidatedReportData(input.projectId);
      }),

    /**
     * Generate HTML report
     */
    generateHTML: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { generateConsolidatedReportData, generateHTMLReport } = await import('./consolidated-report-generator');
        const data = await generateConsolidatedReportData(input.projectId);
        return generateHTMLReport(data);
      }),

    /**
     * Generate JSON report
     */
    generateJSON: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { generateConsolidatedReportData, generateJSONReport } = await import('./consolidated-report-generator');
        const data = await generateConsolidatedReportData(input.projectId);
        return generateJSONReport(data);
      }),
  }),

  // Router para validación IDS
  ids: router({
    // Obtener todas las plantillas IDS predefinidas
    getTemplates: publicProcedure
      .query(async () => {
        return getAllIDSTemplates();
      }),

    // Obtener plantilla por ID
    getTemplateById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const template = getIDSTemplateById(input.id);
        if (!template) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Plantilla IDS no encontrada',
          });
        }
        return template;
      }),

    // Obtener plantillas por categoría
    getTemplatesByCategory: publicProcedure
      .input(z.object({ 
        category: z.enum(['building_codes', 'iso_standards', 'industry_best_practices', 'custom']) 
      }))
      .query(async ({ input }) => {
        return getIDSTemplatesByCategory(input.category);
      }),

    // Validar modelo IFC contra archivo IDS
    validate: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        idsXml: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { parseIDSFile } = await import('./ids-parser');
        const { validateAgainstIDS } = await import('./ids-validation-service');
        const { getIfcModelElements } = await import('./db');

        // Obtener elementos del modelo IFC
        const elements = await getIfcModelElements(input.modelId);
        if (!elements || elements.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No se encontraron elementos en el modelo IFC',
          });
        }

        // Parsear archivo IDS
        const idsDocument = await parseIDSFile(input.idsXml);

        // Validar elementos
        const report = await validateAgainstIDS(elements, idsDocument, input.modelId);

        return report;
      }),

    // Generar resumen de reporte
    generateSummary: protectedProcedure
      .input(z.object({
        report: z.any(), // IDSValidationReport
      }))
      .mutation(async ({ input }) => {
        const { generateReportSummary } = await import('./ids-report-service');
        return generateReportSummary(input.report);
      }),

    // Exportar reporte como JSON
    exportJSON: protectedProcedure
      .input(z.object({
        report: z.any(),
      }))
      .mutation(async ({ input }) => {
        const { exportReportAsJSON } = await import('./ids-report-service');
        return { json: exportReportAsJSON(input.report) };
      }),

    // Exportar reporte como HTML
    exportHTML: protectedProcedure
      .input(z.object({
        report: z.any(),
      }))
      .mutation(async ({ input }) => {
        const { generateReportSummary, generateHTMLReport } = await import('./ids-report-service');
        const summary = generateReportSummary(input.report);
        return { html: generateHTMLReport(input.report, summary) };
      }),

    // Generar datos para gráficos
    getChartData: protectedProcedure
      .input(z.object({
        report: z.any(),
      }))
      .mutation(async ({ input }) => {
        const { generateChartData } = await import('./ids-report-service');
        return generateChartData(input.report);
      }),

    // Obtener IDS de ejemplo
    getSampleIDS: publicProcedure.query(async () => {
      const { createSampleIDSXML } = await import('./ids-parser');
      return { xml: createSampleIDSXML() };
    }),
  }),

  // Router para integración bSDD
  bsdd: router({
    // Búsqueda de clases bSDD
    searchClasses: protectedProcedure
      .input(z.object({
        searchText: z.string(),
        domainUri: z.string().optional(),
        languageCode: z.string().default('en-GB'),
      }))
      .query(async ({ input }) => {
        const { searchBsddClasses } = await import('./bsdd-client');
        return searchBsddClasses(input.searchText, input.domainUri, input.languageCode);
      }),

    // Obtener detalles de una clase bSDD
    getClass: protectedProcedure
      .input(z.object({
        classUri: z.string(),
        includeProperties: z.boolean().default(true),
        languageCode: z.string().default('en-GB'),
      }))
      .query(async ({ input }) => {
        const { getBsddClass } = await import('./bsdd-client');
        return getBsddClass(input.classUri, input.includeProperties, input.languageCode);
      }),

    // Obtener dominios disponibles
    getDomains: protectedProcedure
      .input(z.object({
        languageCode: z.string().default('en-GB'),
      }))
      .query(async ({ input }) => {
        const { getBsddDomains } = await import('./bsdd-client');
        return getBsddDomains(input.languageCode);
      }),

    // Mapear automáticamente elementos de un modelo
    mapModelElements: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        domainUri: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { mapElementsToBsdd } = await import('./bsdd-mapping-service');
        return mapElementsToBsdd(input.modelId, input.domainUri);
      }),

    // Obtener estadísticas de mapeo
    getMappingStats: protectedProcedure
      .input(z.object({
        modelId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getBsddMappingStats } = await import('./bsdd-mapping-service');
        return getBsddMappingStats(input.modelId);
      }),

    // Obtener mapeo de un elemento
    getElementMapping: protectedProcedure
      .input(z.object({
        elementId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getBsddMappingForElement } = await import('./bsdd-mapping-service');
        return getBsddMappingForElement(input.elementId);
      }),

    // Guardar mapeo manual
    saveMapping: protectedProcedure
      .input(z.object({
        elementId: z.number(),
        bsddClassUri: z.string(),
        bsddClassName: z.string(),
        bsddClassCode: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { saveBsddMapping } = await import('./bsdd-mapping-service');
        await saveBsddMapping(
          input.elementId,
          {
            uri: input.bsddClassUri,
            code: input.bsddClassCode,
            name: input.bsddClassName,
          },
          'manual',
          1.0,
          ctx.user.openId
        );
        return { success: true };
      }),

    // Eliminar mapeo
    removeMapping: protectedProcedure
      .input(z.object({
        elementId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { removeBsddMapping } = await import('./bsdd-mapping-service');
        await removeBsddMapping(input.elementId);
        return { success: true };
      }),

    // Enriquecer un elemento con bSDD
    enrichElement: protectedProcedure
      .input(z.object({
        elementId: z.number(),
        domainUri: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { enrichElementWithBsdd } = await import('./bsdd-mapping-service');
        return enrichElementWithBsdd(input.elementId, input.domainUri);
      }),

    // Sugerir clases bSDD para un elemento
    suggestClasses: protectedProcedure
      .input(z.object({
        ifcType: z.string(),
        elementName: z.string().optional(),
        domainUri: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { suggestBsddClasses } = await import('./bsdd-mapping-service');
        return suggestBsddClasses(input.ifcType, input.elementName, input.domainUri);
      }),

    // Obtener estadísticas de caché
    getCacheStats: protectedProcedure
      .query(async () => {
        const { bsddCache } = await import('./bsdd-cache-service');
        return bsddCache.getStats();
      }),

    // Limpiar caché
    clearCache: protectedProcedure
      .mutation(async () => {
        const { bsddCache } = await import('./bsdd-cache-service');
        bsddCache.clear();
        return { success: true };
      }),
  }),

  // Router para Analytics de Proyecto
  projectAnalytics: router({
    // Obtener métricas de proyecto
    getProjectMetrics: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getBimProjectById } = await import('./bim-db');
        const { getIfcModelsByProject } = await import('./bim-db');
        const { calculateProjectMetrics, calculateElementDistribution, calculateGrowthTrend } = await import('./project-analytics');

        const project = await getBimProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Proyecto no encontrado',
          });
        }

        const rawModels = await getIfcModelsByProject(input.projectId);
        
        // Transformar modelos al formato esperado
        const models = rawModels.map((m: any) => ({
          id: m.id,
          name: m.name,
          createdAt: m.createdAt,
          elements: m.elements || [],
        }));
        
        const metrics = await calculateProjectMetrics(input.projectId, models);
        metrics.projectName = project.name;

        const distribution = calculateElementDistribution(metrics.elementsByType);
        const growthTrend = calculateGrowthTrend(metrics.modelTimeline);

        return {
          ...metrics,
          distribution,
          growthTrend,
        };
      }),
  }),


  // Router para comparación de modelos
  comparison: router({
    compareModels: protectedProcedure
      .input(z.object({
        oldModelId: z.number(),
        newModelId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getIfcModelById } = await import('./db');
        const { compareModels } = await import('./ifc-comparison');

        // Obtener ambos modelos de la BD
        const oldModelData = await getIfcModelById(input.oldModelId);
        const newModelData = await getIfcModelById(input.newModelId);

        if (!oldModelData || !newModelData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Uno o ambos modelos no fueron encontrados',
          });
        }

        // Convertir elementos a formato esperado
        const oldElements = oldModelData.elements.map((el: any) => ({
          expressId: el.expressId,
          type: el.type,
          globalId: el.globalId || undefined,
          properties: el.properties as Record<string, any>,
        }));

        const newElements = newModelData.elements.map((el: any) => ({
          expressId: el.expressId,
          type: el.type,
          globalId: el.globalId || undefined,
          properties: el.properties as Record<string, any>,
        }));

        // Comparar modelos
        const comparisonResult = compareModels(oldElements, newElements);

        // Detectar cambios críticos
        const { detectCriticalChanges } = await import('./critical-changes');
        const criticalReport = detectCriticalChanges(comparisonResult);

        // Enviar notificación si hay cambios críticos de alta severidad
        if (criticalReport.summary.highSeverity > 0) {
          const { notifyOwner } = await import('./_core/notification');
          
          const notificationTitle = `⚠️ Cambios Críticos Detectados en Modelo IFC`;
          const notificationContent = `
Se detectaron ${criticalReport.summary.highSeverity} cambios críticos de alta severidad en la comparación:

Modelo antiguo: ${oldModelData.name}
Modelo nuevo: ${newModelData.name}

Resumen de cambios críticos:
- Alta severidad: ${criticalReport.summary.highSeverity}
- Media severidad: ${criticalReport.summary.mediumSeverity}
- Baja severidad: ${criticalReport.summary.lowSeverity}

Revisa la comparación completa en la plataforma.
          `.trim();

          await notifyOwner({
            title: notificationTitle,
            content: notificationContent,
          });
        }

        return {
          oldModel: {
            id: oldModelData.id,
            name: oldModelData.name,
            schema: oldModelData.ifcSchema || 'IFC4',
          },
          newModel: {
            id: newModelData.id,
            name: newModelData.name,
            schema: newModelData.ifcSchema || 'IFC4',
          },
          comparison: comparisonResult,
          criticalChanges: criticalReport,
        };
      }),

    // Obtener historial de versiones de modelos por proyecto
    getModelVersionHistory: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getIfcModelsByProject } = await import('./db');

        // Obtener todos los modelos del proyecto ordenados por fecha
        const models = await getIfcModelsByProject(input.projectId);

        // Agrupar modelos por nombre base (sin sufijo de versión)
        const modelGroups = new Map<string, typeof models>();
        
        models.forEach(model => {
          // Extraer nombre base (sin _v1, _v2, etc.)
          const baseName = model.name.replace(/_v\d+$/, '');
          
          if (!modelGroups.has(baseName)) {
            modelGroups.set(baseName, []);
          }
          modelGroups.get(baseName)!.push(model);
        });

        // Convertir a array de grupos con versiones ordenadas
        const versionHistory = Array.from(modelGroups.entries()).map(([baseName, versions]) => ({
          baseName,
          versions: versions
            .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((v: any, index: number) => {
              const stats = typeof v.statistics === 'string' ? JSON.parse(v.statistics) : v.statistics;
              return {
                id: v.id,
                name: v.name,
                versionNumber: index + 1,
                createdAt: v.createdAt,
                elementCount: stats?.totalElements || 0,
              };
            }),
        }));

        return {
          success: true,
          versionHistory,
        };
      }),

    // Comparar múltiples versiones de modelos
    compareMultiple: protectedProcedure
      .input(z.object({
        modelIds: z.array(z.number()).min(2).max(10), // Máximo 10 versiones
      }))
      .query(async ({ input }) => {
        const { getIfcModelById } = await import('./db');
        const { compareMultipleVersions, generateHeatmap } = await import('./multi-comparison');

        // Obtener modelos con sus elementos
        const modelsWithElements = await Promise.all(
          input.modelIds.map(async (id) => {
            const model = await getIfcModelById(id);
            if (!model) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Modelo con ID ${id} no encontrado`,
              });
            }

            return {
              id: model.id,
              name: model.name,
              elements: model.elements.map((el: any) => ({
                expressId: el.expressId,
                type: el.type,
                globalId: el.globalId || undefined,
                properties: el.properties || {},
              })),
            };
          })
        );

        // Generar matriz de comparaciones
        const result = await compareMultipleVersions(modelsWithElements);
        const heatmap = generateHeatmap(result.matrix);

        return {
          ...result,
          heatmap,
          models: modelsWithElements.map(m => ({
            id: m.id,
            name: m.name,
            elementCount: m.elements.length,
          })),
        };
      }),
  }),

  // Router de IoT para sensores y lecturas
  iot: router({
    // Listar sensores de un elemento IFC
    listSensors: protectedProcedure
      .input(z.object({ elementId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        return await db
          .select()
          .from(iotSensors)
          .where(eq(iotSensors.elementId, input.elementId));
      }),
    
    // Listar todos los sensores de un proyecto
    listSensorsByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Obtener todos los modelos del proyecto
        const models = await db
          .select()
          .from(ifcModels)
          .where(eq(ifcModels.projectId, input.projectId));
        
        const modelIds = models.map(m => m.id);
        if (modelIds.length === 0) return [];
        
        // Obtener todos los elementos de esos modelos
        const { ifcElements } = await import('../drizzle/schema');
        const allSensors: any[] = [];
        
        for (const modelId of modelIds) {
          const elements = await db
            .select()
            .from(ifcElements)
            .where(eq(ifcElements.modelId, modelId));
          
          // Obtener sensores de cada elemento
          for (const element of elements) {
            const sensors = await db
              .select()
              .from(iotSensors)
              .where(eq(iotSensors.elementId, element.id));
            allSensors.push(...sensors);
          }
        }
        
        return allSensors;
      }),

    // Crear un nuevo sensor
    createSensor: protectedProcedure
      .input(z.object({
        elementId: z.number(),
        name: z.string(),
        sensorType: z.string(),
        unit: z.string(),
        minThreshold: z.number().optional(),
        maxThreshold: z.number().optional(),
        metadata: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const result = await db.insert(iotSensors).values({
          ...input,
          status: 'active',
        });
        
        return { success: true, sensorId: Number((result as any).insertId) };
      }),

    // Obtener lecturas de un sensor
    getReadings: protectedProcedure
      .input(z.object({ 
        sensorId: z.number(),
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        return await getLatestReadings(input.sensorId, input.limit);
      }),

    // Simular lecturas para todos los sensores
    simulateAll: protectedProcedure
      .mutation(async () => {
        const results = await simulateAllSensors();
        return { success: true, readings: results };
      }),

    // Obtener estado actual de todos los sensores
    getSensorsStatus: protectedProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const sensors = await db
          .select()
          .from(iotSensors)
          .where(eq(iotSensors.status, 'active'));

        const sensorsWithLatest = await Promise.all(
          sensors.map(async (sensor) => {
            const readings = await getLatestReadings(sensor.id, 1);
            const latestReading = readings[0];
            
            return {
              ...sensor,
              latestValue: latestReading?.value,
              latestTimestamp: latestReading?.timestamp,
              status: latestReading 
                ? evaluateSensorStatus(latestReading.value, sensor.minThreshold, sensor.maxThreshold)
                : 'normal',
            };
          })
        );

        return sensorsWithLatest;
      }),

    // Actualizar configuración de API de un sensor
    updateSensorConfig: protectedProcedure
      .input(z.object({
        sensorId: z.number(),
        apiUrl: z.string().optional(),
        apiType: z.enum(['http', 'mqtt', 'simulator']),
        apiKey: z.string().optional(),
        mqttTopic: z.string().optional(),
        mqttUsername: z.string().optional(),
        mqttPassword: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { sensorId, ...config } = input;
        
        // Validar que si es MQTT, tenga topic
        if (config.apiType === 'mqtt' && !config.mqttTopic) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'MQTT sensors require a topic' 
          });
        }
        
        // Validar que si es HTTP o MQTT, tenga URL
        if ((config.apiType === 'http' || config.apiType === 'mqtt') && !config.apiUrl) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'API URL is required for HTTP and MQTT sensors' 
          });
        }
        
        await db
          .update(iotSensors)
          .set(config)
          .where(eq(iotSensors.id, sensorId));
        
        return { success: true };
      }),

    // Obtener configuración de API de un sensor
    getSensorConfig: protectedProcedure
      .input(z.object({ sensorId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const sensor = await db
          .select()
          .from(iotSensors)
          .where(eq(iotSensors.id, input.sensorId))
          .limit(1);
        
        if (!sensor || sensor.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Sensor not found' });
        }
        
        return {
          apiUrl: sensor[0].apiUrl,
          apiType: sensor[0].apiType,
          apiKey: sensor[0].apiKey,
          mqttTopic: sensor[0].mqttTopic,
          mqttUsername: sensor[0].mqttUsername,
          // No devolver password por seguridad
        };
      }),
    
    // Probar conexión a API externa
    testConnection: protectedProcedure
      .input(z.object({
        apiUrl: z.string(),
        apiType: z.enum(['http', 'mqtt']),
        apiKey: z.string().optional(),
        mqttTopic: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { fetchSensorData } = await import('./sensor-api-client');
        
        try {
          // Intentar obtener datos de la API
          const result = await fetchSensorData({
            apiUrl: input.apiUrl,
            apiType: input.apiType,
            apiKey: input.apiKey,
            mqttTopic: input.mqttTopic,
          });
          
          if (result.success && result.data) {
            return {
              success: true,
              value: result.data.value,
              unit: result.data.unit,
              timestamp: result.data.timestamp,
            };
          } else {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: result.error || 'Failed to fetch data from API',
            });
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Connection test failed',
          });
        }
      }),
    
    // Obtener métricas de salud de un sensor
    getHealthMetrics: protectedProcedure
      .input(z.object({
        sensorId: z.number(),
        hoursBack: z.number().default(24),
      }))
      .query(async ({ input }) => {
        const { getSensorHealthMetrics } = await import('./sensor-health-service');
        return await getSensorHealthMetrics(input.sensorId, input.hoursBack);
      }),
    
    // Obtener métricas de salud de todos los sensores de un proyecto
    getProjectHealthMetrics: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        hoursBack: z.number().default(24),
      }))
      .query(async ({ input }) => {
        const { getProjectHealthMetrics } = await import('./sensor-health-service');
        return await getProjectHealthMetrics(input.projectId, input.hoursBack);
      }),
    
    // Obtener logs de conexión
    getConnectionLogs: protectedProcedure
      .input(z.object({
        sensorId: z.number().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const { getConnectionLogs } = await import('./sensor-health-service');
        return await getConnectionLogs(input.sensorId, input.limit, input.offset);
      }),
    
    // Obtener sensores con problemas
    getProblematicSensors: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        threshold: z.number().default(70),
        hoursBack: z.number().default(24),
      }))
      .query(async ({ input }) => {
        const { getProblematicSensors } = await import('./sensor-health-service');
        return await getProblematicSensors(input.projectId, input.threshold, input.hoursBack);
      }),

    // Obtener configuraciones de alertas
    getAlertConfigurations: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getAlertConfigurations } = await import('./alert-service');
        return await getAlertConfigurations(input.projectId);
      }),

    // Crear configuración de alerta
    createAlertConfiguration: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string(),
        alertType: z.enum(['critical_sensor', 'low_success_rate', 'high_latency']),
        threshold: z.number(),
        webhookUrl: z.string().optional(),
        notifyOwner: z.boolean().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { createAlertConfiguration } = await import('./alert-service');
        const id = await createAlertConfiguration(input);
        return { id };
      }),

    // Actualizar configuración de alerta
    updateAlertConfiguration: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        threshold: z.number().optional(),
        webhookUrl: z.string().optional(),
        notifyOwner: z.boolean().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const { updateAlertConfiguration } = await import('./alert-service');
        await updateAlertConfiguration(id, updates);
        return { success: true };
      }),

    // Eliminar configuración de alerta
    deleteAlertConfiguration: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { deleteAlertConfiguration } = await import('./alert-service');
        await deleteAlertConfiguration(input.id);
        return { success: true };
      }),

    // Obtener historial de alertas
    getAlertHistory: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const { getAlertHistory } = await import('./alert-service');
        return await getAlertHistory(input.projectId, input.limit, input.offset);
      }),

    // Verificar salud de sensor y disparar alertas
    checkSensorAlerts: protectedProcedure
      .input(z.object({
        sensorId: z.number(),
        projectId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { checkSensorHealth } = await import('./alert-service');
        const triggers = await checkSensorHealth(input.sensorId, input.projectId);
        return { triggers };
      }),

    // Generar reporte PDF de salud de APIs
    generateHealthReport: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        hoursBack: z.number().default(24),
      }))
      .mutation(async ({ input }) => {
        const { generateHealthReportPDF, generateReportFilename } = await import('./pdf-report-service');
        const { bimProjects } = await import('../drizzle/schema');
        const db = await import('./db').then(m => m.getDb());
        
        if (!db) throw new Error('Database not available');
        
        const projects = await db.select().from(bimProjects).where(eq(bimProjects.id, input.projectId)).limit(1);
        if (projects.length === 0) throw new Error('Project not found');
        
        const pdfBase64 = await generateHealthReportPDF(input.projectId, input.hoursBack);
        const filename = generateReportFilename(projects[0].name, new Date());
        
        return { pdfBase64, filename };
      }),

    // Ejecutar auto-recuperación manualmente
    runAutoRecovery: protectedProcedure
      .mutation(async () => {
        const { runAutoRecovery } = await import('./auto-recovery-service');
        return await runAutoRecovery();
      }),

    // Obtener historial de recuperación de un sensor
    getRecoveryHistory: protectedProcedure
      .input(z.object({
        sensorId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        const { getRecoveryHistory } = await import('./auto-recovery-service');
        return await getRecoveryHistory(input.sensorId, input.limit);
      }),

    // Obtener estadísticas de recuperación de un proyecto
    getRecoveryStats: protectedProcedure
      .input(z.object({
        projectId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getRecoveryStats } = await import('./auto-recovery-service');
        return await getRecoveryStats(input.projectId);
      }),
  }),

  // Router de métricas globales multi-proyecto
  globalMetrics: router({
    // Obtener KPIs globales
    getGlobalKPIs: protectedProcedure
      .query(async ({ ctx }) => {
        const { getGlobalKPIs } = await import('./global-metrics-service');
        return await getGlobalKPIs(ctx.user.id);
      }),

    // Obtener comparación de proyectos
    getProjectComparison: protectedProcedure
      .query(async ({ ctx }) => {
        const { getProjectComparison } = await import('./global-metrics-service');
        return await getProjectComparison(ctx.user.id);
      }),

    // Obtener ranking de proyectos
    getProjectRankings: protectedProcedure
      .query(async ({ ctx }) => {
        const { getProjectRankings } = await import('./global-metrics-service');
        return await getProjectRankings(ctx.user.id);
      }),

    // Obtener mapa de calor de disponibilidad por hora
    getHourlyHeatmap: protectedProcedure
      .input(z.object({
        days: z.number().default(7),
      }))
      .query(async ({ ctx, input }) => {
        const { getHourlyHeatmap } = await import('./global-metrics-service');
        return await getHourlyHeatmap(ctx.user.id, input.days);
      }),

    // Obtener tendencias de alertas
    getAlertTrends: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        const { getAlertTrends } = await import('./global-metrics-service');
        return await getAlertTrends(ctx.user.id, input.days);
      }),
  }),

  // Router de administración de usuarios
  admin: router({
    // Listar todos los usuarios (solo admin)
    listUsers: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        const { listAllUsers } = await import('./db');
        return await listAllUsers();
      }),

    // Cambiar rol de usuario (solo admin)
    updateRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['admin', 'user']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        // No permitir que un admin se degrade a sí mismo
        if (input.userId === ctx.user.id && input.role === 'user') {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Cannot demote yourself' 
          });
        }
        
        const { updateUserRole } = await import('./db');
        await updateUserRole(input.userId, input.role);
        
        return { success: true };
      }),
  }),

  // Router de comentarios y colaboración
  comments: router({
    // Listar comentarios de un elemento
    list: protectedProcedure
      .input(z.object({ elementId: z.number(), modelId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        return await db
          .select()
          .from(elementComments)
          .where(
            sql`${elementComments.elementId} = ${input.elementId} AND ${elementComments.modelId} = ${input.modelId}`
          )
          .orderBy(elementComments.createdAt);
      }),

    // Crear un nuevo comentario
    create: protectedProcedure
      .input(z.object({
        elementId: z.number(),
        modelId: z.number(),
        content: z.string(),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        await db.insert(elementComments).values({
          ...input,
          userId: ctx.user.openId,
          userName: ctx.user.name || 'Usuario',
        });
        
        return { success: true };
      }),

    // Marcar comentario como resuelto
    resolve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        await db
          .update(elementComments)
          .set({ resolved: true })
          .where(eq(elementComments.id, input.id));
        
        return { success: true };
      }),

    // Contar comentarios por elemento
    countByModel: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const comments = await db
          .select()
          .from(elementComments)
          .where(eq(elementComments.modelId, input.modelId));
        
        // Agrupar por elementId y contar
        const counts: Record<number, { total: number; unresolved: number }> = {};
        for (const comment of comments) {
          if (!counts[comment.elementId]) {
            counts[comment.elementId] = { total: 0, unresolved: 0 };
          }
          counts[comment.elementId].total++;
          if (!comment.resolved) {
            counts[comment.elementId].unresolved++;
          }
        }
        
        return counts;
      }),
  }),

  // Router de gestión COBie (Construction Operations Building information exchange)
  cobie: router({
    // Importar archivo COBie
    importFile: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        filename: z.string(),
        fileData: z.string(), // Base64 encoded
      }))
      .mutation(async ({ input }) => {
        const { parseCobieFile } = await import('./cobie-parser-service');
        const { importCobieFile } = await import('./cobie-import-service');
        
        // Decodificar archivo
        const buffer = Buffer.from(input.fileData, 'base64');
        
        // Parsear archivo
        const parsed = await parseCobieFile(buffer, input.filename);
        
        // Importar a base de datos
        const result = await importCobieFile(parsed, input.projectId);
        
        return {
          facilityId: result.facilityId,
          validation: result.validation,
          summary: {
            facilities: 1,
            floors: parsed.floors.length,
            spaces: parsed.spaces.length,
            types: parsed.types.length,
            components: parsed.components.length,
            systems: parsed.systems.length,
          },
        };
      }),

    // Obtener instalaciones de un proyecto
    getFacilities: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const { cobieFacilities } = await import('../drizzle/schema');
        return await db
          .select()
          .from(cobieFacilities)
          .where(eq(cobieFacilities.projectId, input.projectId));
      }),

    // Obtener componentes de una instalación
    getComponents: protectedProcedure
      .input(z.object({ facilityId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const { cobieComponents, cobieTypes, cobieSpaces } = await import('../drizzle/schema');
        
        // Join con types y spaces para obtener nombres
        const components = await db
          .select({
            id: cobieComponents.id,
            name: cobieComponents.name,
            typeName: cobieTypes.name,
            spaceName: cobieSpaces.name,
            description: cobieComponents.description,
            serialNumber: cobieComponents.serialNumber,
            installationDate: cobieComponents.installationDate,
            assetIdentifier: cobieComponents.assetIdentifier,
            ifcGuid: cobieComponents.ifcGuid,
          })
          .from(cobieComponents)
          .leftJoin(cobieTypes, eq(cobieComponents.typeId, cobieTypes.id))
          .leftJoin(cobieSpaces, eq(cobieComponents.spaceId, cobieSpaces.id))
          .where(eq(cobieTypes.facilityId, input.facilityId));
        
        return components;
      }),

    // Vincular componente COBie con elemento IFC
    linkToIFCElement: protectedProcedure
      .input(z.object({
        componentId: z.number(),
        ifcElementId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const { cobieComponents } = await import('../drizzle/schema');
        
        await db
          .update(cobieComponents)
          .set({ ifcElementId: input.ifcElementId })
          .where(eq(cobieComponents.id, input.componentId));
        
        return { success: true };
      }),

    // Obtener estadísticas de activos
    getAssetStats: protectedProcedure
      .input(z.object({ facilityId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const {
          cobieComponents,
          cobieTypes,
          cobieSpaces,
          cobieFloors,
          cobieSystems,
          cobieJobs,
        } = await import('../drizzle/schema');
        
        // Contar componentes
        const [componentsCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(cobieComponents)
          .leftJoin(cobieTypes, eq(cobieComponents.typeId, cobieTypes.id))
          .where(eq(cobieTypes.facilityId, input.facilityId));
        
        // Contar tipos
        const [typesCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(cobieTypes)
          .where(eq(cobieTypes.facilityId, input.facilityId));
        
        // Contar espacios
        const [spacesCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(cobieSpaces)
          .leftJoin(cobieFloors, eq(cobieSpaces.floorId, cobieFloors.id))
          .where(eq(cobieFloors.facilityId, input.facilityId));
        
        // Contar sistemas
        const [systemsCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(cobieSystems)
          .where(eq(cobieSystems.facilityId, input.facilityId));
        
        // Contar trabajos de mantenimiento
        const [jobsCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(cobieJobs)
          .leftJoin(cobieTypes, eq(cobieJobs.typeId, cobieTypes.id))
          .where(eq(cobieTypes.facilityId, input.facilityId));
        
        return {
          components: Number(componentsCount.count) || 0,
          types: Number(typesCount.count) || 0,
          spaces: Number(spacesCount.count) || 0,
          systems: Number(systemsCount.count) || 0,
          maintenanceJobs: Number(jobsCount.count) || 0,
        };
      }),

    /**
     * Vinculación automática de componentes COBie con elementos IFC
     */
    autoLink: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .mutation(async ({ input }) => {
        const { autoLinkComponents } = await import('./cobie-ifc-matching-service');
        const stats = await autoLinkComponents(input.modelId);
        return stats;
      }),
  }),

  /**
   * Real-time data router
   */
  realtime: router({
    /**
     * Get live sensor data for an element
     */
    getElementData: protectedProcedure
      .input(z.object({ elementId: z.string() }))
      .query(async ({ input }) => {
        const { getElementLiveData } = await import('./realtime-data-service');
        return await getElementLiveData(input.elementId);
      }),

    /**
     * Get live data for multiple elements
     */
    getBatchData: protectedProcedure
      .input(z.object({ elementIds: z.array(z.string()) }))
      .query(async ({ input }) => {
        const { getBatchLiveData } = await import('./realtime-data-service');
        const dataMap = await getBatchLiveData(input.elementIds);
        // Convert Map to object for JSON serialization
        const result: Record<string, any> = {};
        dataMap.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      }),

    /**
     * Get recent sensor readings
     */
    getRecentReadings: protectedProcedure
      .input(z.object({ sensorId: z.number(), minutes: z.number().optional() }))
      .query(async ({ input }) => {
        const { getRecentReadings } = await import('./realtime-data-service');
        return await getRecentReadings(input.sensorId, input.minutes);
      }),

    /**
     * Generate mock sensor data for testing
     */
    getMockData: protectedProcedure
      .input(z.object({ 
        elementId: z.string(),
        type: z.enum(['temperature', 'humidity', 'occupancy', 'energy', 'co2', 'light'])
      }))
      .query(async ({ input }) => {
        const { generateMockSensorData } = await import('./realtime-data-service');
        return generateMockSensorData(input.elementId, input.type);
      }),
  }),
});

export type AppRouter = typeof appRouter;
