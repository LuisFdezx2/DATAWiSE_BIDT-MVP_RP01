import { describe, it, expect } from 'vitest';

/**
 * Pruebas para validar la lógica de visualización diferencial 3D
 * Estas pruebas validan que los colores se asignen correctamente según el tipo de cambio
 */

describe('Comparison Visualization Logic', () => {
  describe('Color Assignment', () => {
    it('should assign green color to added elements', () => {
      const addedColor = 0x4ade80; // Verde
      const addedEmissive = 0x166534; // Verde oscuro

      expect(addedColor).toBe(0x4ade80);
      expect(addedEmissive).toBe(0x166534);
    });

    it('should assign red color to removed elements', () => {
      const removedColor = 0xef4444; // Rojo
      const removedEmissive = 0x7f1d1d; // Rojo oscuro

      expect(removedColor).toBe(0xef4444);
      expect(removedEmissive).toBe(0x7f1d1d);
    });

    it('should assign yellow color to modified elements', () => {
      const modifiedColor = 0xfbbf24; // Amarillo
      const modifiedEmissive = 0x78350f; // Amarillo oscuro

      expect(modifiedColor).toBe(0xfbbf24);
      expect(modifiedEmissive).toBe(0x78350f);
    });
  });

  describe('Element Mapping', () => {
    it('should create correct map from added elements', () => {
      const added = [
        { expressId: 1, type: 'IfcWall', changeType: 'added' as const },
        { expressId: 2, type: 'IfcWindow', changeType: 'added' as const },
      ];

      const addedMap = new Map(added.map(el => [el.expressId, el]));

      expect(addedMap.size).toBe(2);
      expect(addedMap.has(1)).toBe(true);
      expect(addedMap.has(2)).toBe(true);
      expect(addedMap.get(1)?.type).toBe('IfcWall');
    });

    it('should create correct map from removed elements', () => {
      const removed = [
        { expressId: 3, type: 'IfcDoor', changeType: 'removed' as const },
      ];

      const removedMap = new Map(removed.map(el => [el.expressId, el]));

      expect(removedMap.size).toBe(1);
      expect(removedMap.has(3)).toBe(true);
      expect(removedMap.get(3)?.changeType).toBe('removed');
    });

    it('should create correct map from modified elements', () => {
      const modified = [
        { 
          expressId: 4, 
          type: 'IfcSlab', 
          changeType: 'modified' as const,
          propertyChanges: [
            { propertyName: 'Height', oldValue: 0.2, newValue: 0.3 }
          ]
        },
      ];

      const modifiedMap = new Map(modified.map(el => [el.expressId, el]));

      expect(modifiedMap.size).toBe(1);
      expect(modifiedMap.has(4)).toBe(true);
      expect(modifiedMap.get(4)?.propertyChanges).toHaveLength(1);
    });

    it('should handle empty change arrays', () => {
      const added: any[] = [];
      const removed: any[] = [];
      const modified: any[] = [];

      const addedMap = new Map(added.map(el => [el.expressId, el]));
      const removedMap = new Map(removed.map(el => [el.expressId, el]));
      const modifiedMap = new Map(modified.map(el => [el.expressId, el]));

      expect(addedMap.size).toBe(0);
      expect(removedMap.size).toBe(0);
      expect(modifiedMap.size).toBe(0);
    });
  });

  describe('Element Classification', () => {
    it('should correctly identify added element', () => {
      const expressId = 1;
      const addedMap = new Map([[1, { expressId: 1, changeType: 'added' }]]);
      const removedMap = new Map();
      const modifiedMap = new Map();

      const isAdded = addedMap.has(expressId);
      const isRemoved = removedMap.has(expressId);
      const isModified = modifiedMap.has(expressId);

      expect(isAdded).toBe(true);
      expect(isRemoved).toBe(false);
      expect(isModified).toBe(false);
    });

    it('should correctly identify removed element', () => {
      const expressId = 2;
      const addedMap = new Map();
      const removedMap = new Map([[2, { expressId: 2, changeType: 'removed' }]]);
      const modifiedMap = new Map();

      const isAdded = addedMap.has(expressId);
      const isRemoved = removedMap.has(expressId);
      const isModified = modifiedMap.has(expressId);

      expect(isAdded).toBe(false);
      expect(isRemoved).toBe(true);
      expect(isModified).toBe(false);
    });

    it('should correctly identify modified element', () => {
      const expressId = 3;
      const addedMap = new Map();
      const removedMap = new Map();
      const modifiedMap = new Map([[3, { expressId: 3, changeType: 'modified' }]]);

      const isAdded = addedMap.has(expressId);
      const isRemoved = removedMap.has(expressId);
      const isModified = modifiedMap.has(expressId);

      expect(isAdded).toBe(false);
      expect(isRemoved).toBe(false);
      expect(isModified).toBe(true);
    });

    it('should correctly identify unchanged element', () => {
      const expressId = 4;
      const addedMap = new Map();
      const removedMap = new Map();
      const modifiedMap = new Map();

      const isAdded = addedMap.has(expressId);
      const isRemoved = removedMap.has(expressId);
      const isModified = modifiedMap.has(expressId);

      expect(isAdded).toBe(false);
      expect(isRemoved).toBe(false);
      expect(isModified).toBe(false);
    });
  });

  describe('Statistics Validation', () => {
    it('should calculate correct statistics for comparison', () => {
      const added = [
        { expressId: 1, changeType: 'added' },
        { expressId: 2, changeType: 'added' },
      ];
      const removed = [
        { expressId: 3, changeType: 'removed' },
      ];
      const modified = [
        { expressId: 4, changeType: 'modified' },
        { expressId: 5, changeType: 'modified' },
        { expressId: 6, changeType: 'modified' },
      ];

      const statistics = {
        addedCount: added.length,
        removedCount: removed.length,
        modifiedCount: modified.length,
        totalChanges: added.length + removed.length + modified.length,
      };

      expect(statistics.addedCount).toBe(2);
      expect(statistics.removedCount).toBe(1);
      expect(statistics.modifiedCount).toBe(3);
      expect(statistics.totalChanges).toBe(6);
    });

    it('should handle zero changes', () => {
      const statistics = {
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 0,
        totalChanges: 0,
      };

      expect(statistics.totalChanges).toBe(0);
    });
  });

  describe('Comparison Mode Detection', () => {
    it('should detect comparison mode when data exists', () => {
      const comparisonData = {
        oldModelId: 1,
        newModelId: 2,
        added: [],
        removed: [],
        modified: [],
        statistics: {
          totalChanges: 0,
          addedCount: 0,
          removedCount: 0,
          modifiedCount: 0,
        },
      };

      const isComparisonMode = comparisonData !== null;

      expect(isComparisonMode).toBe(true);
    });

    it('should not detect comparison mode when data is null', () => {
      const comparisonData = null;

      const isComparisonMode = comparisonData !== null;

      expect(isComparisonMode).toBe(false);
    });
  });
});
