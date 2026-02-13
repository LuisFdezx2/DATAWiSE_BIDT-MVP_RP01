/**
 * Servicio de comparación múltiple de versiones de modelos IFC
 * Genera una matriz de cambios entre N versiones
 */

import { compareModels, type ComparisonResult } from './ifc-comparison';

export interface MultiComparisonCell {
  oldVersionId: number;
  newVersionId: number;
  totalChanges: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

export interface MultiComparisonResult {
  versionIds: number[];
  matrix: MultiComparisonCell[][];
  summary: {
    totalComparisons: number;
    maxChanges: number;
    minChanges: number;
    avgChanges: number;
  };
}

/**
 * Compara múltiples versiones de modelos y genera una matriz de cambios
 * @param models Array de modelos con sus elementos
 * @returns Matriz de comparaciones entre todas las versiones
 */
export async function compareMultipleVersions(
  models: Array<{
    id: number;
    elements: Array<{
      expressId: number;
      type: string;
      globalId?: string;
      properties: any;
    }>;
  }>
): Promise<MultiComparisonResult> {
  const versionIds = models.map(m => m.id);
  const n = models.length;
  
  // Inicializar matriz (n x n)
  const matrix: MultiComparisonCell[][] = Array(n).fill(null).map(() => 
    Array(n).fill(null).map(() => ({
      oldVersionId: 0,
      newVersionId: 0,
      totalChanges: 0,
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
    }))
  );

  const allChangeCounts: number[] = [];

  // Comparar cada par de versiones
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        // Diagonal: comparación consigo mismo = 0 cambios
        matrix[i][j] = {
          oldVersionId: versionIds[i],
          newVersionId: versionIds[j],
          totalChanges: 0,
          addedCount: 0,
          removedCount: 0,
          modifiedCount: 0,
        };
      } else {
        // Comparar versión i con versión j
        const comparison = compareModels(models[i].elements, models[j].elements);
        
        matrix[i][j] = {
          oldVersionId: versionIds[i],
          newVersionId: versionIds[j],
          totalChanges: comparison.statistics.totalChanges,
          addedCount: comparison.statistics.addedCount,
          removedCount: comparison.statistics.removedCount,
          modifiedCount: comparison.statistics.modifiedCount,
        };

        allChangeCounts.push(comparison.statistics.totalChanges);
      }
    }
  }

  // Calcular estadísticas de resumen
  const nonZeroChanges = allChangeCounts.filter(c => c > 0);
  const summary = {
    totalComparisons: n * (n - 1), // Excluir diagonal
    maxChanges: nonZeroChanges.length > 0 ? Math.max(...nonZeroChanges) : 0,
    minChanges: nonZeroChanges.length > 0 ? Math.min(...nonZeroChanges) : 0,
    avgChanges: nonZeroChanges.length > 0 
      ? nonZeroChanges.reduce((a, b) => a + b, 0) / nonZeroChanges.length 
      : 0,
  };

  return {
    versionIds,
    matrix,
    summary,
  };
}

/**
 * Genera un mapa de calor (heatmap) de intensidad de cambios
 * @param matrix Matriz de comparaciones
 * @returns Matriz normalizada de 0 a 1 para visualización
 */
export function generateHeatmap(matrix: MultiComparisonCell[][]): number[][] {
  const n = matrix.length;
  const heatmap: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  // Encontrar el máximo de cambios para normalizar
  let maxChanges = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && matrix[i][j].totalChanges > maxChanges) {
        maxChanges = matrix[i][j].totalChanges;
      }
    }
  }

  // Normalizar valores de 0 a 1
  if (maxChanges > 0) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        heatmap[i][j] = matrix[i][j].totalChanges / maxChanges;
      }
    }
  }

  return heatmap;
}
