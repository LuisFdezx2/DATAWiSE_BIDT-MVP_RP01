import { getDb } from "./db";
import { ifcModels, ifcElements } from "../drizzle/schema";
import { sql, desc, count, avg } from "drizzle-orm";
import { eq } from "drizzle-orm";

export interface AnalyticsOverview {
  totalModels: number;
  totalElements: number;
  avgProcessingTime: number;
  modelsByMonth: Array<{ month: string; count: number }>;
  elementsByType: Array<{ type: string; count: number }>;
  schemaDistribution: Array<{ schema: string; count: number }>;
}

export async function getAnalyticsOverview(userId: number): Promise<AnalyticsOverview> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Total de modelos del usuario (a través de proyectos)
  const userProjects = await db
    .select({ id: sql<number>`id` })
    .from(sql`bim_projects`)
    .where(sql`owner_id = ${userId}`);
  
  const projectIds = userProjects.map((p: any) => p.id);
  
  if (projectIds.length === 0) {
    return {
      totalModels: 0,
      totalElements: 0,
      avgProcessingTime: 0,
      modelsByMonth: [],
      elementsByType: [],
      schemaDistribution: [],
    };
  }

  const totalModelsResult = await db
    .select({ count: count() })
    .from(ifcModels)
    .where(sql`project_id IN (${sql.join(projectIds.map((id: number) => sql`${id}`), sql`, `)})`);
  
  const totalModels = totalModelsResult[0]?.count || 0;

  // Total de elementos
  const totalElementsResult = await db
    .select({ total: sql<number>`COALESCE(SUM(element_count), 0)` })
    .from(ifcModels)
    .where(sql`project_id IN (${sql.join(projectIds.map((id: number) => sql`${id}`), sql`, `)})`);
  
  const totalElements = Number(totalElementsResult[0]?.total) || 0;

  // Tiempo promedio de procesamiento (simulado, ya que no tenemos este campo)
  const avgProcessingTime = 2.5; // Placeholder

  // Modelos por mes (últimos 6 meses)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const modelsByMonthResult = await db
    .select({
      month: sql<string>`DATE_FORMAT(created_at, '%Y-%m')`,
      count: count(),
    })
    .from(ifcModels)
    .where(sql`project_id IN (${sql.join(projectIds.map((id: number) => sql`${id}`), sql`, `)})`)
    .groupBy(sql`DATE_FORMAT(created_at, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(created_at, '%Y-%m') DESC`)
    .limit(6);

  const modelsByMonth = modelsByMonthResult.map((row: any) => ({
    month: row.month,
    count: row.count,
  }));

  // Elementos por tipo (top 10)
  const allModels = await db
    .select({ statistics: ifcModels.statistics })
    .from(ifcModels)
    .where(sql`project_id IN (${sql.join(projectIds.map((id: number) => sql`${id}`), sql`, `)})`);

  const elementTypesCounts: Record<string, number> = {};
  
  allModels.forEach((model: any) => {
    if (model.statistics) {
      const stats = typeof model.statistics === 'string' 
        ? JSON.parse(model.statistics) 
        : model.statistics;
      
      if (stats.elementsByType) {
        Object.entries(stats.elementsByType).forEach(([type, count]) => {
          elementTypesCounts[type] = (elementTypesCounts[type] || 0) + (count as number);
        });
      }
    }
  });

  const elementsByType = Object.entries(elementTypesCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Distribución por schema
  const schemaDistributionResult = await db
    .select({
      schema: ifcModels.ifcSchema,
      count: count(),
    })
    .from(ifcModels)
    .where(sql`project_id IN (${sql.join(projectIds.map((id: number) => sql`${id}`), sql`, `)})`)
    .groupBy(ifcModels.ifcSchema);

  const schemaDistribution = schemaDistributionResult.map((row: any) => ({
    schema: row.schema,
    count: row.count,
  }));

  return {
    totalModels,
    totalElements,
    avgProcessingTime,
    modelsByMonth,
    elementsByType,
    schemaDistribution,
  };
}
