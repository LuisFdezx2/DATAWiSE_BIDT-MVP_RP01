/**
 * Servicio de Exportación Masiva de Datos
 * 
 * Este servicio proporciona funcionalidades para exportar todos los datos
 * de un proyecto BIM en un archivo ZIP completo que incluye:
 * - Metadatos del proyecto en JSON
 * - Información de modelos IFC en JSON
 * - Lecturas de sensores IoT en CSV
 * - Elementos IFC en CSV
 * - Manifest con estructura del archivo
 */

import JSZip from 'jszip';
import { getDb } from './db';
import { bimProjects, ifcModels, ifcElements, iotSensors, sensorReadings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Interfaz para metadatos del proyecto
 */
interface ProjectMetadata {
  project: {
    id: number;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  models: Array<{
    id: number;
    name: string;
    ifcFileKey: string;
    processingStatus: string;
    elementCount: number | null;
    createdAt: Date;
  }>;
  sensors: Array<{
    id: number;
    name: string;
    type: string;
    unit: string;
    status: string;
  }>;
  statistics: {
    totalModels: number;
    totalElements: number;
    totalSensors: number;
    totalReadings: number;
  };
}

/**
 * Genera un archivo CSV desde un array de objetos
 */
function generateCSV(data: any[], headers: string[]): string {
  if (data.length === 0) {
    return headers.join(',') + '\n';
  }

  const rows = data.map(item => {
    return headers.map(header => {
      const value = item[header];
      
      // Manejar valores nulos o undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Manejar fechas
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // Escapar comillas y comas en strings
      if (typeof value === 'string') {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }
      
      return String(value);
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Obtiene metadatos completos del proyecto
 */
async function getProjectMetadata(projectId: number): Promise<ProjectMetadata> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Obtener proyecto
  const projects = await db
    .select()
    .from(bimProjects)
    .where(eq(bimProjects.id, projectId))
    .limit(1);

  if (projects.length === 0) {
    throw new Error(`Project ${projectId} not found`);
  }

  const project = projects[0];

  // Obtener modelos
  const models = await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.projectId, projectId));

  // Obtener elementos de todos los modelos
  const modelIds = models.map(m => m.id);
  let totalElements = 0;
  
  for (const modelId of modelIds) {
    const elements = await db
      .select()
      .from(ifcElements)
      .where(eq(ifcElements.modelId, modelId));
    totalElements += elements.length;
  }

  // Obtener sensores de todos los elementos
  const elementIds = await db
    .select({ id: ifcElements.id })
    .from(ifcElements)
    .where(eq(ifcElements.modelId, modelIds[0] || 0));

  let allSensors: any[] = [];
  for (const elem of elementIds) {
    const sensors = await db
      .select()
      .from(iotSensors)
      .where(eq(iotSensors.elementId, elem.id));
    allSensors = [...allSensors, ...sensors];
  }

  // Contar lecturas totales
  let totalReadings = 0;
  for (const sensor of allSensors) {
    const readings = await db
      .select()
      .from(sensorReadings)
      .where(eq(sensorReadings.sensorId, sensor.id));
    totalReadings += readings.length;
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    models: models.map(m => ({
      id: m.id,
      name: m.name,
      ifcFileKey: m.ifcFileKey,
      processingStatus: m.processingStatus,
      elementCount: m.elementCount,
      createdAt: m.createdAt,
    })),
    sensors: allSensors.map(s => ({
      id: s.id,
      name: s.name,
      type: s.sensorType,
      unit: s.unit,
      status: s.status,
    })),
    statistics: {
      totalModels: models.length,
      totalElements,
      totalSensors: allSensors.length,
      totalReadings,
    },
  };
}

/**
 * Genera CSV con información de modelos IFC
 */
async function generateModelsCSV(projectId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const models = await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.projectId, projectId));

  const headers = [
    'id',
    'name',
    'ifcFileKey',
    'processingStatus',
    'ifcSchema',
    'elementCount',
    'createdAt',
    'updatedAt',
  ];

  return generateCSV(models, headers);
}

/**
 * Genera CSV con información de elementos IFC
 */
async function generateElementsCSV(projectId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Obtener todos los modelos del proyecto
  const models = await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.projectId, projectId));

  const modelIds = models.map(m => m.id);
  let allElements: any[] = [];

  // Obtener elementos de cada modelo
  for (const modelId of modelIds) {
    const elements = await db
      .select()
      .from(ifcElements)
      .where(eq(ifcElements.modelId, modelId));
    allElements = [...allElements, ...elements];
  }

  const headers = [
    'id',
    'modelId',
    'globalId',
    'ifcType',
    'name',
    'description',
    'properties',
  ];

  return generateCSV(allElements, headers);
}

