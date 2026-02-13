/**
 * Workflow Execution Engine
 * 
 * Executes node-based workflows sequentially, validating connections
 * and tracking progress in real-time.
 */

import { parseIDSFile } from './ids-parser';
import { validateAgainstIDS } from './ids-validation-service';
import { findBsddClassForIfcType, enrichIfcElementWithBsdd } from './bsdd-client';
import { getDb } from './db';
import { ifcModels, ifcElements, workflowExecutions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export type NodeType = 
  | 'ifc-loader'
  | 'filter-class'
  | 'filter-property'
  | 'ids-validator'
  | 'bsdd-mapper'
  | 'graph-builder'
  | 'quality-score'
  | 'export-csv'
  | 'export-json';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  data: {
    label: string;
    config?: Record<string, any>;
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowConfig {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ExecutionProgress {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  data?: any;
  error?: string;
}

export interface ExecutionResult {
  workflowId: number;
  executionId: number;
  status: 'success' | 'error' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  nodeResults: Map<string, any>;
  errors: Array<{ nodeId: string; error: string }>;
  summary: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    outputData?: any;
  };
}

export class WorkflowExecutor {
  private workflowId: number;
  private config: WorkflowConfig;
  private nodeResults: Map<string, any> = new Map();
  private progressCallback?: (progress: ExecutionProgress) => void;
  private executionId?: number;

  constructor(
    workflowId: number,
    config: WorkflowConfig,
    progressCallback?: (progress: ExecutionProgress) => void
  ) {
    this.workflowId = workflowId;
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * Validate workflow before execution
   */
  private validateWorkflow(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if there are nodes
    if (this.config.nodes.length === 0) {
      errors.push('Workflow has no nodes');
    }

    // Check for disconnected nodes (except input nodes)
    const connectedNodes = new Set<string>();
    this.config.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const inputNodeTypes: NodeType[] = ['ifc-loader'];
    this.config.nodes.forEach(node => {
      if (!inputNodeTypes.includes(node.type) && !connectedNodes.has(node.id)) {
        errors.push(`Node "${node.data.label}" (${node.id}) is not connected`);
      }
    });

    // Check for circular dependencies
    if (this.hasCircularDependency()) {
      errors.push('Workflow contains circular dependencies');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect circular dependencies using DFS
   */
  private hasCircularDependency(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = this.config.edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (dfs(edge.target)) return true;
        } else if (recursionStack.has(edge.target)) {
          return true; // Circular dependency detected
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of this.config.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  /**
   * Get execution order using topological sort
   */
  private getExecutionOrder(): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    this.config.nodes.forEach(node => {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    });

    // Build adjacency list and in-degree count
    this.config.edges.forEach(edge => {
      adjList.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no dependencies
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = adjList.get(current) || [];
      neighbors.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result;
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: WorkflowNode): Promise<any> {
    this.updateProgress(node.id, 'running', 0, `Executing ${node.data.label}...`);

    try {
      let result: any;

      switch (node.type) {
        case 'ifc-loader':
          result = await this.executeIfcLoader(node);
          break;
        
        case 'filter-class':
          result = await this.executeFilterClass(node);
          break;
        
        case 'filter-property':
          result = await this.executeFilterProperty(node);
          break;
        
        case 'ids-validator':
          result = await this.executeIdsValidator(node);
          break;
        
        case 'bsdd-mapper':
          result = await this.executeBsddMapper(node);
          break;
        
        case 'quality-score':
          result = await this.executeQualityScore(node);
          break;
        
        case 'export-csv':
        case 'export-json':
          result = await this.executeExport(node);
          break;
        
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      this.nodeResults.set(node.id, result);
      this.updateProgress(node.id, 'completed', 100, `Completed ${node.data.label}`);
      
      return result;
    } catch (error: any) {
      this.updateProgress(node.id, 'error', 0, `Error in ${node.data.label}`, error.message);
      throw error;
    }
  }

  /**
   * Execute IFC Loader node
   */
  private async executeIfcLoader(node: WorkflowNode): Promise<any> {
    const config = node.data.config || {};
    const modelId = config.modelId;

    if (!modelId) {
      throw new Error('IFC Loader: No model ID specified');
    }

    // Get model from database
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [model] = await db.select().from(ifcModels).where(eq(ifcModels.id, modelId)).limit(1);
    
    if (!model) {
      throw new Error(`IFC Loader: Model ${modelId} not found`);
    }

    // Get elements
    const elements = await db.select().from(ifcElements).where(eq(ifcElements.modelId, modelId));

    return {
      model,
      elements,
      elementCount: elements.length
    };
  }

  /**
   * Execute Filter by Class node
   */
  private async executeFilterClass(node: WorkflowNode): Promise<any> {
    const config = node.data.config || {};
    const classFilter = config.ifcClass || '';

    // Get input from previous node
    const inputData = this.getInputData(node.id);
    if (!inputData || !inputData.elements) {
      throw new Error('Filter Class: No input elements');
    }

    const filtered = inputData.elements.filter((el: any) => 
      el.type.toLowerCase().includes(classFilter.toLowerCase())
    );

    return {
      ...inputData,
      elements: filtered,
      elementCount: filtered.length,
      filterApplied: `Class: ${classFilter}`
    };
  }

  /**
   * Execute Filter by Property node
   */
  private async executeFilterProperty(node: WorkflowNode): Promise<any> {
    const config = node.data.config || {};
    const propertyName = config.propertyName || '';
    const propertyValue = config.propertyValue || '';

    const inputData = this.getInputData(node.id);
    if (!inputData || !inputData.elements) {
      throw new Error('Filter Property: No input elements');
    }

    const filtered = inputData.elements.filter((el: any) => {
      const props = typeof el.properties === 'string' ? JSON.parse(el.properties) : el.properties;
      return props && props[propertyName] === propertyValue;
    });

    return {
      ...inputData,
      elements: filtered,
      elementCount: filtered.length,
      filterApplied: `Property: ${propertyName} = ${propertyValue}`
    };
  }

  /**
   * Execute IDS Validator node
   */
  private async executeIdsValidator(node: WorkflowNode): Promise<any> {
    const config = node.data.config || {};
    const idsContent = config.idsContent;

    if (!idsContent) {
      throw new Error('IDS Validator: No IDS specification provided');
    }

    const inputData = this.getInputData(node.id);
    if (!inputData || !inputData.elements) {
      throw new Error('IDS Validator: No input elements');
    }

    // Parse IDS
    const idsSpec = await parseIDSFile(idsContent);
    
    // Validate
    const validationResult = await validateAgainstIDS(inputData.elements, idsSpec);

    return {
      ...inputData,
      validation: validationResult,
      complianceRate: validationResult.complianceRate || 0
    };
  }

  /**
   * Execute bSDD Mapper node
   */
  private async executeBsddMapper(node: WorkflowNode): Promise<any> {
    const inputData = this.getInputData(node.id);
    if (!inputData || !inputData.elements) {
      throw new Error('bSDD Mapper: No input elements');
    }

    const enrichedElements = [];
    for (const element of inputData.elements) {
      try {
        const bsddClass = await findBsddClassForIfcType(element.type);
        if (bsddClass) {
          const enriched = await enrichIfcElementWithBsdd(element, bsddClass);
          enrichedElements.push(enriched);
        } else {
          enrichedElements.push(element);
        }
      } catch (error) {
        // Continue with next element if enrichment fails
        enrichedElements.push(element);
      }
    }

    return {
      ...inputData,
      elements: enrichedElements,
      enrichmentRate: enrichedElements.filter(e => e.bsddEnriched).length / enrichedElements.length
    };
  }

  /**
   * Execute Quality Score node
   */
  private async executeQualityScore(node: WorkflowNode): Promise<any> {
    const inputData = this.getInputData(node.id);
    if (!inputData || !inputData.elements) {
      throw new Error('Quality Score: No input elements');
    }

    // Calculate FAIR scores
    const elements = inputData.elements;
    const totalElements = elements.length;

    // Findability: elements with GUID
    const findable = elements.filter((e: any) => e.guid).length;
    
    // Accessibility: elements with properties
    const accessible = elements.filter((e: any) => {
      const props = typeof e.properties === 'string' ? JSON.parse(e.properties) : e.properties;
      return props && Object.keys(props).length > 0;
    }).length;
    
    // Interoperability: elements with standard IFC type
    const interoperable = elements.filter((e: any) => e.type.startsWith('Ifc')).length;
    
    // Reusability: elements with bSDD enrichment
    const reusable = elements.filter((e: any) => e.bsddEnriched).length;

    const scores = {
      findability: (findable / totalElements) * 100,
      accessibility: (accessible / totalElements) * 100,
      interoperability: (interoperable / totalElements) * 100,
      reusability: (reusable / totalElements) * 100
    };

    const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / 4;

    return {
      ...inputData,
      qualityScores: scores,
      overallQuality: overallScore
    };
  }

  /**
   * Execute Export node
   */
  private async executeExport(node: WorkflowNode): Promise<any> {
    const inputData = this.getInputData(node.id);
    if (!inputData) {
      throw new Error('Export: No input data');
    }

    const format = node.type === 'export-csv' ? 'csv' : 'json';
    
    return {
      ...inputData,
      exportFormat: format,
      exportReady: true
    };
  }

  /**
   * Get input data for a node from its predecessors
   */
  private getInputData(nodeId: string): any {
    const incomingEdges = this.config.edges.filter(e => e.target === nodeId);
    
    if (incomingEdges.length === 0) {
      return null;
    }

    // For now, take the first input (can be extended for multiple inputs)
    const sourceNodeId = incomingEdges[0].source;
    return this.nodeResults.get(sourceNodeId);
  }

  /**
   * Update execution progress
   */
  private updateProgress(
    nodeId: string,
    status: ExecutionProgress['status'],
    progress: number,
    message: string,
    error?: string
  ) {
    if (this.progressCallback) {
      this.progressCallback({
        nodeId,
        status,
        progress,
        message,
        error
      });
    }
  }

  /**
   * Execute the entire workflow
   */
  async execute(): Promise<ExecutionResult> {
    const startTime = new Date();
    const errors: Array<{ nodeId: string; error: string }> = [];

    try {
      // Validate workflow
      const validation = this.validateWorkflow();
      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // Create execution record
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const result = await db.insert(workflowExecutions).values({
        workflowId: this.workflowId,
        status: 'running',
        startedAt: startTime,
        results: JSON.stringify({})
      });
      
      // Get the inserted ID from the result
      const execution = { id: Number((result as any)[0]?.insertId || Date.now()) };

      this.executionId = execution.id;

      // Get execution order
      const executionOrder = this.getExecutionOrder();

      // Execute nodes in order
      let completedNodes = 0;
      for (const nodeId of executionOrder) {
        const node = this.config.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        try {
          await this.executeNode(node);
          completedNodes++;
        } catch (error: any) {
          errors.push({
            nodeId,
            error: error.message
          });
          // Continue execution for non-critical errors
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Get final output (from last node)
      const lastNodeId = executionOrder[executionOrder.length - 1];
      const outputData = this.nodeResults.get(lastNodeId);

      // Update execution record
      const dbUpdate = await getDb();
      if (dbUpdate) {
        await dbUpdate.update(workflowExecutions)
        .set({
          status: errors.length === 0 ? 'completed' : 'failed',
          completedAt: endTime,
          results: JSON.stringify({
            nodeResults: Array.from(this.nodeResults.entries()),
            errors,
            summary: {
              totalNodes: this.config.nodes.length,
              completedNodes,
              failedNodes: errors.length,
              outputData
            }
          })
        })
        .where(eq(workflowExecutions.id, execution.id));
      }

      return {
        workflowId: this.workflowId,
        executionId: execution.id,
        status: errors.length === 0 ? 'success' : (completedNodes > 0 ? 'partial' : 'error'),
        startTime,
        endTime,
        duration,
        nodeResults: this.nodeResults,
        errors,
        summary: {
          totalNodes: this.config.nodes.length,
          completedNodes,
          failedNodes: errors.length,
          outputData
        }
      };

    } catch (error: any) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update execution record as failed
      if (this.executionId) {
        const dbFail = await getDb();
        if (dbFail) {
          await dbFail.update(workflowExecutions)
          .set({
            status: 'failed',
            completedAt: endTime,
            results: JSON.stringify({
              error: error.message,
              errors
            })
          })
          .where(eq(workflowExecutions.id, this.executionId));
        }
      }

      throw error;
    }
  }
}

/**
 * Execute a workflow by ID
 */
export async function executeWorkflow(
  workflowId: number,
  config: WorkflowConfig,
  progressCallback?: (progress: ExecutionProgress) => void
): Promise<ExecutionResult> {
  const executor = new WorkflowExecutor(workflowId, config, progressCallback);
  return await executor.execute();
}
