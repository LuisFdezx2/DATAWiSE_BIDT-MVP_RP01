import { describe, it, expect } from 'vitest';
import { compareMultipleVersions, generateHeatmap } from './multi-comparison';

describe('Multi-Version Comparison Service', () => {
  describe('compareMultipleVersions', () => {
    it('should compare 3 versions and generate matrix', async () => {
      const models = [
        {
          id: 1,
          elements: [
            { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: { height: 3.0 } },
            { expressId: 2, type: 'IfcDoor', globalId: 'door1', properties: { width: 0.9 } },
          ],
        },
        {
          id: 2,
          elements: [
            { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: { height: 3.5 } },
            { expressId: 3, type: 'IfcWindow', globalId: 'window1', properties: { width: 1.2 } },
          ],
        },
        {
          id: 3,
          elements: [
            { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: { height: 4.0 } },
            { expressId: 2, type: 'IfcDoor', globalId: 'door1', properties: { width: 1.0 } },
            { expressId: 3, type: 'IfcWindow', globalId: 'window1', properties: { width: 1.2 } },
          ],
        },
      ];

      const result = await compareMultipleVersions(models);

      expect(result.versionIds).toEqual([1, 2, 3]);
      expect(result.matrix).toHaveLength(3);
      expect(result.matrix[0]).toHaveLength(3);
      expect(result.summary.totalComparisons).toBe(6); // 3 * (3-1)
    });

    it('should have zero changes on diagonal', async () => {
      const models = [
        {
          id: 1,
          elements: [
            { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: {} },
          ],
        },
        {
          id: 2,
          elements: [
            { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: {} },
          ],
        },
      ];

      const result = await compareMultipleVersions(models);

      // Diagonal debe tener 0 cambios
      expect(result.matrix[0][0].totalChanges).toBe(0);
      expect(result.matrix[1][1].totalChanges).toBe(0);
    });

    it('should detect changes between non-diagonal cells', async () => {
      const models = [
        {
          id: 1,
          elements: [
            { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: {} },
          ],
        },
        {
          id: 2,
          elements: [
            { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: {} },
            { expressId: 2, type: 'IfcDoor', globalId: 'door1', properties: {} },
          ],
        },
      ];

      const result = await compareMultipleVersions(models);

      // De v1 a v2: se añadió 1 elemento
      expect(result.matrix[0][1].addedCount).toBe(1);
      expect(result.matrix[0][1].totalChanges).toBeGreaterThan(0);

      // De v2 a v1: se eliminó 1 elemento
      expect(result.matrix[1][0].removedCount).toBe(1);
      expect(result.matrix[1][0].totalChanges).toBeGreaterThan(0);
    });

    it('should calculate summary statistics correctly', async () => {
      const models = [
        {
          id: 1,
          elements: [
            { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: {} },
          ],
        },
        {
          id: 2,
          elements: [
            { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: {} },
            { expressId: 2, type: 'IfcDoor', globalId: 'door1', properties: {} },
          ],
        },
      ];

      const result = await compareMultipleVersions(models);

      expect(result.summary.totalComparisons).toBe(2);
      expect(result.summary.maxChanges).toBeGreaterThan(0);
      expect(result.summary.avgChanges).toBeGreaterThan(0);
    });
  });

  describe('generateHeatmap', () => {
    it('should normalize values to 0-1 range', () => {
      const matrix = [
        [
          { oldVersionId: 1, newVersionId: 1, totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 },
          { oldVersionId: 1, newVersionId: 2, totalChanges: 10, addedCount: 5, removedCount: 3, modifiedCount: 2 },
        ],
        [
          { oldVersionId: 2, newVersionId: 1, totalChanges: 10, addedCount: 3, removedCount: 5, modifiedCount: 2 },
          { oldVersionId: 2, newVersionId: 2, totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 },
        ],
      ];

      const heatmap = generateHeatmap(matrix);

      expect(heatmap).toHaveLength(2);
      expect(heatmap[0]).toHaveLength(2);
      expect(heatmap[0][0]).toBe(0); // Diagonal
      expect(heatmap[0][1]).toBe(1); // Máximo normalizado
      expect(heatmap[1][0]).toBe(1);
      expect(heatmap[1][1]).toBe(0);
    });

    it('should handle all zeros', () => {
      const matrix = [
        [
          { oldVersionId: 1, newVersionId: 1, totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 },
          { oldVersionId: 1, newVersionId: 2, totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 },
        ],
        [
          { oldVersionId: 2, newVersionId: 1, totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 },
          { oldVersionId: 2, newVersionId: 2, totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 },
        ],
      ];

      const heatmap = generateHeatmap(matrix);

      expect(heatmap[0][0]).toBe(0);
      expect(heatmap[0][1]).toBe(0);
      expect(heatmap[1][0]).toBe(0);
      expect(heatmap[1][1]).toBe(0);
    });

    it('should handle varying intensities', () => {
      const matrix = [
        [
          { oldVersionId: 1, newVersionId: 1, totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 },
          { oldVersionId: 1, newVersionId: 2, totalChanges: 5, addedCount: 3, removedCount: 2, modifiedCount: 0 },
          { oldVersionId: 1, newVersionId: 3, totalChanges: 10, addedCount: 5, removedCount: 5, modifiedCount: 0 },
        ],
        [
          { oldVersionId: 2, newVersionId: 1, totalChanges: 5, addedCount: 2, removedCount: 3, modifiedCount: 0 },
          { oldVersionId: 2, newVersionId: 2, totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 },
          { oldVersionId: 2, newVersionId: 3, totalChanges: 5, addedCount: 2, removedCount: 3, modifiedCount: 0 },
        ],
        [
          { oldVersionId: 3, newVersionId: 1, totalChanges: 10, addedCount: 5, removedCount: 5, modifiedCount: 0 },
          { oldVersionId: 3, newVersionId: 2, totalChanges: 5, addedCount: 3, removedCount: 2, modifiedCount: 0 },
          { oldVersionId: 3, newVersionId: 3, totalChanges: 0, addedCount: 0, removedCount: 0, modifiedCount: 0 },
        ],
      ];

      const heatmap = generateHeatmap(matrix);

      expect(heatmap[0][2]).toBe(1); // Máximo
      expect(heatmap[0][1]).toBe(0.5); // Medio
      expect(heatmap[0][0]).toBe(0); // Diagonal
    });
  });
});
