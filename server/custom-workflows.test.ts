import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

describe("Custom Workflows Management", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testUserId: number;

  beforeAll(async () => {
    // Crear usuario de prueba con openId único
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const uniqueId = `test-workflow-user-${Date.now()}`;
    const result = await db.insert(users).values({
      openId: uniqueId,
      name: "Workflow Test User",
      email: `workflow-${Date.now()}@test.com`,
      role: "user",
    });

    testUserId = Number(result[0].insertId);

    // Crear caller con contexto de usuario
    const ctx: TrpcContext = {
      user: {
        id: testUserId,
        openId: uniqueId,
        name: "Workflow Test User",
        email: `workflow-${Date.now()}@test.com`,
        role: "user",
        loginMethod: "vbe6d",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as any,
      res: {} as any,
    };

    caller = appRouter.createCaller(ctx);
  });

  describe("saveCustom", () => {
    it("debería guardar un workflow personalizado con configuración de nodos", async () => {
      const flowConfig = JSON.stringify({
        nodes: [
          { id: "1", type: "default", position: { x: 100, y: 100 }, data: { label: "IFC File" } },
          { id: "2", type: "default", position: { x: 300, y: 100 }, data: { label: "Validate IDS" } },
        ],
        edges: [{ id: "e1-2", source: "1", target: "2" }],
      });

      const result = await caller.workflows.saveCustom({
        name: "Mi Workflow de Validación",
        description: "Workflow personalizado para validar IFC",
        flowConfig,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
    });

    it("debería guardar workflow sin descripción", async () => {
      const flowConfig = JSON.stringify({
        nodes: [{ id: "1", type: "default", position: { x: 100, y: 100 }, data: { label: "IFC File" } }],
        edges: [],
      });

      const result = await caller.workflows.saveCustom({
        name: "Workflow Simple",
        flowConfig,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
    });

    it("debería fallar si el nombre está vacío", async () => {
      await expect(
        caller.workflows.saveCustom({
          name: "",
          flowConfig: "{}",
        })
      ).rejects.toThrow();
    });
  });

  describe("listCustom", () => {
    it("debería listar todos los workflows del usuario", async () => {
      const workflows = await caller.workflows.listCustom();

      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThan(0);
      
      // Verificar que todos los workflows pertenecen al usuario
      workflows.forEach((workflow: any) => {
        expect(workflow.createdBy).toBe(testUserId);
        expect(workflow.name).toBeDefined();
        expect(workflow.flowConfig).toBeDefined();
      });
    });

    it("debería retornar workflows ordenados por fecha de actualización", async () => {
      const workflows = await caller.workflows.listCustom();

      if (workflows.length > 1) {
        for (let i = 0; i < workflows.length - 1; i++) {
          const current = new Date(workflows[i].updatedAt).getTime();
          const next = new Date(workflows[i + 1].updatedAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });

  describe("updateCustom", () => {
    it("debería actualizar el nombre de un workflow", async () => {
      // Primero crear un workflow
      const flowConfig = JSON.stringify({
        nodes: [{ id: "1", type: "default", position: { x: 100, y: 100 }, data: { label: "Test" } }],
        edges: [],
      });

      const created = await caller.workflows.saveCustom({
        name: "Workflow Original",
        flowConfig,
      });

      // Actualizar nombre
      const result = await caller.workflows.updateCustom({
        id: created.id,
        name: "Workflow Actualizado",
      });

      expect(result.success).toBe(true);

      // Verificar que se actualizó
      const workflows = await caller.workflows.listCustom();
      const updated = workflows.find((w: any) => w.id === created.id);
      expect(updated?.name).toBe("Workflow Actualizado");
    });

    it("debería actualizar la descripción de un workflow", async () => {
      const flowConfig = JSON.stringify({
        nodes: [{ id: "1", type: "default", position: { x: 100, y: 100 }, data: { label: "Test" } }],
        edges: [],
      });

      const created = await caller.workflows.saveCustom({
        name: "Workflow para Actualizar",
        description: "Descripción original",
        flowConfig,
      });

      const result = await caller.workflows.updateCustom({
        id: created.id,
        description: "Descripción actualizada",
      });

      expect(result.success).toBe(true);

      const workflows = await caller.workflows.listCustom();
      const updated = workflows.find((w: any) => w.id === created.id);
      expect(updated?.description).toBe("Descripción actualizada");
    });

    it("debería fallar al actualizar workflow de otro usuario", async () => {
      // Crear otro usuario
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const otherUniqueId = `other-workflow-user-${Date.now()}`;
      const otherUserResult = await db.insert(users).values({
        openId: otherUniqueId,
        name: "Other User",
        email: `other-${Date.now()}@test.com`,
        role: "user",
      });

      const otherUserId = Number(otherUserResult[0].insertId);

      // Crear caller para el otro usuario
      const otherCtx: TrpcContext = {
        user: {
          id: otherUserId,
          openId: otherUniqueId,
          name: "Other User",
          email: `other-${Date.now()}@test.com`,
          role: "user",
          loginMethod: "vbe6d",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: { protocol: "https", headers: {} } as any,
        res: {} as any,
      };

      const otherCaller = appRouter.createCaller(otherCtx);

      // Crear workflow con el primer usuario
      const flowConfig = JSON.stringify({
        nodes: [{ id: "1", type: "default", position: { x: 100, y: 100 }, data: { label: "Test" } }],
        edges: [],
      });

      const created = await caller.workflows.saveCustom({
        name: "Workflow Privado",
        flowConfig,
      });

      // Intentar actualizar con el otro usuario
      await expect(
        otherCaller.workflows.updateCustom({
          id: created.id,
          name: "Intento de Hackeo",
        })
      ).rejects.toThrow();
    });
  });

  describe("deleteCustom", () => {
    it("debería eliminar un workflow del usuario", async () => {
      // Crear workflow
      const flowConfig = JSON.stringify({
        nodes: [{ id: "1", type: "default", position: { x: 100, y: 100 }, data: { label: "Test" } }],
        edges: [],
      });

      const created = await caller.workflows.saveCustom({
        name: "Workflow a Eliminar",
        flowConfig,
      });

      // Eliminar
      const result = await caller.workflows.deleteCustom({
        id: created.id,
      });

      expect(result.success).toBe(true);

      // Verificar que ya no existe
      const workflows = await caller.workflows.listCustom();
      const deleted = workflows.find((w: any) => w.id === created.id);
      expect(deleted).toBeUndefined();
    });

    it("debería fallar al eliminar workflow de otro usuario", async () => {
      // Crear otro usuario
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const anotherUniqueId = `another-workflow-user-${Date.now()}`;
      const otherUserResult = await db.insert(users).values({
        openId: anotherUniqueId,
        name: "Another User",
        email: `another-${Date.now()}@test.com`,
        role: "user",
      });

      const otherUserId = Number(otherUserResult[0].insertId);

      const anotherCtx: TrpcContext = {
        user: {
          id: otherUserId,
          openId: anotherUniqueId,
          name: "Another User",
          email: `another-${Date.now()}@test.com`,
          role: "user",
          loginMethod: "vbe6d",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: { protocol: "https", headers: {} } as any,
        res: {} as any,
      };

      const otherCaller = appRouter.createCaller(anotherCtx);

      // Crear workflow con el primer usuario
      const flowConfig = JSON.stringify({
        nodes: [{ id: "1", type: "default", position: { x: 100, y: 100 }, data: { label: "Test" } }],
        edges: [],
      });

      const created = await caller.workflows.saveCustom({
        name: "Workflow Protegido",
        flowConfig,
      });

      // Intentar eliminar con el otro usuario
      await expect(
        otherCaller.workflows.deleteCustom({
          id: created.id,
        })
      ).rejects.toThrow();
    });
  });

  describe("Flujo completo de gestión de workflows", () => {
    it("debería crear, listar, actualizar y eliminar un workflow", async () => {
      // 1. Crear
      const flowConfig = JSON.stringify({
        nodes: [
          { id: "1", type: "default", position: { x: 100, y: 100 }, data: { label: "IFC File" } },
          { id: "2", type: "default", position: { x: 300, y: 100 }, data: { label: "Filter" } },
          { id: "3", type: "default", position: { x: 500, y: 100 }, data: { label: "Export" } },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2" },
          { id: "e2-3", source: "2", target: "3" },
        ],
      });

      const created = await caller.workflows.saveCustom({
        name: "Workflow Completo",
        description: "Workflow de prueba completo",
        flowConfig,
      });

      expect(created.success).toBe(true);

      // 2. Listar y verificar que existe
      let workflows = await caller.workflows.listCustom();
      let found = workflows.find((w: any) => w.id === created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe("Workflow Completo");

      // 3. Actualizar
      await caller.workflows.updateCustom({
        id: created.id,
        name: "Workflow Completo Actualizado",
        description: "Descripción actualizada",
      });

      workflows = await caller.workflows.listCustom();
      found = workflows.find((w: any) => w.id === created.id);
      expect(found?.name).toBe("Workflow Completo Actualizado");
      expect(found?.description).toBe("Descripción actualizada");

      // 4. Eliminar
      await caller.workflows.deleteCustom({ id: created.id });

      workflows = await caller.workflows.listCustom();
      found = workflows.find((w: any) => w.id === created.id);
      expect(found).toBeUndefined();
    });
  });
});
