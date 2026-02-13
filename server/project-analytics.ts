/**
 * Project Analytics Service - Métricas agregadas de proyectos BIM
 */

export interface ProjectMetrics {
  projectId: number;
  projectName: string;
  totalModels: number;
  totalElements: number;
  elementsByType: Record<string, number>;
  modelTimeline: Array<{
    modelId: number;
    modelName: string;
    uploadDate: Date;
    elementCount: number;
  }>;
  changesSummary: {
    totalComparisons: number;
    totalChanges: number;
    addedElements: number;
    removedElements: number;
    modifiedElements: number;
  };
  topModifiedElements: Array<{
    type: string;
    count: number;
  }>;
}

export interface ElementDistribution {
  type: string;
  count: number;
  percentage: number;
}

/**
 * Calcula métricas agregadas para un proyecto
 */
export async function calculateProjectMetrics(
  projectId: number,
  models: Array<{
    id: number;
    name: string;
    createdAt: Date;
    elements: Array<{
      ifcType: string;
    }>;
  }>
): Promise<ProjectMetrics> {
  const totalModels = models.length;
  const totalElements = models.reduce((sum, m) => sum + m.elements.length, 0);

  // Distribución por tipo IFC
  const elementsByType: Record<string, number> = {};
  models.forEach(model => {
    model.elements.forEach(el => {
      const type = el.ifcType;
      elementsByType[type] = (elementsByType[type] || 0) + 1;
    });
  });

  // Timeline de modelos
  const modelTimeline = models
    .map(m => ({
      modelId: m.id,
      modelName: m.name,
      uploadDate: m.createdAt,
      elementCount: m.elements.length,
    }))
    .sort((a, b) => a.uploadDate.getTime() - b.uploadDate.getTime());

  // Resumen de cambios (simplificado - en producción vendría de comparaciones)
  const changesSummary = {
    totalComparisons: Math.max(0, totalModels - 1),
    totalChanges: 0,
    addedElements: 0,
    removedElements: 0,
    modifiedElements: 0,
  };

  // Top elementos modificados
  const topModifiedElements = Object.entries(elementsByType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    projectId,
    projectName: '', // Se llenará desde el caller
    totalModels,
    totalElements,
    elementsByType,
    modelTimeline,
    changesSummary,
    topModifiedElements,
  };
}

/**
 * Calcula distribución de elementos con porcentajes
 */
export function calculateElementDistribution(
  elementsByType: Record<string, number>
): ElementDistribution[] {
  const total = Object.values(elementsByType).reduce((sum, count) => sum + count, 0);
  
  return Object.entries(elementsByType)
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calcula tendencias de crecimiento de elementos
 */
export function calculateGrowthTrend(
  modelTimeline: Array<{
    modelId: number;
    modelName: string;
    uploadDate: Date;
    elementCount: number;
  }>
): Array<{
  date: Date;
  elementCount: number;
  growth: number;
}> {
  if (modelTimeline.length === 0) {
    return [];
  }

  return modelTimeline.map((model, index) => {
    const previousCount = index > 0 ? modelTimeline[index - 1].elementCount : 0;
    const growth = previousCount > 0 
      ? ((model.elementCount - previousCount) / previousCount) * 100 
      : 0;

    return {
      date: model.uploadDate,
      elementCount: model.elementCount,
      growth,
    };
  });
}
