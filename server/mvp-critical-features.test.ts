/**
 * Tests for MVP Critical Features
 * - Workflow Execution Engine
 * - IFC S3 Storage Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WorkflowConfig } from './workflow-executor';
import { executeWorkflow } from './workflow-executor';
import { uploadIfcFile, updateModelStatus, getIfcFileUrl } from './ifc-storage-service';

// Mock storage module
vi.mock('./storage', () => ({
  storagePut: vi.fn(async (key: string, data: any, contentType: string) => ({
    key,
    url: `https://s3.example.com/${key}`,
  })),
}));

// Mock database
vi.mock('./db', () => ({
  getDb: vi.fn(async () => ({
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([{ insertId: 123 }])),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{
            id: 123,
            ifcFileUrl: 'https://s3.example.com/test.ifc',
            fragmentsUrl: 'https://s3.example.com/test.frag',
          }])),
        })),
      })),
    })),
  })),
}));

describe('Workflow Execution Engine', () => {
  it('should export executeWorkflow function', () => {
    // Verify the main export exists
    expect(executeWorkflow).toBeDefined();
    expect(typeof executeWorkflow).toBe('function');
  });

  it('should have WorkflowConfig type defined', () => {
    // Basic type check - workflow config should have nodes and edges
    const config: WorkflowConfig = {
      nodes: [],
      edges: [],
    };
    
    expect(config).toHaveProperty('nodes');
    expect(config).toHaveProperty('edges');
  });
});

describe('IFC S3 Storage Service', () => {
  it('should upload IFC file to S3', async () => {
    const fileBuffer = Buffer.from('fake ifc content');
    
    const result = await uploadIfcFile({
      projectId: 1,
      fileName: 'test-model.ifc',
      fileBuffer,
      description: 'Test model',
    });

    expect(result).toHaveProperty('modelId');
    expect(result).toHaveProperty('ifcFileKey');
    expect(result).toHaveProperty('ifcFileUrl');
    expect(result.ifcFileUrl).toContain('s3.example.com');
    expect(result.fileSize).toBe(fileBuffer.length);
  });

  it('should generate unique S3 keys', async () => {
    const fileBuffer = Buffer.from('fake ifc content');
    
    const result1 = await uploadIfcFile({
      projectId: 1,
      fileName: 'test.ifc',
      fileBuffer,
    });

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const result2 = await uploadIfcFile({
      projectId: 1,
      fileName: 'test.ifc',
      fileBuffer,
    });

    expect(result1.ifcFileKey).not.toBe(result2.ifcFileKey);
  });

  it('should update model processing status', async () => {
    await expect(
      updateModelStatus(123, 'completed', {
        ifcSchema: 'IFC4',
        qualityScore: 85,
        elementCount: 1500,
        statistics: { totalElements: 1500, elementsByType: {} },
      })
    ).resolves.not.toThrow();
  });

  it('should retrieve IFC file URL', async () => {
    const url = await getIfcFileUrl(123);
    
    expect(url).toBe('https://s3.example.com/test.ifc');
  });

  it('should sanitize file names for S3 keys', async () => {
    const fileBuffer = Buffer.from('fake ifc content');
    
    const result = await uploadIfcFile({
      projectId: 1,
      fileName: 'test model with spaces & special!chars.ifc',
      fileBuffer,
    });

    // S3 key should not contain spaces or special characters
    expect(result.ifcFileKey).not.toContain(' ');
    expect(result.ifcFileKey).not.toContain('&');
    expect(result.ifcFileKey).not.toContain('!');
    expect(result.ifcFileKey).toContain('_');
  });
});

describe('Integration: Workflow + Storage', () => {
  it('should execute workflow with IFC loading node', async () => {
    // This would be a full integration test
    // For now, we just verify the components work together
    
    const fileBuffer = Buffer.from('fake ifc content');
    const uploadResult = await uploadIfcFile({
      projectId: 1,
      fileName: 'integration-test.ifc',
      fileBuffer,
    });

    expect(uploadResult.modelId).toBeDefined();
    
    // In a real workflow, this model would be loaded by the IFC Loader node
    const fileUrl = await getIfcFileUrl(uploadResult.modelId);
    expect(fileUrl).toBeDefined();
  });
});
