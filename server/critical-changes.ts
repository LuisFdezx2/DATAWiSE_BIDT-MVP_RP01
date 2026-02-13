/**
 * Servicio de detección de cambios críticos en elementos estructurales
 */

import type { ComparisonResult } from './ifc-comparison';

// Tipos de elementos estructurales críticos
export const CRITICAL_ELEMENT_TYPES = [
  'IfcWall',
  'IfcWallStandardCase',
  'IfcColumn',
  'IfcBeam',
  'IfcSlab',
  'IfcFooting',
  'IfcPile',
  'IfcRoof',
] as const;

export interface CriticalChange {
  expressId: number;
  type: string;
  globalId?: string;
  name?: string;
  changeType: 'added' | 'removed' | 'modified';
  severity: 'high' | 'medium' | 'low';
  description: string;
  propertyChanges?: Array<{
    propertyName: string;
    oldValue: any;
    newValue: any;
  }>;
}

export interface CriticalChangesReport {
  hasCriticalChanges: boolean;
  criticalChanges: CriticalChange[];
  summary: {
    totalCritical: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
}

/**
 * Determina si un tipo de elemento es crítico
 */
export function isCriticalElement(type: string): boolean {
  return CRITICAL_ELEMENT_TYPES.some(criticalType => 
    type.toLowerCase().includes(criticalType.toLowerCase())
  );
}

/**
 * Determina la severidad de un cambio en un elemento crítico
 */
function determineSeverity(
  changeType: 'added' | 'removed' | 'modified',
  elementType: string,
  propertyChanges?: Array<{ propertyName: string; oldValue: any; newValue: any }>
): 'high' | 'medium' | 'low' {
  // Eliminación de elementos estructurales = alta severidad
  if (changeType === 'removed') {
    return 'high';
  }

  // Adición de elementos estructurales = severidad media
  if (changeType === 'added') {
    return 'medium';
  }

  // Modificación: depende de las propiedades cambiadas
  if (changeType === 'modified' && propertyChanges) {
    const criticalProperties = [
      'loadbearing',
      'isexternal',
      'thickness',
      'width',
      'height',
      'length',
      'material',
      'structuraltype',
    ];

    const hasCriticalPropertyChange = propertyChanges.some(change =>
      criticalProperties.some(prop =>
        change.propertyName.toLowerCase().includes(prop)
      )
    );

    return hasCriticalPropertyChange ? 'high' : 'low';
  }

  return 'low';
}

/**
 * Genera descripción legible del cambio
 */
function generateChangeDescription(
  changeType: 'added' | 'removed' | 'modified',
  elementType: string,
  name?: string
): string {
  const elementName = name || `Elemento ${elementType}`;

  switch (changeType) {
    case 'added':
      return `Se añadió ${elementName}`;
    case 'removed':
      return `Se eliminó ${elementName}`;
    case 'modified':
      return `Se modificó ${elementName}`;
    default:
      return `Cambio en ${elementName}`;
  }
}

/**
 * Detecta cambios críticos en una comparación de modelos
 */
export function detectCriticalChanges(
  comparison: ComparisonResult
): CriticalChangesReport {
  const criticalChanges: CriticalChange[] = [];

  // Procesar elementos añadidos
  comparison.added
    .filter(el => isCriticalElement(el.type))
    .forEach(el => {
      const severity = determineSeverity('added', el.type);
      criticalChanges.push({
        expressId: el.expressId,
        type: el.type,
        globalId: el.globalId,
        changeType: 'added',
        severity,
        description: generateChangeDescription('added', el.type),
      });
    });

  // Procesar elementos eliminados
  comparison.removed
    .filter(el => isCriticalElement(el.type))
    .forEach(el => {
      const severity = determineSeverity('removed', el.type);
      criticalChanges.push({
        expressId: el.expressId,
        type: el.type,
        globalId: el.globalId,
        changeType: 'removed',
        severity,
        description: generateChangeDescription('removed', el.type),
      });
    });

  // Procesar elementos modificados
  comparison.modified
    .filter(el => isCriticalElement(el.type))
    .forEach(el => {
      const severity = determineSeverity('modified', el.type, el.propertyChanges);
      criticalChanges.push({
        expressId: el.expressId,
        type: el.type,
        globalId: el.globalId,
        changeType: 'modified',
        severity,
        description: generateChangeDescription('modified', el.type),
        propertyChanges: el.propertyChanges,
      });
    });

  // Calcular resumen
  const summary = {
    totalCritical: criticalChanges.length,
    highSeverity: criticalChanges.filter(c => c.severity === 'high').length,
    mediumSeverity: criticalChanges.filter(c => c.severity === 'medium').length,
    lowSeverity: criticalChanges.filter(c => c.severity === 'low').length,
  };

  return {
    hasCriticalChanges: criticalChanges.length > 0,
    criticalChanges,
    summary,
  };
}
