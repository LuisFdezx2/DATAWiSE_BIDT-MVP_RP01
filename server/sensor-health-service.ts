import { getDb } from './db';
import { sensorConnectionLogs, iotSensors, type InsertSensorConnectionLog } from '../drizzle/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

/**
 * Servicio de Monitoreo de Salud de APIs de Sensores
 * 
 * Proporciona funciones para:
 * - Registrar intentos de conexión a APIs externas
 * - Calcular métricas de uptime, latencia y tasa de éxito
 * - Obtener logs de conexión con paginación
 * - Identificar sensores con problemas de conectividad
 */

/**
 * Registra un intento de conexión a API de sensor
 * 
 * @param sensorId - ID del sensor
 * @param success - Si la conexión fue exitosa
 * @param latencyMs - Latencia en milisegundos (opcional, solo si exitoso)
 * @param errorMessage - Mensaje de error (opcional, solo si fallido)
 * @param source - Fuente de datos ('api' o 'fallback')
 */
export async function logConnection(params: {
  sensorId: number;
  success: boolean;
  latencyMs?: number;
  errorMessage?: string;
  source: 'api' | 'fallback';
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const logEntry: InsertSensorConnectionLog = {
    sensorId: params.sensorId,
    success: params.success,
    latencyMs: params.latencyMs,
    errorMessage: params.errorMessage,
    source: params.source,
  };

  await db.insert(sensorConnectionLogs).values(logEntry);
}

/**
 * Métricas de salud de un sensor
 */
export interface SensorHealthMetrics {
  sensorId: number;
  sensorName: string;
  sensorType: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number; // Porcentaje (0-100)
  averageLatency: number | null; // Milisegundos
  uptime: number; // Porcentaje (0-100)
  lastSuccess: Date | null;
  lastFailure: Date | null;
  lastError: string | null;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
}

/**
 * Calcula métricas de salud para un sensor específico
 * 
 * @param sensorId - ID del sensor
 * @param hoursBack - Número de horas hacia atrás para calcular métricas (default: 24)
 * @returns Métricas de salud del sensor
 */
export async function getSensorHealthMetrics(
  sensorId: number,
  hoursBack: number = 24
): Promise<SensorHealthMetrics | null> {
  const db = await getDb();
  if (!db) return null;

  // Obtener información del sensor
  const sensor = await db
    .select()
    .from(iotSensors)
    .where(eq(iotSensors.id, sensorId))
    .limit(1);

  if (!sensor || sensor.length === 0) return null;

  // Calcular timestamp de inicio del período
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hoursBack);

  // Obtener logs del período
  const logs = await db
    .select()
    .from(sensorConnectionLogs)
    .where(
      and(
        eq(sensorConnectionLogs.sensorId, sensorId),
        gte(sensorConnectionLogs.timestamp, startTime)
      )
    )
    .orderBy(desc(sensorConnectionLogs.timestamp));

  if (logs.length === 0) {
    return {
      sensorId,
      sensorName: sensor[0].name,
      sensorType: sensor[0].sensorType,
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      successRate: 0,
      averageLatency: null,
      uptime: 0,
      lastSuccess: null,
      lastFailure: null,
      lastError: null,
      status: 'unknown',
    };
  }

  // Calcular métricas
  const totalAttempts = logs.length;
  const successfulAttempts = logs.filter(l => l.success).length;
  const failedAttempts = totalAttempts - successfulAttempts;
  const successRate = (successfulAttempts / totalAttempts) * 100;

  // Calcular latencia promedio (solo de intentos exitosos)
  const successfulLogs = logs.filter(l => l.success && l.latencyMs !== null);
  const averageLatency = successfulLogs.length > 0
    ? successfulLogs.reduce((sum, l) => sum + (l.latencyMs || 0), 0) / successfulLogs.length
    : null;

  // Calcular uptime (porcentaje de tiempo con conexión exitosa)
  // Simplificado: porcentaje de intentos exitosos
  const uptime = successRate;

  // Encontrar último éxito y último fallo
  const lastSuccessLog = logs.find(l => l.success);
  const lastFailureLog = logs.find(l => !l.success);

  // Determinar estado de salud
  let status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  if (successRate >= 95) {
    status = 'healthy';
  } else if (successRate >= 70) {
    status = 'degraded';
  } else if (successRate > 0) {
    status = 'critical';
  } else {
    status = 'unknown';
  }

  return {
    sensorId,
    sensorName: sensor[0].name,
    sensorType: sensor[0].sensorType,
    totalAttempts,
    successfulAttempts,
    failedAttempts,
    successRate: Math.round(successRate * 100) / 100,
    averageLatency: averageLatency ? Math.round(averageLatency) : null,
    uptime: Math.round(uptime * 100) / 100,
    lastSuccess: lastSuccessLog?.timestamp || null,
    lastFailure: lastFailureLog?.timestamp || null,
    lastError: lastFailureLog?.errorMessage || null,
    status,
  };
}

