import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, Clock, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/**
 * Dashboard de Salud de APIs de Sensores
 * 
 * Muestra métricas de conectividad, uptime, latencia y alertas
 * para todas las APIs de sensores configuradas en un proyecto.
 * 
 * Características:
 * - Selector de proyecto
 * - Métricas agregadas (uptime promedio, latencia promedio)
 * - Gráfico de barras de tasa de éxito por sensor
 * - Gráfico de líneas de latencia por sensor
 * - Tabla de sensores con problemas
 * - Alertas visuales para sensores críticos
 * - Selector de período (24h, 7d, 30d)
 */

export function ApiHealthDashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [hoursBack, setHoursBack] = useState<number>(24);

  // Obtener lista de proyectos
  const { data: projects } = trpc.bimProjects.list.useQuery();

  // Obtener métricas de salud del proyecto seleccionado
  const { data: metrics, isLoading } = trpc.iot.getProjectHealthMetrics.useQuery(
    { projectId: selectedProjectId!, hoursBack },
    { enabled: selectedProjectId !== null, refetchInterval: 30000 } // Refetch cada 30s
  );

  // Obtener sensores con problemas
  const { data: problematicSensors } = trpc.iot.getProblematicSensors.useQuery(
    { projectId: selectedProjectId!, threshold: 70, hoursBack },
    { enabled: selectedProjectId !== null }
  );

  // Calcular métricas agregadas
  const aggregatedMetrics = metrics && metrics.length > 0 ? {
    averageUptime: metrics.reduce((sum, m) => sum + m.uptime, 0) / metrics.length,
    averageLatency: metrics
      .filter(m => m.averageLatency !== null)
      .reduce((sum, m) => sum + (m.averageLatency || 0), 0) / metrics.filter(m => m.averageLatency !== null).length,
    totalSensors: metrics.length,
    healthySensors: metrics.filter(m => m.status === 'healthy').length,
    degradedSensors: metrics.filter(m => m.status === 'degraded').length,
    criticalSensors: metrics.filter(m => m.status === 'critical').length,
    unknownSensors: metrics.filter(m => m.status === 'unknown').length,
  } : null;

  // Datos para gráfico de barras (tasa de éxito)
  const successRateData = metrics?.map(m => ({
    name: m.sensorName.length > 15 ? m.sensorName.substring(0, 15) + '...' : m.sensorName,
    successRate: m.successRate,
    status: m.status,
  })) || [];

  // Datos para gráfico de líneas (latencia)
  const latencyData = metrics
    ?.filter(m => m.averageLatency !== null)
    .map(m => ({
      name: m.sensorName.length > 15 ? m.sensorName.substring(0, 15) + '...' : m.sensorName,
      latency: m.averageLatency,
    })) || [];

  // Datos para gráfico de pie (distribución de estados)
  const statusDistribution = aggregatedMetrics ? [
    { name: 'Saludable', value: aggregatedMetrics.healthySensors, color: '#22c55e' },
    { name: 'Degradado', value: aggregatedMetrics.degradedSensors, color: '#eab308' },
    { name: 'Crítico', value: aggregatedMetrics.criticalSensors, color: '#ef4444' },
    { name: 'Desconocido', value: aggregatedMetrics.unknownSensors, color: '#94a3b8' },
  ].filter(s => s.value > 0) : [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      healthy: { variant: 'default', icon: CheckCircle2, label: 'Saludable' },
      degraded: { variant: 'secondary', icon: AlertTriangle, label: 'Degradado' },
      critical: { variant: 'destructive', icon: XCircle, label: 'Crítico' },
      unknown: { variant: 'outline', icon: Activity, label: 'Desconocido' },
    };

    const config = variants[status] || variants.unknown;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard de Salud de APIs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitoreo de conectividad y rendimiento de sensores IoT
          </p>
        </div>
        {selectedProjectId && (
          <ExportButton projectId={selectedProjectId} hoursBack={hoursBack} />
        )}
      </div>

      {/* Selectores */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Proyecto</label>
          <Select
            value={selectedProjectId?.toString() || ''}
            onValueChange={(value) => setSelectedProjectId(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <label className="text-sm font-medium mb-2 block">Período</label>
          <Select
            value={hoursBack.toString()}
            onValueChange={(value) => setHoursBack(Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">Últimas 24 horas</SelectItem>
              <SelectItem value="168">Últimos 7 días</SelectItem>
              <SelectItem value="720">Últimos 30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedProjectId ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Selecciona un proyecto para ver las métricas de salud de APIs
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#7fb069]" />
          </CardContent>
        </Card>
      ) : !metrics || metrics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No hay sensores con APIs configuradas en este proyecto
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Alertas de sensores problemáticos */}
          {problematicSensors && problematicSensors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sensores con Problemas Detectados</AlertTitle>
              <AlertDescription>
                {problematicSensors.length} sensor(es) tienen tasa de éxito menor al 70%.
                Revisa la tabla de sensores con problemas más abajo.
              </AlertDescription>
            </Alert>
          )}

          {/* Métricas Agregadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Uptime Promedio</CardDescription>
                <CardTitle className="text-3xl">
                  {aggregatedMetrics?.averageUptime.toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {aggregatedMetrics && aggregatedMetrics.averageUptime >= 95 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>Excelente</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-yellow-600" />
                      <span>Mejorable</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Latencia Promedio</CardDescription>
                <CardTitle className="text-3xl">
                  {aggregatedMetrics?.averageLatency 
                    ? `${aggregatedMetrics.averageLatency.toFixed(0)}ms`
                    : 'N/A'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Tiempo de respuesta</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Sensores Saludables</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  {aggregatedMetrics?.healthySensors}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  de {aggregatedMetrics?.totalSensors} totales
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Sensores Críticos</CardDescription>
                <CardTitle className="text-3xl text-red-600">
                  {aggregatedMetrics?.criticalSensors}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  requieren atención
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Tasa de Éxito */}
            <Card>
              <CardHeader>
                <CardTitle>Tasa de Éxito por Sensor</CardTitle>
                <CardDescription>Porcentaje de conexiones exitosas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={successRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="successRate" fill="#7fb069" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Latencia */}
            <Card>
              <CardHeader>
                <CardTitle>Latencia Promedio por Sensor</CardTitle>
                <CardDescription>Tiempo de respuesta en milisegundos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={latencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="latency" stroke="#7fb069" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Distribución de Estados */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Estados</CardTitle>
                <CardDescription>Sensores por estado de salud</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tabla de Sensores con Problemas */}
            <Card>
              <CardHeader>
                <CardTitle>Sensores con Problemas</CardTitle>
                <CardDescription>Tasa de éxito {'<'} 70%</CardDescription>
              </CardHeader>
              <CardContent>
                {problematicSensors && problematicSensors.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {problematicSensors.map((sensor) => (
                      <div key={sensor.sensorId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{sensor.sensorName}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {sensor.sensorType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-600">
                            {sensor.successRate.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {sensor.failedAttempts}/{sensor.totalAttempts} fallos
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No hay sensores con problemas
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Auto-recuperación de Sensores */}
          {selectedProjectId && <AutoRecoveryCard projectId={selectedProjectId} />}

          {/* Tabla Detallada de Todos los Sensores */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Todos los Sensores</CardTitle>
              <CardDescription>Métricas completas de conectividad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Sensor</th>
                      <th className="text-left py-3 px-4">Tipo</th>
                      <th className="text-left py-3 px-4">Estado</th>
                      <th className="text-right py-3 px-4">Uptime</th>
                      <th className="text-right py-3 px-4">Tasa Éxito</th>
                      <th className="text-right py-3 px-4">Latencia</th>
                      <th className="text-right py-3 px-4">Intentos</th>
                      <th className="text-left py-3 px-4">Último Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((sensor) => (
                      <tr key={sensor.sensorId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4 font-medium">{sensor.sensorName}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {sensor.sensorType}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(sensor.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {sensor.uptime.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          {sensor.successRate.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          {sensor.averageLatency ? `${sensor.averageLatency}ms` : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right text-sm">
                          <span className="text-green-600">{sensor.successfulAttempts}</span>
                          {' / '}
                          <span className="text-red-600">{sensor.failedAttempts}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {sensor.lastError || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * Componente de auto-recuperación de sensores
 */
function AutoRecoveryCard({ projectId }: { projectId: number }) {
  const { data: stats } = trpc.iot.getRecoveryStats.useQuery({ projectId });
  
  const runRecovery = trpc.iot.runAutoRecovery.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Auto-recuperación completada: ${data.successfulRecoveries} sensor(es) recuperado(s), ` +
        `${data.failedRecoveries} fallo(s)`
      );
    },
    onError: (error) => {
      toast.error(`Error en auto-recuperación: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Auto-recuperación de Sensores</CardTitle>
            <CardDescription>
              Sistema automático de reconexion cada 15 minutos
            </CardDescription>
          </div>
          <Button
            onClick={() => runRecovery.mutate()}
            disabled={runRecovery.isPending}
            variant="outline"
            className="gap-2"
          >
            {runRecovery.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                Ejecutar Ahora
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalAttempts}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Intentos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.successfulAttempts}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Exitosos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {stats.failedAttempts}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Fallidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.successRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasa de Éxito</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Componente de botón para exportar reporte PDF
 */
function ExportButton({ projectId, hoursBack }: { projectId: number; hoursBack: number }) {
  const generateReport = trpc.iot.generateHealthReport.useMutation({
    onSuccess: (data) => {
      // Descargar PDF
      const link = document.createElement('a');
      link.href = data.pdfBase64;
      link.download = data.filename;
      link.click();
      toast.success('Reporte PDF generado exitosamente');
    },
    onError: (error) => {
      toast.error(`Error al generar reporte: ${error.message}`);
    },
  });

  return (
    <Button
      onClick={() => generateReport.mutate({ projectId, hoursBack })}
      disabled={generateReport.isPending}
      className="gap-2"
    >
      {generateReport.isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Exportar Reporte PDF
        </>
      )}
    </Button>
  );
}
