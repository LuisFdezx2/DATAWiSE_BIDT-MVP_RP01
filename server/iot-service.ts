import { getDb } from './db';
import { iotSensors, sensorReadings, type IotSensor, type InsertIotSensor } from '../drizzle/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { getSensorReading, getHistoricalSensorReadings, type SensorReading as ApiSensorReading } from './sensor-api-client';

/**
 * Servicio de simulación de datos de sensores IoT
 * Genera valores realistas para diferentes tipos de sensores
 */

export interface SensorData {
  sensorId: number;
  value: number;
  timestamp: Date;
  status: 'normal' | 'warning' | 'alert';
}

/**
 * Genera un valor simulado para un sensor según su tipo
 */
export function generateSensorValue(sensorType: string, baseValue?: number): number {
  const noise = (Math.random() - 0.5) * 2; // Ruido entre -1 y 1

  switch (sensorType) {
    case 'temperature':
      // Temperatura entre 18-26°C con variación
      return Math.round((baseValue || 22) + noise * 3);
    
    case 'humidity':
      // Humedad entre 30-70% con variación
      return Math.round((baseValue || 50) + noise * 10);
    
    case 'energy':
      // Consumo energético entre 0-100 kWh con variación
      return Math.round((baseValue || 50) + noise * 20);
    
    case 'occupancy':
      // Ocupación 0 o 1 (binario)
      return Math.random() > 0.5 ? 1 : 0;
    
    case 'co2':
      // CO2 entre 400-1200 ppm con variación
      return Math.round((baseValue || 800) + noise * 200);
    
    case 'light':
      // Iluminación entre 0-1000 lux con variación
      return Math.round((baseValue || 500) + noise * 200);
    
    default:
      return Math.round((baseValue || 50) + noise * 10);
  }
}

/**
 * Evalúa si un valor está dentro de los umbrales del sensor
 */
export function evaluateSensorStatus(
  value: number,
  minThreshold: number | null,
  maxThreshold: number | null
): 'normal' | 'warning' | 'alert' {
  if (minThreshold !== null && value < minThreshold) {
    return 'alert';
  }
  if (maxThreshold !== null && value > maxThreshold) {
    return 'alert';
  }
  
  // Warning si está cerca de los umbrales (10% de margen)
  if (minThreshold !== null && value < minThreshold * 1.1) {
    return 'warning';
  }
  if (maxThreshold !== null && value > maxThreshold * 0.9) {
    return 'warning';
  }
  
  return 'normal';
}

/**
 * Obtiene las últimas lecturas de un sensor
 */
export async function getLatestReadings(sensorId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return await db
    .select()
    .from(sensorReadings)
    .where(eq(sensorReadings.sensorId, sensorId))
    .orderBy(desc(sensorReadings.timestamp))
    .limit(limit);
}

/**
 * Obtiene lecturas de un sensor en un rango de tiempo
 */
export async function getReadingsInRange(
  sensorId: number,
  startTime: Date,
  endTime?: Date
) {
  const conditions = [
    eq(sensorReadings.sensorId, sensorId),
    gte(sensorReadings.timestamp, startTime),
  ];

  if (endTime) {
    conditions.push(lte(sensorReadings.timestamp, endTime));
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return await db
    .select()
    .from(sensorReadings)
    .where(and(...conditions))
    .orderBy(desc(sensorReadings.timestamp));
}

/**
 * Registra una nueva lectura de sensor
 */
export async function recordReading(sensorId: number, value: number, metadata?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return await db.insert(sensorReadings).values({
    sensorId,
    value,
    timestamp: new Date(),
    metadata,
  });
}

/**
 * Obtiene una lectura de un sensor, usando API real si está configurada
 * o simulador como fallback
 */
export async function getSensorData(sensor: IotSensor): Promise<SensorData> {
  const startTime = Date.now();
  let usedFallback = false;
  let errorMessage: string | undefined;

  // Función de fallback que genera valor simulado
  const simulatorFallback = (): ApiSensorReading => {
    usedFallback = true;
    const value = generateSensorValue(sensor.sensorType);
    const status = evaluateSensorStatus(value, sensor.minThreshold, sensor.maxThreshold);
    
    return {
      value,
      timestamp: Date.now(),
      unit: sensor.unit,
      status,
    };
  };

  try {
    // Intentar obtener lectura desde API real
    const reading = await getSensorReading(sensor, simulatorFallback);
    const latency = Date.now() - startTime;

    // Registrar intento de conexión (solo si tiene API configurada)
    if (sensor.apiUrl && sensor.apiType !== 'simulator') {
      const { logConnection } = await import('./sensor-health-service');
      await logConnection({
        sensorId: sensor.id,
        success: !usedFallback,
        latencyMs: !usedFallback ? latency : undefined,
        errorMessage: usedFallback ? 'Fallback to simulator' : undefined,
        source: usedFallback ? 'fallback' : 'api',
      });

      // Verificar alertas en background (no bloqueamos la respuesta)
      if (sensor.elementId) {
        const { ifcElements, ifcModels } = await import('../drizzle/schema');
        const db = await getDb();
        if (db) {
          const element = await db.select().from(ifcElements).where(eq(ifcElements.id, sensor.elementId)).limit(1);
          if (element.length > 0) {
            const model = await db.select().from(ifcModels).where(eq(ifcModels.id, element[0].modelId)).limit(1);
            if (model.length > 0) {
              const projectId = model[0].projectId;
              // Ejecutar en background sin esperar
              import('./alert-service').then(({ checkSensorHealth }) => {
                checkSensorHealth(sensor.id, projectId).catch(err => {
                  console.error('Error checking sensor alerts:', err);
                });
              });
            }
          }
        }
      }
    }

    // Registrar lectura en BD
    await recordReading(sensor.id, reading.value);

    return {
      sensorId: sensor.id,
      value: reading.value,
      timestamp: new Date(reading.timestamp),
      status: reading.status,
    };
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Registrar fallo de conexión
    if (sensor.apiUrl && sensor.apiType !== 'simulator') {
      const { logConnection } = await import('./sensor-health-service');
      await logConnection({
        sensorId: sensor.id,
        success: false,
        errorMessage,
        source: 'fallback',
      });
    }

    // Usar fallback en caso de error
    const fallbackReading = simulatorFallback();
    await recordReading(sensor.id, fallbackReading.value);

    return {
      sensorId: sensor.id,
      value: fallbackReading.value,
      timestamp: new Date(fallbackReading.timestamp),
      status: fallbackReading.status,
    };
  }
}

/**
 * Simula lecturas para todos los sensores activos
 * Ahora intenta usar API real si está configurada
 */
export async function simulateAllSensors(): Promise<SensorData[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const sensors = await db
    .select()
    .from(iotSensors)
    .where(eq(iotSensors.status, 'active'));

  const results: SensorData[] = [];

  // Usar getSensorData que intenta API real y hace fallback a simulador
  for (const sensor of sensors) {
    try {
      const data = await getSensorData(sensor);
      results.push(data);
    } catch (error) {
      console.error(`Error getting data for sensor ${sensor.id}:`, error);
      // Continuar con el siguiente sensor si uno falla
    }
  }

  return results;
}
