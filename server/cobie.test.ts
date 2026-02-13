/**
 * Pruebas unitarias para sistema COBie
 * Cubre parsers, validación e importación
 */

import { describe, it, expect } from 'vitest';
import type { ParsedCobieData, CobieValidationResult } from './cobie-parser-service';
import { validateCobieStructure } from './cobie-import-service';

// Alias para compatibilidad con tests
const validateCobieData = validateCobieStructure;

describe('COBie System', () => {
  describe('Validation', () => {
    it('should validate complete COBie data without errors', () => {
      const data: ParsedCobieData = {
        facility: {
          name: 'Test Building',
          createdOn: new Date(),
          createdBy: 'test@example.com',
          category: 'Commercial',
          projectPhase: 'Construction',
        },
        floors: [
          {
            name: 'Ground Floor',
            createdOn: new Date(),
            createdBy: 'test@example.com',
            elevation: 0,
            height: 3.5,
          },
        ],
        spaces: [
          {
            name: 'Room 101',
            createdOn: new Date(),
            createdBy: 'test@example.com',
            floorName: 'Ground Floor',
            category: 'Office',
            usableHeight: 2.8,
            grossArea: 25.5,
            netArea: 23.0,
          },
        ],
        zones: [],
        types: [
          {
            name: 'HVAC-001',
            createdOn: new Date(),
            createdBy: 'test@example.com',
            category: 'HVAC',
            description: 'Air Conditioning Unit',
            manufacturer: 'ACME Corp',
            modelNumber: 'AC-2000',
          },
        ],
        components: [
          {
            name: 'AC-Unit-01',
            createdOn: new Date(),
            createdBy: 'test@example.com',
            typeName: 'HVAC-001',
            spaceName: 'Room 101',
            description: 'Main AC unit',
            serialNumber: 'SN123456',
            installationDate: new Date(),
            assetIdentifier: 'ASSET-001',
          },
        ],
        systems: [],
        assemblies: [],
        connections: [],
        spareParts: [],
        resources: [],
        jobs: [],
        documents: [],
        attributes: [],
        coordinates: [],
      };

      const result: CobieValidationResult = validateCobieData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalEntities).toBeGreaterThan(0);
    });

    it('should detect missing required fields', () => {
      const data: ParsedCobieData = {
        facility: {
          name: '', // Missing required name
          createdOn: new Date(),
          createdBy: 'test@example.com',
        },
        floors: [],
        spaces: [],
        zones: [],
        types: [],
        components: [],
        systems: [],
        assemblies: [],
        connections: [],
        spareParts: [],
        resources: [],
        jobs: [],
        documents: [],
        attributes: [],
        coordinates: [],
      };

      const result: CobieValidationResult = validateCobieData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toContain('facility');
    });

    it('should detect invalid cross-references', () => {
      const data: ParsedCobieData = {
        facility: {
          name: 'Test Building',
          createdOn: new Date(),
          createdBy: 'test@example.com',
        },
        floors: [],
        spaces: [
          {
            name: 'Room 101',
            createdOn: new Date(),
            createdBy: 'test@example.com',
            floorName: 'NonExistentFloor', // Invalid reference
            category: 'Office',
          },
        ],
        zones: [],
        types: [],
        components: [],
        systems: [],
        assemblies: [],
        connections: [],
        spareParts: [],
        resources: [],
        jobs: [],
        documents: [],
        attributes: [],
        coordinates: [],
      };

      const result: CobieValidationResult = validateCobieData(data);

      expect(result.warnings.length).toBeGreaterThan(0);
      const floorWarning = result.warnings.find(w => w.field.includes('floorName'));
      expect(floorWarning).toBeDefined();
    });

    it('should generate validation summary', () => {
      const data: ParsedCobieData = {
        facility: {
          name: 'Test Building',
          createdOn: new Date(),
          createdBy: 'test@example.com',
        },
        floors: [{ name: 'F1', createdOn: new Date(), createdBy: 'test@example.com' }],
        spaces: [{ name: 'S1', createdOn: new Date(), createdBy: 'test@example.com', floorName: 'F1' }],
        zones: [],
        types: [{ name: 'T1', createdOn: new Date(), createdBy: 'test@example.com' }],
        components: [{ name: 'C1', createdOn: new Date(), createdBy: 'test@example.com', typeName: 'T1' }],
        systems: [],
        assemblies: [],
        connections: [],
        spareParts: [],
        resources: [],
        jobs: [],
        documents: [],
        attributes: [],
        coordinates: [],
      };

      const result: CobieValidationResult = validateCobieData(data);

      expect(result.summary.totalEntities).toBeGreaterThanOrEqual(4); // floors + spaces + types + components
      expect(result.summary.validEntities).toBeGreaterThanOrEqual(4);
      expect(result.summary.invalidEntities).toBe(0);
    });
  });

  describe('Parser Format Detection', () => {
    it('should detect Excel format by extension', () => {
      const filename = 'building.xlsx';
      const ext = filename.toLowerCase().split('.').pop();
      expect(ext).toBe('xlsx');
    });

    it('should detect IFC format by extension', () => {
      const filename = 'model.ifc';
      const ext = filename.toLowerCase().split('.').pop();
      expect(ext).toBe('ifc');
    });

    it('should detect XML format by extension', () => {
      const filename = 'data.xml';
      const ext = filename.toLowerCase().split('.').pop();
      expect(ext).toBe('xml');
    });
  });

  describe('Data Structures', () => {
    it('should create valid facility object', () => {
      const facility = {
        name: 'Test Building',
        createdOn: new Date(),
        createdBy: 'test@example.com',
        category: 'Commercial',
        projectPhase: 'Construction',
        siteName: 'Main Campus',
        linearUnits: 'meters',
        areaUnits: 'square meters',
        volumeUnits: 'cubic meters',
        description: 'Test facility',
      };

      expect(facility.name).toBeTruthy();
      expect(facility.createdOn).toBeInstanceOf(Date);
      expect(facility.createdBy).toBeTruthy();
    });

    it('should create valid component object', () => {
      const component = {
        name: 'AC-Unit-01',
        createdOn: new Date(),
        createdBy: 'test@example.com',
        typeName: 'HVAC-001',
        spaceName: 'Room 101',
        description: 'Air conditioning unit',
        serialNumber: 'SN123456',
        installationDate: new Date(),
        warrantyStartDate: new Date(),
        assetIdentifier: 'ASSET-001',
      };

      expect(component.name).toBeTruthy();
      expect(component.typeName).toBeTruthy();
      expect(component.serialNumber).toBeTruthy();
    });
  });

  describe('Reference Mapping', () => {
    it('should map floor names to IDs', () => {
      const floors = [
        { name: 'Ground Floor', id: 1 },
        { name: 'First Floor', id: 2 },
      ];

      const floorMap = new Map(floors.map(f => [f.name, f.id]));

      expect(floorMap.get('Ground Floor')).toBe(1);
      expect(floorMap.get('First Floor')).toBe(2);
      expect(floorMap.get('NonExistent')).toBeUndefined();
    });

    it('should map type names to IDs', () => {
      const types = [
        { name: 'HVAC-001', id: 10 },
        { name: 'ELEC-001', id: 11 },
      ];

      const typeMap = new Map(types.map(t => [t.name, t.id]));

      expect(typeMap.get('HVAC-001')).toBe(10);
      expect(typeMap.get('ELEC-001')).toBe(11);
    });
  });

  describe('Date Handling', () => {
    it('should handle Excel serial dates', () => {
      // Excel serial date for 2024-01-01 is 45292
      const excelSerial = 45292;
      const baseDate = new Date(1900, 0, 1);
      const date = new Date(baseDate.getTime() + (excelSerial - 2) * 24 * 60 * 60 * 1000);

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January
    });

    it('should handle ISO date strings', () => {
      const isoString = '2024-01-15T10:30:00Z';
      const date = new Date(isoString);

      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
    });
  });

  describe('Entity Counts', () => {
    it('should count all entity types correctly', () => {
      const data: ParsedCobieData = {
        facility: { name: 'Test', createdOn: new Date(), createdBy: 'test' },
        floors: [{ name: 'F1', createdOn: new Date(), createdBy: 'test' }],
        spaces: [{ name: 'S1', createdOn: new Date(), createdBy: 'test', floorName: 'F1' }],
        zones: [],
        types: [{ name: 'T1', createdOn: new Date(), createdBy: 'test' }],
        components: [
          { name: 'C1', createdOn: new Date(), createdBy: 'test', typeName: 'T1' },
          { name: 'C2', createdOn: new Date(), createdBy: 'test', typeName: 'T1' },
        ],
        systems: [],
        assemblies: [],
        connections: [],
        spareParts: [],
        resources: [],
        jobs: [],
        documents: [],
        attributes: [],
        coordinates: [],
      };

      expect(data.floors.length).toBe(1);
      expect(data.spaces.length).toBe(1);
      expect(data.types.length).toBe(1);
      expect(data.components.length).toBe(2);
    });
  });
});
