import { describe, it, expect } from 'vitest';
import { compareModels } from './model-comparison';

describe('Model Comparison Service', () => {
  describe('compareModels', () => {
    it('should detect added elements', () => {
      const oldElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1' } },
      ];

      const newElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1' } },
        { expressId: 2, type: 'IfcWindow', globalId: 'window-1', properties: { Name: 'Window 1' } },
      ];

      const result = compareModels(oldElements, newElements);

      expect(result.added).toHaveLength(1);
      expect(result.added[0].globalId).toBe('window-1');
      expect(result.added[0].changeType).toBe('added');
      expect(result.removed).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
    });

    it('should detect removed elements', () => {
      const oldElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1' } },
        { expressId: 2, type: 'IfcWindow', globalId: 'window-1', properties: { Name: 'Window 1' } },
      ];

      const newElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1' } },
      ];

      const result = compareModels(oldElements, newElements);

      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].globalId).toBe('window-1');
      expect(result.removed[0].changeType).toBe('removed');
      expect(result.added).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
    });

    it('should detect modified elements with property changes', () => {
      const oldElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1', Height: 3.0 } },
      ];

      const newElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1 Modified', Height: 3.5 } },
      ];

      const result = compareModels(oldElements, newElements);

      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].globalId).toBe('wall-1');
      expect(result.modified[0].changeType).toBe('modified');
      expect(result.modified[0].propertyChanges).toBeDefined();
      expect(result.modified[0].propertyChanges).toHaveLength(2);
      
      // Verificar cambio en Name
      const nameChange = result.modified[0].propertyChanges?.find(c => c.propertyName === 'Name');
      expect(nameChange).toBeDefined();
      expect(nameChange?.oldValue).toBe('Wall 1');
      expect(nameChange?.newValue).toBe('Wall 1 Modified');

      // Verificar cambio en Height
      const heightChange = result.modified[0].propertyChanges?.find(c => c.propertyName === 'Height');
      expect(heightChange).toBeDefined();
      expect(heightChange?.oldValue).toBe(3.0);
      expect(heightChange?.newValue).toBe(3.5);
    });

    it('should not detect changes when elements are identical', () => {
      const elements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1', Height: 3.0 } },
        { expressId: 2, type: 'IfcWindow', globalId: 'window-1', properties: { Name: 'Window 1' } },
      ];

      const result = compareModels(elements, elements);

      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
      expect(result.statistics.totalChanges).toBe(0);
    });

    it('should handle elements without globalId', () => {
      const oldElements = [
        { expressId: 1, type: 'IfcWall', properties: { Name: 'Wall 1' } },
      ];

      const newElements = [
        { expressId: 1, type: 'IfcWall', properties: { Name: 'Wall 1 Modified' } },
      ];

      const result = compareModels(oldElements, newElements);

      // Sin globalId, se compara por expressId
      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].expressId).toBe(1);
    });

    it('should calculate correct statistics', () => {
      const oldElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1' } },
        { expressId: 2, type: 'IfcWindow', globalId: 'window-1', properties: { Name: 'Window 1' } },
        { expressId: 3, type: 'IfcDoor', globalId: 'door-1', properties: { Name: 'Door 1' } },
      ];

      const newElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1 Modified' } },
        { expressId: 3, type: 'IfcDoor', globalId: 'door-1', properties: { Name: 'Door 1' } },
        { expressId: 4, type: 'IfcSlab', globalId: 'slab-1', properties: { Name: 'Slab 1' } },
      ];

      const result = compareModels(oldElements, newElements);

      expect(result.statistics.addedCount).toBe(1); // slab-1
      expect(result.statistics.removedCount).toBe(1); // window-1
      expect(result.statistics.modifiedCount).toBe(1); // wall-1
      expect(result.statistics.totalChanges).toBe(3);
    });

    it('should handle empty old model (all elements added)', () => {
      const oldElements: any[] = [];
      const newElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1' } },
        { expressId: 2, type: 'IfcWindow', globalId: 'window-1', properties: { Name: 'Window 1' } },
      ];

      const result = compareModels(oldElements, newElements);

      expect(result.added).toHaveLength(2);
      expect(result.removed).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
      expect(result.statistics.totalChanges).toBe(2);
    });

    it('should handle empty new model (all elements removed)', () => {
      const oldElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1' } },
        { expressId: 2, type: 'IfcWindow', globalId: 'window-1', properties: { Name: 'Window 1' } },
      ];
      const newElements: any[] = [];

      const result = compareModels(oldElements, newElements);

      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(2);
      expect(result.modified).toHaveLength(0);
      expect(result.statistics.totalChanges).toBe(2);
    });

    it('should detect property additions', () => {
      const oldElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1' } },
      ];

      const newElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1', Height: 3.0, Width: 0.2 } },
      ];

      const result = compareModels(oldElements, newElements);

      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].propertyChanges).toHaveLength(2);
      
      const heightChange = result.modified[0].propertyChanges?.find(c => c.propertyName === 'Height');
      expect(heightChange?.oldValue).toBeUndefined();
      expect(heightChange?.newValue).toBe(3.0);
    });

    it('should detect property deletions', () => {
      const oldElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1', Height: 3.0, Width: 0.2 } },
      ];

      const newElements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall-1', properties: { Name: 'Wall 1' } },
      ];

      const result = compareModels(oldElements, newElements);

      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].propertyChanges).toHaveLength(2);
      
      const heightChange = result.modified[0].propertyChanges?.find(c => c.propertyName === 'Height');
      expect(heightChange?.oldValue).toBe(3.0);
      expect(heightChange?.newValue).toBeUndefined();
    });

    it('should handle complex property changes', () => {
      const oldElements = [
        { 
          expressId: 1, 
          type: 'IfcWall', 
          globalId: 'wall-1', 
          properties: { 
            Name: 'Wall 1',
            Dimensions: { Height: 3.0, Width: 0.2, Length: 5.0 },
            Material: 'Concrete'
          } 
        },
      ];

      const newElements = [
        { 
          expressId: 1, 
          type: 'IfcWall', 
          globalId: 'wall-1', 
          properties: { 
            Name: 'Wall 1',
            Dimensions: { Height: 3.5, Width: 0.2, Length: 5.0 },
            Material: 'Brick'
          } 
        },
      ];

      const result = compareModels(oldElements, newElements);

      expect(result.modified).toHaveLength(1);
      expect(result.modified[0].propertyChanges).toBeDefined();
      
      // Verificar que detecta cambios en objetos anidados y valores simples
      const dimensionsChange = result.modified[0].propertyChanges?.find(c => c.propertyName === 'Dimensions');
      const materialChange = result.modified[0].propertyChanges?.find(c => c.propertyName === 'Material');
      
      expect(dimensionsChange).toBeDefined();
      expect(materialChange).toBeDefined();
      expect(materialChange?.oldValue).toBe('Concrete');
      expect(materialChange?.newValue).toBe('Brick');
    });
  });
});
