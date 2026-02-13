/**
 * Real-Time Data Integration Service
 * Connects IoT sensor data to 3D elements for live visualization
 */

import { getDb } from './db';
import { iotSensors, sensorReadings } from '../drizzle/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

export interface SensorData {
  sensorId: number;
  elementId: string;
  type: 'temperature' | 'humidity' | 'occupancy' | 'energy' | 'co2' | 'light';
  value: number;
  unit: string;
  timestamp: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface LiveDataUpdate {
  elementId: string;
  sensorData: SensorData[];
  visualizationHint: {
    color?: string;
    opacity?: number;
    animation?: 'pulse' | 'glow' | 'none';
  };
}

/**
 * Get latest sensor readings for an IFC element
 */
export async function getElementLiveData(elementId: string): Promise<SensorData[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get all sensors for this element
    const elementSensors = await db
      .select()
      .from(iotSensors)
      .where(eq(iotSensors.elementId, parseInt(elementId)));

    if (elementSensors.length === 0) return [];

    // Get latest reading for each sensor
    const sensorData: SensorData[] = [];

    for (const sensor of elementSensors) {
      const [latestReading] = await db
        .select()
        .from(sensorReadings)
        .where(eq(sensorReadings.sensorId, sensor.id))
        .orderBy(desc(sensorReadings.timestamp))
        .limit(1);

      if (latestReading) {
        sensorData.push({
          sensorId: sensor.id,
          elementId,
          type: sensor.sensorType as any,
          value: latestReading.value,
          unit: sensor.unit || '',
          timestamp: new Date(latestReading.timestamp).getTime(),
          status: determineStatus(sensor.sensorType as any, latestReading.value),
        });
      }
    }

    return sensorData;
  } catch (error) {
    console.error('Error getting element live data:', error);
    return [];
  }
}

/**
 * Get live data for multiple elements
 */
export async function getBatchLiveData(elementIds: string[]): Promise<Map<string, SensorData[]>> {
  const result = new Map<string, SensorData[]>();

  await Promise.all(
    elementIds.map(async (elementId) => {
      const data = await getElementLiveData(elementId);
      if (data.length > 0) {
        result.set(elementId, data);
      }
    })
  );

  return result;
}

/**
 * Get recent sensor readings (last N minutes)
 */
export async function getRecentReadings(
  sensorId: number,
  minutes: number = 60
): Promise<Array<{ timestamp: number; value: number }>> {
  const db = await getDb();
  if (!db) return [];

  try {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    const readings = await db
      .select()
      .from(sensorReadings)
      .where(
        and(
          eq(sensorReadings.sensorId, sensorId),
          gte(sensorReadings.timestamp, cutoffTime)
        )
      )
      .orderBy(desc(sensorReadings.timestamp))
      .limit(1000);

    return readings.map(r => ({
      timestamp: new Date(r.timestamp).getTime(),
      value: r.value,
    }));
  } catch (error) {
    console.error('Error getting recent readings:', error);
    return [];
  }
}

/**
 * Determine status based on sensor type and value
 */
function determineStatus(
  type: 'temperature' | 'humidity' | 'occupancy' | 'energy' | 'co2' | 'light',
  value: number
): 'normal' | 'warning' | 'critical' {
  const thresholds = {
    temperature: { warning: 25, critical: 30 },
    humidity: { warning: 60, critical: 70 },
    occupancy: { warning: 80, critical: 95 },
    energy: { warning: 1000, critical: 1500 },
    co2: { warning: 800, critical: 1200 },
    light: { warning: 100, critical: 50 },
  };

  const threshold = thresholds[type];
  if (!threshold) return 'normal';

  if (value >= threshold.critical) return 'critical';
  if (value >= threshold.warning) return 'warning';
  return 'normal';
}

/**
 * Get visualization hint based on sensor data
 */
export function getVisualizationHint(sensorData: SensorData[]): {
  color?: string;
  opacity?: number;
  animation?: 'pulse' | 'glow' | 'none';
} {
  // Find highest priority status
  const hasCritical = sensorData.some(s => s.status === 'critical');
  const hasWarning = sensorData.some(s => s.status === 'warning');

  if (hasCritical) {
    return {
      color: '#ef4444', // red
      opacity: 0.8,
      animation: 'pulse',
    };
  }

  if (hasWarning) {
    return {
      color: '#f59e0b', // amber
      opacity: 0.6,
      animation: 'glow',
    };
  }

  return {
    color: '#10b981', // green
    opacity: 0.4,
    animation: 'none',
  };
}

/**
 * Create live data update for an element
 */
export async function createLiveDataUpdate(elementId: string): Promise<LiveDataUpdate | null> {
  const sensorData = await getElementLiveData(elementId);
  
  if (sensorData.length === 0) return null;

  return {
    elementId,
    sensorData,
    visualizationHint: getVisualizationHint(sensorData),
  };
}

/**
 * Simulate real-time sensor data (for demo purposes)
 */
export function generateMockSensorData(
  elementId: string,
  type: 'temperature' | 'humidity' | 'occupancy' | 'energy' | 'co2' | 'light'
): SensorData {
  const baseValues = {
    temperature: 22,
    humidity: 45,
    occupancy: 50,
    energy: 500,
    co2: 400,
    light: 300,
  };

  const units = {
    temperature: '°C',
    humidity: '%',
    occupancy: '%',
    energy: 'W',
    co2: 'ppm',
    light: 'lux',
  };

  const variation = (Math.random() - 0.5) * 10;
  const value = baseValues[type] + variation;

  return {
    sensorId: Math.floor(Math.random() * 1000),
    elementId,
    type,
    value,
    unit: units[type],
    timestamp: Date.now(),
    status: determineStatus(type, value),
  };
}

/**
 * Stream mock data for testing (simulates WebSocket updates)
 */
export class MockDataStream {
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: Map<string, (data: LiveDataUpdate) => void> = new Map();

  /**
   * Subscribe to live data updates for an element
   */
  subscribe(elementId: string, callback: (data: LiveDataUpdate) => void): void {
    this.subscribers.set(elementId, callback);
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(elementId: string): void {
    this.subscribers.delete(elementId);
  }

  /**
   * Start streaming mock data
   */
  start(intervalMs: number = 5000): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.subscribers.forEach((callback, elementId) => {
        const sensorTypes: Array<'temperature' | 'humidity' | 'occupancy' | 'energy' | 'co2' | 'light'> = [
          'temperature',
          'humidity',
          'occupancy',
        ];

        const sensorData = sensorTypes.map(type =>
          generateMockSensorData(elementId, type)
        );

        const update: LiveDataUpdate = {
          elementId,
          sensorData,
          visualizationHint: getVisualizationHint(sensorData),
        };

        callback(update);
      });
    }, intervalMs);
  }

  /**
   * Stop streaming
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Clear all subscribers
   */
  clear(): void {
    this.stop();
    this.subscribers.clear();
  }
}

// Export singleton instance for mock streaming
export const mockDataStream = new MockDataStream();
