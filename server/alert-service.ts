import { getDb } from './db';
import { alertConfigurations, alertHistory, iotSensors, type InsertAlertHistoryEntry } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSensorHealthMetrics, type SensorHealthMetrics } from './sensor-health-service';
import { notifyOwner } from './_core/notification';

/**
 * Servicio de Alertas y Webhooks para Sensores IoT
 * 
 * Proporciona funciones para:
 * - Evaluar salud de sensores contra configuraciones de alertas
 * - Enviar webhooks a URLs externas
 * - Notificar al propietario del proyecto
 * - Registrar historial de alertas enviadas
 */

export type AlertType = 'critical_sensor' | 'low_success_rate' | 'high_latency';

export interface AlertTrigger {
  sensorId: number;
  sensorName: string;
  alertType: AlertType;
  message: string;
  triggerValue: number;
  threshold: number;
}

/**
 * Evalúa la salud de un sensor contra las configuraciones de alertas
 * 
 * @param sensorId - ID del sensor
 * @param projectId - ID del proyecto
 * @returns Array de alertas activadas
 */
export async function checkSensorHealth(
  sensorId: number,
  projectId: number
): Promise<AlertTrigger[]> {
  const db = await getDb();
  if (!db) return [];

  // Obtener métricas de salud del sensor
  const metrics = await getSensorHealthMetrics(sensorId, 24);
  if (!metrics) return [];

  // Obtener configuraciones de alertas activas para el proyecto
  const configs = await db
    .select()
    .from(alertConfigurations)
    .where(
      and(
        eq(alertConfigurations.projectId, projectId),
        eq(alertConfigurations.enabled, true)
      )
    );

  const triggers: AlertTrigger[] = [];

  for (const config of configs) {
    let triggered = false;
    let triggerValue = 0;
    let message = '';

    switch (config.alertType) {
      case 'critical_sensor':
        // Alerta si el sensor está en estado crítico
        if (metrics.status === 'critical') {
          triggered = true;
          triggerValue = Math.round(metrics.successRate);
          message = `Sensor "${metrics.sensorName}" en estado CRÍTICO. Tasa de éxito: ${metrics.successRate}%`;
        }
        break;

      case 'low_success_rate':
        // Alerta si la tasa de éxito está por debajo del umbral
        if (metrics.successRate < config.threshold) {
          triggered = true;
          triggerValue = Math.round(metrics.successRate);
          message = `Sensor "${metrics.sensorName}" con baja tasa de éxito: ${metrics.successRate}% (umbral: ${config.threshold}%)`;
        }
        break;

      case 'high_latency':
        // Alerta si la latencia promedio está por encima del umbral
        if (metrics.averageLatency !== null && metrics.averageLatency > config.threshold) {
          triggered = true;
          triggerValue = Math.round(metrics.averageLatency);
          message = `Sensor "${metrics.sensorName}" con alta latencia: ${metrics.averageLatency}ms (umbral: ${config.threshold}ms)`;
        }
        break;
    }

    if (triggered) {
      triggers.push({
        sensorId: metrics.sensorId,
        sensorName: metrics.sensorName,
        alertType: config.alertType,
        message,
        triggerValue,
        threshold: config.threshold,
      });

      // Registrar en historial
      await recordAlert({
        configId: config.id,
        sensorId: metrics.sensorId,
        alertType: config.alertType,
        message,
        triggerValue,
        threshold: config.threshold,
        webhookSent: false,
        ownerNotified: false,
      });

      // Enviar webhook si está configurado
      if (config.webhookUrl) {
        const webhookSent = await sendWebhook(config.webhookUrl, {
          alertType: config.alertType,
          sensorId: metrics.sensorId,
          sensorName: metrics.sensorName,
          message,
          triggerValue,
          threshold: config.threshold,
          timestamp: new Date().toISOString(),
        });

        if (webhookSent) {
          await updateAlertWebhookStatus(sensorId, config.id, true);
        }
      }

      // Notificar al propietario si está habilitado
      if (config.notifyOwner) {
        const ownerNotified = await notifyOwner({
          title: `Alerta de Sensor: ${config.name}`,
          content: message,
        });

        if (ownerNotified) {
          await updateAlertOwnerStatus(sensorId, config.id, true);
        }
      }
    }
  }

  return triggers;
}

/**
 * Envía un webhook a una URL externa
 * 
 * @param url - URL del webhook
 * @param payload - Datos a enviar
 * @returns true si el webhook se envió exitosamente
 */
