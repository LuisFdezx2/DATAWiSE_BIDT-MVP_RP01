/**
 * Servicio de comparación de modelos IFC
 * Detecta elementos añadidos, eliminados y modificados entre dos versiones
 */

export interface IfcElement {
  expressId: number;
  type: string;
  globalId?: string;
  name?: string;
  properties?: Record<string, any>;
}

export interface PropertyChange {
  propertyName: string;
  oldValue: any;
  newValue: any;
}

export interface ElementChange {
  expressId: number;
  type: string;
  globalId?: string;
  name?: string;
  changeType: 'added' | 'removed' | 'modified';
  propertyChanges?: PropertyChange[];
}

export interface ComparisonResult {
  added: ElementChange[];
  removed: ElementChange[];
  modified: ElementChange[];
  statistics: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
}

/**
 * Compara dos arrays de elementos IFC y detecta cambios
 */
export function compareModels(
  oldElements: IfcElement[],
  newElements: IfcElement[]
): ComparisonResult {
  const added: ElementChange[] = [];
  const removed: ElementChange[] = [];
  const modified: ElementChange[] = [];

  // Crear mapas por globalId (o expressId si no hay globalId)
  const oldMap = new Map<string, IfcElement>();
  const newMap = new Map<string, IfcElement>();

  // Indexar elementos antiguos
  for (const element of oldElements) {
    const key = element.globalId || `expr-${element.expressId}`;
    oldMap.set(key, element);
  }

  // Indexar elementos nuevos
  for (const element of newElements) {
    const key = element.globalId || `expr-${element.expressId}`;
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
        name: newElement.name,
        changeType: 'added',
      });
    } else {
      // Verificar si el elemento fue modificado
      const propertyChanges = detectPropertyChanges(
        oldElement.properties || {},
        newElement.properties || {}
      );

      if (propertyChanges.length > 0) {
        modified.push({
          expressId: newElement.expressId,
          type: newElement.type,
          globalId: newElement.globalId,
          name: newElement.name,
          changeType: 'modified',
          propertyChanges,
        });
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
        name: oldElement.name,
        changeType: 'removed',
      });
    }
  }

  return {
    added,
    removed,
    modified,
    statistics: {
      totalChanges: added.length + removed.length + modified.length,
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
    },
  };
}

/**
 * Detecta cambios en propiedades entre dos objetos
 */
function detectPropertyChanges(
  oldProps: Record<string, any>,
  newProps: Record<string, any>
): PropertyChange[] {
  const changes: PropertyChange[] = [];
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of Array.from(allKeys)) {
    const oldValue = oldProps[key];
    const newValue = newProps[key];

    // Comparar valores (deep comparison para objetos)
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
 * Compara dos valores de forma profunda
 */
function areValuesEqual(a: any, b: any): boolean {
  // Valores idénticos
  if (a === b) return true;

  // Uno es undefined y el otro no
  if (a === undefined || b === undefined) return false;

  // Uno es null y el otro no
  if (a === null || b === null) return a === b;

  // Tipos diferentes
  if (typeof a !== typeof b) return false;

  // Objetos y arrays
  if (typeof a === 'object') {
    // Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => areValuesEqual(item, b[index]));
    }

    // Objetos
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => areValuesEqual(a[key], b[key]));
  }

  // Valores primitivos
  return false;
}
