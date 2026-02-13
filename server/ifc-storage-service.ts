/**
 * IFC Storage Service
 * Handles persistent storage of IFC files and processed fragments in S3
 */

import { storagePut } from './storage';
import { getDb } from './db';
import { ifcModels } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export interface IFCUploadOptions {
  projectId: number;
  fileName: string;
  fileBuffer: Buffer;
  description?: string;
}

export interface IFCUploadResult {
  modelId: number;
  ifcFileKey: string;
  ifcFileUrl: string;
  fileSize: number;
}

/**
 * Generate a unique S3 key for IFC file to prevent enumeration
 */
function generateIfcFileKey(projectId: number, fileName: string): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `projects/${projectId}/ifc/${timestamp}-${randomSuffix}-${sanitizedName}`;
}

/**
 * Generate a unique S3 key for processed fragments
 */
function generateFragmentsKey(projectId: number, modelId: number): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  return `projects/${projectId}/fragments/${modelId}-${timestamp}-${randomSuffix}.frag`;
}

/**
 * Upload IFC file to S3 and create database record
 */
export async function uploadIfcFile(options: IFCUploadOptions): Promise<IFCUploadResult> {
  const { projectId, fileName, fileBuffer, description } = options;
  
  // Generate unique S3 key
  const ifcFileKey = generateIfcFileKey(projectId, fileName);
  
  // Upload to S3
  const { url: ifcFileUrl } = await storagePut(
    ifcFileKey,
    fileBuffer,
    'application/x-step' // MIME type for IFC files
  );
  
  // Create database record
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result = await db.insert(ifcModels).values({
    projectId,
    name: fileName,
    description: description || null,
    ifcFileKey,
    ifcFileUrl,
    fileSize: fileBuffer.length,
    processingStatus: 'pending',
  });
  
  const modelId = Number((result as any)[0]?.insertId || Date.now());
  
  return {
    modelId,
    ifcFileKey,
    ifcFileUrl,
    fileSize: fileBuffer.length,
  };
}

/**
 * Store processed 3D fragments in S3
 */
export async function storeFragments(
  modelId: number,
  projectId: number,
  fragmentsBuffer: Buffer
): Promise<{ fragmentsKey: string; fragmentsUrl: string }> {
  // Generate unique S3 key for fragments
  const fragmentsKey = generateFragmentsKey(projectId, modelId);
  
  // Upload fragments to S3
  const { url: fragmentsUrl } = await storagePut(
    fragmentsKey,
    fragmentsBuffer,
    'application/octet-stream'
  );
  
  // Update model record with fragments info
  const db = await getDb();
  if (db) {
    await db.update(ifcModels)
      .set({
        fragmentsKey,
        fragmentsUrl,
      })
      .where(eq(ifcModels.id, modelId));
  }
  
  return {
    fragmentsKey,
    fragmentsUrl,
  };
}

/**
 * Update model processing status
 */
export async function updateModelStatus(
  modelId: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  additionalData?: {
    ifcSchema?: string;
    qualityScore?: number;
    elementCount?: number;
    statistics?: any;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const updateData: any = {
    processingStatus: status,
  };
  
  if (additionalData) {
    if (additionalData.ifcSchema) updateData.ifcSchema = additionalData.ifcSchema;
    if (additionalData.qualityScore !== undefined) updateData.qualityScore = additionalData.qualityScore;
    if (additionalData.elementCount !== undefined) updateData.elementCount = additionalData.elementCount;
    if (additionalData.statistics) updateData.statistics = JSON.stringify(additionalData.statistics);
  }
  
  await db.update(ifcModels)
    .set(updateData)
    .where(eq(ifcModels.id, modelId));
}

/**
 * Get IFC file URL from S3
 */
export async function getIfcFileUrl(modelId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [model] = await db.select()
    .from(ifcModels)
    .where(eq(ifcModels.id, modelId))
    .limit(1);
  
  return model?.ifcFileUrl || null;
}

/**
 * Get fragments URL from S3
 */
export async function getFragmentsUrl(modelId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [model] = await db.select()
    .from(ifcModels)
    .where(eq(ifcModels.id, modelId))
    .limit(1);
  
  return model?.fragmentsUrl || null;
}

/**
 * Delete IFC model and associated S3 files
 * Note: S3 deletion would require additional SDK setup
 */
export async function deleteIfcModel(modelId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // TODO: Delete S3 files (requires AWS SDK setup)
  // For now, just delete database record
  
  await db.delete(ifcModels)
    .where(eq(ifcModels.id, modelId));
}
