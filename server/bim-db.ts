import { eq, and, desc } from "drizzle-orm";
import { 
  bimProjects, 
  ifcModels, 
  workflows, 
  workflowExecutions, 
  ifcElements,
  InsertBimProject,
  InsertIfcModel,
  InsertWorkflow,
  InsertWorkflowExecution,
  InsertIfcElement
} from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Funciones helper para gestionar proyectos BIM
 */

export async function createBimProject(project: InsertBimProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(bimProjects).values(project);
  return Number(result[0].insertId);
}

export async function getBimProjectsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(bimProjects)
    .where(eq(bimProjects.ownerId, ownerId))
    .orderBy(desc(bimProjects.updatedAt));
}

export async function getBimProjectById(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(bimProjects)
    .where(eq(bimProjects.id, projectId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function updateBimProject(projectId: number, updates: Partial<InsertBimProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(bimProjects)
    .set(updates)
    .where(eq(bimProjects.id, projectId));
}

export async function deleteBimProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(bimProjects).where(eq(bimProjects.id, projectId));
}

/**
 * Funciones helper para gestionar modelos IFC
 */

export async function createIfcModel(model: InsertIfcModel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ifcModels).values(model);
  return Number(result[0].insertId);
}

export async function getIfcModelsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.projectId, projectId))
    .orderBy(desc(ifcModels.updatedAt));
}

export async function getIfcModelById(modelId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.id, modelId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function updateIfcModel(modelId: number, updates: Partial<InsertIfcModel>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(ifcModels)
    .set(updates)
    .where(eq(ifcModels.id, modelId));
}

export async function deleteIfcModel(modelId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(ifcModels).where(eq(ifcModels.id, modelId));
}

/**
 * Funciones helper para gestionar workflows
 */

export async function createWorkflow(workflow: InsertWorkflow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workflows).values(workflow);
  return Number(result[0].insertId);
}

export async function getWorkflowsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(workflows)
    .where(eq(workflows.projectId, projectId))
    .orderBy(desc(workflows.updatedAt));
}

export async function getWorkflowsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(workflows)
    .where(eq(workflows.createdBy, userId))
    .orderBy(desc(workflows.updatedAt));
}

export async function getWorkflowById(workflowId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, workflowId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function updateWorkflow(workflowId: number, updates: Partial<InsertWorkflow>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(workflows)
    .set(updates)
    .where(eq(workflows.id, workflowId));
}

export async function deleteWorkflow(workflowId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(workflows).where(eq(workflows.id, workflowId));
}

/**
 * Funciones helper para gestionar ejecuciones de workflows
 */

export async function createWorkflowExecution(execution: InsertWorkflowExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(workflowExecutions).values(execution);
  return Number(result[0].insertId);
}

export async function getWorkflowExecutionsByWorkflow(workflowId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.workflowId, workflowId))
    .orderBy(desc(workflowExecutions.startedAt));
}

export async function getWorkflowExecutionById(executionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, executionId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function updateWorkflowExecution(executionId: number, updates: Partial<InsertWorkflowExecution>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(workflowExecutions)
    .set(updates)
    .where(eq(workflowExecutions.id, executionId));
}

/**
 * Funciones helper para gestionar elementos IFC
 */

export async function createIfcElement(element: InsertIfcElement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ifcElements).values(element);
  return Number(result[0].insertId);
}

export async function createIfcElementsBatch(elements: InsertIfcElement[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (elements.length === 0) return;
  
  // Insertar en lotes de 1000 para evitar límites de MySQL
  const batchSize = 1000;
  for (let i = 0; i < elements.length; i += batchSize) {
    const batch = elements.slice(i, i + batchSize);
    await db.insert(ifcElements).values(batch);
  }
}

export async function getIfcElementsByModel(modelId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.modelId, modelId));
}

export async function getIfcElementsByType(modelId: number, ifcType: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(ifcElements)
    .where(and(
      eq(ifcElements.modelId, modelId),
      eq(ifcElements.ifcType, ifcType)
    ));
}

export async function getIfcElementById(elementId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.id, elementId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteIfcElementsByModel(modelId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(ifcElements).where(eq(ifcElements.modelId, modelId));
}
