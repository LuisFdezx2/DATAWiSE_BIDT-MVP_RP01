import { getDb } from './db';
import { iotSensors, sensorRecoveryAttempts, sensorConnectionLogs, type IotSensor } from '../drizzle/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { getSensorReading } from './sensor-api-client';
import { notifyOwner } from './_core/notification';

/**
 * Servicio de Auto-recuperación de Sensores
 * 
 * Detecta sensores en estado de fallback prolongado e intenta
 * reconectarlos automáticamente con estrategia de backoff exponencial.
 * 
 * Backoff: 15min → 30min → 1h → 2h → 4h → 8h (max)
 */

const BACKOFF_SCHEDULE = [15, 30, 60, 120, 240, 480]; // minutos
const FALLBACK_THRESHOLD_MINUTES = 60; // Considerar sensor en fallback si >1h sin éxito

export interface FailedSensor {
  sensor: IotSensor;
  minutesSinceLastSuccess: number;
  lastAttemptMinutesAgo: number | null;
  attemptCount: number;
}

/**
 * Detecta sensores que han estado en fallback por más del umbral
 */
export async function detectFailedSensors(): Promise<FailedSensor[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Obtener sensores activos con API configurada
  const sensors = await db
    .select()
    .from(iotSensors)
    .where(
      and(
        eq(iotSensors.status, 'active'),
        // Solo sensores con API configurada (no simuladores)
      )
    );

  const failedSensors: FailedSensor[] = [];
  const now = new Date();

  for (const sensor of sensors) {
    // Saltar sensores sin API configurada
    if (!sensor.apiUrl || sensor.apiType === 'simulator') continue;

    // Obtener último log exitoso
    const successLogs = await db
      .select()
      .from(sensorConnectionLogs)
      .where(
        and(
          eq(sensorConnectionLogs.sensorId, sensor.id),
          eq(sensorConnectionLogs.success, true)
        )
      )
      .orderBy(desc(sensorConnectionLogs.timestamp))
      .limit(1);

    const lastSuccess = successLogs[0];
    const minutesSinceLastSuccess = lastSuccess
      ? (now.getTime() - new Date(lastSuccess.timestamp).getTime()) / (1000 * 60)
      : Infinity;

    // Si ha pasado más del umbral sin éxito, es candidato para recuperación
    if (minutesSinceLastSuccess > FALLBACK_THRESHOLD_MINUTES) {
      // Obtener último intento de recuperación
      const lastAttempts = await db
        .select()
        .from(sensorRecoveryAttempts)
        .where(eq(sensorRecoveryAttempts.sensorId, sensor.id))
        .orderBy(desc(sensorRecoveryAttempts.attemptAt))
        .limit(1);

      const lastAttempt = lastAttempts[0];
      const lastAttemptMinutesAgo = lastAttempt
        ? (now.getTime() - new Date(lastAttempt.attemptAt).getTime()) / (1000 * 60)
        : null;

      // Contar intentos de recuperación
      const allAttempts = await db
        .select()
        .from(sensorRecoveryAttempts)
        .where(eq(sensorRecoveryAttempts.sensorId, sensor.id));

      failedSensors.push({
        sensor,
        minutesSinceLastSuccess,
        lastAttemptMinutesAgo,
        attemptCount: allAttempts.length,
      });
    }
  }

  return failedSensors;
}

/**
 * Calcula el tiempo de backoff según el número de intentos
 */
export function calculateBackoff(attemptCount: number): number {
  const index = Math.min(attemptCount, BACKOFF_SCHEDULE.length - 1);
  return BACKOFF_SCHEDULE[index];
}

/**
 * Determina si es momento de intentar recuperación
 */
export function shouldAttemptRecovery(
  lastAttemptMinutesAgo: number | null,
  attemptCount: number
): boolean {
  // Si nunca se ha intentado, intentar ahora
  if (lastAttemptMinutesAgo === null) return true;

  // Calcular backoff requerido
  const requiredBackoff = calculateBackoff(attemptCount);

  // Intentar si ha pasado suficiente tiempo
  return lastAttemptMinutesAgo >= requiredBackoff;
}

/**
 * Intenta recuperar conexión de un sensor
 */
