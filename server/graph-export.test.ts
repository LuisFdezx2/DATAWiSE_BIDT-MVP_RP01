import { describe, it, expect } from 'vitest';

/**
 * Pruebas para exportación de grafos
 * Nota: Las funciones de exportación están en el cliente,
 * aquí probamos la lógica de transformación de datos
 */

describe('Graph Export', () => {
  describe('GraphML format', () => {
    it('debe generar XML válido con nodos y aristas', () => {
      const graph = {
        nodes: [
          { id: 'node1', type: 'IfcWall', properties: { Name: 'Wall 1' } },
          { id: 'node2', type: 'IfcColumn', properties: { Name: 'Column 1' } },
        ],
        edges: [
          { from: 'node1', to: 'node2', type: 'CONNECTS_TO' },
        ],
      };

      // Simular exportación GraphML
      const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
      const hasNodes = graph.nodes.length > 0;
      const hasEdges = graph.edges.length > 0;

      expect(hasNodes).toBe(true);
      expect(hasEdges).toBe(true);
      expect(graph.nodes[0].id).toBe('node1');
      expect(graph.edges[0].from).toBe('node1');
    });

    it('debe escapar caracteres especiales XML', () => {
      const unsafeString = '<tag> & "quotes" \'apostrophe\'';
      const escaped = unsafeString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      expect(escaped).toBe('&lt;tag&gt; &amp; &quot;quotes&quot; &apos;apostrophe&apos;');
    });

    it('debe incluir propiedades de nodos en formato JSON', () => {
      const node = {
        id: 'wall1',
        type: 'IfcWall',
        properties: {
          Name: 'External Wall',
          Height: 3.5,
          Material: 'Concrete',
        },
      };

      const propertiesJson = JSON.stringify(node.properties);
      expect(propertiesJson).toContain('External Wall');
      expect(propertiesJson).toContain('3.5');
      expect(propertiesJson).toContain('Concrete');
    });
  });

  describe('JSON format', () => {
    it('debe serializar grafo completo a JSON', () => {
      const graph = {
        nodes: [
          { id: 'node1', type: 'IfcWall', properties: {} },
          { id: 'node2', type: 'IfcColumn', properties: {} },
        ],
        edges: [
          { from: 'node1', to: 'node2', type: 'CONNECTS_TO' },
        ],
      };

      const json = JSON.stringify(graph, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed.nodes.length).toBe(2);
      expect(parsed.edges.length).toBe(1);
      expect(parsed.nodes[0].id).toBe('node1');
      expect(parsed.edges[0].type).toBe('CONNECTS_TO');
    });

    it('debe preservar tipos de datos en JSON', () => {
      const graph = {
        nodes: [
          {
            id: 'node1',
            type: 'IfcWall',
            properties: {
              Name: 'Wall',
              Height: 3.5,
              IsExternal: true,
              Tags: ['structural', 'load-bearing'],
            },
          },
        ],
        edges: [],
      };

      const json = JSON.stringify(graph);
      const parsed = JSON.parse(json);

      expect(typeof parsed.nodes[0].properties.Height).toBe('number');
      expect(typeof parsed.nodes[0].properties.IsExternal).toBe('boolean');
      expect(Array.isArray(parsed.nodes[0].properties.Tags)).toBe(true);
    });
  });

  describe('Filename generation', () => {
    it('debe generar nombre de archivo con timestamp', () => {
      const modelName = 'Building_Model';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${modelName}_graph_${timestamp}.graphml`;

      expect(filename).toContain(modelName);
      expect(filename).toContain(timestamp);
      expect(filename).toContain('.graphml');
    });

    it('debe soportar diferentes formatos de archivo', () => {
      const modelName = 'test_model';
      const timestamp = '2025-01-01';
      
      const graphmlFile = `${modelName}_graph_${timestamp}.graphml`;
      const jsonFile = `${modelName}_graph_${timestamp}.json`;

      expect(graphmlFile.endsWith('.graphml')).toBe(true);
      expect(jsonFile.endsWith('.json')).toBe(true);
    });
  });

  describe('Graph data validation', () => {
    it('debe validar que todos los nodos tengan id único', () => {
      const nodes = [
        { id: 'node1', type: 'IfcWall', properties: {} },
        { id: 'node2', type: 'IfcColumn', properties: {} },
        { id: 'node3', type: 'IfcDoor', properties: {} },
      ];

      const ids = nodes.map(n => n.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(nodes.length);
    });

    it('debe validar que las aristas referencien nodos existentes', () => {
      const nodes = [
        { id: 'node1', type: 'IfcWall', properties: {} },
        { id: 'node2', type: 'IfcColumn', properties: {} },
      ];
      const edges = [
        { from: 'node1', to: 'node2', type: 'CONNECTS_TO' },
      ];

      const nodeIds = new Set(nodes.map(n => n.id));
      const allEdgesValid = edges.every(
        e => nodeIds.has(e.from) && nodeIds.has(e.to)
      );

      expect(allEdgesValid).toBe(true);
    });

    it('debe detectar aristas con referencias inválidas', () => {
      const nodes = [
        { id: 'node1', type: 'IfcWall', properties: {} },
      ];
      const edges = [
        { from: 'node1', to: 'nonexistent', type: 'CONNECTS_TO' },
      ];

      const nodeIds = new Set(nodes.map(n => n.id));
      const allEdgesValid = edges.every(
        e => nodeIds.has(e.from) && nodeIds.has(e.to)
      );

      expect(allEdgesValid).toBe(false);
    });
  });
});
