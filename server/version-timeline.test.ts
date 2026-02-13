import { describe, it, expect } from 'vitest';

/**
 * Pruebas para validar la lógica de timeline de versiones
 */

describe('Version Timeline Logic', () => {
  describe('Version Grouping', () => {
    it('should group models by base name', () => {
      const models = [
        { id: 1, name: 'Building_v1', createdAt: '2024-01-01' },
        { id: 2, name: 'Building_v2', createdAt: '2024-01-02' },
        { id: 3, name: 'Bridge_v1', createdAt: '2024-01-03' },
      ];

      const modelGroups = new Map<string, typeof models>();
      
      models.forEach(model => {
        const baseName = model.name.replace(/_v\d+$/, '');
        
        if (!modelGroups.has(baseName)) {
          modelGroups.set(baseName, []);
        }
        modelGroups.get(baseName)!.push(model);
      });

      expect(modelGroups.size).toBe(2);
      expect(modelGroups.has('Building')).toBe(true);
      expect(modelGroups.has('Bridge')).toBe(true);
      expect(modelGroups.get('Building')?.length).toBe(2);
      expect(modelGroups.get('Bridge')?.length).toBe(1);
    });

    it('should handle models without version suffix', () => {
      const models = [
        { id: 1, name: 'Building', createdAt: '2024-01-01' },
        { id: 2, name: 'Building_v1', createdAt: '2024-01-02' },
      ];

      const modelGroups = new Map<string, typeof models>();
      
      models.forEach(model => {
        const baseName = model.name.replace(/_v\d+$/, '');
        
        if (!modelGroups.has(baseName)) {
          modelGroups.set(baseName, []);
        }
        modelGroups.get(baseName)!.push(model);
      });

      expect(modelGroups.size).toBe(1);
      expect(modelGroups.get('Building')?.length).toBe(2);
    });
  });

  describe('Version Sorting', () => {
    it('should sort versions by creation date', () => {
      const versions = [
        { id: 3, createdAt: '2024-01-03' },
        { id: 1, createdAt: '2024-01-01' },
        { id: 2, createdAt: '2024-01-02' },
      ];

      const sorted = versions.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });

    it('should assign sequential version numbers', () => {
      const versions = [
        { id: 1, createdAt: '2024-01-01' },
        { id: 2, createdAt: '2024-01-02' },
        { id: 3, createdAt: '2024-01-03' },
      ];

      const sorted = versions
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((v, index) => ({
          ...v,
          versionNumber: index + 1,
        }));

      expect(sorted[0].versionNumber).toBe(1);
      expect(sorted[1].versionNumber).toBe(2);
      expect(sorted[2].versionNumber).toBe(3);
    });
  });

  describe('Version Selection', () => {
    it('should allow selecting two versions', () => {
      const selectedVersions: number[] = [];
      const versionId1 = 1;
      const versionId2 = 2;

      // Seleccionar primera versión
      selectedVersions.push(versionId1);
      expect(selectedVersions.length).toBe(1);

      // Seleccionar segunda versión
      selectedVersions.push(versionId2);
      expect(selectedVersions.length).toBe(2);
    });

    it('should replace oldest selection when selecting third version', () => {
      let selectedVersions = [1, 2];
      const newVersionId = 3;

      // Reemplazar la primera selección
      selectedVersions = [selectedVersions[1], newVersionId];

      expect(selectedVersions.length).toBe(2);
      expect(selectedVersions).toEqual([2, 3]);
    });

    it('should allow deselecting a version', () => {
      let selectedVersions = [1, 2];
      const versionIdToRemove = 1;

      selectedVersions = selectedVersions.filter(id => id !== versionIdToRemove);

      expect(selectedVersions.length).toBe(1);
      expect(selectedVersions).toEqual([2]);
    });
  });

  describe('Version Comparison Order', () => {
    it('should order versions by creation date for comparison', () => {
      const version1 = { id: 2, createdAt: '2024-01-02' };
      const version2 = { id: 1, createdAt: '2024-01-01' };

      const oldVersion = new Date(version1.createdAt) < new Date(version2.createdAt) 
        ? version1.id 
        : version2.id;
      const newVersion = oldVersion === version1.id ? version2.id : version1.id;

      // version2 (id=1) es más antigua (2024-01-01), version1 (id=2) es más nueva (2024-01-02)
      expect(oldVersion).toBe(1);
      expect(newVersion).toBe(2);
    });

    it('should handle same creation date', () => {
      const version1 = { id: 1, createdAt: '2024-01-01' };
      const version2 = { id: 2, createdAt: '2024-01-01' };

      const oldVersion = new Date(version1.createdAt) <= new Date(version2.createdAt) 
        ? version1.id 
        : version2.id;
      const newVersion = oldVersion === version1.id ? version2.id : version1.id;

      expect(oldVersion).toBe(1);
      expect(newVersion).toBe(2);
    });
  });

  describe('Version History Structure', () => {
    it('should create correct version history structure', () => {
      const models = [
        { id: 1, name: 'Building_v1', createdAt: '2024-01-01', elementCount: 100 },
        { id: 2, name: 'Building_v2', createdAt: '2024-01-02', elementCount: 110 },
      ];

      const modelGroups = new Map<string, typeof models>();
      
      models.forEach(model => {
        const baseName = model.name.replace(/_v\d+$/, '');
        if (!modelGroups.has(baseName)) {
          modelGroups.set(baseName, []);
        }
        modelGroups.get(baseName)!.push(model);
      });

      const versionHistory = Array.from(modelGroups.entries()).map(([baseName, versions]) => ({
        baseName,
        versions: versions
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((v, index) => ({
            id: v.id,
            name: v.name,
            versionNumber: index + 1,
            createdAt: v.createdAt,
            elementCount: v.elementCount,
          })),
      }));

      expect(versionHistory).toHaveLength(1);
      expect(versionHistory[0].baseName).toBe('Building');
      expect(versionHistory[0].versions).toHaveLength(2);
      expect(versionHistory[0].versions[0].versionNumber).toBe(1);
      expect(versionHistory[0].versions[1].versionNumber).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty model list', () => {
      const models: any[] = [];
      const modelGroups = new Map<string, typeof models>();
      
      models.forEach(model => {
        const baseName = model.name.replace(/_v\d+$/, '');
        if (!modelGroups.has(baseName)) {
          modelGroups.set(baseName, []);
        }
        modelGroups.get(baseName)!.push(model);
      });

      expect(modelGroups.size).toBe(0);
    });

    it('should handle single model', () => {
      const models = [
        { id: 1, name: 'Building_v1', createdAt: '2024-01-01' },
      ];

      const modelGroups = new Map<string, typeof models>();
      
      models.forEach(model => {
        const baseName = model.name.replace(/_v\d+$/, '');
        if (!modelGroups.has(baseName)) {
          modelGroups.set(baseName, []);
        }
        modelGroups.get(baseName)!.push(model);
      });

      expect(modelGroups.size).toBe(1);
      expect(modelGroups.get('Building')?.length).toBe(1);
    });

    it('should handle complex version suffixes', () => {
      const models = [
        { id: 1, name: 'Building_v1', createdAt: '2024-01-01' },
        { id: 2, name: 'Building_v10', createdAt: '2024-01-02' },
        { id: 3, name: 'Building_v100', createdAt: '2024-01-03' },
      ];

      const modelGroups = new Map<string, typeof models>();
      
      models.forEach(model => {
        const baseName = model.name.replace(/_v\d+$/, '');
        if (!modelGroups.has(baseName)) {
          modelGroups.set(baseName, []);
        }
        modelGroups.get(baseName)!.push(model);
      });

      expect(modelGroups.size).toBe(1);
      expect(modelGroups.get('Building')?.length).toBe(3);
    });
  });
});