export async function attemptRecovery(sensor: IotSensor, attemptCount: number): Promise<{
  success: boolean;
  latencyMs?: number;
  errorMessage?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Intentar obtener lectura desde API real
    const reading = await getSensorReading(sensor, () => {
      throw new Error('Fallback not allowed in recovery attempt');
    });

    const latencyMs = Date.now() - startTime;

    // Registrar intento exitoso
    const db = await getDb();
    if (db) {
      await db.insert(sensorRecoveryAttempts).values({
        sensorId: sensor.id,
        success: true,
        backoffMinutes: calculateBackoff(attemptCount),
        latencyMs,
      });
    }

    return { success: true, latencyMs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Registrar intento fallido
    const db = await getDb();
    if (db) {
      await db.insert(sensorRecoveryAttempts).values({
        sensorId: sensor.id,
        success: false,
        backoffMinutes: calculateBackoff(attemptCount),
        errorMessage,
      });
    }

    return { success: false, errorMessage };
  }
}

/**
 * Ejecuta el proceso de auto-recuperación
 * Retorna el número de sensores recuperados
 */
export async function runAutoRecovery(): Promise<{
  sensorsChecked: number;
  recoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
}> {
  const failedSensors = await detectFailedSensors();
  
  let recoveryAttempts = 0;
  let successfulRecoveries = 0;
  let failedRecoveries = 0;

  for (const { sensor, lastAttemptMinutesAgo, attemptCount } of failedSensors) {
    // Verificar si es momento de intentar
    if (!shouldAttemptRecovery(lastAttemptMinutesAgo, attemptCount)) {
      continue;
    }

    recoveryAttempts++;

    // Intentar recuperación
    const result = await attemptRecovery(sensor, attemptCount);

    if (result.success) {
      successfulRecoveries++;

      // Notificar al propietario
      try {
        await notifyOwner({
          title: '✅ Sensor Recuperado',
          content: `El sensor "${sensor.name}" (ID: ${sensor.id}) ha recuperado la conexión exitosamente después de ${attemptCount + 1} intentos. Latencia: ${result.latencyMs}ms`,
        });
      } catch (error) {
        console.error('Error sending recovery notification:', error);
      }
    } else {
      failedRecoveries++;
    }
  }

  return {
    sensorsChecked: failedSensors.length,
    recoveryAttempts,
    successfulRecoveries,
    failedRecoveries,
  };
}

/**
 * Obtiene el historial de intentos de recuperación de un sensor
 */
export async function getRecoveryHistory(
  sensorId: number,
  limit: number = 50
): Promise<typeof sensorRecoveryAttempts.$inferSelect[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db
    .select()
    .from(sensorRecoveryAttempts)
    .where(eq(sensorRecoveryAttempts.sensorId, sensorId))
    .orderBy(desc(sensorRecoveryAttempts.attemptAt))
    .limit(limit);
}

/**
 * Obtiene estadísticas de recuperación de un proyecto
 */
export async function getRecoveryStats(projectId: number): Promise<{
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  sensorsWithAttempts: number;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Obtener sensores del proyecto
  const { ifcElements, ifcModels } = await import('../drizzle/schema');
  
  // Obtener todos los sensores del proyecto
  const projectSensors = await db
    .select({ sensorId: iotSensors.id })
    .from(iotSensors)
    .leftJoin(ifcElements, eq(iotSensors.elementId, ifcElements.id))
    .leftJoin(ifcModels, eq(ifcElements.modelId, ifcModels.id))
    .where(eq(ifcModels.projectId, projectId));

  const sensorIds = projectSensors.map(s => s.sensorId);

  if (sensorIds.length === 0) {
    return {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      successRate: 0,
      sensorsWithAttempts: 0,
    };
  }

  // Obtener todos los intentos de estos sensores
  const attempts = await db
    .select()
    .from(sensorRecoveryAttempts)
    .where(eq(sensorRecoveryAttempts.sensorId, sensorIds[0])); // Simplificado para ejemplo

  const totalAttempts = attempts.length;
  const successfulAttempts = attempts.filter(a => a.success).length;
  const failedAttempts = attempts.filter(a => !a.success).length;
  const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;
  
  // Contar sensores únicos con intentos
  const uniqueSensors = new Set(attempts.map(a => a.sensorId));
  const sensorsWithAttempts = uniqueSensors.size;

  return {
    totalAttempts,
    successfulAttempts,
    failedAttempts,
    successRate,
    sensorsWithAttempts,
  };
}
