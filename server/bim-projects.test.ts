import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

/**
 * Crea un contexto de prueba autenticado
 */
function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "vbe6d",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("BIM Projects Router", () => {
  it("debería listar proyectos BIM del usuario autenticado", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const projects = await caller.bimProjects.list();

    expect(Array.isArray(projects)).toBe(true);
    // Los proyectos pueden estar vacíos inicialmente
  });

  it("debería crear un nuevo proyecto BIM", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bimProjects.create({
      name: "Proyecto de Prueba",
      description: "Este es un proyecto de prueba para validación",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
    expect(result.id).toBeGreaterThan(0);
  });

  it("debería obtener un proyecto BIM por ID", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Primero crear un proyecto
    const created = await caller.bimProjects.create({
      name: "Proyecto para Obtener",
      description: "Proyecto de prueba",
    });

    // Luego obtenerlo
    const project = await caller.bimProjects.get({ id: created.id });

    expect(project).toBeDefined();
    if (project) {
      expect(project.id).toBe(created.id);
      expect(project.name).toBe("Proyecto para Obtener");
      expect(project.ownerId).toBe(ctx.user!.id);
    }
  });

  it("debería actualizar un proyecto BIM existente", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Crear proyecto
    const created = await caller.bimProjects.create({
      name: "Proyecto Original",
      description: "Descripción original",
    });

    // Actualizar proyecto
    const updateResult = await caller.bimProjects.update({
      id: created.id,
      name: "Proyecto Actualizado",
      description: "Descripción actualizada",
    });

    expect(updateResult.success).toBe(true);

    // Verificar que se actualizó
    const updated = await caller.bimProjects.get({ id: created.id });
    expect(updated?.name).toBe("Proyecto Actualizado");
    expect(updated?.description).toBe("Descripción actualizada");
  });

  it("debería eliminar un proyecto BIM", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Crear proyecto
    const created = await caller.bimProjects.create({
      name: "Proyecto a Eliminar",
    });

    // Eliminar proyecto
    const deleteResult = await caller.bimProjects.delete({ id: created.id });
    expect(deleteResult.success).toBe(true);

    // Verificar que ya no existe
    const deleted = await caller.bimProjects.get({ id: created.id });
    expect(deleted).toBeUndefined();
  });
});

describe("IFC Models Router", () => {
  it("debería listar modelos IFC de un proyecto", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Crear un proyecto primero
    const project = await caller.bimProjects.create({
      name: "Proyecto con Modelos",
    });

    const models = await caller.ifcModels.list({ projectId: project.id });

    expect(Array.isArray(models)).toBe(true);
    // Los modelos pueden estar vacíos inicialmente
  });

  it("debería actualizar el estado de procesamiento de un modelo IFC", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Crear proyecto
    const project = await caller.bimProjects.create({
      name: "Proyecto para Modelo",
    });

    // Crear modelo IFC manualmente en la base de datos
    const { createIfcModel } = await import("./bim-db");
    const modelId = await createIfcModel({
      projectId: project.id,
      name: "Modelo de Prueba",
      ifcFileKey: "test/model.ifc",
      ifcFileUrl: "https://example.com/test/model.ifc",
      processingStatus: "pending",
    });

    // Actualizar estado
    const updateResult = await caller.ifcModels.updateStatus({
      id: modelId,
      status: "completed",
      qualityScore: 85,
    });

    expect(updateResult.success).toBe(true);

    // Verificar actualización
    const model = await caller.ifcModels.get({ id: modelId });
    expect(model?.processingStatus).toBe("completed");
    expect(model?.qualityScore).toBe(85);
  });
});

describe("Workflows Router", () => {
  it("debería listar flujos de trabajo de un proyecto", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Crear proyecto
    const project = await caller.bimProjects.create({
      name: "Proyecto con Workflows",
    });

    const workflows = await caller.workflows.list({ projectId: project.id });

    expect(Array.isArray(workflows)).toBe(true);
  });

  it("debería crear un nuevo flujo de trabajo", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Crear proyecto
    const project = await caller.bimProjects.create({
      name: "Proyecto para Workflow",
    });

    // Crear workflow
    const flowConfig = JSON.stringify({
      nodes: [
        { id: "1", type: "ifc-loader", position: { x: 0, y: 0 } },
        { id: "2", type: "filter-class", position: { x: 200, y: 0 } },
      ],
      edges: [{ source: "1", target: "2" }],
    });

    const result = await caller.workflows.create({
      projectId: project.id,
      name: "Flujo de Validación",
      description: "Flujo para validar modelos IFC",
      flowConfig,
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("debería obtener un flujo de trabajo por ID", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Crear proyecto y workflow
    const project = await caller.bimProjects.create({
      name: "Proyecto Test",
    });

    const flowConfig = JSON.stringify({
      nodes: [],
      edges: [],
    });

    const created = await caller.workflows.create({
      projectId: project.id,
      name: "Workflow Test",
      flowConfig,
    });

    // Obtener workflow
    const workflow = await caller.workflows.get({ id: created.id });

    expect(workflow).toBeDefined();
    if (workflow) {
      expect(workflow.id).toBe(created.id);
      expect(workflow.name).toBe("Workflow Test");
      expect(workflow.createdBy).toBe(ctx.user!.id);
    }
  });

  it("debería actualizar un flujo de trabajo existente", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Crear proyecto y workflow
    const project = await caller.bimProjects.create({
      name: "Proyecto Test",
    });

    const flowConfig = JSON.stringify({ nodes: [], edges: [] });

    const created = await caller.workflows.create({
      projectId: project.id,
      name: "Workflow Original",
      flowConfig,
    });

    // Actualizar workflow
    const newFlowConfig = JSON.stringify({
      nodes: [{ id: "1", type: "ifc-loader" }],
      edges: [],
    });

    const updateResult = await caller.workflows.update({
      id: created.id,
      name: "Workflow Actualizado",
      flowConfig: newFlowConfig,
    });

    expect(updateResult.success).toBe(true);

    // Verificar actualización
    const updated = await caller.workflows.get({ id: created.id });
    expect(updated?.name).toBe("Workflow Actualizado");
    expect(updated?.flowConfig).toBe(newFlowConfig);
  });
});
