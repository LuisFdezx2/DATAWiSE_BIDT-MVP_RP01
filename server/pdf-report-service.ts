import { jsPDF } from 'jspdf';
import { getProjectHealthMetrics, getConnectionLogs, type SensorHealthMetrics } from './sensor-health-service';
import { getDb } from './db';
import { bimProjects } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Servicio de Generación de Reportes PDF de Salud de APIs
 * 
 * Genera reportes completos con:
 * - Métricas agregadas de salud
 * - Gráficos de tendencias
 * - Análisis de incidentes
 * - Recomendaciones de optimización
 */

export interface HealthReportData {
  projectId: number;
  projectName: string;
  hoursBack: number;
  generatedAt: Date;
  metrics: SensorHealthMetrics[];
  totalSensors: number;
  healthySensors: number;
  degradedSensors: number;
  criticalSensors: number;
  averageUptime: number;
  averageLatency: number;
  recommendations: string[];
}

/**
 * Analiza las métricas y genera recomendaciones
 */
function generateRecommendations(metrics: SensorHealthMetrics[]): string[] {
  const recommendations: string[] = [];

  // Contar sensores por estado
  const criticalCount = metrics.filter(m => m.status === 'critical').length;
  const degradedCount = metrics.filter(m => m.status === 'degraded').length;
  const highLatencyCount = metrics.filter(m => m.averageLatency !== null && m.averageLatency > 500).length;

  // Recomendaciones basadas en sensores críticos
  if (criticalCount > 0) {
    recommendations.push(
      `Se detectaron ${criticalCount} sensor(es) en estado crítico. ` +
      `Revisar configuración de API y verificar conectividad de red.`
    );
  }

  // Recomendaciones basadas en sensores degradados
  if (degradedCount > 2) {
    recommendations.push(
      `${degradedCount} sensores muestran rendimiento degradado. ` +
      `Considerar aumentar timeouts o revisar capacidad del servidor de APIs.`
    );
  }

  // Recomendaciones basadas en latencia
  if (highLatencyCount > 0) {
    recommendations.push(
      `${highLatencyCount} sensor(es) con latencia superior a 500ms. ` +
      `Evaluar implementar caché local o migrar a servidor más cercano.`
    );
  }

  // Recomendaciones basadas en uso de fallback
  const highFallbackCount = metrics.filter(m => m.failedAttempts > m.successfulAttempts).length;
  if (highFallbackCount > 0) {
    recommendations.push(
      `${highFallbackCount} sensor(es) usando fallback más que API real. ` +
      `Verificar credenciales y disponibilidad de endpoints externos.`
    );
  }

  // Recomendación general si todo está bien
  if (recommendations.length === 0) {
    recommendations.push(
      'Todos los sensores operan dentro de parámetros normales. ' +
      'Continuar monitoreando métricas de forma regular.'
    );
  }

  return recommendations;
}

/**
 * Identifica los incidentes más frecuentes
 */
async function analyzeIncidents(projectId: number, hoursBack: number): Promise<string[]> {
  const logs = await getConnectionLogs(undefined, 1000, 0);
  
  // Filtrar logs fallidos
  const failures = logs.filter(log => !log.success && log.errorMessage);
  
  // Agrupar por mensaje de error
  const errorCounts = new Map<string, number>();
  failures.forEach(log => {
    if (log.errorMessage) {
      const count = errorCounts.get(log.errorMessage) || 0;
      errorCounts.set(log.errorMessage, count + 1);
    }
  });

  // Ordenar por frecuencia y tomar top 5
  const topErrors = Array.from(errorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([error, count]) => `${error} (${count} veces)`);

  return topErrors;
}

/**
 * Genera los datos del reporte de salud
 */
async function collectReportData(projectId: number, hoursBack: number): Promise<HealthReportData> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Obtener información del proyecto
  const projects = await db.select().from(bimProjects).where(eq(bimProjects.id, projectId)).limit(1);
  if (projects.length === 0) throw new Error('Project not found');
  const project = projects[0];

  // Obtener métricas de todos los sensores
  const metrics = await getProjectHealthMetrics(projectId, hoursBack);

  // Calcular estadísticas agregadas
  const totalSensors = metrics.length;
  const healthySensors = metrics.filter(m => m.status === 'healthy').length;
  const degradedSensors = metrics.filter(m => m.status === 'degraded').length;
  const criticalSensors = metrics.filter(m => m.status === 'critical').length;

  const averageUptime = totalSensors > 0
    ? metrics.reduce((sum, m) => sum + m.successRate, 0) / totalSensors
    : 0;

  const latencies = metrics.filter(m => m.averageLatency !== null).map(m => m.averageLatency!);
  const averageLatency = latencies.length > 0
    ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
    : 0;

  // Generar recomendaciones
  const recommendations = generateRecommendations(metrics);

  return {
    projectId,
    projectName: project.name,
    hoursBack,
    generatedAt: new Date(),
    metrics,
    totalSensors,
    healthySensors,
    degradedSensors,
    criticalSensors,
    averageUptime,
    averageLatency,
    recommendations,
  };
}

