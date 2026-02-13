import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitCompare, Plus, Minus, Edit, AlertCircle, Box, FileDown, Camera } from 'lucide-react';
import { useLocation } from 'wouter';
import { useIfcModel } from '@/contexts/IfcModelContext';
import { useComparison } from '@/contexts/ComparisonContext';
import { generateComparisonReport } from '@/services/pdfReportGenerator';
import { VersionTimeline } from '@/components/VersionTimeline';
import { CriticalChangesAlert } from '@/components/CriticalChangesAlert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ModelComparison() {
  const [oldModelId, setOldModelId] = useState<number | null>(null);
  const [newModelId, setNewModelId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'added' | 'removed' | 'modified'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const { setCurrentModel } = useIfcModel();
  const { setComparisonData, screenshot3D } = useComparison();
  const utils = trpc.useUtils();

  // Obtener proyectos BIM
  const { data: projectsData } = trpc.bimProjects.list.useQuery();
  const projects = projectsData || [];

  // Obtener historial de versiones del proyecto seleccionado
  const { data: versionHistoryData } = trpc.comparison.getModelVersionHistory.useQuery(
    { projectId: selectedProjectId! },
    { enabled: selectedProjectId !== null }
  );

  // Obtener lista de modelos disponibles
  const { data: modelsData, isLoading: modelsLoading } = trpc.ifc.listSavedModels.useQuery({});
  const models = modelsData?.models || [];

  // Comparar modelos
  const { data: comparison, isLoading: comparing, error } = trpc.comparison.compareModels.useQuery(
    {
      oldModelId: oldModelId!,
      newModelId: newModelId!,
    },
    {
      enabled: oldModelId !== null && newModelId !== null && oldModelId !== newModelId,
    }
  );

  const handleViewIn3D = async () => {
    if (!newModelId || !comparison) return;

    try {
      // Cargar el modelo nuevo (versión más reciente) desde BD
      const result = await utils.ifc.getSavedModel.fetch({ modelId: newModelId });
      
      if (result.success && result.model) {
        const model = result.model;
        
        // Convertir elementos de BD a formato IfcModel
        const ifcModel = {
          elements: model.elements.map(el => ({
            expressId: el.expressId,
            type: el.ifcType,
            name: el.name || undefined,
            globalId: el.globalId || undefined,
            properties: el.properties || undefined,
          })),
        };

        // Guardar modelo en contexto
        setCurrentModel(ifcModel, {
          schema: model.ifcSchema,
          fileUrl: model.ifcFileUrl,
          fileName: model.name,
          statistics: model.statistics,
        });

        // Guardar datos de comparación en contexto
        setComparisonData({
          oldModelId: oldModelId!,
          newModelId: newModelId,
          added: comparison.comparison.added,
          removed: comparison.comparison.removed,
          modified: comparison.comparison.modified,
          statistics: comparison.comparison.statistics,
        });

        // Navegar al visor 3D
        setLocation('/viewer');
      }
    } catch (error) {
      console.error('Error loading model for 3D view:', error);
    }
  };

  const handleExportReport = async () => {
    if (!comparison || !oldModelId || !newModelId) return;

    try {
      // Obtener nombres de modelos
      const oldModel = models.find(m => m.id === oldModelId);
      const newModel = models.find(m => m.id === newModelId);

      if (!oldModel || !newModel) {
        console.error('No se encontraron los modelos');
        return;
      }

      // Preparar datos para el reporte
      const reportData = {
        oldModelName: oldModel.name,
        newModelName: newModel.name,
        statistics: comparison.comparison.statistics,
        added: comparison.comparison.added,
        removed: comparison.comparison.removed,
        modified: comparison.comparison.modified,
      };

      // Generar y descargar PDF (con screenshot si está disponible)
      await generateComparisonReport(reportData, screenshot3D || undefined);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const getFilteredChanges = () => {
    if (!comparison) return [];
    
    switch (filterType) {
      case 'added':
        return comparison.comparison.added;
      case 'removed':
        return comparison.comparison.removed;
      case 'modified':
        return comparison.comparison.modified;
      case 'all':
      default:
        return [
          ...comparison.comparison.added,
          ...comparison.comparison.removed,
          ...comparison.comparison.modified,
        ];
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'removed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'modified':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return <Plus className="w-4 h-4" />;
      case 'removed':
        return <Minus className="w-4 h-4" />;
      case 'modified':
        return <Edit className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <GitCompare className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Comparación de Modelos IFC</h1>
              <p className="text-gray-600">Detecta cambios entre dos versiones del mismo modelo</p>
            </div>
          </div>
          {comparison && (
            <div className="flex gap-2">
              <Button
                className="bg-[#7fb069] hover:bg-[#6fa055] text-white"
                onClick={handleViewIn3D}
              >
                <Box className="w-4 h-4 mr-2" />
                Ver en 3D
              </Button>
              {screenshot3D && (
                <Button
                  variant="outline"
                  className="border-green-500 text-green-600"
                  disabled
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Vista 3D Capturada
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleExportReport}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Exportar Reporte {screenshot3D && '(con vista 3D)'}
              </Button>
            </div>
          )}
        </div>

        {/* Tabs para selección manual vs timeline */}
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="manual">Selección Manual</TabsTrigger>
            <TabsTrigger value="timeline">Timeline de Versiones</TabsTrigger>
          </TabsList>

          {/* Selección manual */}
          <TabsContent value="manual">
            <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo Antiguo (Versión 1)
              </label>
              <Select
                value={oldModelId?.toString() || ''}
                onValueChange={(value) => setOldModelId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model: any) => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.name} ({model.ifcSchema || 'IFC4'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo Nuevo (Versión 2)
              </label>
              <Select
                value={newModelId?.toString() || ''}
                onValueChange={(value) => setNewModelId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model: any) => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.name} ({model.ifcSchema || 'IFC4'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

              {oldModelId && newModelId && oldModelId === newModelId && (
                <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span>Por favor, selecciona dos modelos diferentes para comparar</span>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Timeline de versiones */}
          <TabsContent value="timeline">
            <Card className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Proyecto
                </label>
                <Select
                  value={selectedProjectId?.toString() || ''}
                  onValueChange={(value) => setSelectedProjectId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {versionHistoryData && versionHistoryData.versionHistory && (
                <VersionTimeline
                  versionHistory={versionHistoryData.versionHistory}
                  onCompare={(oldId, newId) => {
                    setOldModelId(oldId);
                    setNewModelId(newId);
                  }}
                  onMultiCompare={(versionIds) => {
                    // Navegar a página de comparación múltiple
                    setLocation(`/multi-comparison?ids=${versionIds.join(',')}`);
                  }}
                />
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Resultados de comparación */}
        {comparing && (
          <Card className="p-8 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600">Comparando modelos...</p>
            </div>
          </Card>
        )}

        {error && (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>Error al comparar modelos: {error.message}</span>
            </div>
          </Card>
        )}

        {comparison && (
          <>
            {/* Critical Changes Alert */}
            {comparison.criticalChanges && comparison.criticalChanges.hasCriticalChanges && (
              <CriticalChangesAlert
                criticalChanges={comparison.criticalChanges.criticalChanges}
                summary={comparison.criticalChanges.summary}
              />
            )}

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-gray-600">Total de Cambios</div>
                <div className="text-3xl font-bold text-gray-900">
                  {comparison.comparison.statistics.totalChanges}
                </div>
              </Card>

              <Card className="p-4 border-green-200 bg-green-50">
                <div className="text-sm text-green-700">Añadidos</div>
                <div className="text-3xl font-bold text-green-800">
                  {comparison.comparison.statistics.addedCount}
                </div>
              </Card>

              <Card className="p-4 border-red-200 bg-red-50">
                <div className="text-sm text-red-700">Eliminados</div>
                <div className="text-3xl font-bold text-red-800">
                  {comparison.comparison.statistics.removedCount}
                </div>
              </Card>

              <Card className="p-4 border-yellow-200 bg-yellow-50">
                <div className="text-sm text-yellow-700">Modificados</div>
                <div className="text-3xl font-bold text-yellow-800">
                  {comparison.comparison.statistics.modifiedCount}
                </div>
              </Card>
            </div>

            {/* Filtros */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
                <div className="flex gap-2">
                  <Button
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('all')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filterType === 'added' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('added')}
                    className={filterType === 'added' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Añadidos
                  </Button>
                  <Button
                    variant={filterType === 'removed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('removed')}
                    className={filterType === 'removed' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <Minus className="w-4 h-4 mr-1" />
                    Eliminados
                  </Button>
                  <Button
                    variant={filterType === 'modified' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('modified')}
                    className={filterType === 'modified' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Modificados
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tabla de cambios */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo de Cambio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo IFC
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Express ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Global ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cambios en Propiedades
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredChanges().map((change, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getChangeTypeColor(change.changeType)}>
                            <span className="flex items-center gap-1">
                              {getChangeTypeIcon(change.changeType)}
                              {change.changeType === 'added' && 'Añadido'}
                              {change.changeType === 'removed' && 'Eliminado'}
                              {change.changeType === 'modified' && 'Modificado'}
                            </span>
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {change.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {change.expressId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {change.globalId || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {change.changeType === 'modified' && change.propertyChanges && (
                            <div className="space-y-1">
                              {change.propertyChanges.slice(0, 3).map((propChange, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-medium">{propChange.propertyName}:</span>{' '}
                                  <span className="text-red-600">{JSON.stringify(propChange.oldValue)}</span>
                                  {' → '}
                                  <span className="text-green-600">{JSON.stringify(propChange.newValue)}</span>
                                </div>
                              ))}
                              {change.propertyChanges.length > 3 && (
                                <div className="text-xs text-gray-400">
                                  +{change.propertyChanges.length - 3} más...
                                </div>
                              )}
                            </div>
                          )}
                          {change.changeType === 'added' && (
                            <span className="text-green-600 text-xs">Elemento nuevo</span>
                          )}
                          {change.changeType === 'removed' && (
                            <span className="text-red-600 text-xs">Elemento eliminado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {getFilteredChanges().length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No hay cambios para mostrar con el filtro seleccionado
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {!oldModelId && !newModelId && !comparing && !comparison && (
          <Card className="p-12 text-center">
            <GitCompare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecciona dos modelos para comparar
            </h3>
            <p className="text-gray-600">
              Elige una versión antigua y una nueva del mismo modelo para detectar cambios
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
