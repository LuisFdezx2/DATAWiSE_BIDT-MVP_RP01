/**
 * Servicio de mapeo entre elementos IFC y clases bSDD
 * Gestiona la persistencia y recuperación de mapeos
 */

import { getDb } from './db';
import { ifcElements } from '../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
  searchBsddClasses,
  getBsddClass,
  findBsddClassForIfcType,
  type BsddClass,
  type BsddProperty,
} from './bsdd-client';

export interface BsddMapping {
  elementId: number;
  bsddClassUri: string;
  bsddClassName: string;
  bsddClassCode: string;
  mappingMethod: 'automatic' | 'manual';
  confidence: number; // 0-1
  mappedAt: Date;
  mappedBy?: string;
}

export interface EnrichmentResult {
  elementId: number;
  elementType: string;
  elementName?: string;
  bsddClass: BsddClass | null;
  existingProperties: Record<string, any>;
  suggestedProperties: BsddProperty[];
  mappingMethod: 'automatic' | 'manual';
  confidence: number;
}

/**
 * Obtiene el mapeo bSDD de un elemento IFC
 */
export async function getBsddMappingForElement(
  elementId: number
): Promise<BsddMapping | null> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const elements = await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.id, elementId))
    .limit(1);

  if (elements.length === 0 || !elements[0].bsddClassifications) {
    return null;
  }

  try {
    const classifications = JSON.parse(elements[0].bsddClassifications as string);
    if (!classifications || classifications.length === 0) {
      return null;
    }

    // Devolver el primer mapeo (podría haber múltiples en el futuro)
    const mapping = classifications[0];
    return {
      elementId,
      bsddClassUri: mapping.uri,
      bsddClassName: mapping.name,
      bsddClassCode: mapping.code,
      mappingMethod: mapping.mappingMethod || 'automatic',
      confidence: mapping.confidence || 0,
      mappedAt: new Date(mapping.mappedAt),
      mappedBy: mapping.mappedBy,
    };
  } catch (error) {
    console.error('Error parsing bSDD classifications:', error);
    return null;
  }
}

/**
 * Guarda un mapeo bSDD para un elemento IFC
 */
export async function saveBsddMapping(
  elementId: number,
  bsddClass: BsddClass,
  mappingMethod: 'automatic' | 'manual' = 'automatic',
  confidence: number = 1.0,
  mappedBy?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const mapping = {
    uri: bsddClass.uri,
    code: bsddClass.code,
    name: bsddClass.name,
    definition: bsddClass.definition,
    mappingMethod,
    confidence,
    mappedAt: new Date().toISOString(),
    mappedBy,
  };

  await db
    .update(ifcElements)
    .set({
      bsddClassifications: JSON.stringify([mapping]),
    })
    .where(eq(ifcElements.id, elementId));
}

/**
 * Elimina el mapeo bSDD de un elemento IFC
 */
export async function removeBsddMapping(elementId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  await db
    .update(ifcElements)
    .set({
      bsddClassifications: null,
    })
    .where(eq(ifcElements.id, elementId));
}

/**
 * Mapea automáticamente múltiples elementos IFC a clases bSDD
 */
