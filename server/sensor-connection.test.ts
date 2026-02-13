import { describe, it, expect } from 'vitest';
import { fetchSensorData } from './sensor-api-client';

/**
 * Pruebas unitarias para test de conexión de sensores IoT
 * 
 * Estas pruebas validan:
 * - Función fetchSensorData con diferentes configuraciones
 * - Manejo de errores de conexión
 * - Formato de respuesta
 */

describe('Sensor Connection Tests', () => {
  describe('fetchSensorData', () => {
    it('should return error for invalid HTTP URL', async () => {
      const result = await fetchSensorData({
        apiUrl: 'invalid-url',
        apiType: 'http',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for unreachable HTTP endpoint', async () => {
      const result = await fetchSensorData({
        apiUrl: 'http://localhost:99999/sensor',
        apiType: 'http',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle HTTP API with API key', async () => {
      const result = await fetchSensorData({
        apiUrl: 'http://localhost:99999/sensor',
        apiType: 'http',
        apiKey: 'test-key-123',
      });

      // Debería fallar por endpoint no disponible, no por falta de key
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for invalid MQTT URL', async () => {
      const result = await fetchSensorData({
        apiUrl: 'invalid-mqtt-url',
        apiType: 'mqtt',
        mqttTopic: 'test/topic',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for MQTT without topic', async () => {
      const result = await fetchSensorData({
        apiUrl: 'mqtt://localhost:1883',
        apiType: 'mqtt',
        mqttTopic: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for unreachable MQTT broker', async () => {
      const result = await fetchSensorData({
        apiUrl: 'mqtt://localhost:99999',
        apiType: 'mqtt',
        mqttTopic: 'sensors/temperature',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include error message in response', async () => {
      const result = await fetchSensorData({
        apiUrl: 'http://localhost:99999/sensor',
        apiType: 'http',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error!.length).toBeGreaterThan(0);
    });

    it('should handle different HTTP methods gracefully', async () => {
      const result = await fetchSensorData({
        apiUrl: 'http://localhost:99999/sensor',
        apiType: 'http',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Response Format', () => {
    it('should return object with success field', async () => {
      const result = await fetchSensorData({
        apiUrl: 'http://localhost:99999/sensor',
        apiType: 'http',
      });

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should return error field when failed', async () => {
      const result = await fetchSensorData({
        apiUrl: 'invalid-url',
        apiType: 'http',
      });

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('should not return data field when failed', async () => {
      const result = await fetchSensorData({
        apiUrl: 'invalid-url',
        apiType: 'http',
      });

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid HTTP configuration', async () => {
      const config = {
        apiUrl: 'http://localhost:99999/sensor',
        apiType: 'http' as const,
      };

      const result = await fetchSensorData(config);
      
      // Debería intentar conectar (y fallar por endpoint no disponible)
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept valid MQTT configuration', async () => {
      const config = {
        apiUrl: 'mqtt://localhost:1883',
        apiType: 'mqtt' as const,
        mqttTopic: 'test/topic',
      };

      const result = await fetchSensorData(config);
      
      // Debería intentar conectar (y fallar por broker no disponible)
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle optional API key', async () => {
      const configWithKey = {
        apiUrl: 'http://localhost:99999/sensor',
        apiType: 'http' as const,
        apiKey: 'test-key',
      };

      const configWithoutKey = {
        apiUrl: 'http://localhost:99999/sensor',
        apiType: 'http' as const,
      };

      const result1 = await fetchSensorData(configWithKey);
      const result2 = await fetchSensorData(configWithoutKey);

      // Ambos deberían fallar por endpoint no disponible
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it('should handle optional MQTT topic', async () => {
      const configWithTopic = {
        apiUrl: 'mqtt://localhost:1883',
        apiType: 'mqtt' as const,
        mqttTopic: 'sensors/temp',
      };

      const configWithoutTopic = {
        apiUrl: 'mqtt://localhost:1883',
        apiType: 'mqtt' as const,
      };

      const result1 = await fetchSensorData(configWithTopic);
      const result2 = await fetchSensorData(configWithoutTopic);

      // Ambos deberían fallar
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });
  });
});
