/**
 * Cliente de API para sensores IoT reales
 * 
 * Este servicio proporciona funcionalidades para conectarse a APIs externas
 * de sensores mediante HTTP o MQTT, permitiendo obtener datos reales en lugar
 * de usar el simulador.
 * 
 * Soporta:
 * - APIs REST HTTP con autenticación por API key
 * - Brokers MQTT con autenticación opcional
 * - Fallback automático al simulador si la API falla
 */

import { IotSensor } from '../drizzle/schema';

/**
 * Lectura de sensor obtenida desde API externa
 */
export interface SensorReading {
  value: number;
  timestamp: number;
  unit: string;
  status: 'normal' | 'warning' | 'alert';
}

/**
 * Configuración de conexión HTTP
 */
interface HttpConfig {
  url: string;
  apiKey?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
}

/**
 * Configuración de conexión MQTT
 */
interface MqttConfig {
  url: string;
  topic: string;
  username?: string;
  password?: string;
  clientId?: string;
}

/**
 * Cliente para APIs HTTP de sensores
 * 
 * Realiza peticiones HTTP a endpoints REST que devuelven lecturas de sensores.
 * Soporta autenticación mediante API key en headers.
 * 
 * Formato esperado de respuesta:
 * {
 *   "value": 23.5,
 *   "timestamp": 1234567890,
 *   "unit": "°C",
 *   "status": "normal"
 * }
 */
export class HttpSensorClient {
  private config: HttpConfig;

  constructor(config: HttpConfig) {
    this.config = config;
  }

  /**
   * Obtiene la lectura actual del sensor desde la API HTTP
   */
  async getReading(): Promise<SensorReading> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.headers,
      };

      // Añadir API key si está configurada
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.url, {
        method: this.config.method || 'GET',
        headers,
        signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validar que la respuesta tenga el formato esperado
      if (typeof data.value !== 'number') {
        throw new Error('Invalid response format: missing or invalid value field');
      }

      return {
        value: data.value,
        timestamp: data.timestamp || Date.now(),
        unit: data.unit || '',
        status: data.status || 'normal',
      };
    } catch (error) {
      console.error('Error fetching sensor data from HTTP API:', error);
      throw error;
    }
  }

  /**
   * Obtiene múltiples lecturas históricas del sensor
   * @param startTime Timestamp de inicio
   * @param endTime Timestamp de fin
   */
  async getHistoricalReadings(startTime: number, endTime: number): Promise<SensorReading[]> {
    try {
      const url = new URL(this.config.url);
      url.searchParams.append('start', startTime.toString());
      url.searchParams.append('end', endTime.toString());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000), // Timeout de 10 segundos para históricos
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validar que la respuesta sea un array
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array of readings');
      }

      return data.map((item: any) => ({
        value: item.value,
        timestamp: item.timestamp || Date.now(),
        unit: item.unit || '',
        status: item.status || 'normal',
      }));
    } catch (error) {
      console.error('Error fetching historical sensor data from HTTP API:', error);
      throw error;
    }
  }
}

/**
 * Cliente para brokers MQTT de sensores
 * 
 * Nota: Esta implementación es un placeholder ya que MQTT requiere
 * una conexión persistente que no es ideal para el modelo request/response
 * de tRPC. En producción, se recomienda usar un servicio worker separado
 * que escuche los mensajes MQTT y los almacene en la base de datos.
 */
export class MqttSensorClient {
  private config: MqttConfig;

  constructor(config: MqttConfig) {
    this.config = config;
  }

  /**
   * Obtiene la lectura más reciente del sensor desde MQTT
   * 
   * Nota: Esta es una implementación simplificada. En producción,
   * se recomienda usar un servicio worker que mantenga la conexión
   * MQTT abierta y almacene las lecturas en la base de datos.
   */
  async getReading(): Promise<SensorReading> {
    throw new Error(
      'MQTT client not implemented. Use a background worker to subscribe to MQTT topics and store readings in the database.'
    );
  }

