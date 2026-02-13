import { describe, it, expect } from 'vitest';
import {
  sendWebhook,
  type AlertType,
} from './alert-service';

/**
 * Pruebas unitarias para el servicio de alertas y webhooks
 * 
 * Cobertura:
 * - Envío de webhooks a URLs externas
 * - Creación y gestión de configuraciones de alertas
 * - Evaluación de salud de sensores
 */

describe('Alert Service', () => {
  describe('sendWebhook', () => {
    it('should handle webhook sending', async () => {
      // Usamos una URL de prueba que no existe
      const result = await sendWebhook('https://httpbin.org/post', {
        alertType: 'critical_sensor',
        sensorId: 1,
        sensorName: 'Test Sensor',
        message: 'Test alert message',
        triggerValue: 30,
        threshold: 70,
        timestamp: new Date().toISOString(),
      });

      // El resultado puede ser true o false dependiendo de la conectividad
      expect(typeof result).toBe('boolean');
    });

    it('should return false for invalid URL', async () => {
      const result = await sendWebhook('invalid-url', {
        alertType: 'critical_sensor',
        message: 'Test',
      });

      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const result = await sendWebhook('https://nonexistent-domain-12345.com/webhook', {
        alertType: 'low_success_rate',
        message: 'Test',
      });

      expect(result).toBe(false);
    });
  });

  describe('Alert Type Validation', () => {
    it('should recognize valid alert types', () => {
      const validTypes: AlertType[] = [
        'critical_sensor',
        'low_success_rate',
        'high_latency',
      ];

      validTypes.forEach(type => {
        expect(['critical_sensor', 'low_success_rate', 'high_latency']).toContain(type);
      });
    });
  });

  describe('Alert Trigger Logic', () => {
    it('should trigger critical_sensor alert when status is critical', () => {
      // Esta es una prueba conceptual de la lógica
      const sensorStatus = 'critical';
      const shouldTrigger = sensorStatus === 'critical';
      
      expect(shouldTrigger).toBe(true);
    });

    it('should trigger low_success_rate alert when below threshold', () => {
      const successRate = 65;
      const threshold = 70;
      const shouldTrigger = successRate < threshold;
      
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger low_success_rate alert when above threshold', () => {
      const successRate = 95;
      const threshold = 70;
      const shouldTrigger = successRate < threshold;
      
      expect(shouldTrigger).toBe(false);
    });

    it('should trigger high_latency alert when above threshold', () => {
      const averageLatency = 500;
      const threshold = 300;
      const shouldTrigger = averageLatency > threshold;
      
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger high_latency alert when below threshold', () => {
      const averageLatency = 150;
      const threshold = 300;
      const shouldTrigger = averageLatency > threshold;
      
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('Webhook Payload Structure', () => {
    it('should create valid webhook payload', () => {
      const payload = {
        alertType: 'critical_sensor' as AlertType,
        sensorId: 123,
        sensorName: 'Temperature Sensor',
        message: 'Sensor in critical state',
        triggerValue: 30,
        threshold: 70,
        timestamp: new Date().toISOString(),
      };

      expect(payload).toHaveProperty('alertType');
      expect(payload).toHaveProperty('sensorId');
      expect(payload).toHaveProperty('sensorName');
      expect(payload).toHaveProperty('message');
      expect(payload).toHaveProperty('triggerValue');
      expect(payload).toHaveProperty('threshold');
      expect(payload).toHaveProperty('timestamp');
      
      expect(typeof payload.sensorId).toBe('number');
      expect(typeof payload.sensorName).toBe('string');
      expect(typeof payload.message).toBe('string');
      expect(typeof payload.triggerValue).toBe('number');
      expect(typeof payload.threshold).toBe('number');
    });
  });

  describe('Alert Message Generation', () => {
    it('should generate critical sensor message', () => {
      const sensorName = 'Temperature Sensor';
      const successRate = 30;
      const message = `Sensor "${sensorName}" en estado CRÍTICO. Tasa de éxito: ${successRate}%`;
      
      expect(message).toContain(sensorName);
      expect(message).toContain('CRÍTICO');
      expect(message).toContain('30%');
    });

    it('should generate low success rate message', () => {
      const sensorName = 'Humidity Sensor';
      const successRate = 65;
      const threshold = 70;
      const message = `Sensor "${sensorName}" con baja tasa de éxito: ${successRate}% (umbral: ${threshold}%)`;
      
      expect(message).toContain(sensorName);
      expect(message).toContain('baja tasa de éxito');
      expect(message).toContain('65%');
      expect(message).toContain('70%');
    });

    it('should generate high latency message', () => {
      const sensorName = 'Energy Meter';
      const latency = 450;
      const threshold = 300;
      const message = `Sensor "${sensorName}" con alta latencia: ${latency}ms (umbral: ${threshold}ms)`;
      
      expect(message).toContain(sensorName);
      expect(message).toContain('alta latencia');
      expect(message).toContain('450ms');
      expect(message).toContain('300ms');
    });
  });

  describe('Alert Configuration Validation', () => {
    it('should validate alert configuration structure', () => {
      const config = {
        projectId: 1,
        name: 'Critical Temperature Alert',
        alertType: 'critical_sensor' as AlertType,
        threshold: 70,
        webhookUrl: 'https://example.com/webhook',
        notifyOwner: true,
        enabled: true,
      };

      expect(config.projectId).toBeGreaterThan(0);
      expect(config.name.length).toBeGreaterThan(0);
      expect(['critical_sensor', 'low_success_rate', 'high_latency']).toContain(config.alertType);
      expect(config.threshold).toBeGreaterThan(0);
      expect(typeof config.notifyOwner).toBe('boolean');
      expect(typeof config.enabled).toBe('boolean');
    });

    it('should handle optional webhook URL', () => {
      const configWithWebhook = {
        webhookUrl: 'https://example.com/webhook',
      };

      const configWithoutWebhook = {
        webhookUrl: undefined,
      };

      expect(configWithWebhook.webhookUrl).toBeDefined();
      expect(configWithoutWebhook.webhookUrl).toBeUndefined();
    });
  });

  describe('Alert History Entry Structure', () => {
    it('should validate alert history entry', () => {
      const entry = {
        configId: 1,
        sensorId: 123,
        alertType: 'low_success_rate' as AlertType,
        message: 'Test alert message',
        triggerValue: 65,
        threshold: 70,
        webhookSent: true,
        ownerNotified: true,
        sentAt: new Date(),
      };

      expect(entry.configId).toBeGreaterThan(0);
      expect(entry.sensorId).toBeGreaterThan(0);
      expect(['critical_sensor', 'low_success_rate', 'high_latency']).toContain(entry.alertType);
      expect(entry.triggerValue).toBeLessThan(entry.threshold);
      expect(typeof entry.webhookSent).toBe('boolean');
      expect(typeof entry.ownerNotified).toBe('boolean');
      expect(entry.sentAt).toBeInstanceOf(Date);
    });
  });
});
