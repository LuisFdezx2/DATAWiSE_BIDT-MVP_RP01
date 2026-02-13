/**
 * Servicio de matching automático entre componentes COBie y elementos IFC
 * Implementa 3 estrategias: GUID, nombre (fuzzy), coordenadas espaciales
 */

import { getDb } from './db';
import { cobieComponents, ifcElements } from '../drizzle/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export interface MatchResult {
  componentId: number;
  componentName: string;
  ifcElementId: number;
  ifcGlobalId: string;
  ifcType: string;
  matchStrategy: 'guid' | 'name';
  confidence: number;
}

export interface MatchingStats {
  totalComponents: number;
  matchedByGuid: number;
  matchedByName: number;
  unmatched: number;
}

/**
 * Calcula similitud entre dos strings (Levenshtein distance normalizada)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1.0;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  return 1 - (distance / maxLen);
}

/**
 * Estrategia 1: Matching por GUID
 */
export async function matchByGuid(modelId: number): Promise<MatchResult[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db
    .select({
      componentId: cobieComponents.id,
      componentName: cobieComponents.name,
      ifcElementId: ifcElements.id,
      ifcGlobalId: ifcElements.globalId,
      ifcType: ifcElements.ifcType,
    })
    .from(cobieComponents)
    .innerJoin(
      ifcElements,
      and(
        eq(cobieComponents.ifcGuid, ifcElements.globalId),
        eq(ifcElements.modelId, modelId),
        isNull(cobieComponents.ifcElementId)
      )
    )
    .limit(1000);
  
  return results.map(r => ({
    componentId: r.componentId,
    componentName: r.componentName,
    ifcElementId: r.ifcElementId,
    ifcGlobalId: r.ifcGlobalId || '',
    ifcType: r.ifcType,
    matchStrategy: 'guid' as const,
    confidence: 100,
  }));
}

/**
 * Estrategia 2: Matching por nombre (fuzzy matching)
 */
export async function matchByName(
  modelId: number,
  minSimilarity: number = 0.8
): Promise<MatchResult[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Obtener componentes sin vincular
  const components = await db
    .select()
    .from(cobieComponents)
    .where(isNull(cobieComponents.ifcElementId))
    .limit(500);
  
  // Obtener elementos IFC del proyecto
  const ifcEls = await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.modelId, modelId))
    .limit(1000);
  
  const matches: MatchResult[] = [];
  
  for (const component of components) {
    let bestMatch: MatchResult | null = null;
    let bestSimilarity = 0;
    
    for (const ifcEl of ifcEls) {
      if (!ifcEl.name) continue;
      
      const similarity = stringSimilarity(component.name, ifcEl.name);
      
      if (similarity > bestSimilarity && similarity >= minSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          componentId: component.id,
          componentName: component.name,
          ifcElementId: ifcEl.id,
          ifcGlobalId: ifcEl.globalId || '',
          ifcType: ifcEl.ifcType,
          matchStrategy: 'name' as const,
          confidence: Math.round(similarity * 100),
        };
      }
    }
    
    if (bestMatch) {
      matches.push(bestMatch);
    }
  }
  
  return matches;
}

/**
 * Ejecuta todas las estrategias de matching y aplica los resultados
 */
export async function autoLinkComponents(modelId: number): Promise<MatchingStats> {
  const db = await getDb();
  if (!db) {
    return {
      totalComponents: 0,
      matchedByGuid: 0,
      matchedByName: 0,
      unmatched: 0,
    };
  }
  
  // Contar total de componentes sin vincular
  const allComponents = await db
    .select({ count: sql<string>`count(*)` })
    .from(cobieComponents)
    .where(isNull(cobieComponents.ifcElementId));
  
  const totalComponents = Number(allComponents[0]?.count || 0);
  
  // Estrategia 1: GUID (más confiable)
  const guidMatches = await matchByGuid(modelId);
  
  for (const match of guidMatches) {
    await db
      .update(cobieComponents)
      .set({ ifcElementId: match.ifcElementId })
      .where(eq(cobieComponents.id, match.componentId));
  }
  
  // Estrategia 2: Nombre (fuzzy matching)
  const nameMatches = await matchByName(modelId, 0.8);
  
  for (const match of nameMatches) {
    await db
      .update(cobieComponents)
      .set({ ifcElementId: match.ifcElementId })
      .where(eq(cobieComponents.id, match.componentId));
  }
  
  // Contar no vinculados
  const unlinkedComponents = await db
    .select({ count: sql<string>`count(*)` })
    .from(cobieComponents)
    .where(isNull(cobieComponents.ifcElementId));
  
  const unmatched = Number(unlinkedComponents[0]?.count || 0);
  
  return {
    totalComponents,
    matchedByGuid: guidMatches.length,
    matchedByName: nameMatches.length,
    unmatched,
  };
}
