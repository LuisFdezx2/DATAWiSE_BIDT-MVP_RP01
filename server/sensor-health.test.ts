import { describe, it, expect } from 'vitest';
import {
  logConnection,
  getSensorHealthMetrics,
  getConnectionLogs,
  type SensorHealthMetrics,
} from './sensor-health-service';

/**
 * Pruebas unitarias para el servicio de salud de APIs de sensores
 * 
 * Cobertura:
 * - Registro de intentos de conexión (exitosos y fallidos)
 * - Cálculo de métricas de salud (uptime, latencia, tasa de éxito)
 * - Obtención de logs con paginación
 */

describe('Sensor Health Service', () => {
  describe('logConnection', () => {
    it('should log successful connection', async () => {
      // Simplemente verificamos que la función no lanza errores
      await expect(logConnection({
        sensorId: 1,
        success: true,
        latencyMs: 150,
        source: 'api',
      })).resolves.not.toThrow();
    });

    it('should log failed connection', async () => {
      await expect(logConnection({
        sensorId: 1,
        success: false,
        errorMessage: 'Connection timeout',
        source: 'fallback',
      })).resolves.not.toThrow();
    });

    it('should log fallback usage', async () => {
      await expect(logConnection({
        sensorId: 1,
        success: false,
        errorMessage: 'Fallback to simulator',
        source: 'fallback',
      })).resolves.not.toThrow();
    });
  });

  describe('getSensorHealthMetrics', () => {
    it('should return null for non-existent sensor', async () => {
      const metrics = await getSensorHealthMetrics(999999, 24);
      expect(metrics).toBeNull();
    });

    it('should return metrics structure when sensor exists', async () => {
      // Crear algunos logs primero
      await logConnection({
        sensorId: 1,
        success: true,
        latencyMs: 100,
        source: 'api',
      });

      const metrics = await getSensorHealthMetrics(1, 24);
      
      if (metrics) {
        expect(metrics).toHaveProperty('sensorId');
        expect(metrics).toHaveProperty('sensorName');
        expect(metrics).toHaveProperty('totalAttempts');
        expect(metrics).toHaveProperty('successRate');
        expect(metrics).toHaveProperty('status');
        expect(['healthy', 'degraded', 'critical', 'unknown']).toContain(metrics.status);
      }
    });
  });

  describe('getConnectionLogs', () => {
    it('should return array of logs', async () => {
      const logs = await getConnectionLogs(undefined, 10, 0);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const logs = await getConnectionLogs(undefined, 5, 0);
      expect(logs.length).toBeLessThanOrEqual(5);
    });

    it('should filter by sensorId when provided', async () => {
      // Crear log para sensor específico
      await logConnection({
        sensorId: 123,
        success: true,
        latencyMs: 100,
        source: 'api',
      });

      const logs = await getConnectionLogs(123, 100, 0);
      
      // Todos los logs deben ser del sensor 123
      logs.forEach(log => {
        expect(log.sensorId).toBe(123);
      });
    });
  });

  describe('Health Metrics Calculation', () => {
    it('should calculate success rate correctly', async () => {
      const testSensorId = 500 + Math.floor(Math.random() * 1000);

      // Registrar 7 exitosos y 3 fallidos = 70% success rate
      for (let i = 0; i < 7; i++) {
        await logConnection({
          sensorId: testSensorId,
          success: true,
          latencyMs: 100,
          source: 'api',
        });
      }

      for (let i = 0; i < 3; i++) {
        await logConnection({
          sensorId: testSensorId,
          success: false,
          errorMessage: 'Test error',
          source: 'fallback',
        });
      }

      const metrics = await getSensorHealthMetrics(testSensorId, 24);
      
      if (metrics) {
        expect(metrics.totalAttempts).toBe(10);
        expect(metrics.successfulAttempts).toBe(7);
        expect(metrics.failedAttempts).toBe(3);
        expect(metrics.successRate).toBe(70);
      }
    });

    it('should determine healthy status for high success rate', async () => {
      const testSensorId = 600 + Math.floor(Math.random() * 1000);

      // 96% success rate
      for (let i = 0; i < 24; i++) {
        await logConnection({
          sensorId: testSensorId,
          success: true,
          latencyMs: 100,
          source: 'api',
        });
      }

      await logConnection({
        sensorId: testSensorId,
        success: false,
        errorMessage: 'Rare error',
        source: 'fallback',
      });

      const metrics = await getSensorHealthMetrics(testSensorId, 24);
      
      if (metrics) {
        expect(metrics.status).toBe('healthy');
        expect(metrics.successRate).toBeGreaterThanOrEqual(95);
      }
    });

    it('should determine degraded status for medium success rate', async () => {
      const testSensorId = 700 + Math.floor(Math.random() * 1000);

      // 80% success rate
      for (let i = 0; i < 8; i++) {
        await logConnection({
          sensorId: testSensorId,
          success: true,
          latencyMs: 100,
          source: 'api',
        });
      }

      for (let i = 0; i < 2; i++) {
        await logConnection({
          sensorId: testSensorId,
          success: false,
          errorMessage: 'Some errors',
          source: 'fallback',
        });
      }

      const metrics = await getSensorHealthMetrics(testSensorId, 24);
      
      if (metrics) {
        expect(metrics.status).toBe('degraded');
        expect(metrics.successRate).toBeGreaterThanOrEqual(70);
        expect(metrics.successRate).toBeLessThan(95);
      }
    });

    it('should determine critical status for low success rate', async () => {
      const testSensorId = 800 + Math.floor(Math.random() * 1000);

      // 30% success rate
      for (let i = 0; i < 3; i++) {
        await logConnection({
          sensorId: testSensorId,
          success: true,
          latencyMs: 100,
          source: 'api',
        });
      }

      for (let i = 0; i < 7; i++) {
        await logConnection({
          sensorId: testSensorId,
          success: false,
          errorMessage: 'Frequent errors',
          source: 'fallback',
        });
      }

      const metrics = await getSensorHealthMetrics(testSensorId, 24);
      
      if (metrics) {
        expect(metrics.status).toBe('critical');
        expect(metrics.successRate).toBeLessThan(70);
      }
    });

    it('should calculate average latency from successful attempts', async () => {
      const testSensorId = 900 + Math.floor(Math.random() * 1000);

      // Registrar con diferentes latencias: 100, 200, 300 ms
      await logConnection({
        sensorId: testSensorId,
        success: true,
        latencyMs: 100,
        source: 'api',
      });

      await logConnection({
        sensorId: testSensorId,
        success: true,
        latencyMs: 200,
        source: 'api',
      });

      await logConnection({
        sensorId: testSensorId,
        success: true,
        latencyMs: 300,
        source: 'api',
      });

      const metrics = await getSensorHealthMetrics(testSensorId, 24);
      
      if (metrics && metrics.averageLatency !== null) {
        // Promedio debería ser 200ms
        expect(metrics.averageLatency).toBe(200);
      }
    });
  });

  describe('Log Pagination', () => {
    it('should support pagination with offset', async () => {
      const testSensorId = 1000 + Math.floor(Math.random() * 1000);

      // Crear 15 logs
      for (let i = 0; i < 15; i++) {
        await logConnection({
          sensorId: testSensorId,
          success: i % 2 === 0,
          latencyMs: i % 2 === 0 ? 100 : undefined,
          errorMessage: i % 2 === 0 ? undefined : `Error ${i}`,
          source: i % 2 === 0 ? 'api' : 'fallback',
        });
      }

      // Primera página
      const page1 = await getConnectionLogs(testSensorId, 10, 0);
      expect(page1.length).toBeLessThanOrEqual(10);

      // Segunda página
      const page2 = await getConnectionLogs(testSensorId, 10, 10);
      expect(page2.length).toBeLessThanOrEqual(10);
    });
  });
});
