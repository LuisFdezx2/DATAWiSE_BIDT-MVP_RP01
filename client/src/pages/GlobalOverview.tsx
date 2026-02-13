import { trpc } from '../lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Activity, AlertTriangle, Server, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

/**
 * Dashboard Global de Métricas Multi-Proyecto
 * 
 * Vista consolidada de todos los proyectos del usuario con KPIs agregados,
 * comparativas entre proyectos y rankings de rendimiento.
 */
export default function GlobalOverview() {
  const { data: kpis, isLoading: kpisLoading } = trpc.globalMetrics.getGlobalKPIs.useQuery();
  const { data: comparison, isLoading: comparisonLoading } = trpc.globalMetrics.getProjectComparison.useQuery();
  const { data: rankings, isLoading: rankingsLoading } = trpc.globalMetrics.getProjectRankings.useQuery();
  const { data: heatmap } = trpc.globalMetrics.getHourlyHeatmap.useQuery({ days: 7 });
  const { data: trends } = trpc.globalMetrics.getAlertTrends.useQuery({ days: 30 });

  if (kpisLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Vista Global de Proyectos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Métricas agregadas de todos tus proyectos BIM
        </p>
      </div>

      {/* KPIs Globales */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proyectos</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.totalSensors} sensores totales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sensores Activos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{kpis.activeSensors}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.totalSensors > 0 
                  ? ((kpis.activeSensors / kpis.totalSensors) * 100).toFixed(1) 
                  : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime Global</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {kpis.globalUptime.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Últimas 24 horas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{kpis.alertsToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Hoy / {kpis.alertsThisWeek} esta semana / {kpis.alertsThisMonth} este mes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparación de Proyectos */}
        <Card>
          <CardHeader>
            <CardTitle>Comparación de Proyectos</CardTitle>
            <CardDescription>Uptime promedio por proyecto (24h)</CardDescription>
          </CardHeader>
          <CardContent>
            {comparisonLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : comparison && comparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="projectName" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="averageUptime" fill="#3b82f6" name="Uptime (%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No hay datos disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Tendencias de Alertas */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencias de Alertas</CardTitle>
            <CardDescription>Alertas disparadas por día (30 días)</CardDescription>
          </CardHeader>
          <CardContent>
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#f97316" name="Alertas" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Proyectos */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Proyectos</CardTitle>
          <CardDescription>Ordenados por rendimiento (uptime × sensores)</CardDescription>
        </CardHeader>
        <CardContent>
          {rankingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : rankings && rankings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Rank</th>
                    <th className="text-left py-3 px-4">Proyecto</th>
                    <th className="text-right py-3 px-4">Sensores</th>
                    <th className="text-right py-3 px-4">Uptime</th>
                    <th className="text-right py-3 px-4">Score</th>
                    <th className="text-left py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((project) => (
                    <tr key={project.projectId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                        #{project.rank}
                      </td>
                      <td className="py-3 px-4 font-medium">{project.projectName}</td>
                      <td className="py-3 px-4 text-right">{project.sensorCount}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={project.uptime >= 90 ? 'text-green-600' : project.uptime >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {project.uptime.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {project.score.toFixed(1)}
                      </td>
                      <td className="py-3 px-4">
                        {project.rank === 1 ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            Top
                          </span>
                        ) : project.rank === rankings.length ? (
                          <span className="flex items-center gap-1 text-red-600">
                            <TrendingDown className="h-4 w-4" />
                            Bajo
                          </span>
                        ) : (
                          <span className="text-gray-500">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No hay proyectos para mostrar</p>
          )}
        </CardContent>
      </Card>

      {/* Mapa de Calor de Disponibilidad */}
      <Card>
        <CardHeader>
          <CardTitle>Disponibilidad por Hora del Día</CardTitle>
          <CardDescription>Mapa de calor de uptime por hora (últimos 7 días)</CardDescription>
        </CardHeader>
        <CardContent>
          {heatmap && heatmap.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={heatmap}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" label={{ value: 'Hora del día', position: 'insideBottom', offset: -5 }} />
                <YAxis domain={[0, 100]} label={{ value: 'Disponibilidad (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="availability" fill="#10b981" name="Disponibilidad (%)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