export async function sendWebhook(url: string, payload: any): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BIM-Digital-Twin-Alert-System/1.0',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending webhook:', error);
    return false;
  }
}

/**
 * Registra una alerta en el historial
 * 
 * @param alert - Datos de la alerta
 */
async function recordAlert(alert: InsertAlertHistoryEntry): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(alertHistory).values(alert);
}

/**
 * Actualiza el estado de envío de webhook de una alerta
 * 
 * @param sensorId - ID del sensor
 * @param configId - ID de la configuración
 * @param sent - Si el webhook fue enviado
 */
async function updateAlertWebhookStatus(
  sensorId: number,
  configId: number,
  sent: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Actualizar la alerta más reciente
  const recentAlert = await db
    .select()
    .from(alertHistory)
    .where(
      and(
        eq(alertHistory.sensorId, sensorId),
        eq(alertHistory.configId, configId)
      )
    )
    .orderBy(alertHistory.sentAt)
    .limit(1);

  if (recentAlert.length > 0) {
    await db
      .update(alertHistory)
      .set({ webhookSent: sent })
      .where(eq(alertHistory.id, recentAlert[0].id));
  }
}

/**
 * Actualiza el estado de notificación al propietario de una alerta
 * 
 * @param sensorId - ID del sensor
 * @param configId - ID de la configuración
 * @param notified - Si el propietario fue notificado
 */
async function updateAlertOwnerStatus(
  sensorId: number,
  configId: number,
  notified: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Actualizar la alerta más reciente
  const recentAlert = await db
    .select()
    .from(alertHistory)
    .where(
      and(
        eq(alertHistory.sensorId, sensorId),
        eq(alertHistory.configId, configId)
      )
    )
    .orderBy(alertHistory.sentAt)
    .limit(1);

  if (recentAlert.length > 0) {
    await db
      .update(alertHistory)
      .set({ ownerNotified: notified })
      .where(eq(alertHistory.id, recentAlert[0].id));
  }
}

/**
 * Obtiene el historial de alertas de un proyecto
 * 
 * @param projectId - ID del proyecto
 * @param limit - Número máximo de alertas a retornar
 * @param offset - Número de alertas a saltar
 * @returns Array de alertas
 */
export async function getAlertHistory(
  projectId: number,
  limit: number = 100,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];

  // Obtener configuraciones del proyecto
  const configs = await db
    .select()
    .from(alertConfigurations)
    .where(eq(alertConfigurations.projectId, projectId));

  if (configs.length === 0) return [];

  const configIds = configs.map(c => c.id);

  // Obtener historial de alertas
  const alerts = await db
    .select()
    .from(alertHistory)
    .where(eq(alertHistory.configId, configIds[0])) // Simplificado para un solo config
    .orderBy(alertHistory.sentAt)
    .limit(limit)
    .offset(offset);

  return alerts;
}

/**
 * Obtiene las configuraciones de alertas de un proyecto
 * 
 * @param projectId - ID del proyecto
 * @returns Array de configuraciones
 */
export async function getAlertConfigurations(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(alertConfigurations)
    .where(eq(alertConfigurations.projectId, projectId));
}

/**
 * Crea una nueva configuración de alerta
 * 
 * @param config - Configuración de alerta
 * @returns ID de la configuración creada
 */
export async function createAlertConfiguration(config: {
  projectId: number;
  name: string;
  alertType: AlertType;
  threshold: number;
  webhookUrl?: string;
  notifyOwner?: boolean;
  enabled?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(alertConfigurations).values({
    ...config,
    notifyOwner: config.notifyOwner ?? true,
    enabled: config.enabled ?? true,
  });

  return Number((result as any).insertId);
}

/**
 * Actualiza una configuración de alerta
 * 
 * @param id - ID de la configuración
 * @param updates - Campos a actualizar
 */
export async function updateAlertConfiguration(
  id: number,
  updates: Partial<{
    name: string;
    threshold: number;
    webhookUrl: string;
    notifyOwner: boolean;
    enabled: boolean;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(alertConfigurations)
    .set(updates)
    .where(eq(alertConfigurations.id, id));
}

/**
 * Elimina una configuración de alerta
 * 
 * @param id - ID de la configuración
 */
export async function deleteAlertConfiguration(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(alertConfigurations)
    .where(eq(alertConfigurations.id, id));
}
