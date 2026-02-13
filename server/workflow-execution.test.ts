import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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

  return { ctx };
}

describe("Workflow Execution", () => {
  it("should create a new workflow", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project first
    const project = await caller.bimProjects.create({
      name: "Test Project",
      description: "Project for testing",
    });

    const workflow = await caller.workflows.create({
      projectId: project.id,
      name: "Test Workflow",
      description: "Test workflow for unit testing",
      flowConfig: JSON.stringify({
        nodes: [
          { id: "1", type: "ifcFile", position: { x: 0, y: 0 }, data: {} },
          { id: "2", type: "filterByClass", position: { x: 200, y: 0 }, data: {} },
        ],
        edges: [{ id: "e1-2", source: "1", target: "2" }],
      }),
    });

    expect(workflow).toBeDefined();
    expect(workflow.id).toBeDefined();
  });

  it("should list workflows for a user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project first
    const project = await caller.bimProjects.create({
      name: "Test Project",
      description: "Project for testing",
    });

    // Create a workflow
    await caller.workflows.create({
      projectId: project.id,
      name: "Workflow 1",
      description: "First workflow",
      flowConfig: JSON.stringify({ nodes: [], edges: [] }),
    });

    const workflows = await caller.workflows.list({ projectId: project.id });

    expect(workflows).toBeDefined();
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);
  });

  it("should get a specific workflow by ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project first
    const project = await caller.bimProjects.create({
      name: "Test Project",
      description: "Project for testing",
    });

    // Create a workflow
    const created = await caller.workflows.create({
      projectId: project.id,
      name: "Test Workflow",
      description: "Test description",
      flowConfig: JSON.stringify({ nodes: [], edges: [] }),
    });

    // Retrieve it
    const workflow = await caller.workflows.get({ id: created.id });

    expect(workflow).toBeDefined();
    expect(workflow?.id).toBe(created.id);
    expect(workflow?.name).toBe("Test Workflow");
  });


});
