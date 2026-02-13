import { describe, it, expect } from 'vitest';
import { parseIDSFile, createSampleIDSXML } from './ids-parser';
import { validateAgainstIDS } from './ids-validator';
import type { IfcElementData } from './ifc-processor';

describe('IDS Validation System', () => {
  describe('IDS Parser', () => {
    it('debería parsear un archivo IDS de ejemplo', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      expect(idsDocument).toBeDefined();
      expect(idsDocument.version).toBe('1.0');
      expect(idsDocument.specifications).toHaveLength(2);
    });

    it('debería extraer correctamente la especificación de muros portantes', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const wallSpec = idsDocument.specifications[0];
      expect(wallSpec.name).toBe('Load-Bearing Walls');
      expect(wallSpec.applicability).toHaveLength(1);
      expect(wallSpec.applicability[0].type).toBe('entity');
      expect(wallSpec.applicability[0].value).toBe('IfcWall');
    });

    it('debería extraer requisitos de propiedades', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const wallSpec = idsDocument.specifications[0];
      expect(wallSpec.requirements).toHaveLength(1);
      expect(wallSpec.requirements[0].type).toBe('property');
      expect(wallSpec.requirements[0].name).toBe('LoadBearing');
      expect(wallSpec.requirements[0].cardinality).toBe('required');
    });
  });

  describe('IDS Validator', () => {
    it('debería validar elementos que cumplen con IDS', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          globalId: 'wall-001',
          name: 'Wall 1',
          properties: {
            LoadBearing: 'TRUE',
          },
        },
      ];

      const report = validateAgainstIDS(elements, idsDocument);

      expect(report.totalElements).toBe(1);
      expect(report.validatedElements).toBe(1);
      expect(report.passedElements).toBe(1);
      expect(report.failedElements).toBe(0);
      expect(report.complianceRate).toBe(100);
    });

    it('debería detectar elementos que no cumplen con IDS', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          globalId: 'wall-001',
          name: 'Wall 1',
          properties: {
            // Falta la propiedad LoadBearing
          },
        },
      ];

      const report = validateAgainstIDS(elements, idsDocument);

      expect(report.totalElements).toBe(1);
      expect(report.validatedElements).toBe(1);
      expect(report.passedElements).toBe(0);
      expect(report.failedElements).toBe(1);
      expect(report.complianceRate).toBe(0);
    });

    it('debería generar detalles de fallos de validación', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          globalId: 'wall-001',
          name: 'Wall 1',
          properties: {},
        },
      ];

      const report = validateAgainstIDS(elements, idsDocument);

      expect(report.elementResults).toHaveLength(1);
      expect(report.elementResults[0].passed).toBe(false);
      expect(report.elementResults[0].failures).toHaveLength(1);
      expect(report.elementResults[0].failures[0].requirementName).toBe('LoadBearing');
      expect(report.elementResults[0].failures[0].actual).toBe('missing');
    });

    it('debería validar múltiples especificaciones', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          globalId: 'wall-001',
          name: 'Wall 1',
          properties: {
            LoadBearing: 'TRUE',
          },
        },
        {
          expressId: 2,
          type: 'IfcDoor',
          globalId: 'door-001',
          name: 'Door 1',
          properties: {
            FireRating: 'EI30',
          },
        },
      ];

      const report = validateAgainstIDS(elements, idsDocument);

      expect(report.specificationResults).toHaveLength(2);
      expect(report.specificationResults[0].name).toBe('Load-Bearing Walls');
      expect(report.specificationResults[1].name).toBe('Fire Rating for Doors');
    });

    it('debería calcular correctamente la tasa de cumplimiento', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWall',
          properties: {
            LoadBearing: 'TRUE',
          },
        },
        {
          expressId: 2,
          type: 'IfcWall',
          properties: {},
        },
        {
          expressId: 3,
          type: 'IfcWall',
          properties: {
            LoadBearing: 'TRUE',
          },
        },
      ];

      const report = validateAgainstIDS(elements, idsDocument);

      expect(report.validatedElements).toBe(3);
      expect(report.passedElements).toBe(2);
      expect(report.failedElements).toBe(1);
      expect(Math.round(report.complianceRate)).toBe(67);
    });

    it('debería ignorar elementos no aplicables', async () => {
      const sampleXML = createSampleIDSXML();
      const idsDocument = await parseIDSFile(sampleXML);

      const elements: IfcElementData[] = [
        {
          expressId: 1,
          type: 'IfcWindow', // No aplicable a ninguna especificación
          properties: {},
        },
      ];

      const report = validateAgainstIDS(elements, idsDocument);

      expect(report.totalElements).toBe(1);
      expect(report.validatedElements).toBe(0);
      expect(report.elementResults).toHaveLength(0);
    });
  });
});
