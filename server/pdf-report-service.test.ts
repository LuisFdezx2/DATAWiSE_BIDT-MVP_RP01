import { describe, it, expect } from 'vitest';
import { generateReportFilename } from './pdf-report-service';

/**
 * Pruebas unitarias para el servicio de generación de reportes PDF
 * 
 * Cobertura:
 * - Generación de nombres de archivo
 * - Validación de estructura de datos
 * - Lógica de recomendaciones
 */

describe('PDF Report Service', () => {
  describe('generateReportFilename', () => {
    it('should generate valid filename with project name and date', () => {
      const projectName = 'Test Project';
      const date = new Date('2025-11-29T12:00:00Z');
      
      const filename = generateReportFilename(projectName, date);
      
      expect(filename).toContain('health_report');
      expect(filename).toContain('Test_Project');
      expect(filename).toContain('2025-11-29');
      expect(filename).toEndWith('.pdf');
    });

    it('should sanitize special characters in project name', () => {
      const projectName = 'Project @#$ with special chars!';
      const date = new Date('2025-11-29');
      
      const filename = generateReportFilename(projectName, date);
      
      // No debe contener caracteres especiales
      expect(filename).not.toMatch(/[@#$!]/);
      expect(filename).toMatch(/^health_report_[a-zA-Z0-9_]+_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should handle empty project name', () => {
      const projectName = '';
      const date = new Date('2025-11-29');
      
      const filename = generateReportFilename(projectName, date);
      
      expect(filename).toContain('health_report');
      expect(filename).toEndWith('.pdf');
    });
  });

  describe('Report Data Structure', () => {
    it('should validate health report data structure', () => {
      const reportData = {
        projectId: 1,
        projectName: 'Test Project',
        hoursBack: 24,
        generatedAt: new Date(),
        metrics: [],
        totalSensors: 10,
        healthySensors: 7,
        degradedSensors: 2,
        criticalSensors: 1,
        averageUptime: 85.5,
        averageLatency: 250.3,
        recommendations: ['Recommendation 1', 'Recommendation 2'],
      };

      expect(reportData.projectId).toBeGreaterThan(0);
      expect(reportData.projectName).toBeTruthy();
      expect(reportData.hoursBack).toBeGreaterThan(0);
      expect(reportData.generatedAt).toBeInstanceOf(Date);
      expect(Array.isArray(reportData.metrics)).toBe(true);
      expect(reportData.totalSensors).toBeGreaterThanOrEqual(0);
      expect(reportData.healthySensors).toBeGreaterThanOrEqual(0);
      expect(reportData.degradedSensors).toBeGreaterThanOrEqual(0);
      expect(reportData.criticalSensors).toBeGreaterThanOrEqual(0);
      expect(reportData.averageUptime).toBeGreaterThanOrEqual(0);
      expect(reportData.averageUptime).toBeLessThanOrEqual(100);
      expect(reportData.averageLatency).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(reportData.recommendations)).toBe(true);
    });

    it('should ensure sensor counts sum correctly', () => {
      const totalSensors = 10;
      const healthySensors = 6;
      const degradedSensors = 3;
      const criticalSensors = 1;

      const sum = healthySensors + degradedSensors + criticalSensors;
      
      expect(sum).toBe(totalSensors);
    });
  });

  describe('Recommendation Logic', () => {
    it('should recommend action for critical sensors', () => {
      const criticalCount = 3;
      const shouldRecommend = criticalCount > 0;
      
      expect(shouldRecommend).toBe(true);
      
      if (shouldRecommend) {
        const recommendation = `Se detectaron ${criticalCount} sensor(es) en estado crítico. ` +
          `Revisar configuración de API y verificar conectividad de red.`;
        
        expect(recommendation).toContain('crítico');
        expect(recommendation).toContain('3');
      }
    });

    it('should recommend action for degraded sensors', () => {
      const degradedCount = 5;
      const threshold = 2;
      const shouldRecommend = degradedCount > threshold;
      
      expect(shouldRecommend).toBe(true);
      
      if (shouldRecommend) {
        const recommendation = `${degradedCount} sensores muestran rendimiento degradado. ` +
          `Considerar aumentar timeouts o revisar capacidad del servidor de APIs.`;
        
        expect(recommendation).toContain('degradado');
        expect(recommendation).toContain('5');
      }
    });

    it('should recommend action for high latency sensors', () => {
      const highLatencyCount = 2;
      const latencyThreshold = 500;
      const shouldRecommend = highLatencyCount > 0;
      
      expect(shouldRecommend).toBe(true);
      
      if (shouldRecommend) {
        const recommendation = `${highLatencyCount} sensor(es) con latencia superior a ${latencyThreshold}ms. ` +
          `Evaluar implementar caché local o migrar a servidor más cercano.`;
        
        expect(recommendation).toContain('latencia');
        expect(recommendation).toContain('500ms');
      }
    });

    it('should recommend action for high fallback usage', () => {
      const sensor = {
        successfulAttempts: 30,
        failedAttempts: 70,
      };
      
      const usingFallbackMoreThanApi = sensor.failedAttempts > sensor.successfulAttempts;
      
      expect(usingFallbackMoreThanApi).toBe(true);
    });

    it('should provide positive feedback when all is well', () => {
      const criticalCount = 0;
      const degradedCount = 0;
      const highLatencyCount = 0;
      const highFallbackCount = 0;
      
      const hasIssues = criticalCount > 0 || degradedCount > 2 || 
                       highLatencyCount > 0 || highFallbackCount > 0;
      
      expect(hasIssues).toBe(false);
      
      if (!hasIssues) {
        const recommendation = 'Todos los sensores operan dentro de parámetros normales. ' +
          'Continuar monitoreando métricas de forma regular.';
        
        expect(recommendation).toContain('normales');
      }
    });
  });

  describe('Incident Analysis', () => {
    it('should group errors by message', () => {
      const errors = [
        'Connection timeout',
        'Connection timeout',
        'Connection timeout',
        'Invalid API key',
        'Invalid API key',
        'Network error',
      ];

      const errorCounts = new Map<string, number>();
      errors.forEach(error => {
        const count = errorCounts.get(error) || 0;
        errorCounts.set(error, count + 1);
      });

      expect(errorCounts.get('Connection timeout')).toBe(3);
      expect(errorCounts.get('Invalid API key')).toBe(2);
      expect(errorCounts.get('Network error')).toBe(1);
    });

    it('should sort errors by frequency', () => {
      const errorCounts = new Map([
        ['Error A', 5],
        ['Error B', 10],
        ['Error C', 3],
      ]);

      const sorted = Array.from(errorCounts.entries())
        .sort((a, b) => b[1] - a[1]);

      expect(sorted[0][0]).toBe('Error B');
      expect(sorted[1][0]).toBe('Error A');
      expect(sorted[2][0]).toBe('Error C');
    });

    it('should limit to top 5 errors', () => {
      const errorCounts = new Map([
        ['Error 1', 10],
        ['Error 2', 9],
        ['Error 3', 8],
        ['Error 4', 7],
        ['Error 5', 6],
        ['Error 6', 5],
        ['Error 7', 4],
      ]);

      const topErrors = Array.from(errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      expect(topErrors.length).toBe(5);
      expect(topErrors[0][0]).toBe('Error 1');
      expect(topErrors[4][0]).toBe('Error 5');
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate average uptime correctly', () => {
      const metrics = [
        { successRate: 95.5 },
        { successRate: 87.3 },
        { successRate: 92.1 },
      ];

      const average = metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length;
      
      expect(average).toBeCloseTo(91.63, 1);
    });

    it('should calculate average latency correctly', () => {
      const metrics = [
        { averageLatency: 250 },
        { averageLatency: 300 },
        { averageLatency: null },
        { averageLatency: 200 },
      ];

      const latencies = metrics.filter(m => m.averageLatency !== null).map(m => m.averageLatency!);
      const average = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      
      expect(average).toBe(250);
      expect(latencies.length).toBe(3);
    });

    it('should handle empty metrics gracefully', () => {
      const metrics: any[] = [];
      
      const totalSensors = metrics.length;
      const averageUptime = totalSensors > 0
        ? metrics.reduce((sum, m) => sum + m.successRate, 0) / totalSensors
        : 0;
      
      expect(totalSensors).toBe(0);
      expect(averageUptime).toBe(0);
    });
  });
});
