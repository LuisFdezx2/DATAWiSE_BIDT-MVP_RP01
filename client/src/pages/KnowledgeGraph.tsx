import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Network, Download, Box } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { GraphVisualization } from '@/components/GraphVisualization';
import { exportGraph } from '@/services/graphExporter';
import { useLocation } from 'wouter';
import { useIfcModel } from '@/contexts/IfcModelContext';

export default function KnowledgeGraph() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [searchNodeId, setSearchNodeId] = useState('');
  const [maxDepth, setMaxDepth] = useState(2);
  const [queryType, setQueryType] = useState<'full' | 'connected'>('full');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { setCurrentModel } = useIfcModel();
  const utils = trpc.useUtils();

  // Obtener lista de proyectos
  const { data: projectsData } = trpc.bimProjects.list.useQuery();

  // Obtener modelos del proyecto seleccionado
  const { data: modelsData } = trpc.ifcModels.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: selectedProjectId !== null }
  );

  // Obtener estadísticas del grafo
  const { data: graphStats, isLoading: isLoadingStats } = trpc.knowledgeGraph.getStats.useQuery(
    { modelId: selectedModelId! },
    { enabled: selectedModelId !== null && queryType === 'full' }
  );

  // Usar graphStats como fullGraph para compatibilidad
  const fullGraph = graphStats;
  const isLoadingFull = isLoadingStats;

  // Buscar nodos conectados
  const { data: connectedGraph, isLoading: isLoadingConnected } = trpc.knowledgeGraph.findConnected.useQuery(
    {
      guid: searchNodeId,
      maxDepth,
    },
    { enabled: selectedModelId !== null && queryType === 'connected' && searchNodeId.length > 0 }
  );

  const handleSearch = () => {
    if (searchNodeId.trim()) {
      setQueryType('connected');
    }
  };

  const handleShowFullGraph = () => {
    setQueryType('full');
    setSearchNodeId('');
  };

  const handleExport = (format: 'graphml' | 'json') => {
    const currentGraph = queryType === 'full' ? fullGraph : connectedGraph;
    if (!currentGraph) return;

    const modelName = modelsData?.find(m => m.id === selectedModelId)?.name || 'model';
    exportGraph(
      {
        nodes: currentGraph.nodes,
        edges: currentGraph.edges,
      },
      format,
      modelName
    );
  };

  const handleQuickFilter = (filterType: string) => {
    setQuickFilter(filterType);
    setQueryType('full');
  };

  const handleViewIn3D = async () => {
    if (!selectedModelId || !selectedNodeId) return;

    try {
      // Obtener modelo desde BD
      const result = await utils.ifc.getSavedModel.fetch({ modelId: selectedModelId });
      
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

        // Guardar en contexto
        setCurrentModel(ifcModel, {
          schema: model.ifcSchema,
          fileUrl: model.ifcFileUrl,
          fileName: model.name,
          statistics: model.statistics,
        });

        // Navegar al visor con elemento seleccionado
        setLocation(`/viewer?highlight=${selectedNodeId}`);
      }
    } catch (error) {
      console.error('Error loading model:', error);
    }
  };

  const isLoading = queryType === 'full' ? isLoadingFull : isLoadingConnected;
  const rawGraphData = queryType === 'full' ? fullGraph : connectedGraph;

  // Aplicar filtro rápido si existe
  const graphData = useMemo(() => {
    if (!rawGraphData || !quickFilter) return rawGraphData;

    const structuralTypes = ['IfcWall', 'IfcColumn', 'IfcBeam', 'IfcSlab', 'IfcFooting'];
    const filteredNodes = rawGraphData.nodes.filter((node: any) => {
      if (quickFilter === 'structural') {
        return structuralTypes.includes(node.type);
      } else if (quickFilter === 'external') {
        return node.properties?.IsExternal === true || node.type === 'IfcWall';
      }
      return true;
    });

    const nodeIds = new Set(filteredNodes.map((n: any) => n.id));
    const filteredEdges = rawGraphData.edges.filter(
      (e: any) => nodeIds.has(e.from) && nodeIds.has(e.to)
    );

    return {
      ...rawGraphData,
      nodes: filteredNodes,
      edges: filteredEdges,
      nodeCount: filteredNodes.length,
      edgeCount: filteredEdges.length,
    };
  }, [rawGraphData, quickFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-8 h-8 text-[#7fb069]" />
            <h1 className="text-3xl font-bold text-gray-900">Knowledge Graph</h1>
          </div>
          <p className="text-gray-600">
            Explora relaciones espaciales y estructurales entre elementos IFC
          </p>
        </div>

        {/* Selector de proyecto y modelo */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Seleccionar Proyecto BIM
              </label>
              <Select
                value={selectedProjectId?.toString() || ''}
                onValueChange={(value) => {
                  setSelectedProjectId(Number(value));
                  setSelectedModelId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proyecto..." />
                </SelectTrigger>
                <SelectContent>
                  {projectsData?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProjectId && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Seleccionar Modelo IFC
                </label>
                <Select
                  value={selectedModelId?.toString() || ''}
                  onValueChange={(value) => setSelectedModelId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un modelo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsData?.map((model: any) => (
                      <SelectItem key={model.id} value={model.id.toString()}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedModelId && (
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Buscar Nodo por ID
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: wall1, exp_123..."
                      value={searchNodeId}
                      onChange={(e) => setSearchNodeId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} className="bg-[#7fb069] hover:bg-[#6fa055]">
                      <Search className="w-4 h-4 mr-2" />
                      Buscar
                    </Button>
                  </div>
                </div>

                {/* Filtros Rápidos */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleQuickFilter('structural')}
                    variant={quickFilter === 'structural' ? 'default' : 'outline'}
                    className={quickFilter === 'structural' ? 'bg-[#7fb069] hover:bg-[#6fa055]' : ''}
                  >
                    Elementos Estructurales
                  </Button>
                  <Button
                    onClick={() => handleQuickFilter('external')}
                    variant={quickFilter === 'external' ? 'default' : 'outline'}
                    className={quickFilter === 'external' ? 'bg-[#7fb069] hover:bg-[#6fa055]' : ''}
                  >
                    Elementos Exteriores
                  </Button>
                  {quickFilter && (
                    <Button
                      onClick={() => setQuickFilter(null)}
                      variant="ghost"
                    >
                      Limpiar Filtro
                    </Button>
                  )}
                </div>

                {/* Botones de Exportación */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExport('json')}
                    variant="outline"
                    disabled={!graphData}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar JSON
                  </Button>
                  <Button
                    onClick={() => handleExport('graphml')}
                    variant="outline"
                    disabled={!graphData}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar GraphML
                  </Button>
                  <Button
                    onClick={handleViewIn3D}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                    disabled={!selectedNodeId}
                  >
                    <Box className="w-4 h-4 mr-2" />
                    Ver en 3D
                  </Button>
                </div>

                <div className="w-48">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Profundidad
                  </label>
                  <Select
                    value={maxDepth.toString()}
                    onValueChange={(value) => setMaxDepth(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 nivel</SelectItem>
                      <SelectItem value="2">2 niveles</SelectItem>
                      <SelectItem value="3">3 niveles</SelectItem>
                      <SelectItem value="4">4 niveles</SelectItem>
                      <SelectItem value="5">5 niveles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedModelId && queryType === 'connected' && (
              <Button variant="outline" onClick={handleShowFullGraph}>
                Mostrar Grafo Completo
              </Button>
            )}
          </div>
        </Card>

        {/* Visualización del grafo */}
        {isLoading && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-[#7fb069] animate-spin mb-4" />
              <p className="text-gray-600">Construyendo grafo de conocimiento...</p>
            </div>
          </Card>
        )}

        {!isLoading && graphData && (
          <>
            {queryType === 'full' && (
              <GraphVisualization
                nodes={graphData.nodes}
                edges={graphData.edges}
                onNodeClick={(node) => setSelectedNodeId(node.id)}
              />
            )}

            {queryType === 'connected' && connectedGraph && Array.isArray(connectedGraph) && (
              <GraphVisualization
                nodes={(connectedGraph as any).nodes || []}
                edges={(connectedGraph as any).edges || []}
                highlightedNodeIds={[searchNodeId]}
                onNodeClick={(node) => setSelectedNodeId(node.id)}
              />
            )}
          </>
        )}

        {!isLoading && !graphData && selectedModelId && (
          <Card className="p-12">
            <div className="text-center">
              <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {queryType === 'connected' 
                  ? 'Introduce un ID de nodo para buscar'
                  : 'Selecciona un modelo para visualizar el grafo'}
              </h3>
              <p className="text-gray-600">
                El grafo de conocimiento te permite explorar relaciones entre elementos IFC
              </p>
            </div>
          </Card>
        )}

        {!selectedModelId && (
          <Card className="p-12">
            <div className="text-center">
              <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Selecciona un modelo IFC
              </h3>
              <p className="text-gray-600">
                Elige un modelo procesado para comenzar a explorar su grafo de conocimiento
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
