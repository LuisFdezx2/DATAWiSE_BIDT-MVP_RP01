import { describe, it, expect } from 'vitest';
import {
  calculateProjectMetrics,
  calculateElementDistribution,
  calculateGrowthTrend,
} from './project-analytics';

describe('Project Analytics', () => {
  describe('calculateProjectMetrics', () => {
    it('debe calcular métricas básicas de proyecto', async () => {
      const models = [
        {
          id: 1,
          name: 'Model 1',
          createdAt: new Date('2025-01-01'),
          elements: [
            { ifcType: 'IfcWall' },
            { ifcType: 'IfcWall' },
            { ifcType: 'IfcColumn' },
          ],
        },
        {
          id: 2,
          name: 'Model 2',
          createdAt: new Date('2025-01-15'),
          elements: [
            { ifcType: 'IfcWall' },
            { ifcType: 'IfcDoor' },
          ],
        },
      ];

      const metrics = await calculateProjectMetrics(1, models);

      expect(metrics.projectId).toBe(1);
      expect(metrics.totalModels).toBe(2);
      expect(metrics.totalElements).toBe(5);
      expect(metrics.elementsByType['IfcWall']).toBe(3);
      expect(metrics.elementsByType['IfcColumn']).toBe(1);
      expect(metrics.elementsByType['IfcDoor']).toBe(1);
    });

    it('debe ordenar timeline por fecha', async () => {
      const models = [
        {
          id: 2,
          name: 'Model 2',
          createdAt: new Date('2025-01-15'),
          elements: [],
        },
        {
          id: 1,
          name: 'Model 1',
          createdAt: new Date('2025-01-01'),
          elements: [],
        },
      ];

      const metrics = await calculateProjectMetrics(1, models);

      expect(metrics.modelTimeline[0].modelId).toBe(1);
      expect(metrics.modelTimeline[1].modelId).toBe(2);
    });

    it('debe calcular top elementos modificados', async () => {
      const models = [
        {
          id: 1,
          name: 'Model 1',
          createdAt: new Date(),
          elements: [
            { ifcType: 'IfcWall' },
            { ifcType: 'IfcWall' },
            { ifcType: 'IfcWall' },
            { ifcType: 'IfcColumn' },
            { ifcType: 'IfcDoor' },
          ],
        },
      ];

      const metrics = await calculateProjectMetrics(1, models);

      expect(metrics.topModifiedElements.length).toBeGreaterThan(0);
      expect(metrics.topModifiedElements[0].type).toBe('IfcWall');
      expect(metrics.topModifiedElements[0].count).toBe(3);
    });
  });

  describe('calculateElementDistribution', () => {
    it('debe calcular distribución con porcentajes', () => {
      const elementsByType = {
        IfcWall: 50,
        IfcColumn: 30,
        IfcDoor: 20,
      };

      const distribution = calculateElementDistribution(elementsByType);

      expect(distribution.length).toBe(3);
      expect(distribution[0].type).toBe('IfcWall');
      expect(distribution[0].count).toBe(50);
      expect(distribution[0].percentage).toBe(50);
      
      expect(distribution[1].type).toBe('IfcColumn');
      expect(distribution[1].percentage).toBe(30);
      
      expect(distribution[2].type).toBe('IfcDoor');
      expect(distribution[2].percentage).toBe(20);
    });

    it('debe ordenar por count descendente', () => {
      const elementsByType = {
        IfcDoor: 10,
        IfcWall: 50,
        IfcColumn: 30,
      };

      const distribution = calculateElementDistribution(elementsByType);

      expect(distribution[0].count).toBeGreaterThanOrEqual(distribution[1].count);
      expect(distribution[1].count).toBeGreaterThanOrEqual(distribution[2].count);
    });

    it('debe manejar total cero', () => {
      const elementsByType = {};

      const distribution = calculateElementDistribution(elementsByType);

      expect(distribution.length).toBe(0);
    });
  });

  describe('calculateGrowthTrend', () => {
    it('debe calcular tendencia de crecimiento', () => {
      const timeline = [
        {
          modelId: 1,
          modelName: 'Model 1',
          uploadDate: new Date('2025-01-01'),
          elementCount: 100,
        },
        {
          modelId: 2,
          modelName: 'Model 2',
          uploadDate: new Date('2025-01-15'),
          elementCount: 150,
        },
        {
          modelId: 3,
          modelName: 'Model 3',
          uploadDate: new Date('2025-02-01'),
          elementCount: 120,
        },
      ];

      const trend = calculateGrowthTrend(timeline);

      expect(trend.length).toBe(3);
      expect(trend[0].growth).toBe(0); // Primer modelo, sin crecimiento previo
      expect(trend[1].growth).toBe(50); // (150-100)/100 * 100 = 50%
      expect(trend[2].growth).toBe(-20); // (120-150)/150 * 100 = -20%
    });

    it('debe manejar timeline vacío', () => {
      const timeline: any[] = [];

      const trend = calculateGrowthTrend(timeline);

      expect(trend.length).toBe(0);
    });

    it('debe manejar un solo modelo', () => {
      const timeline = [
        {
          modelId: 1,
          modelName: 'Model 1',
          uploadDate: new Date('2025-01-01'),
          elementCount: 100,
        },
      ];

      const trend = calculateGrowthTrend(timeline);

      expect(trend.length).toBe(1);
      expect(trend[0].growth).toBe(0);
    });
  });
});
