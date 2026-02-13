/**
 * Servicio de comparación de versiones de modelos IFC
 * Detecta elementos añadidos, eliminados y modificados entre dos versiones
 */

export interface IfcElement {
  expressId: number;
  type: string;
  globalId?: string;
  properties: Record<string, any>;
}

export interface ElementChange {
  expressId: number;
  type: string;
  globalId?: string;
  changeType: 'added' | 'removed' | 'modified';
  oldProperties?: Record<string, any>;
  newProperties?: Record<string, any>;
  propertyChanges?: PropertyChange[];
}

export interface PropertyChange {
  propertyName: string;
  oldValue: any;
  newValue: any;
}

export interface ComparisonResult {
  added: ElementChange[];
  removed: ElementChange[];
  modified: ElementChange[];
  unchanged: number;
  statistics: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
    changesByType: Record<string, { added: number; removed: number; modified: number }>;
  };
}

/**
 * Compara dos modelos IFC y detecta cambios
 */
export function compareModels(
  oldModel: IfcElement[],
  newModel: IfcElement[]
): ComparisonResult {
  const added: ElementChange[] = [];
  const removed: ElementChange[] = [];
  const modified: ElementChange[] = [];
  let unchangedCount = 0;

  // Crear mapas por GlobalId para comparación eficiente
  const oldMap = new Map<string, IfcElement>();
  const newMap = new Map<string, IfcElement>();

  // Indexar modelo antiguo
  for (const element of oldModel) {
    const key = element.globalId || `${element.type}_${element.expressId}`;
    oldMap.set(key, element);
  }

  // Indexar modelo nuevo
  for (const element of newModel) {
    const key = element.globalId || `${element.type}_${element.expressId}`;
    newMap.set(key, element);
  }

  // Detectar elementos añadidos y modificados
  for (const [key, newElement] of Array.from(newMap.entries())) {
    const oldElement = oldMap.get(key);

    if (!oldElement) {
      // Elemento añadido
      added.push({
        expressId: newElement.expressId,
        type: newElement.type,
        globalId: newElement.globalId,
        changeType: 'added',
        newProperties: newElement.properties,
      });
    } else {
      // Comparar propiedades
      const propertyChanges = compareProperties(oldElement.properties, newElement.properties);

      if (propertyChanges.length > 0) {
        // Elemento modificado
        modified.push({
          expressId: newElement.expressId,
          type: newElement.type,
          globalId: newElement.globalId,
          changeType: 'modified',
          oldProperties: oldElement.properties,
          newProperties: newElement.properties,
          propertyChanges,
        });
      } else {
        // Sin cambios
        unchangedCount++;
      }
    }
  }

  // Detectar elementos eliminados
  for (const [key, oldElement] of Array.from(oldMap.entries())) {
    if (!newMap.has(key)) {
      removed.push({
        expressId: oldElement.expressId,
        type: oldElement.type,
        globalId: oldElement.globalId,
        changeType: 'removed',
        oldProperties: oldElement.properties,
      });
    }
  }

  // Calcular estadísticas por tipo
  const changesByType: Record<string, { added: number; removed: number; modified: number }> = {};

  for (const change of added) {
    if (!changesByType[change.type]) {
      changesByType[change.type] = { added: 0, removed: 0, modified: 0 };
    }
    changesByType[change.type].added++;
  }

  for (const change of removed) {
    if (!changesByType[change.type]) {
      changesByType[change.type] = { added: 0, removed: 0, modified: 0 };
    }
    changesByType[change.type].removed++;
  }

  for (const change of modified) {
    if (!changesByType[change.type]) {
      changesByType[change.type] = { added: 0, removed: 0, modified: 0 };
    }
    changesByType[change.type].modified++;
  }

  return {
    added,
    removed,
    modified,
    unchanged: unchangedCount,
    statistics: {
      totalChanges: added.length + removed.length + modified.length,
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
      unchangedCount,
      changesByType,
    },
  };
}

/**
 * Compara las propiedades de dos elementos y detecta cambios
 */
function compareProperties(
  oldProps: Record<string, any>,
  newProps: Record<string, any>
): PropertyChange[] {
  const changes: PropertyChange[] = [];
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of Array.from(allKeys)) {
    const oldValue = oldProps[key];
    const newValue = newProps[key];

    // Comparar valores (manejo especial para objetos y arrays)
    if (!areValuesEqual(oldValue, newValue)) {
      changes.push({
        propertyName: key,
        oldValue,
        newValue,
      });
    }
  }

  return changes;
}

/**
 * Compara dos valores considerando tipos primitivos, objetos y arrays
 */
function areValuesEqual(val1: any, val2: any): boolean {
  // Ambos undefined o null
  if (val1 === val2) return true;
  
  // Uno es undefined/null y el otro no
  if (val1 == null || val2 == null) return false;

  // Tipos diferentes
  if (typeof val1 !== typeof val2) return false;

  // Tipos primitivos
  if (typeof val1 !== 'object') return val1 === val2;

  // Arrays
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return false;
    return val1.every((item, index) => areValuesEqual(item, val2[index]));
  }

  // Objetos
  const keys1 = Object.keys(val1);
  const keys2 = Object.keys(val2);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key => areValuesEqual(val1[key], val2[key]));
}

/**
 * Genera un resumen textual de los cambios
 */
export function generateChangeSummary(result: ComparisonResult): string {
  const { statistics } = result;
  const lines: string[] = [];

  lines.push(`Total de cambios detectados: ${statistics.totalChanges}`);
  lines.push(`- Elementos añadidos: ${statistics.addedCount}`);
  lines.push(`- Elementos eliminados: ${statistics.removedCount}`);
  lines.push(`- Elementos modificados: ${statistics.modifiedCount}`);
  lines.push(`- Elementos sin cambios: ${statistics.unchangedCount}`);
  lines.push('');
  lines.push('Cambios por tipo de elemento:');

  for (const [type, counts] of Object.entries(statistics.changesByType)) {
    const total = counts.added + counts.removed + counts.modified;
    if (total > 0) {
      lines.push(`  ${type}:`);
      if (counts.added > 0) lines.push(`    + ${counts.added} añadidos`);
      if (counts.removed > 0) lines.push(`    - ${counts.removed} eliminados`);
      if (counts.modified > 0) lines.push(`    ~ ${counts.modified} modificados`);
    }
  }

  return lines.join('\n');
}

/**
 * Filtra cambios por tipo de elemento
 */
export function filterChangesByType(
  result: ComparisonResult,
  ifcType: string
): ComparisonResult {
  return {
    added: result.added.filter(c => c.type === ifcType),
    removed: result.removed.filter(c => c.type === ifcType),
    modified: result.modified.filter(c => c.type === ifcType),
    unchanged: result.unchanged,
    statistics: result.statistics,
  };
}

/**
 * Filtra cambios por tipo de cambio
 */
export function filterChangesByChangeType(
  result: ComparisonResult,
  changeType: 'added' | 'removed' | 'modified'
): ElementChange[] {
  switch (changeType) {
    case 'added':
      return result.added;
    case 'removed':
      return result.removed;
    case 'modified':
      return result.modified;
    default:
      return [];
  }
}
