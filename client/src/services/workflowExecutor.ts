import { Node, Edge } from "@xyflow/react";

export interface ExecutionResult {
  nodeId: string;
  nodeName: string;
  status: "success" | "error" | "skipped";
  message: string;
  data?: any;
  timestamp: number;
}

export interface WorkflowExecutionLog {
  results: ExecutionResult[];
  totalNodes: number;
  successCount: number;
  errorCount: number;
  duration: number;
}

/**
 * Ejecuta un workflow de nodos conectados secuencialmente
 * 
 * Este servicio simula la ejecución de un workflow BIM procesando nodos
 * en orden topológico basado en sus conexiones. En una implementación
 * real, cada nodo ejecutaría su lógica específica (cargar IFC, filtrar,
 * validar, etc.) y pasaría datos al siguiente nodo.
 */
export class WorkflowExecutor {
  /**
   * Construye el grafo de dependencias de nodos
   */
  private buildDependencyGraph(nodes: Node[], edges: Edge[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    // Inicializar todos los nodos
    nodes.forEach(node => {
      graph.set(node.id, []);
    });
    
    // Construir dependencias (nodos que deben ejecutarse antes)
    edges.forEach(edge => {
      const dependencies = graph.get(edge.target) || [];
      dependencies.push(edge.source);
      graph.set(edge.target, dependencies);
    });
    
    return graph;
  }

  /**
   * Ordena los nodos topológicamente para ejecución secuencial
   */
  private topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
    const graph = this.buildDependencyGraph(nodes, edges);
    const visited = new Set<string>();
    const result: Node[] = [];
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      const dependencies = graph.get(nodeId) || [];
      
      // Visitar dependencias primero
      dependencies.forEach(depId => visit(depId));
      
      // Añadir nodo actual
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        result.push(node);
      }
    };
    
    // Visitar todos los nodos
    nodes.forEach(node => visit(node.id));
    
    return result;
  }

  /**
   * Simula la ejecución de un nodo específico
   */
  private async executeNode(
    node: Node,
    inputData: any,
    onProgress?: (result: ExecutionResult) => void
  ): Promise<ExecutionResult> {
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const nodeName = node.data.label as string;
    const result: ExecutionResult = {
      nodeId: node.id,
      nodeName,
      status: "success",
      message: `Processed ${nodeName}`,
      data: { ...inputData, processedBy: nodeName },
      timestamp: Date.now(),
    };
    
    // Simular diferentes comportamientos según el tipo de nodo
    if (nodeName.includes("IFC File")) {
      result.message = "Loaded IFC file successfully";
      result.data = { elements: 1250, schema: "IFC4" };
    } else if (nodeName.includes("Filter")) {
      result.message = "Filtered elements by criteria";
      result.data = { ...inputData, filtered: true, count: 850 };
    } else if (nodeName.includes("Validate")) {
      result.message = "Validation completed";
      result.data = { ...inputData, valid: true, errors: 0 };
    } else if (nodeName.includes("Quality")) {
      result.message = "Quality score calculated";
      result.data = { ...inputData, score: 0.87 };
    } else if (nodeName.includes("Export")) {
      result.message = "Data exported successfully";
      result.data = { ...inputData, exported: true };
    }
    
    if (onProgress) {
      onProgress(result);
    }
    
    return result;
  }

  /**
   * Ejecuta el workflow completo
   */
  async execute(
    nodes: Node[],
    edges: Edge[],
    onProgress?: (result: ExecutionResult) => void
  ): Promise<WorkflowExecutionLog> {
    const startTime = Date.now();
    const results: ExecutionResult[] = [];
    
    // Validar que hay nodos
    if (nodes.length === 0) {
      throw new Error("No nodes to execute");
    }
    
    // Ordenar nodos topológicamente
    const sortedNodes = this.topologicalSort(nodes, edges);
    
    // Ejecutar nodos secuencialmente
    let currentData: any = {};
    
    for (const node of sortedNodes) {
      try {
        const result = await this.executeNode(node, currentData, onProgress);
        results.push(result);
        currentData = result.data;
      } catch (error) {
        const errorResult: ExecutionResult = {
          nodeId: node.id,
          nodeName: node.data.label as string,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
        };
        results.push(errorResult);
        if (onProgress) {
          onProgress(errorResult);
        }
        break; // Detener ejecución en caso de error
      }
    }
    
    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;
    
    return {
      results,
      totalNodes: nodes.length,
      successCount,
      errorCount,
      duration,
    };
  }
}
