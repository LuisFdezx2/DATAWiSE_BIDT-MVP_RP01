import { describe, it, expect } from 'vitest';
import { isCriticalElement, detectCriticalChanges, CRITICAL_ELEMENT_TYPES } from './critical-changes';
import type { ComparisonResult } from './ifc-comparison';

describe('Critical Changes Detection Service', () => {
  describe('isCriticalElement', () => {
    it('should identify critical structural elements', () => {
      expect(isCriticalElement('IfcWall')).toBe(true);
      expect(isCriticalElement('IfcWallStandardCase')).toBe(true);
      expect(isCriticalElement('IfcColumn')).toBe(true);
      expect(isCriticalElement('IfcBeam')).toBe(true);
      expect(isCriticalElement('IfcSlab')).toBe(true);
      expect(isCriticalElement('IfcFooting')).toBe(true);
      expect(isCriticalElement('IfcPile')).toBe(true);
      expect(isCriticalElement('IfcRoof')).toBe(true);
    });

    it('should reject non-critical elements', () => {
      expect(isCriticalElement('IfcDoor')).toBe(false);
      expect(isCriticalElement('IfcWindow')).toBe(false);
      expect(isCriticalElement('IfcFurniture')).toBe(false);
      expect(isCriticalElement('IfcSpace')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isCriticalElement('ifcwall')).toBe(true);
      expect(isCriticalElement('IFCCOLUMN')).toBe(true);
      expect(isCriticalElement('IfcBeAm')).toBe(true);
    });
  });

  describe('detectCriticalChanges', () => {
    it('should detect added critical elements', () => {
      const comparison: ComparisonResult = {
        added: [
          { expressId: 1, type: 'IfcWall', globalId: 'wall1' },
          { expressId: 2, type: 'IfcColumn', globalId: 'col1' },
          { expressId: 3, type: 'IfcDoor', globalId: 'door1' }, // No crítico
        ],
        removed: [],
        modified: [],
        statistics: {
          totalChanges: 3,
          addedCount: 3,
          removedCount: 0,
          modifiedCount: 0,
        },
      };

      const report = detectCriticalChanges(comparison);

      expect(report.hasCriticalChanges).toBe(true);
      expect(report.criticalChanges).toHaveLength(2); // Solo wall y column
      expect(report.summary.totalCritical).toBe(2);
      expect(report.summary.mediumSeverity).toBe(2); // Añadidos = media severidad
    });

    it('should detect removed critical elements with high severity', () => {
      const comparison: ComparisonResult = {
        added: [],
        removed: [
          { expressId: 1, type: 'IfcWall', globalId: 'wall1' },
          { expressId: 2, type: 'IfcBeam', globalId: 'beam1' },
        ],
        modified: [],
        statistics: {
          totalChanges: 2,
          addedCount: 0,
          removedCount: 2,
          modifiedCount: 0,
        },
      };

      const report = detectCriticalChanges(comparison);

      expect(report.hasCriticalChanges).toBe(true);
      expect(report.criticalChanges).toHaveLength(2);
      expect(report.summary.highSeverity).toBe(2); // Eliminados = alta severidad
      expect(report.summary.totalCritical).toBe(2);
    });

    it('should detect modified critical elements', () => {
      const comparison: ComparisonResult = {
        added: [],
        removed: [],
        modified: [
          {
            expressId: 1,
            type: 'IfcWall',
            globalId: 'wall1',
            propertyChanges: [
              { propertyName: 'thickness', oldValue: 0.2, newValue: 0.3 },
            ],
          },
          {
            expressId: 2,
            type: 'IfcColumn',
            globalId: 'col1',
            propertyChanges: [
              { propertyName: 'color', oldValue: 'red', newValue: 'blue' },
            ],
          },
        ],
        statistics: {
          totalChanges: 2,
          addedCount: 0,
          removedCount: 0,
          modifiedCount: 2,
        },
      };

      const report = detectCriticalChanges(comparison);

      expect(report.hasCriticalChanges).toBe(true);
      expect(report.criticalChanges).toHaveLength(2);
      // Wall con cambio en thickness = alta severidad
      expect(report.summary.highSeverity).toBe(1);
      // Column con cambio en color = baja severidad
      expect(report.summary.lowSeverity).toBe(1);
    });

    it('should return empty report when no critical changes', () => {
      const comparison: ComparisonResult = {
        added: [{ expressId: 1, type: 'IfcDoor', globalId: 'door1' }],
        removed: [{ expressId: 2, type: 'IfcWindow', globalId: 'window1' }],
        modified: [],
        statistics: {
          totalChanges: 2,
          addedCount: 1,
          removedCount: 1,
          modifiedCount: 0,
        },
      };

      const report = detectCriticalChanges(comparison);

      expect(report.hasCriticalChanges).toBe(false);
      expect(report.criticalChanges).toHaveLength(0);
      expect(report.summary.totalCritical).toBe(0);
    });

    it('should correctly categorize severity levels', () => {
      const comparison: ComparisonResult = {
        added: [{ expressId: 1, type: 'IfcWall', globalId: 'wall1' }],
        removed: [{ expressId: 2, type: 'IfcColumn', globalId: 'col1' }],
        modified: [
          {
            expressId: 3,
            type: 'IfcBeam',
            globalId: 'beam1',
            propertyChanges: [
              { propertyName: 'loadBearing', oldValue: true, newValue: false },
            ],
          },
          {
            expressId: 4,
            type: 'IfcSlab',
            globalId: 'slab1',
            propertyChanges: [
              { propertyName: 'color', oldValue: 'white', newValue: 'gray' },
            ],
          },
        ],
        statistics: {
          totalChanges: 4,
          addedCount: 1,
          removedCount: 1,
          modifiedCount: 2,
        },
      };

      const report = detectCriticalChanges(comparison);

      expect(report.summary.totalCritical).toBe(4);
      expect(report.summary.highSeverity).toBe(2); // 1 removed + 1 modified con propiedad crítica
      expect(report.summary.mediumSeverity).toBe(1); // 1 added
      expect(report.summary.lowSeverity).toBe(1); // 1 modified sin propiedad crítica
    });

    it('should generate descriptive messages', () => {
      const comparison: ComparisonResult = {
        added: [{ expressId: 1, type: 'IfcWall', globalId: 'wall1' }],
        removed: [],
        modified: [],
        statistics: {
          totalChanges: 1,
          addedCount: 1,
          removedCount: 0,
          modifiedCount: 0,
        },
      };

      const report = detectCriticalChanges(comparison);

      expect(report.criticalChanges[0].description).toContain('añadió');
      expect(report.criticalChanges[0].description).toContain('IfcWall');
    });
  });

  describe('CRITICAL_ELEMENT_TYPES', () => {
    it('should include all major structural types', () => {
      expect(CRITICAL_ELEMENT_TYPES).toContain('IfcWall');
      expect(CRITICAL_ELEMENT_TYPES).toContain('IfcColumn');
      expect(CRITICAL_ELEMENT_TYPES).toContain('IfcBeam');
      expect(CRITICAL_ELEMENT_TYPES).toContain('IfcSlab');
      expect(CRITICAL_ELEMENT_TYPES).toContain('IfcFooting');
      expect(CRITICAL_ELEMENT_TYPES).toContain('IfcPile');
      expect(CRITICAL_ELEMENT_TYPES).toContain('IfcRoof');
    });

    it('should have at least 7 critical types', () => {
      expect(CRITICAL_ELEMENT_TYPES.length).toBeGreaterThanOrEqual(7);
    });
  });
});