export async function mapElementsToBsdd(
  modelId: number,
  domainUri?: string
): Promise<{
  totalElements: number;
  mappedElements: number;
  failedElements: number;
  mappings: EnrichmentResult[];
}> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Obtener todos los elementos del modelo
  const elements = await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.modelId, modelId));

  const mappings: EnrichmentResult[] = [];
  let mappedCount = 0;
  let failedCount = 0;

  // Procesar elementos en lotes para evitar sobrecarga de API
  const BATCH_SIZE = 10;
  for (let i = 0; i < elements.length; i += BATCH_SIZE) {
    const batch = elements.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (element) => {
      try {
        // Buscar clase bSDD para el tipo IFC
        const bsddClass = await findBsddClassForIfcType(element.ifcType, domainUri);
        
        if (!bsddClass) {
          failedCount++;
          return {
            elementId: element.id,
            elementType: element.ifcType,
            elementName: element.name || undefined,
            bsddClass: null,
            existingProperties: element.properties ? JSON.parse(element.properties as string) : {},
            suggestedProperties: [],
            mappingMethod: 'automatic' as const,
            confidence: 0,
          };
        }

        // Obtener detalles completos de la clase
        const classDetails = await getBsddClass(bsddClass.uri, true);
        
        // Guardar mapeo
        await saveBsddMapping(element.id, bsddClass, 'automatic', 0.8);
        
        mappedCount++;

        const existingProperties = element.properties ? JSON.parse(element.properties as string) : {};
        const suggestedProperties = classDetails?.properties?.filter(
          prop => !(prop.name in existingProperties)
        ) || [];

        return {
          elementId: element.id,
          elementType: element.ifcType,
          elementName: element.name || undefined,
          bsddClass,
          existingProperties,
          suggestedProperties,
          mappingMethod: 'automatic' as const,
          confidence: 0.8,
        };
      } catch (error) {
        console.error(`Error mapping element ${element.id}:`, error);
        failedCount++;
        return {
          elementId: element.id,
          elementType: element.ifcType,
          elementName: element.name || undefined,
          bsddClass: null,
          existingProperties: {},
          suggestedProperties: [],
          mappingMethod: 'automatic' as const,
          confidence: 0,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    mappings.push(...batchResults);

    // Pequeña pausa entre lotes para no sobrecargar la API
    if (i + BATCH_SIZE < elements.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    totalElements: elements.length,
    mappedElements: mappedCount,
    failedElements: failedCount,
    mappings,
  };
}

/**
 * Obtiene estadísticas de mapeo bSDD para un modelo
 */
export async function getBsddMappingStats(
  modelId: number
): Promise<{
  totalElements: number;
  mappedElements: number;
  unmappedElements: number;
  mappingRate: number;
  mappingsByType: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const elements = await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.modelId, modelId));

  const mappedElements = elements.filter(el => el.bsddClassifications);
  const mappingsByType: Record<string, number> = {};

  for (const element of mappedElements) {
    mappingsByType[element.ifcType] = (mappingsByType[element.ifcType] || 0) + 1;
  }

  return {
    totalElements: elements.length,
    mappedElements: mappedElements.length,
    unmappedElements: elements.length - mappedElements.length,
    mappingRate: elements.length > 0 ? (mappedElements.length / elements.length) * 100 : 0,
    mappingsByType,
  };
}

/**
 * Busca sugerencias de clases bSDD para un elemento IFC
 */
export async function suggestBsddClasses(
  ifcType: string,
  elementName?: string,
  domainUri?: string
): Promise<BsddClass[]> {
  const suggestions: BsddClass[] = [];

  // 1. Búsqueda por tipo IFC exacto
  const typeSearch = await searchBsddClasses(ifcType, domainUri);
  suggestions.push(...typeSearch.classes.slice(0, 3));

  // 2. Si hay nombre de elemento, buscar por nombre
  if (elementName) {
    const nameSearch = await searchBsddClasses(elementName, domainUri);
    suggestions.push(...nameSearch.classes.slice(0, 2));
  }

  // 3. Búsqueda por tipo simplificado (sin "Ifc")
  const simplifiedType = ifcType.replace(/^Ifc/, '');
  if (simplifiedType !== ifcType) {
    const simplifiedSearch = await searchBsddClasses(simplifiedType, domainUri);
    suggestions.push(...simplifiedSearch.classes.slice(0, 2));
  }

  // Eliminar duplicados por URI
  const uniqueSuggestions = suggestions.filter(
    (cls, index, self) => self.findIndex(c => c.uri === cls.uri) === index
  );

  return uniqueSuggestions.slice(0, 5); // Máximo 5 sugerencias
}

/**
 * Enriquece un elemento IFC con datos bSDD
 */
export async function enrichElementWithBsdd(
  elementId: number,
  domainUri?: string
): Promise<EnrichmentResult | null> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const elements = await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.id, elementId))
    .limit(1);

  if (elements.length === 0) {
    return null;
  }

  const element = elements[0];
  
  // Verificar si ya tiene mapeo
  let bsddClass: BsddClass | null = null;
  const existingMapping = await getBsddMappingForElement(elementId);
  
  if (existingMapping) {
    // Usar mapeo existente
    const classDetails = await getBsddClass(existingMapping.bsddClassUri, true);
    if (classDetails) {
      bsddClass = classDetails;
    }
  } else {
    // Buscar automáticamente
    bsddClass = await findBsddClassForIfcType(element.ifcType, domainUri);
    
    if (bsddClass) {
      // Guardar mapeo automático
      await saveBsddMapping(elementId, bsddClass, 'automatic', 0.7);
    }
  }

  if (!bsddClass) {
    return {
      elementId,
      elementType: element.ifcType,
      elementName: element.name || undefined,
      bsddClass: null,
      existingProperties: element.properties ? JSON.parse(element.properties as string) : {},
      suggestedProperties: [],
      mappingMethod: 'automatic',
      confidence: 0,
    };
  }

  // Obtener detalles completos con propiedades
  const classDetails = await getBsddClass(bsddClass.uri, true);
  const existingProperties = element.properties ? JSON.parse(element.properties as string) : {};
  const suggestedProperties = classDetails?.properties?.filter(
    prop => !(prop.name in existingProperties)
  ) || [];

  return {
    elementId,
    elementType: element.ifcType,
    elementName: element.name || undefined,
    bsddClass: classDetails || bsddClass,
    existingProperties,
    suggestedProperties,
    mappingMethod: existingMapping?.mappingMethod || 'automatic',
    confidence: existingMapping?.confidence || 0.7,
  };
}
