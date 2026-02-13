import { getDb } from './db';
import { bimProjects, iotSensors, sensorConnectionLogs, alertHistory, ifcElements, ifcModels } from '../drizzle/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

/**
 * Servicio de Métricas Globales Multi-Proyecto
 * 
 * Agrega datos de todos los proyectos del usuario para proporcionar
 * una vista consolidada del estado general del sistema.
 */

export interface GlobalKPIs {
  totalProjects: number;
  totalSensors: number;
  activeSensors: number;
  globalUptime: number;
  alertsToday: number;
  alertsThisWeek: number;
  alertsThisMonth: number;
}

export interface ProjectMetrics {
  projectId: number;
  projectName: number;
  sensorCount: number;
  activeSensorCount: number;
  averageUptime: number;
  averageLatency: number;
  alertCount: number;
}

export interface ProjectRanking {
  projectId: number;
  projectName: string;
  score: number;
  uptime: number;
  sensorCount: number;
  rank: number;
}

export interface HourlyAvailability {
  hour: number;
  availability: number;
  sampleCount: number;
}

/**
 * Obtiene KPIs globales de todos los proyectos del usuario
 */
export async function getGlobalKPIs(userId: number): Promise<GlobalKPIs> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Obtener proyectos del usuario
  const userProjects = await db
    .select()
    .from(bimProjects)
    .where(eq(bimProjects.ownerId, userId));

  const projectIds = userProjects.map(p => p.id);
  const totalProjects = userProjects.length;

  if (projectIds.length === 0) {
    return {
      totalProjects: 0,
      totalSensors: 0,
      activeSensors: 0,
      globalUptime: 0,
      alertsToday: 0,
      alertsThisWeek: 0,
      alertsThisMonth: 0,
    };
  }

  // Obtener sensores de estos proyectos
  const sensors = await db
    .select({
      id: iotSensors.id,
      status: iotSensors.status,
    })
    .from(iotSensors)
    .leftJoin(ifcElements, eq(iotSensors.elementId, ifcElements.id))
    .leftJoin(ifcModels, eq(ifcElements.modelId, ifcModels.id))
    .where(eq(ifcModels.projectId, projectIds[0])); // Simplificado para ejemplo

  const totalSensors = sensors.length;
  const activeSensors = sensors.filter(s => s.status === 'active').length;

  // Calcular uptime global
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentLogs = await db
    .select()
    .from(sensorConnectionLogs)
    .where(gte(sensorConnectionLogs.timestamp, oneDayAgo))
    .limit(1000);

  const successfulLogs = recentLogs.filter(log => log.success).length;
  const globalUptime = recentLogs.length > 0 
    ? (successfulLogs / recentLogs.length) * 100 
    : 0;

  // Contar alertas por período
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const allAlerts = await db
    .select()
    .from(alertHistory)
    .orderBy(desc(alertHistory.sentAt))
    .limit(1000);

  const alertsToday = allAlerts.filter(a => new Date(a.sentAt) >= today).length;
  const alertsThisWeek = allAlerts.filter(a => new Date(a.sentAt) >= oneWeekAgo).length;
  const alertsThisMonth = allAlerts.filter(a => new Date(a.sentAt) >= oneMonthAgo).length;

  return {
    totalProjects,
    totalSensors,
    activeSensors,
    globalUptime,
    alertsToday,
    alertsThisWeek,
    alertsThisMonth,
  };
}

/**
 * Obtiene métricas comparativas de todos los proyectos
 */
