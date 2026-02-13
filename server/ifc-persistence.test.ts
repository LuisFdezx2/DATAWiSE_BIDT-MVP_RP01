import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb, getOrCreateDefaultProject, saveIfcModel, saveIfcElements, listIfcModels, getIfcModelById } from './db';

describe('IFC Model Persistence', () => {
  let testUserId: number;
  let testProjectId: number;

  beforeAll(async () => {
    // Usar un ID de usuario de prueba
    testUserId = 1;
  });

  it('debería crear o obtener proyecto por defecto', async () => {
    const project = await getOrCreateDefaultProject(testUserId, 'Test User');
    
    expect(project).toBeDefined();
    expect(project.id).toBeGreaterThan(0);
    expect(project.ownerId).toBe(testUserId);
    
    testProjectId = project.id;
  });

  it('debería guardar modelo IFC en base de datos', async () => {
    const modelId = await saveIfcModel({
      projectId: testProjectId,
      name: 'test-model.ifc',
      ifcFileUrl: 'https://example.com/test-model.ifc',
      ifcSchema: 'IFC4',
      elementCount: 10,
      statistics: {
        totalElements: 10,
        elementsByType: {
          'IfcWall': 5,
          'IfcWindow': 3,
          'IfcDoor': 2,
        },
      },
    });

    expect(modelId).toBeGreaterThan(0);
  });

  it('debería guardar elementos IFC en base de datos', async () => {
    // Primero guardar un modelo
    const modelId = await saveIfcModel({
      projectId: testProjectId,
      name: 'test-model-2.ifc',
      ifcFileUrl: 'https://example.com/test-model-2.ifc',
      ifcSchema: 'IFC4',
      elementCount: 3,
    });

    const elements = [
      {
        expressId: 100,
        ifcType: 'IfcWall',
        name: 'Wall-001',
        globalId: 'abc123',
        properties: { height: 3.0, width: 0.2 },
      },
      {
        expressId: 101,
        ifcType: 'IfcWindow',
        name: 'Window-001',
        globalId: 'def456',
        properties: { height: 1.5, width: 1.0 },
      },
      {
        expressId: 102,
        ifcType: 'IfcDoor',
        name: 'Door-001',
        globalId: 'ghi789',
        properties: { height: 2.1, width: 0.9 },
      },
    ];

    await saveIfcElements(modelId, elements);

    // Verificar que se guardaron
    const savedModel = await getIfcModelById(modelId);
    expect(savedModel).toBeDefined();
    expect(savedModel!.elements.length).toBe(3);
  });

  it('debería listar modelos IFC de un proyecto', async () => {
    const models = await listIfcModels(testProjectId);
    
    expect(models).toBeDefined();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it('debería obtener modelo IFC por ID con elementos', async () => {
    // Primero guardar un modelo con elementos
    const modelId = await saveIfcModel({
      projectId: testProjectId,
      name: 'test-model-3.ifc',
      ifcFileUrl: 'https://example.com/test-model-3.ifc',
      ifcSchema: 'IFC2x3',
      elementCount: 2,
      statistics: {
        totalElements: 2,
        elementsByType: {
          'IfcWall': 2,
        },
      },
    });

    await saveIfcElements(modelId, [
      {
        expressId: 200,
        ifcType: 'IfcWall',
        name: 'Wall-A',
        globalId: 'wall-a-guid',
      },
      {
        expressId: 201,
        ifcType: 'IfcWall',
        name: 'Wall-B',
        globalId: 'wall-b-guid',
      },
    ]);

    const model = await getIfcModelById(modelId);
    
    expect(model).toBeDefined();
    expect(model!.id).toBe(modelId);
    expect(model!.name).toBe('test-model-3.ifc');
    expect(model!.ifcSchema).toBe('IFC2x3');
    expect(model!.elements.length).toBe(2);
    expect(model!.elements[0].ifcType).toBe('IfcWall');
  });

  it('debería retornar null para modelo inexistente', async () => {
    const model = await getIfcModelById(999999);
    expect(model).toBeNull();
  });
});

describe('IFC Router - Saved Models', () => {
  const caller = appRouter.createCaller({
    user: {
      id: 1,
      openId: 'test-open-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: 'oauth',
    },
  });

  it('debería listar modelos guardados', async () => {
    const result = await caller.ifc.listSavedModels({});
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.models)).toBe(true);
  });

  it('debería obtener modelo guardado por ID', async () => {
    // Primero listar para obtener un ID válido
    const listResult = await caller.ifc.listSavedModels({});
    
    if (listResult.models && listResult.models.length > 0) {
      const modelId = listResult.models[0].id;
      const result = await caller.ifc.getSavedModel({ modelId });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.model).toBeDefined();
        expect(result.model.id).toBe(modelId);
      }
    }
  });

  it('debería retornar error para modelo inexistente', async () => {
    const result = await caller.ifc.getSavedModel({ modelId: 999999 });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
