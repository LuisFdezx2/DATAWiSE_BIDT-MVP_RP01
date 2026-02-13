import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, FileText, Clock, Database, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const COLORS = ['#7fb069', '#e63946', '#f77f00', '#06aed5', '#9b5de5', '#f15bb5'];

export function Analytics() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { data: analytics, isLoading } = trpc.analytics.getOverview.useQuery();
  const { data: projects } = trpc.bimProjects.list.useQuery();
  const { data: projectMetrics, isLoading: isLoadingMetrics } = trpc.projectAnalytics.getProjectMetrics.useQuery(
    { projectId: selectedProjectId! },
    { enabled: selectedProjectId !== null }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#7fb069]" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Analíticas</h1>
        <p className="text-muted-foreground mt-2">
          Métricas clave y tendencias de tus proyectos BIM
        </p>
      </div>

      {/* Selector de Proyecto y Botón de Exportación */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Filtrar por Proyecto:</label>
            <Select
              value={selectedProjectId?.toString() || 'all'}
              onValueChange={(value) => setSelectedProjectId(value === 'all' ? null : Number(value))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Todos los proyectos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {projects?.map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedProjectId && (
            <ExportButton projectId={selectedProjectId} />
          )}
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Modelos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalModels}</div>
            <p className="text-xs text-muted-foreground">
              Modelos IFC procesados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Elementos</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalElements.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Elementos IFC extraídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgProcessingTime.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">
              Procesamiento por modelo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Elementos Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalModels > 0 
                ? Math.round(analytics.totalElements / analytics.totalModels).toLocaleString()
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Por modelo IFC
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Modelos por Mes */}
        <Card>
          <CardHeader>
            <CardTitle>Modelos Procesados por Mes</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.modelsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.modelsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7fb069" name="Modelos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribución por Schema */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Schema IFC</CardTitle>
            <CardDescription>Versiones de esquema utilizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.schemaDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.schemaDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ schema, percent }) => `${schema}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.schemaDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Elementos por Tipo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top 10 Tipos de Elementos IFC</CardTitle>
            <CardDescription>Elementos más frecuentes en tus modelos</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.elementsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.elementsByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7fb069" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Proyecto Específico */}
      {selectedProjectId && projectMetrics && (
        <div className="space-y-6">
          <div className="border-t pt-6">
            <h2 className="text-2xl font-bold mb-4">
              Métricas de {projectMetrics.projectName}
            </h2>
          </div>

          {/* Timeline de Modelos */}
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Elementos</CardTitle>
              <CardDescription>Crecimiento del proyecto a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              {projectMetrics.growthTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={projectMetrics.growthTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="elementCount" 
                      stroke="#7fb069" 
                      name="Total Elementos"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No hay suficientes datos para mostrar tendencia
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribución de Elementos */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Elementos por Tipo</CardTitle>
              <CardDescription>Top 10 tipos más frecuentes en este proyecto</CardDescription>
            </CardHeader>
            <CardContent>
              {projectMetrics.distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={projectMetrics.distribution.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="type" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7fb069" name="Cantidad" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isLoadingMetrics && selectedProjectId && (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#7fb069]" />
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Componente para exportar datos del proyecto
 */
function ExportButton({ projectId }: { projectId: number }) {
  const exportMutation = trpc.bimProjects.exportProject.useMutation({
    onSuccess: (data) => {
      // Convertir base64 a blob
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/zip' });
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Proyecto exportado exitosamente');
    },
    onError: (error) => {
      toast.error(`Error al exportar: ${error.message}`);
    },
  });

  return (
    <Button
      onClick={() => exportMutation.mutate({ projectId })}
      disabled={exportMutation.isPending}
      className="bg-[#7fb069] hover:bg-[#6a9959] text-white"
    >
      {exportMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Exportar Proyecto
        </>
      )}
    </Button>
  );
}
