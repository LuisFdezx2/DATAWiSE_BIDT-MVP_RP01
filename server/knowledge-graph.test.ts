import { describe, it, expect } from 'vitest';
import {
  createGraph,
  addNode,
  addEdge,
  buildGraphFromIfc,
  findConnectedNodes,
  findShortestPath,
  findNodesByType,
} from './knowledge-graph';

describe('Knowledge Graph', () => {
  describe('createGraph', () => {
    it('debe crear un grafo vacío', () => {
      const graph = createGraph();
      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.length).toBe(0);
      expect(graph.adjacencyList.size).toBe(0);
    });
  });

  describe('addNode', () => {
    it('debe añadir un nodo al grafo', () => {
      const graph = createGraph();
      addNode(graph, {
        id: 'node1',
        type: 'IfcWall',
        properties: { Name: 'Wall 1' },
      });

      expect(graph.nodes.size).toBe(1);
      expect(graph.nodes.get('node1')).toBeDefined();
      expect(graph.adjacencyList.has('node1')).toBe(true);
    });
  });

  describe('addEdge', () => {
    it('debe añadir una arista al grafo', () => {
      const graph = createGraph();
      addNode(graph, { id: 'node1', type: 'IfcWall', properties: {} });
      addNode(graph, { id: 'node2', type: 'IfcColumn', properties: {} });
      
      addEdge(graph, {
        from: 'node1',
        to: 'node2',
        type: 'CONNECTS_TO',
      });

      expect(graph.edges.length).toBe(1);
      expect(graph.adjacencyList.get('node1')?.has('node2')).toBe(true);
    });
  });

  describe('buildGraphFromIfc', () => {
    it('debe construir un grafo desde elementos IFC', () => {
      const elements = [
        { expressId: 1, type: 'IfcWall', globalId: 'wall1', properties: {} },
        { expressId: 2, type: 'IfcColumn', globalId: 'col1', properties: {} },
        { expressId: 3, type: 'IfcDoor', globalId: 'door1', properties: {} },
      ];

      const graph = buildGraphFromIfc(elements);

      expect(graph.nodes.size).toBe(3);
      expect(graph.nodes.get('wall1')).toBeDefined();
      expect(graph.nodes.get('col1')).toBeDefined();
      expect(graph.nodes.get('door1')).toBeDefined();
    });

    it('debe crear relaciones CONTAINS desde propiedades', () => {
      const elements = [
        {
          expressId: 1,
          type: 'IfcSpace',
          globalId: 'space1',
          properties: { ContainedElements: ['wall1', 'door1'] },
        },
        { expressId: 2, type: 'IfcWall', globalId: 'wall1', properties: {} },
        { expressId: 3, type: 'IfcDoor', globalId: 'door1', properties: {} },
      ];

      const graph = buildGraphFromIfc(elements);

      const containsEdges = graph.edges.filter(e => e.type === 'CONTAINS');
      expect(containsEdges.length).toBeGreaterThan(0);
    });
  });

  describe('findConnectedNodes', () => {
    it('debe encontrar nodos conectados con profundidad 1', () => {
      const graph = createGraph();
      addNode(graph, { id: 'node1', type: 'IfcWall', properties: {} });
      addNode(graph, { id: 'node2', type: 'IfcColumn', properties: {} });
      addNode(graph, { id: 'node3', type: 'IfcDoor', properties: {} });
      
      addEdge(graph, { from: 'node1', to: 'node2', type: 'CONNECTS_TO' });
      addEdge(graph, { from: 'node2', to: 'node3', type: 'CONNECTS_TO' });

      const result = findConnectedNodes(graph, 'node1', 1);

      expect(result.nodes.length).toBe(2); // node1 + node2
      expect(result.nodes.some(n => n.id === 'node1')).toBe(true);
      expect(result.nodes.some(n => n.id === 'node2')).toBe(true);
      expect(result.nodes.some(n => n.id === 'node3')).toBe(false);
    });

    it('debe filtrar por tipo de relación', () => {
      const graph = createGraph();
      addNode(graph, { id: 'node1', type: 'IfcWall', properties: {} });
      addNode(graph, { id: 'node2', type: 'IfcColumn', properties: {} });
      addNode(graph, { id: 'node3', type: 'IfcDoor', properties: {} });
      
      addEdge(graph, { from: 'node1', to: 'node2', type: 'CONNECTS_TO' });
      addEdge(graph, { from: 'node1', to: 'node3', type: 'CONTAINS' });

      const result = findConnectedNodes(graph, 'node1', 1, ['CONNECTS_TO']);

      expect(result.edges.every(e => e.type === 'CONNECTS_TO')).toBe(true);
    });
  });

  describe('findShortestPath', () => {
    it('debe encontrar el camino más corto entre dos nodos', () => {
      const graph = createGraph();
      addNode(graph, { id: 'node1', type: 'IfcWall', properties: {} });
      addNode(graph, { id: 'node2', type: 'IfcColumn', properties: {} });
      addNode(graph, { id: 'node3', type: 'IfcDoor', properties: {} });
      
      addEdge(graph, { from: 'node1', to: 'node2', type: 'CONNECTS_TO' });
      addEdge(graph, { from: 'node2', to: 'node3', type: 'CONNECTS_TO' });

      const path = findShortestPath(graph, 'node1', 'node3');

      expect(path).not.toBeNull();
      expect(path!.distance).toBe(2);
      expect(path!.path.length).toBe(3);
      expect(path!.path[0].id).toBe('node1');
      expect(path!.path[2].id).toBe('node3');
    });

    it('debe retornar null si no hay camino', () => {
      const graph = createGraph();
      addNode(graph, { id: 'node1', type: 'IfcWall', properties: {} });
      addNode(graph, { id: 'node2', type: 'IfcColumn', properties: {} });

      const path = findShortestPath(graph, 'node1', 'node2');

      expect(path).toBeNull();
    });
  });

  describe('findNodesByType', () => {
    it('debe encontrar nodos por tipo IFC', () => {
      const graph = createGraph();
      addNode(graph, { id: 'node1', type: 'IfcWall', properties: {} });
      addNode(graph, { id: 'node2', type: 'IfcWall', properties: {} });
      addNode(graph, { id: 'node3', type: 'IfcColumn', properties: {} });

      const result = findNodesByType(graph, 'Wall');

      expect(result.nodes.length).toBe(2);
      expect(result.nodes.every(n => n.type.includes('Wall'))).toBe(true);
    });
  });
});