/**
 * Obtiene métricas de salud para todos los sensores de un proyecto
 * 
 * @param projectId - ID del proyecto
 * @param hoursBack - Número de horas hacia atrás (default: 24)
 * @returns Array de métricas de salud por sensor
 */
export async function getProjectHealthMetrics(
  projectId: number,
  hoursBack: number = 24
): Promise<SensorHealthMetrics[]> {
  const db = await getDb();
  if (!db) return [];

  // Obtener todos los sensores del proyecto
  // (necesitamos navegar: proyecto -> modelos -> elementos -> sensores)
  const { ifcModels, ifcElements } = await import('../drizzle/schema');

  const models = await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.projectId, projectId));

  if (models.length === 0) return [];

  const allMetrics: SensorHealthMetrics[] = [];

  for (const model of models) {
    const elements = await db
      .select()
      .from(ifcElements)
      .where(eq(ifcElements.modelId, model.id));

    for (const element of elements) {
      const sensors = await db
        .select()
        .from(iotSensors)
        .where(eq(iotSensors.elementId, element.id));

      for (const sensor of sensors) {
        const metrics = await getSensorHealthMetrics(sensor.id, hoursBack);
        if (metrics) {
          allMetrics.push(metrics);
        }
      }
    }
  }

  return allMetrics;
}

/**
 * Obtiene logs de conexión con paginación
 * 
 * @param sensorId - ID del sensor (opcional, si no se provee retorna todos)
 * @param limit - Número máximo de logs a retornar
 * @param offset - Número de logs a saltar (para paginación)
 * @returns Array de logs de conexión
 */
export async function getConnectionLogs(
  sensorId?: number,
  limit: number = 100,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(sensorConnectionLogs)
    .orderBy(desc(sensorConnectionLogs.timestamp))
    .limit(limit)
    .offset(offset);

  if (sensorId !== undefined) {
    query = query.where(eq(sensorConnectionLogs.sensorId, sensorId)) as any;
  }

  return await query;
}

/**
 * Identifica sensores con problemas de conectividad
 * 
 * @param projectId - ID del proyecto
 * @param threshold - Umbral de tasa de éxito mínima (default: 70%)
 * @param hoursBack - Número de horas hacia atrás (default: 24)
 * @returns Array de sensores con problemas
 */
export async function getProblematicSensors(
  projectId: number,
  threshold: number = 70,
  hoursBack: number = 24
): Promise<SensorHealthMetrics[]> {
  const allMetrics = await getProjectHealthMetrics(projectId, hoursBack);
  
  return allMetrics.filter(m => 
    m.totalAttempts > 0 && m.successRate < threshold
  );
}

/**
 * Limpia logs antiguos de conexión
 * 
 * @param daysToKeep - Número de días de logs a mantener (default: 30)
 * @returns Número de logs eliminados
 */
export async function cleanOldLogs(daysToKeep: number = 30): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  await db
    .delete(sensorConnectionLogs)
    .where(sql`${sensorConnectionLogs.timestamp} < ${cutoffDate}`);
}