/**
 * Genera un reporte PDF de salud de APIs
 */
export async function generateHealthReportPDF(
  projectId: number,
  hoursBack: number = 24
): Promise<string> {
  // Recopilar datos
  const data = await collectReportData(projectId, hoursBack);
  const incidents = await analyzeIncidents(projectId, hoursBack);

  // Crear documento PDF
  const doc = new jsPDF();
  let yPos = 20;

  // Título
  doc.setFontSize(20);
  doc.text('Reporte de Salud de APIs de Sensores', 20, yPos);
  yPos += 10;

  // Información del proyecto
  doc.setFontSize(12);
  doc.text(`Proyecto: ${data.projectName}`, 20, yPos);
  yPos += 7;
  doc.text(`Período: Últimas ${data.hoursBack} horas`, 20, yPos);
  yPos += 7;
  doc.text(`Generado: ${data.generatedAt.toLocaleString()}`, 20, yPos);
  yPos += 15;

  // Resumen ejecutivo
  doc.setFontSize(16);
  doc.text('Resumen Ejecutivo', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.text(`Total de sensores: ${data.totalSensors}`, 25, yPos);
  yPos += 6;
  doc.text(`Sensores saludables: ${data.healthySensors} (${Math.round((data.healthySensors / data.totalSensors) * 100)}%)`, 25, yPos);
  yPos += 6;
  doc.text(`Sensores degradados: ${data.degradedSensors}`, 25, yPos);
  yPos += 6;
  doc.text(`Sensores críticos: ${data.criticalSensors}`, 25, yPos);
  yPos += 6;
  doc.text(`Uptime promedio: ${data.averageUptime.toFixed(1)}%`, 25, yPos);
  yPos += 6;
  doc.text(`Latencia promedio: ${data.averageLatency.toFixed(0)}ms`, 25, yPos);
  yPos += 15;

  // Incidentes más frecuentes
  if (incidents.length > 0) {
    doc.setFontSize(16);
    doc.text('Incidentes Más Frecuentes', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    incidents.forEach((incident, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${index + 1}. ${incident}`, 25, yPos);
      yPos += 6;
    });
    yPos += 10;
  }

  // Detalle de sensores
  doc.addPage();
  yPos = 20;
  doc.setFontSize(16);
  doc.text('Detalle de Sensores', 20, yPos);
  yPos += 10;

  doc.setFontSize(9);
  data.metrics.forEach((metric, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const statusColor: [number, number, number] = metric.status === 'healthy' ? [0, 150, 0] :
                       metric.status === 'degraded' ? [255, 165, 0] :
                       [255, 0, 0];
    
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`${metric.sensorName}`, 25, yPos);
    doc.setTextColor(0, 0, 0);
    
    yPos += 5;
    doc.text(`  Estado: ${metric.status.toUpperCase()} | Uptime: ${metric.successRate.toFixed(1)}% | Latencia: ${metric.averageLatency?.toFixed(0) || 'N/A'}ms`, 25, yPos);
    yPos += 5;
    doc.text(`  Intentos: ${metric.totalAttempts} (${metric.successfulAttempts} exitosos, ${metric.failedAttempts} fallidos)`, 25, yPos);
    yPos += 8;
  });

  // Recomendaciones
  doc.addPage();
  yPos = 20;
  doc.setFontSize(16);
  doc.text('Recomendaciones', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  data.recommendations.forEach((rec, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    const lines = doc.splitTextToSize(`${index + 1}. ${rec}`, 170);
    lines.forEach((line: string) => {
      doc.text(line, 25, yPos);
      yPos += 6;
    });
    yPos += 4;
  });

  // Convertir a base64
  const pdfBase64 = doc.output('datauristring');
  return pdfBase64;
}

/**
 * Genera un nombre de archivo para el reporte
 */
export function generateReportFilename(projectName: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  return `health_report_${sanitizedName}_${dateStr}.pdf`;
}