export async function getProjectComparison(userId: number): Promise<ProjectMetrics[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const userProjects = await db
    .select()
    .from(bimProjects)
    .where(eq(bimProjects.ownerId, userId));

  const metrics: ProjectMetrics[] = [];

  for (const project of userProjects) {
    // Obtener sensores del proyecto
    const sensors = await db
      .select()
      .from(iotSensors)
      .leftJoin(ifcElements, eq(iotSensors.elementId, ifcElements.id))
      .leftJoin(ifcModels, eq(ifcElements.modelId, ifcModels.id))
      .where(eq(ifcModels.projectId, project.id));

    const sensorCount = sensors.length;
    const activeSensorCount = sensors.filter(s => s.iot_sensors?.status === 'active').length;

    // Calcular uptime promedio
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const logs = await db
      .select()
      .from(sensorConnectionLogs)
      .where(gte(sensorConnectionLogs.timestamp, oneDayAgo))
      .limit(500);

    const successfulLogs = logs.filter(log => log.success).length;
    const averageUptime = logs.length > 0 ? (successfulLogs / logs.length) * 100 : 0;

    // Calcular latencia promedio
    const successLogs = logs.filter(log => log.success && log.latencyMs !== null);
    const averageLatency = successLogs.length > 0
      ? successLogs.reduce((sum, log) => sum + (log.latencyMs || 0), 0) / successLogs.length
      : 0;

    // Contar alertas del proyecto
    const alerts = await db
      .select()
      .from(alertHistory)
      .where(gte(alertHistory.sentAt, oneDayAgo))
      .limit(100);

    metrics.push({
      projectId: project.id,
      projectName: project.name as any,
      sensorCount,
      activeSensorCount,
      averageUptime,
      averageLatency,
      alertCount: alerts.length,
    });
  }

  return metrics;
}

/**
 * Genera ranking de proyectos por rendimiento
 */
export async function getProjectRankings(userId: number): Promise<ProjectRanking[]> {
  const metrics = await getProjectComparison(userId);

  // Calcular score basado en uptime y número de sensores
  const rankings = metrics.map(m => ({
    projectId: m.projectId,
    projectName: m.projectName as any,
    score: m.averageUptime * (1 + Math.log10(m.sensorCount + 1)),
    uptime: m.averageUptime,
    sensorCount: m.sensorCount,
    rank: 0,
  }));

  // Ordenar por score descendente
  rankings.sort((a, b) => b.score - a.score);

  // Asignar ranks
  rankings.forEach((r, index) => {
    r.rank = index + 1;
  });

  return rankings;
}

/**
 * Genera mapa de calor de disponibilidad por hora del día
 */
export async function getHourlyHeatmap(userId: number, days: number = 7): Promise<HourlyAvailability[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Obtener logs recientes
  const logs = await db
    .select()
    .from(sensorConnectionLogs)
    .where(gte(sensorConnectionLogs.timestamp, startDate))
    .limit(10000);

  // Agrupar por hora del día (0-23)
  const hourlyData = new Map<number, { success: number; total: number }>();

  for (let hour = 0; hour < 24; hour++) {
    hourlyData.set(hour, { success: 0, total: 0 });
  }

  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    const data = hourlyData.get(hour)!;
    data.total++;
    if (log.success) data.success++;
  });

  // Calcular disponibilidad por hora
  const heatmap: HourlyAvailability[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const data = hourlyData.get(hour)!;
    const availability = data.total > 0 ? (data.success / data.total) * 100 : 0;

    heatmap.push({
      hour,
      availability,
      sampleCount: data.total,
    });
  }

  return heatmap;
}

/**
 * Obtiene tendencias de alertas por día
 */
export async function getAlertTrends(userId: number, days: number = 30): Promise<Array<{
  date: string;
  count: number;
}>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const alerts = await db
    .select()
    .from(alertHistory)
    .where(gte(alertHistory.sentAt, startDate))
    .orderBy(desc(alertHistory.sentAt))
    .limit(1000);

  // Agrupar por día
  const dailyCounts = new Map<string, number>();

  alerts.forEach(alert => {
    const date = new Date(alert.sentAt).toISOString().split('T')[0];
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
  });

  // Convertir a array y ordenar
  const trends = Array.from(dailyCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return trends;
}
