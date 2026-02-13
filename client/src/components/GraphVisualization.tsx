import { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface GraphNode {
  id: string;
  type: string;
  properties: Record<string, any>;
  label?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, any>;
}

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  highlightedNodeIds?: string[];
}

export function GraphVisualization({
  nodes,
  edges,
  onNodeClick,
  highlightedNodeIds = [],
}: GraphVisualizationProps) {
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Transformar datos para react-force-graph
  const graphData = {
    nodes: nodes.map(n => ({
      id: n.id,
      name: n.label || n.type,
      type: n.type,
      properties: n.properties,
      color: getNodeColor(n.type),
      highlighted: highlightedNodeIds.includes(n.id),
    })),
    links: edges.map(e => ({
      source: e.from,
      target: e.to,
      type: e.type,
      label: e.type,
    })),
  };

  // Colores por tipo de elemento IFC
  function getNodeColor(type: string): string {
    if (type.includes('Wall')) return '#ef4444'; // Rojo
    if (type.includes('Column')) return '#3b82f6'; // Azul
    if (type.includes('Beam')) return '#f59e0b'; // Naranja
    if (type.includes('Slab')) return '#10b981'; // Verde
    if (type.includes('Door')) return '#8b5cf6'; // Púrpura
    if (type.includes('Window')) return '#06b6d4'; // Cyan
    if (type.includes('Space')) return '#ec4899'; // Rosa
    return '#6b7280'; // Gris por defecto
  }

  // Tamaño de nodo basado en conexiones
  function getNodeSize(node: any): number {
    const connections = graphData.links.filter(
      l => l.source === node.id || l.target === node.id
    ).length;
    return Math.max(5, Math.min(15, 5 + connections * 2));
  }

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.2, 500);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.2, 500);
    }
  };

  const handleFitView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(500, 50);
    }
  };

  useEffect(() => {
    // Ajustar vista inicial
    if (graphRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(500, 50);
      }, 100);
    }
  }, [graphData.nodes.length]);

  return (
    <div className="space-y-4">
      {/* Controles */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-semibold">{nodes.length}</span> nodos
              <span className="mx-2">·</span>
              <span className="font-semibold">{edges.length}</span> relaciones
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleFitView}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Leyenda de colores */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="bg-red-500">Muros</Badge>
          <Badge className="bg-blue-500">Columnas</Badge>
          <Badge className="bg-orange-500">Vigas</Badge>
          <Badge className="bg-green-500">Losas</Badge>
          <Badge className="bg-purple-500">Puertas</Badge>
          <Badge className="bg-cyan-500">Ventanas</Badge>
          <Badge className="bg-pink-500">Espacios</Badge>
          <Badge className="bg-gray-500">Otros</Badge>
        </div>
      </Card>

      {/* Grafo */}
      <Card className="p-0 overflow-hidden">
        <div className="relative" style={{ height: '600px' }}>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel={(node: any) => `${node.name} (${node.type})`}
            nodeColor={(node: any) => node.highlighted ? '#fbbf24' : node.color}
            nodeVal={(node: any) => getNodeSize(node)}
            linkLabel={(link: any) => link.type}
            linkColor={() => '#d1d5db'}
            linkWidth={2}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        </div>
      </Card>

      {/* Panel de información del nodo seleccionado */}
      {selectedNode && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Nodo Seleccionado</h3>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">ID:</span>
              <span className="ml-2 font-mono text-sm">{selectedNode.id}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Tipo:</span>
              <Badge className="ml-2">{selectedNode.type}</Badge>
            </div>
            <div>
              <span className="text-sm text-gray-600">Etiqueta:</span>
              <span className="ml-2 text-sm">{selectedNode.label || 'Sin etiqueta'}</span>
            </div>
            {Object.keys(selectedNode.properties).length > 0 && (
              <div>
                <span className="text-sm text-gray-600">Propiedades:</span>
                <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono max-h-40 overflow-y-auto">
                  <pre>{JSON.stringify(selectedNode.properties, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