  /**
   * Obtiene lecturas históricas del sensor desde MQTT
   */
  async getHistoricalReadings(startTime: number, endTime: number): Promise<SensorReading[]> {
    throw new Error(
      'MQTT historical readings not implemented. Store MQTT messages in the database using a background worker.'
    );
  }
}

/**
 * Factory para crear clientes de API de sensores según configuración
 */
export function createSensorClient(sensor: IotSensor): HttpSensorClient | MqttSensorClient | null {
  // Si no hay URL configurada o es tipo simulator, retornar null
  if (!sensor.apiUrl || sensor.apiType === 'simulator') {
    return null;
  }

  switch (sensor.apiType) {
    case 'http':
      return new HttpSensorClient({
        url: sensor.apiUrl,
        apiKey: sensor.apiKey || undefined,
      });

    case 'mqtt':
      if (!sensor.mqttTopic) {
        console.warn(`Sensor ${sensor.id} configured as MQTT but missing topic`);
        return null;
      }

      return new MqttSensorClient({
        url: sensor.apiUrl,
        topic: sensor.mqttTopic,
        username: sensor.mqttUsername || undefined,
        password: sensor.mqttPassword || undefined,
      });

    default:
      console.warn(`Unknown API type for sensor ${sensor.id}: ${sensor.apiType}`);
      return null;
  }
}

/**
 * Obtiene datos de sensor desde una API externa (para testing)
 * Retorna resultado con success/error
 */
export async function fetchSensorData(config: {
  apiUrl: string;
  apiType: 'http' | 'mqtt';
  apiKey?: string;
  mqttTopic?: string;
}): Promise<{ success: boolean; data?: SensorReading; error?: string }> {
  try {
    if (config.apiType === 'http') {
      const client = new HttpSensorClient({
        url: config.apiUrl,
        apiKey: config.apiKey,
      });
      const reading = await client.getReading();
      return { success: true, data: reading };
    } else if (config.apiType === 'mqtt') {
      const client = new MqttSensorClient({
        url: config.apiUrl,
        topic: config.mqttTopic || '',
        username: undefined,
        password: undefined,
      });
      const reading = await client.getReading();
      return { success: true, data: reading };
    } else {
      return { success: false, error: 'Unsupported API type' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Obtiene una lectura de sensor, usando API real si está configurada,
 * o fallback al simulador si no está disponible
 */
export async function getSensorReading(
  sensor: IotSensor,
  simulatorFallback: () => SensorReading
): Promise<SensorReading> {
  const client = createSensorClient(sensor);

  // Si no hay cliente configurado, usar simulador
  if (!client) {
    return simulatorFallback();
  }

  try {
    // Intentar obtener lectura desde API real
    const reading = await client.getReading();
    return reading;
  } catch (error) {
    console.error(`Error getting reading from API for sensor ${sensor.id}, falling back to simulator:`, error);
    // Fallback al simulador si la API falla
    return simulatorFallback();
  }
}

/**
 * Obtiene lecturas históricas de sensor, usando API real si está configurada,
 * o fallback al simulador si no está disponible
 */
export async function getHistoricalSensorReadings(
  sensor: IotSensor,
  startTime: number,
  endTime: number,
  simulatorFallback: () => SensorReading[]
): Promise<SensorReading[]> {
  const client = createSensorClient(sensor);

  // Si no hay cliente configurado, usar simulador
  if (!client) {
    return simulatorFallback();
  }

  try {
    // Intentar obtener lecturas desde API real
    const readings = await client.getHistoricalReadings(startTime, endTime);
    return readings;
  } catch (error) {
    console.error(`Error getting historical readings from API for sensor ${sensor.id}, falling back to simulator:`, error);
    // Fallback al simulador si la API falla
    return simulatorFallback();
  }
}
