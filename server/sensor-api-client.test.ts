import { describe, it, expect, beforeEach } from 'vitest';
import { HttpSensorClient, MqttSensorClient, createSensorClient, getSensorReading } from './sensor-api-client';
import type { IotSensor } from '../drizzle/schema';

/**
 * Pruebas unitarias para el cliente de API de sensores IoT
 * 
 * Estas pruebas validan:
 * - Creación de clientes HTTP y MQTT
 * - Factory de clientes según configuración
 * - Lógica de fallback a simulador
 * - Validación de configuraciones
 */

describe('Sensor API Client', () => {
  describe('HttpSensorClient', () => {
    it('should create HTTP client with URL', () => {
      const client = new HttpSensorClient({
        url: 'https://api.example.com/sensor/1',
      });

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(HttpSensorClient);
    });

    it('should create HTTP client with URL and API key', () => {
      const client = new HttpSensorClient({
        url: 'https://api.example.com/sensor/1',
        apiKey: 'test-api-key-123',
      });

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(HttpSensorClient);
    });

    it('should create HTTP client with custom headers', () => {
      const client = new HttpSensorClient({
        url: 'https://api.example.com/sensor/1',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(HttpSensorClient);
    });
  });

  describe('MqttSensorClient', () => {
    it('should create MQTT client with URL and topic', () => {
      const client = new MqttSensorClient({
        url: 'mqtt://broker.example.com:1883',
        topic: 'sensors/temperature/1',
      });

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(MqttSensorClient);
    });

    it('should create MQTT client with authentication', () => {
      const client = new MqttSensorClient({
        url: 'mqtt://broker.example.com:1883',
        topic: 'sensors/temperature/1',
        username: 'mqtt-user',
        password: 'mqtt-password',
      });

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(MqttSensorClient);
    });

    it('should throw error when trying to get reading (not implemented)', async () => {
      const client = new MqttSensorClient({
        url: 'mqtt://broker.example.com:1883',
        topic: 'sensors/temperature/1',
      });

      await expect(client.getReading()).rejects.toThrow('MQTT client not implemented');
    });
  });

  describe('createSensorClient', () => {
    it('should return null for simulator type', () => {
      const sensor: IotSensor = {
        id: 1,
        elementId: 1,
        name: 'Test Sensor',
        sensorType: 'temperature',
        unit: '°C',
        minThreshold: 18,
        maxThreshold: 26,
        status: 'active',
        metadata: null,
        apiUrl: null,
        apiType: 'simulator',
        apiKey: null,
        mqttTopic: null,
        mqttUsername: null,
        mqttPassword: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const client = createSensorClient(sensor);
      expect(client).toBeNull();
    });

    it('should return null when no API URL is configured', () => {
      const sensor: IotSensor = {
        id: 1,
        elementId: 1,
        name: 'Test Sensor',
        sensorType: 'temperature',
        unit: '°C',
        minThreshold: 18,
        maxThreshold: 26,
        status: 'active',
        metadata: null,
        apiUrl: null,
        apiType: 'http',
        apiKey: null,
        mqttTopic: null,
        mqttUsername: null,
        mqttPassword: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const client = createSensorClient(sensor);
      expect(client).toBeNull();
    });

    it('should create HTTP client for HTTP type with URL', () => {
      const sensor: IotSensor = {
        id: 1,
        elementId: 1,
        name: 'Test Sensor',
        sensorType: 'temperature',
        unit: '°C',
        minThreshold: 18,
        maxThreshold: 26,
        status: 'active',
        metadata: null,
        apiUrl: 'https://api.example.com/sensor/1',
        apiType: 'http',
        apiKey: 'test-key',
        mqttTopic: null,
        mqttUsername: null,
        mqttPassword: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const client = createSensorClient(sensor);
      expect(client).toBeInstanceOf(HttpSensorClient);
    });

    it('should create MQTT client for MQTT type with URL and topic', () => {
      const sensor: IotSensor = {
        id: 1,
        elementId: 1,
        name: 'Test Sensor',
        sensorType: 'temperature',
        unit: '°C',
        minThreshold: 18,
        maxThreshold: 26,
        status: 'active',
        metadata: null,
        apiUrl: 'mqtt://broker.example.com:1883',
        apiType: 'mqtt',
        apiKey: null,
        mqttTopic: 'sensors/temp/1',
        mqttUsername: 'user',
        mqttPassword: 'pass',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const client = createSensorClient(sensor);
      expect(client).toBeInstanceOf(MqttSensorClient);
    });

    it('should return null for MQTT type without topic', () => {
      const sensor: IotSensor = {
        id: 1,
        elementId: 1,
        name: 'Test Sensor',
        sensorType: 'temperature',
        unit: '°C',
        minThreshold: 18,
        maxThreshold: 26,
        status: 'active',
        metadata: null,
        apiUrl: 'mqtt://broker.example.com:1883',
        apiType: 'mqtt',
        apiKey: null,
        mqttTopic: null,
        mqttUsername: null,
        mqttPassword: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const client = createSensorClient(sensor);
      expect(client).toBeNull();
    });
  });

  describe('getSensorReading with fallback', () => {
    it('should use fallback when sensor is simulator type', async () => {
      const sensor: IotSensor = {
        id: 1,
        elementId: 1,
        name: 'Test Sensor',
        sensorType: 'temperature',
        unit: '°C',
        minThreshold: 18,
        maxThreshold: 26,
        status: 'active',
        metadata: null,
        apiUrl: null,
        apiType: 'simulator',
        apiKey: null,
        mqttTopic: null,
        mqttUsername: null,
        mqttPassword: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const fallbackValue = {
        value: 22.5,
        timestamp: Date.now(),
        unit: '°C',
        status: 'normal' as const,
      };

      const reading = await getSensorReading(sensor, () => fallbackValue);
      
      expect(reading).toEqual(fallbackValue);
    });

    it('should use fallback when sensor has no API URL', async () => {
      const sensor: IotSensor = {
        id: 1,
        elementId: 1,
        name: 'Test Sensor',
        sensorType: 'temperature',
        unit: '°C',
        minThreshold: 18,
        maxThreshold: 26,
        status: 'active',
        metadata: null,
        apiUrl: null,
        apiType: 'http',
        apiKey: null,
        mqttTopic: null,
        mqttUsername: null,
        mqttPassword: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const fallbackValue = {
        value: 23.0,
        timestamp: Date.now(),
        unit: '°C',
        status: 'normal' as const,
      };

      const reading = await getSensorReading(sensor, () => fallbackValue);
      
      expect(reading).toEqual(fallbackValue);
    });
  });

  describe('Configuration validation', () => {
    it('should handle sensor with all HTTP fields', () => {
      const sensor: IotSensor = {
        id: 1,
        elementId: 1,
        name: 'HTTP Sensor',
        sensorType: 'temperature',
        unit: '°C',
        minThreshold: 18,
        maxThreshold: 26,
        status: 'active',
        metadata: null,
        apiUrl: 'https://api.example.com/sensor/1',
        apiType: 'http',
        apiKey: 'secret-key-123',
        mqttTopic: null,
        mqttUsername: null,
        mqttPassword: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const client = createSensorClient(sensor);
      expect(client).toBeInstanceOf(HttpSensorClient);
    });

    it('should handle sensor with all MQTT fields', () => {
      const sensor: IotSensor = {
        id: 1,
        elementId: 1,
        name: 'MQTT Sensor',
        sensorType: 'humidity',
        unit: '%',
        minThreshold: 30,
        maxThreshold: 70,
        status: 'active',
        metadata: null,
        apiUrl: 'mqtt://broker.hivemq.com:1883',
        apiType: 'mqtt',
        apiKey: null,
        mqttTopic: 'building/floor1/humidity',
        mqttUsername: 'mqtt_user',
        mqttPassword: 'mqtt_pass',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const client = createSensorClient(sensor);
      expect(client).toBeInstanceOf(MqttSensorClient);
    });
  });
});
