/**
 * Knowledge Graph Service - Grafo de relaciones IFC en memoria
 * Permite consultas relacionales complejas sin Neo4j
 */

export interface GraphNode {
  id: string; // expressId o globalId
  type: string; // Tipo IFC
  properties: Record<string, any>;
  label?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: RelationType;
  properties?: Record<string, any>;
}

export type RelationType =
  | 'CONTAINS'
  | 'CONTAINED_IN'
  | 'CONNECTS_TO'
  | 'ADJACENT_TO'
  | 'SUPPORTS'
  | 'SUPPORTED_BY'
  | 'BOUNDS'
  | 'BOUNDED_BY';

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacencyList: Map<string, Set<string>>;
}

export interface PathResult {
  path: GraphNode[];
  distance: number;
}

export interface QueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    queryType: string;
    executionTime: number;
    resultCount: number;
  };
}

/**
 * Crea un grafo vacío
 */
export function createGraph(): KnowledgeGraph {
  return {
    nodes: new Map(),
    edges: [],
    adjacencyList: new Map(),
  };
}

/**
 * Añade un nodo al grafo
 */
export function addNode(graph: KnowledgeGraph, node: GraphNode): void {
  graph.nodes.set(node.id, node);
  if (!graph.adjacencyList.has(node.id)) {
    graph.adjacencyList.set(node.id, new Set());
  }
}

/**
 * Añade una arista al grafo
 */
export function addEdge(graph: KnowledgeGraph, edge: GraphEdge): void {
  graph.edges.push(edge);
  
  // Actualizar lista de adyacencia
  if (!graph.adjacencyList.has(edge.from)) {
    graph.adjacencyList.set(edge.from, new Set());
  }
  graph.adjacencyList.get(edge.from)!.add(edge.to);
}

/**
 * Construye grafo desde elementos IFC
 */
export function buildGraphFromIfc(elements: Array<{
  expressId: number;
  type: string;
  globalId?: string;
  properties?: any;
}>): KnowledgeGraph {
  const graph = createGraph();
  const startTime = Date.now();

  // Crear nodos
  elements.forEach(el => {
    const nodeId = el.globalId || `exp_${el.expressId}`;
    addNode(graph, {
      id: nodeId,
      type: el.type,
      properties: el.properties || {},
      label: el.properties?.Name || el.type,
    });
  });

  // Crear relaciones basadas en propiedades IFC
  elements.forEach(el => {
    const nodeId = el.globalId || `exp_${el.expressId}`;
    const props = el.properties || {};

    // Relación CONTAINS (espacios contienen elementos)
    if (el.type.includes('Space') && props.ContainedElements) {
      const contained = Array.isArray(props.ContainedElements) 
        ? props.ContainedElements 
        : [props.ContainedElements];
      
      contained.forEach((targetId: string) => {
        if (graph.nodes.has(targetId)) {
          addEdge(graph, {
            from: nodeId,
            to: targetId,
            type: 'CONTAINS',
          });
          addEdge(graph, {
            from: targetId,
            to: nodeId,
            type: 'CONTAINED_IN',
          });
        }
      });
    }

    // Relación CONNECTS_TO (puertas/ventanas conectan espacios)
    if ((el.type.includes('Door') || el.type.includes('Window')) && props.ConnectedSpaces) {
      const spaces = Array.isArray(props.ConnectedSpaces)
        ? props.ConnectedSpaces
        : [props.ConnectedSpaces];
      
      spaces.forEach((spaceId: string) => {
        if (graph.nodes.has(spaceId)) {
          addEdge(graph, {
            from: nodeId,
            to: spaceId,
            type: 'CONNECTS_TO',
          });
        }
      });
    }

    // Relación SUPPORTS (columnas soportan vigas)
    if (el.type.includes('Column') && props.SupportedElements) {
      const supported = Array.isArray(props.SupportedElements)
        ? props.SupportedElements
        : [props.SupportedElements];
      
      supported.forEach((targetId: string) => {
        if (graph.nodes.has(targetId)) {
          addEdge(graph, {
            from: nodeId,
            to: targetId,
            type: 'SUPPORTS',
          });
          addEdge(graph, {
            from: targetId,
            to: nodeId,
            type: 'SUPPORTED_BY',
          });
        }
      });
    }
  });

  console.log(`Graph built in ${Date.now() - startTime}ms: ${graph.nodes.size} nodes, ${graph.edges.length} edges`);
  return graph;
}

