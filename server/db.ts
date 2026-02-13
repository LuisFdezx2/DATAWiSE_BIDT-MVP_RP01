import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  ifcModels, 
  InsertIfcModel, 
  ifcElements, 
  InsertIfcElement,
  bimProjects,
  InsertBimProject,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Crear o obtener proyecto BIM por defecto para el usuario
 */
export async function getOrCreateDefaultProject(userId: number, userName: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Buscar proyecto por defecto del usuario
  const existingProjects = await db
    .select()
    .from(bimProjects)
    .where(eq(bimProjects.ownerId, userId))
    .limit(1);

  if (existingProjects.length > 0) {
    return existingProjects[0];
  }

  // Crear proyecto por defecto
  const newProject: InsertBimProject = {
    name: `${userName}'s Project`,
    description: "Default project for IFC models",
    ownerId: userId,
  };

  const result = await db.insert(bimProjects).values(newProject);
  const projectId = Number(result[0].insertId);

  return {
    id: projectId,
    ...newProject,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Guardar modelo IFC en base de datos
 */
export async function saveIfcModel(model: {
  projectId: number;
  name: string;
  ifcFileUrl: string;
  ifcSchema?: string;
  elementCount?: number;
  statistics?: any;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const insertData: InsertIfcModel = {
    projectId: model.projectId,
    name: model.name,
    ifcFileKey: model.ifcFileUrl.split('/').pop() || '',
    ifcFileUrl: model.ifcFileUrl,
    ifcSchema: model.ifcSchema,
    processingStatus: "completed",
    elementCount: model.elementCount,
    statistics: model.statistics ? JSON.stringify(model.statistics) : null,
  };

  const result = await db.insert(ifcModels).values(insertData);
  const modelId = Number(result[0].insertId);

  return modelId;
}

/**
 * Guardar elementos IFC en base de datos (batch insert)
 */
export async function saveIfcElements(modelId: number, elements: Array<{
  expressId: number;
  ifcType: string;
  name?: string;
  globalId?: string;
  properties?: any;
}>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  if (elements.length === 0) {
    return;
  }

  const insertData: InsertIfcElement[] = elements.map(element => ({
    modelId,
    expressId: element.expressId,
    ifcType: element.ifcType,
    name: element.name || null,
    globalId: element.globalId || null,
    properties: element.properties ? JSON.stringify(element.properties) : null,
    bsddClassifications: null,
  }));

  // Insertar en lotes de 100 para evitar límites de MySQL
  const batchSize = 100;
  for (let i = 0; i < insertData.length; i += batchSize) {
    const batch = insertData.slice(i, i + batchSize);
    await db.insert(ifcElements).values(batch);
  }
}

/**
 * Listar modelos IFC de un proyecto
 */
export async function listIfcModels(projectId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.projectId, projectId))
    .orderBy(ifcModels.createdAt);
}

/**
 * Alias para listIfcModels (para compatibilidad)
 */
export const getIfcModelsByProject = listIfcModels;

/**
 * Obtener elementos IFC de un modelo (para validación IDS)
 */
export async function getIfcModelElements(modelId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const elements = await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.modelId, modelId));

  // Convertir a formato IfcElementData
  return elements.map(el => ({
    expressId: el.expressId,
    type: el.ifcType,
    globalId: el.globalId || undefined,
    name: el.name || undefined,
    properties: (el.properties ? JSON.parse(el.properties as string) : {}) as Record<string, any>,
  }));
}

/**
 * Obtener modelo IFC por ID con sus elementos
 */
export async function getIfcModelById(modelId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const models = await db
    .select()
    .from(ifcModels)
    .where(eq(ifcModels.id, modelId))
    .limit(1);

  if (models.length === 0) {
    return null;
  }

  const model = models[0];

  // Obtener elementos del modelo
  const elements = await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.modelId, modelId));

  return {
    ...model,
    elements,
  };
}

/**
 * Listar todos los usuarios (solo para administradores)
 */
export async function listAllUsers() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(users)
    .orderBy(users.createdAt);
}

/**
 * Actualizar rol de usuario
 */
export async function updateUserRole(userId: number, role: 'admin' | 'user') {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId));
}