/**
 * Genera CSV con información de sensores IoT
 */
async function generateSensorsCSV(projectId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Obtener todos los modelos del proyecto
  const models = await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.projectId, projectId));

  const modelIds = models.map(m => m.id);
  let allSensors: any[] = [];

  // Obtener sensores de cada modelo
  for (const modelId of modelIds) {
    const elements = await db
      .select()
      .from(ifcElements)
      .where(eq(ifcElements.modelId, modelId));

    for (const element of elements) {
      const sensors = await db
        .select()
        .from(iotSensors)
        .where(eq(iotSensors.elementId, element.id));
      allSensors = [...allSensors, ...sensors];
    }
  }

  const headers = [
    'id',
    'elementId',
    'name',
    'sensorType',
    'unit',
    'minThreshold',
    'maxThreshold',
    'status',
    'apiType',
    'apiUrl',
  ];

  return generateCSV(allSensors, headers);
}

/**
 * Genera CSV con lecturas de sensores IoT
 */
async function generateReadingsCSV(projectId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Obtener todos los sensores del proyecto
  const models = await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.projectId, projectId));

  const modelIds = models.map(m => m.id);
  let allReadings: any[] = [];

  // Obtener lecturas de cada sensor
  for (const modelId of modelIds) {
    const elements = await db
      .select()
      .from(ifcElements)
      .where(eq(ifcElements.modelId, modelId));

    for (const element of elements) {
      const sensors = await db
        .select()
        .from(iotSensors)
        .where(eq(iotSensors.elementId, element.id));

      for (const sensor of sensors) {
        const readings = await db
          .select()
          .from(sensorReadings)
          .where(eq(sensorReadings.sensorId, sensor.id));
        
        // Añadir nombre del sensor a cada lectura
        const readingsWithSensor = readings.map(r => ({
          ...r,
          sensorName: sensor.name,
          sensorType: sensor.sensorType,
          unit: sensor.unit,
        }));
        
        allReadings = [...allReadings, ...readingsWithSensor];
      }
    }
  }

  const headers = [
    'id',
    'sensorId',
    'sensorName',
    'sensorType',
    'value',
    'unit',
    'timestamp',
    'metadata',
  ];

  return generateCSV(allReadings, headers);
}

/**
 * Genera manifest JSON con estructura del archivo
 */
function generateManifest(metadata: ProjectMetadata): string {
  const manifest = {
    exportVersion: '1.0.0',
    exportDate: new Date().toISOString(),
    project: {
      id: metadata.project.id,
      name: metadata.project.name,
    },
    files: [
      {
        name: 'metadata.json',
        description: 'Metadatos completos del proyecto',
        format: 'JSON',
      },
      {
        name: 'models.csv',
        description: 'Información de modelos IFC',
        format: 'CSV',
      },
      {
        name: 'elements.csv',
        description: 'Elementos IFC de todos los modelos',
        format: 'CSV',
      },
      {
        name: 'sensors.csv',
        description: 'Sensores IoT vinculados a elementos',
        format: 'CSV',
      },
      {
        name: 'readings.csv',
        description: 'Lecturas históricas de sensores',
        format: 'CSV',
      },
    ],
    statistics: metadata.statistics,
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Exporta todos los datos de un proyecto en un archivo ZIP
 * 
 * @param projectId ID del proyecto a exportar
 * @returns Buffer del archivo ZIP generado
 */
export async function exportProjectData(projectId: number): Promise<Buffer> {
  const zip = new JSZip();

  // Obtener metadatos del proyecto
  const metadata = await getProjectMetadata(projectId);

  // Añadir metadata.json
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // Añadir manifest.json
  zip.file('manifest.json', generateManifest(metadata));

  // Añadir models.csv
  const modelsCSV = await generateModelsCSV(projectId);
  zip.file('models.csv', modelsCSV);

  // Añadir elements.csv
  const elementsCSV = await generateElementsCSV(projectId);
  zip.file('elements.csv', elementsCSV);

  // Añadir sensors.csv
  const sensorsCSV = await generateSensorsCSV(projectId);
  zip.file('sensors.csv', sensorsCSV);

  // Añadir readings.csv
  const readingsCSV = await generateReadingsCSV(projectId);
  zip.file('readings.csv', readingsCSV);

  // Generar archivo ZIP
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9, // Máxima compresión
    },
  });

  return zipBuffer;
}
