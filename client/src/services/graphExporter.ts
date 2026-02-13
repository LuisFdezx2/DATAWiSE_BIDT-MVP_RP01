/**
 * Graph Exporter Service - Exportación de grafos a formatos estándar
 */

export interface GraphNode {
  id: string;
  type: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Exporta grafo a formato GraphML (XML)
 * GraphML es un formato estándar para grafos basado en XML
 */
export function exportToGraphML(graph: Graph): string {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const graphmlOpen = '<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n';
  
  // Definir atributos
  let keys = '';
  keys += '  <key id="d0" for="node" attr.name="type" attr.type="string"/>\n';
  keys += '  <key id="d1" for="node" attr.name="properties" attr.type="string"/>\n';
  keys += '  <key id="d2" for="edge" attr.name="type" attr.type="string"/>\n';
  
  // Abrir grafo
  let graphContent = '  <graph id="G" edgedefault="directed">\n';
  
  // Añadir nodos
  graph.nodes.forEach(node => {
    graphContent += `    <node id="${escapeXml(node.id)}">\n`;
    graphContent += `      <data key="d0">${escapeXml(node.type)}</data>\n`;
    graphContent += `      <data key="d1">${escapeXml(JSON.stringify(node.properties))}</data>\n`;
    graphContent += `    </node>\n`;
  });
  
  // Añadir aristas
  graph.edges.forEach((edge, index) => {
    graphContent += `    <edge id="e${index}" source="${escapeXml(edge.from)}" target="${escapeXml(edge.to)}">\n`;
    graphContent += `      <data key="d2">${escapeXml(edge.type)}</data>\n`;
    graphContent += `    </edge>\n`;
  });
  
  // Cerrar grafo y GraphML
  graphContent += '  </graph>\n';
  const graphmlClose = '</graphml>';
  
  return xmlHeader + graphmlOpen + keys + graphContent + graphmlClose;
}

/**
 * Exporta grafo a formato JSON
 */
export function exportToJSON(graph: Graph): string {
  return JSON.stringify(graph, null, 2);
}

/**
 * Descarga contenido como archivo
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapa caracteres especiales XML
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Exporta y descarga grafo en formato especificado
 */
export function exportGraph(graph: Graph, format: 'graphml' | 'json', modelName: string = 'graph') {
  const timestamp = new Date().toISOString().split('T')[0];
  
  if (format === 'graphml') {
    const content = exportToGraphML(graph);
    downloadFile(content, `${modelName}_graph_${timestamp}.graphml`, 'application/xml');
  } else if (format === 'json') {
    const content = exportToJSON(graph);
    downloadFile(content, `${modelName}_graph_${timestamp}.json`, 'application/json');
  }
}
