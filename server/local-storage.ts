/**
 * Local Filesystem Storage Service
 * 
 * Replaces S3 storage for standalone local installation.
 * Stores files in local filesystem with organized directory structure.
 */

import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';

// Base directory for file storage
const STORAGE_BASE_DIR = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads');

// Subdirectories for different file types
const DIRECTORIES = {
  ifc: 'ifc-models',
  fragments: '3d-fragments',
  cobie: 'cobie-files',
  exports: 'exports',
  temp: 'temp',
};

/**
 * Initialize storage directories
 */
export async function initializeStorage(): Promise<void> {
  try {
    // Create base directory
    await fs.mkdir(STORAGE_BASE_DIR, { recursive: true });

    // Create subdirectories
    for (const dir of Object.values(DIRECTORIES)) {
      const fullPath = path.join(STORAGE_BASE_DIR, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }

    console.log(`✅ Local storage initialized at: ${STORAGE_BASE_DIR}`);
  } catch (error) {
    console.error('❌ Failed to initialize local storage:', error);
    throw error;
  }
}

/**
 * Generate unique file key with random suffix
 */
function generateFileKey(originalName: string, category: keyof typeof DIRECTORIES): string {
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const sanitized = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${DIRECTORIES[category]}/${sanitized}_${timestamp}_${randomSuffix}${ext}`;
}

/**
 * Get full filesystem path from file key
 */
function getFullPath(fileKey: string): string {
  return path.join(STORAGE_BASE_DIR, fileKey);
}

/**
 * Get public URL for file (for local development, returns file path)
 */
function getFileUrl(fileKey: string): string {
  // In local mode, we'll serve files through an API endpoint
  return `/api/files/${encodeURIComponent(fileKey)}`;
}

/**
 * Upload file to local storage
 */
export async function uploadFile(
  fileBuffer: Buffer,
  originalName: string,
  category: keyof typeof DIRECTORIES = 'temp',
  contentType?: string
): Promise<{ key: string; url: string; size: number }> {
  const fileKey = generateFileKey(originalName, category);
  const fullPath = getFullPath(fileKey);

  // Ensure directory exists
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  // Write file
  await fs.writeFile(fullPath, fileBuffer);

  // Get file stats
  const stats = await fs.stat(fullPath);

  return {
    key: fileKey,
    url: getFileUrl(fileKey),
    size: stats.size,
  };
}

/**
 * Upload file from stream
 */
export async function uploadFileStream(
  stream: NodeJS.ReadableStream,
  originalName: string,
  category: keyof typeof DIRECTORIES = 'temp'
): Promise<{ key: string; url: string }> {
  const fileKey = generateFileKey(originalName, category);
  const fullPath = getFullPath(fileKey);

  // Ensure directory exists
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  // Pipe stream to file
  const writeStream = createWriteStream(fullPath);
  await pipeline(stream, writeStream);

  return {
    key: fileKey,
    url: getFileUrl(fileKey),
  };
}

/**
 * Download file from local storage
 */
export async function downloadFile(fileKey: string): Promise<Buffer> {
  const fullPath = getFullPath(fileKey);

  try {
    return await fs.readFile(fullPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${fileKey}`);
    }
    throw error;
  }
}

/**
 * Get file stream for efficient large file handling
 */
export function getFileStream(fileKey: string): NodeJS.ReadableStream {
  const fullPath = getFullPath(fileKey);
  return createReadStream(fullPath);
}

/**
 * Check if file exists
 */
export async function fileExists(fileKey: string): Promise<boolean> {
  const fullPath = getFullPath(fileKey);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete file from local storage
 */
export async function deleteFile(fileKey: string): Promise<void> {
  const fullPath = getFullPath(fileKey);

  try {
    await fs.unlink(fullPath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // File doesn't exist, consider it deleted
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(fileKey: string): Promise<{
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}> {
  const fullPath = getFullPath(fileKey);

  try {
    const stats = await fs.stat(fullPath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${fileKey}`);
    }
    throw error;
  }
}

/**
 * List files in a category
 */
export async function listFiles(category: keyof typeof DIRECTORIES): Promise<string[]> {
  const dirPath = path.join(STORAGE_BASE_DIR, DIRECTORIES[category]);

  try {
    const files = await fs.readdir(dirPath);
    return files.map(file => `${DIRECTORIES[category]}/${file}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Clean up old temporary files
 */
export async function cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
  const tempDir = path.join(STORAGE_BASE_DIR, DIRECTORIES.temp);
  const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
  let deletedCount = 0;

  try {
    const files = await fs.readdir(tempDir);

    for (const file of files) {
      const fullPath = path.join(tempDir, file);
      const stats = await fs.stat(fullPath);

      if (stats.mtime.getTime() < cutoffTime) {
        await fs.unlink(fullPath);
        deletedCount++;
      }
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error('Error cleaning up temp files:', error);
    }
  }

  return deletedCount;
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalSize: number;
  fileCount: number;
  byCategory: Record<string, { size: number; count: number }>;
}> {
  const stats = {
    totalSize: 0,
    fileCount: 0,
    byCategory: {} as Record<string, { size: number; count: number }>,
  };

  for (const [category, dir] of Object.entries(DIRECTORIES)) {
    const dirPath = path.join(STORAGE_BASE_DIR, dir);
    let categorySize = 0;
    let categoryCount = 0;

    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const fileStat = await fs.stat(fullPath);

        if (fileStat.isFile()) {
          categorySize += fileStat.size;
          categoryCount++;
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`Error reading ${category} directory:`, error);
      }
    }

    stats.byCategory[category] = {
      size: categorySize,
      count: categoryCount,
    };

    stats.totalSize += categorySize;
    stats.fileCount += categoryCount;
  }

  return stats;
}

// Initialize storage on module load
initializeStorage().catch(console.error);