/**
 * Búsqueda en anchura (BFS) para encontrar nodos conectados
 */
export function findConnectedNodes(
  graph: KnowledgeGraph,
  startNodeId: string,
  maxDepth: number = 3,
  relationTypes?: RelationType[]
): QueryResult {
  const startTime = Date.now();
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];
  const resultNodes: GraphNode[] = [];
  const resultEdges: GraphEdge[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (visited.has(current.id) || current.depth > maxDepth) {
      continue;
    }

    visited.add(current.id);
    const node = graph.nodes.get(current.id);
    if (node) {
      resultNodes.push(node);
    }

    // Buscar aristas salientes
    const outgoingEdges = graph.edges.filter(e => e.from === current.id);
    outgoingEdges.forEach(edge => {
      // Filtrar por tipo de relación si se especifica
      if (relationTypes && !relationTypes.includes(edge.type)) {
        return;
      }

      if (!visited.has(edge.to)) {
        resultEdges.push(edge);
        queue.push({ id: edge.to, depth: current.depth + 1 });
      }
    });
  }

  return {
    nodes: resultNodes,
    edges: resultEdges,
    metadata: {
      queryType: 'findConnectedNodes',
      executionTime: Date.now() - startTime,
      resultCount: resultNodes.length,
    },
  };
}

/**
 * Encuentra el camino más corto entre dos nodos (algoritmo de Dijkstra simplificado)
 */
export function findShortestPath(
  graph: KnowledgeGraph,
  startId: string,
  endId: string
): PathResult | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const unvisited = new Set(graph.nodes.keys());

  // Inicializar distancias
  graph.nodes.forEach((_, id) => {
    distances.set(id, id === startId ? 0 : Infinity);
  });

  while (unvisited.size > 0) {
    // Encontrar nodo no visitado con menor distancia
    let current: string | null = null;
    let minDistance = Infinity;
    
    unvisited.forEach(id => {
      const dist = distances.get(id)!;
      if (dist < minDistance) {
        minDistance = dist;
        current = id;
      }
    });

    if (current === null || minDistance === Infinity) {
      break;
    }

    unvisited.delete(current);

    if (current === endId) {
      break;
    }

    // Actualizar distancias de vecinos
    const neighbors = graph.adjacencyList.get(current!) || new Set();
    neighbors.forEach(neighbor => {
      if (unvisited.has(neighbor)) {
        const alt = distances.get(current!)! + 1;
        if (alt < distances.get(neighbor)!) {
          distances.set(neighbor, alt);
          previous.set(neighbor, current!);
        }
      }
    });
  }

  // Reconstruir camino
  if (!previous.has(endId) && startId !== endId) {
    return null; // No hay camino
  }

  const path: GraphNode[] = [];
  let current: string | undefined = endId;
  
  while (current) {
    const node = graph.nodes.get(current);
    if (node) {
      path.unshift(node);
    }
    current = previous.get(current);
  }

  return {
    path,
    distance: distances.get(endId)!,
  };
}

/**
 * Encuentra todos los nodos de un tipo específico
 */
export function findNodesByType(
  graph: KnowledgeGraph,
  type: string
): QueryResult {
  const startTime = Date.now();
  const nodes: GraphNode[] = [];

  graph.nodes.forEach(node => {
    if (node.type.toLowerCase().includes(type.toLowerCase())) {
      nodes.push(node);
    }
  });

  return {
    nodes,
    edges: [],
    metadata: {
      queryType: 'findNodesByType',
      executionTime: Date.now() - startTime,
      resultCount: nodes.length,
    },
  };
}

/**
 * Encuentra nodos por propiedad
 */
export function findNodesByProperty(
  graph: KnowledgeGraph,
  propertyName: string,
  propertyValue: any
): QueryResult {
  const startTime = Date.now();
  const nodes: GraphNode[] = [];

  graph.nodes.forEach(node => {
    if (node.properties[propertyName] === propertyValue) {
      nodes.push(node);
    }
  });

  return {
    nodes,
    edges: [],
    metadata: {
      queryType: 'findNodesByProperty',
      executionTime: Date.now() - startTime,
      resultCount: nodes.length,
    },
  };
}
