import { describe, it, expect } from 'vitest';
import { parseIDSFile, createSampleIDSXML } from './ids-parser';
import { validateAgainstIDS } from './ids-validation-service';
import { generateReportSummary, generateChartData, exportReportAsJSON } from './ids-report-service';
import type { IfcElementData } from './ifc-processor';

describe('IDS System - Complete Integration', () => {
  describe('IDS Parser', () => {
    it('debe parsear correctamente un archivo IDS de ejemplo', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      expect(idsDocument).toBeDefined();
      expect(idsDocument.version).toBe('1.0');
      expect(idsDocument.specifications).toHaveLength(2);
      
      // Verificar primera especificación (Load-Bearing Walls)
      const spec1 = idsDocument.specifications[0];
      expect(spec1.name).toBe('Load-Bearing Walls');
      expect(spec1.applicability).toHaveLength(1);
      expect(spec1.applicability[0].type).toBe('entity');
      expect(spec1.applicability[0].value).toBe('IfcWall');
      expect(spec1.requirements).toHaveLength(1);
      expect(spec1.requirements[0].type).toBe('property');
      expect(spec1.requirements[0].name).toBe('LoadBearing');
      expect(spec1.requirements[0].propertySet).toBe('Pset_WallCommon');
    });

    it('debe manejar archivos IDS inválidos', async () => {
      const invalidXML = '<invalid>xml</invalid>';
      
      await expect(parseIDSFile(invalidXML)).rejects.toThrow();
    });

    it('debe parsear especificaciones con múltiples requisitos', async () => {
      const multiRequirementXML = `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" version="1.0">
  <specifications>
    <specification name="Complete Wall Spec">
      <applicability>
        <entity>
          <name><simpleValue>IfcWall</simpleValue></name>
        </entity>
      </applicability>
      <requirements>
        <property cardinality="required" dataType="IfcBoolean">
          <propertySet><simpleValue>Pset_WallCommon</simpleValue></propertySet>
          <name><simpleValue>LoadBearing</simpleValue></name>
        </property>
        <property cardinality="required" dataType="IfcLabel">
          <propertySet><simpleValue>Pset_WallCommon</simpleValue></propertySet>
          <name><simpleValue>FireRating</simpleValue></name>
        </property>
        <attribute cardinality="required">
          <name><simpleValue>Name</simpleValue></name>
        </attribute>
      </requirements>
    </specification>
  </specifications>
</ids>`;

      const idsDocument = await parseIDSFile(multiRequirementXML);
      
      expect(idsDocument.specifications).toHaveLength(1);
      expect(idsDocument.specifications[0].requirements).toHaveLength(3);
      expect(idsDocument.specifications[0].requirements[0].type).toBe('property');
      expect(idsDocument.specifications[0].requirements[1].type).toBe('property');
      expect(idsDocument.specifications[0].requirements[2].type).toBe('attribute');
    });
  });

  describe('IDS Validation Service', () => {
    it('debe validar elementos que cumplen con los requisitos', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      // Crear elementos de prueba que cumplen
      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          globalId: 'WALL001',
          name: 'Wall-001',
          properties: {
            Pset_WallCommon: {
              LoadBearing: 'TRUE',
            },
          },
        },
        {
          expressId: 2,
          type: 'IfcDoor',
          globalId: 'DOOR001',
          name: 'Door-001',
          properties: {
            Pset_DoorCommon: {
              FireRating: 'EI60',
            },
          },
        },
      ];

      const report = await validateAgainstIDS(elements, idsDocument);

      expect(report).toBeDefined();
      expect(report.totalElements).toBe(2);
      expect(report.validatedElements).toBe(2);
      expect(report.passedElements).toBe(2);
      expect(report.failedElements).toBe(0);
      expect(report.complianceRate).toBe(100);
    });

    it('debe detectar elementos que no cumplen con los requisitos', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      // Crear elementos que no cumplen
      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          globalId: 'WALL001',
          name: 'Wall-001',
          properties: {
            // Falta Pset_WallCommon.LoadBearing
          },
        },
        {
          expressId: 2,
          type: 'IfcDoor',
          globalId: 'DOOR001',
          name: 'Door-001',
          properties: {
            // Falta Pset_DoorCommon.FireRating
          },
        },
      ];

      const report = await validateAgainstIDS(elements, idsDocument);

      expect(report.totalElements).toBe(2);
      expect(report.validatedElements).toBe(2);
      expect(report.passedElements).toBe(0);
      expect(report.failedElements).toBe(2);
      expect(report.complianceRate).toBe(0);
      
      // Verificar detalles de fallos
      const failedResults = report.elementResults.filter(r => !r.passed);
      expect(failedResults).toHaveLength(2);
      expect(failedResults[0].failures).toHaveLength(1);
      expect(failedResults[0].failures[0].requirementName).toBe('LoadBearing');
    });

    it('debe validar correctamente valores de propiedades', async () => {
      const xmlWithValues = `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" version="1.0">
  <specifications>
    <specification name="Fire Rating Check">
      <applicability>
        <entity>
          <name><simpleValue>IfcDoor</simpleValue></name>
        </entity>
      </applicability>
      <requirements>
        <property cardinality="required" dataType="IfcLabel">
          <propertySet><simpleValue>Pset_DoorCommon</simpleValue></propertySet>
          <name><simpleValue>FireRating</simpleValue></name>
          <value><simpleValue>EI60</simpleValue></value>
        </property>
      </requirements>
    </specification>
  </specifications>
</ids>`;

      const idsDocument = await parseIDSFile(xmlWithValues);

      // Elemento con valor correcto
      const correctElement: IfcElementData[] = [{
        expressId: 1,
        type: 'IfcDoor',
        properties: {
          Pset_DoorCommon: {
            FireRating: 'EI60',
          },
        },
      }];

      const correctReport = await validateAgainstIDS(correctElement, idsDocument);
      expect(correctReport.passedElements).toBe(1);

      // Elemento con valor incorrecto
      const incorrectElement: IfcElementData[] = [{
        expressId: 2,
        type: 'IfcDoor',
        properties: {
          Pset_DoorCommon: {
            FireRating: 'EI30', // Valor diferente
          },
        },
      }];

      const incorrectReport = await validateAgainstIDS(incorrectElement, idsDocument);
      expect(incorrectReport.failedElements).toBe(1);
      expect(incorrectReport.elementResults[0].failures[0].expected).toBe('EI60');
      expect(incorrectReport.elementResults[0].failures[0].actual).toBe('EI30');
    });

    it('debe manejar requisitos opcionales correctamente', async () => {
      const xmlWithOptional = `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" version="1.0">
  <specifications>
    <specification name="Optional Property">
      <applicability>
        <entity>
          <name><simpleValue>IfcWall</simpleValue></name>
        </entity>
      </applicability>
      <requirements>
        <property cardinality="optional" dataType="IfcLabel">
          <propertySet><simpleValue>Pset_WallCommon</simpleValue></propertySet>
          <name><simpleValue>AcousticRating</simpleValue></name>
        </property>
      </requirements>
    </specification>
  </specifications>
</ids>`;

      const idsDocument = await parseIDSFile(xmlWithOptional);

      // Elemento sin la propiedad opcional
      const elements: IfcElementData[] = [{
        expressId: 1,
        type: 'IfcWall',
        properties: {},
      }];

      const report = await validateAgainstIDS(elements, idsDocument);
      
      // No debe fallar porque es opcional
      expect(report.passedElements).toBe(1);
      expect(report.failedElements).toBe(0);
    });

    it('debe validar atributos IFC correctamente', async () => {
      const xmlWithAttributes = `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" version="1.0">
  <specifications>
    <specification name="Name Required">
      <applicability>
        <entity>
          <name><simpleValue>IfcWall</simpleValue></name>
        </entity>
      </applicability>
      <requirements>
        <attribute cardinality="required">
          <name><simpleValue>Name</simpleValue></name>
        </attribute>
      </requirements>
    </specification>
  </specifications>
</ids>`;

      const idsDocument = await parseIDSFile(xmlWithAttributes);

      // Elemento con nombre
      const withName: IfcElementData[] = [{
        expressId: 1,
        type: 'IfcWall',
        name: 'Wall-001',
        properties: {},
      }];

      const reportWithName = await validateAgainstIDS(withName, idsDocument);
      expect(reportWithName.passedElements).toBe(1);

      // Elemento sin nombre
      const withoutName: IfcElementData[] = [{
        expressId: 2,
        type: 'IfcWall',
        properties: {},
      }];

      const reportWithoutName = await validateAgainstIDS(withoutName, idsDocument);
      expect(reportWithoutName.failedElements).toBe(1);
    });
  });

  describe('IDS Report Service', () => {
    it('debe generar resumen ejecutivo correctamente', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          properties: {
            Pset_WallCommon: { LoadBearing: 'TRUE' },
          },
        },
        {
          expressId: 2,
          type: 'IfcWall',
          properties: {}, // Falta propiedad
        },
      ];

      const report = await validateAgainstIDS(elements, idsDocument);
      const summary = generateReportSummary(report);

      expect(summary).toBeDefined();
      expect(summary.title).toBe('IDS Validation Report');
      expect(summary.overallCompliance.total).toBe(2);
      expect(summary.overallCompliance.passed).toBe(1);
      expect(summary.overallCompliance.failed).toBe(1);
      expect(summary.specificationSummaries).toHaveLength(2);
      expect(summary.recommendations).toBeDefined();
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });

    it('debe clasificar correctamente el estado de cumplimiento', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      // 100% compliance
      const perfectElements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          properties: {
            Pset_WallCommon: { LoadBearing: 'TRUE' },
          },
        },
      ];

      const perfectReport = await validateAgainstIDS(perfectElements, idsDocument);
      const perfectSummary = generateReportSummary(perfectReport);
      
      expect(perfectSummary.specificationSummaries[0].status).toBe('excellent');
    });

    it('debe generar datos de gráficos correctamente', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          properties: {
            Pset_WallCommon: { LoadBearing: 'TRUE' },
          },
        },
        {
          expressId: 2,
          type: 'IfcDoor',
          properties: {}, // Falta propiedad
        },
      ];

      const report = await validateAgainstIDS(elements, idsDocument);
      const chartData = generateChartData(report);

      expect(chartData).toBeDefined();
      expect(chartData.complianceBySpecification).toBeDefined();
      expect(chartData.complianceBySpecification.labels).toHaveLength(2);
      expect(chartData.failuresByType).toBeDefined();
      expect(chartData.complianceOverview).toBeDefined();
      expect(chartData.complianceOverview.total).toBe(2);
    });

    it('debe exportar reporte como JSON válido', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [{
        expressId: 1,
        type: 'IfcWall',
        properties: {
          Pset_WallCommon: { LoadBearing: 'TRUE' },
        },
      }];

      const report = await validateAgainstIDS(elements, idsDocument);
      const json = exportReportAsJSON(report);

      expect(json).toBeDefined();
      expect(() => JSON.parse(json)).not.toThrow();
      
      const parsed = JSON.parse(json);
      expect(parsed.totalElements).toBe(1);
      expect(parsed.complianceRate).toBe(100);
    });

    it('debe generar recomendaciones basadas en fallos', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      // Elementos con diferentes tipos de fallos
      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          properties: {}, // Falta propiedad
        },
        {
          expressId: 2,
          type: 'IfcDoor',
          properties: {}, // Falta propiedad
        },
      ];

      const report = await validateAgainstIDS(elements, idsDocument);
      const summary = generateReportSummary(report);

      expect(summary.recommendations).toBeDefined();
      expect(summary.recommendations.length).toBeGreaterThan(0);
      
      // Debe incluir recomendación sobre propiedades
      const hasPropertyRecommendation = summary.recommendations.some(r => 
        r.includes('propiedad') || r.includes('property')
      );
      expect(hasPropertyRecommendation).toBe(true);
    });
  });

  describe('IDS System - Edge Cases', () => {
    it('debe manejar elementos sin propiedades', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [{
        expressId: 1,
        type: 'IfcWall',
        properties: {},
      }];

      const report = await validateAgainstIDS(elements, idsDocument);
      
      expect(report).toBeDefined();
      expect(report.failedElements).toBe(1);
    });

    it('debe manejar elementos de tipos no aplicables', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      // Elemento de tipo no cubierto por especificaciones
      const elements: IfcElementData[] = [{
        expressId: 1,
        type: 'IfcWindow',
        properties: {},
      }];

      const report = await validateAgainstIDS(elements, idsDocument);
      
      // No debe validarse porque no es aplicable
      expect(report.validatedElements).toBe(0);
    });

    it('debe manejar property sets anidados', async () => {
      const elements: IfcElementData[] = [{
        expressId: 1,
        type: 'IfcWall',
        properties: {
          Pset_WallCommon: {
            LoadBearing: 'TRUE',
            IsExternal: 'FALSE',
          },
        },
      }];

      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);
      const report = await validateAgainstIDS(elements, idsDocument);

      expect(report.passedElements).toBe(1);
    });
  });
});
