/**
 * Servicio mejorado de validación IDS
 * Maneja property sets, propiedades anidadas y casos edge
 */

import type { IDSDocument, IDSSpecification, IDSRequirement } from './ids-parser';
import type { IfcElementData } from './ifc-processor';

export interface ValidationResult {
  elementId: number;
  elementType: string;
  elementName?: string;
  specificationName: string;
  passed: boolean;
  failures: ValidationFailure[];
  warnings: ValidationWarning[];
}

export interface ValidationFailure {
  requirementType: string;
  requirementName: string;
  expected: string;
  actual: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  message: string;
  context?: string;
}

export interface IDSValidationReport {
  modelId?: number;
  modelName?: string;
  validationDate: Date;
  totalElements: number;
  validatedElements: number;
  passedElements: number;
  failedElements: number;
  warningCount: number;
  complianceRate: number;
  specificationResults: SpecificationResult[];
  elementResults: ValidationResult[];
}

export interface SpecificationResult {
  name: string;
  description?: string;
  totalApplicable: number;
  passed: number;
  failed: number;
  warnings: number;
  complianceRate: number;
}

/**
 * Valida elementos IFC contra un documento IDS
 */
export async function validateAgainstIDS(
  elements: IfcElementData[],
  idsDocument: IDSDocument,
  modelId?: number,
  modelName?: string
): Promise<IDSValidationReport> {
  const elementResults: ValidationResult[] = [];
  const specificationResults: SpecificationResult[] = [];

  // Validar cada especificación
  for (const specification of idsDocument.specifications) {
    const specResult = await validateSpecification(elements, specification);
    specificationResults.push(specResult);
    elementResults.push(...specResult.elementResults);
  }

  // Calcular estadísticas globales
  const validatedElements = new Set(elementResults.map(r => r.elementId)).size;
  const passedElements = elementResults.filter(r => r.passed).length;
  const failedElements = elementResults.filter(r => !r.passed).length;
  const warningCount = elementResults.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    modelId,
    modelName,
    validationDate: new Date(),
    totalElements: elements.length,
    validatedElements,
    passedElements,
    failedElements,
    warningCount,
    complianceRate: validatedElements > 0 ? (passedElements / validatedElements) * 100 : 0,
    specificationResults,
    elementResults,
  };
}

/**
 * Valida elementos contra una especificación específica
 */
async function validateSpecification(
  elements: IfcElementData[],
  specification: IDSSpecification
): Promise<SpecificationResult & { elementResults: ValidationResult[] }> {
  const elementResults: ValidationResult[] = [];

  // Filtrar elementos aplicables
  const applicableElements = elements.filter(element =>
    isElementApplicable(element, specification)
  );

  // Validar cada elemento aplicable
  for (const element of applicableElements) {
    const failures: ValidationFailure[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar cada requisito
    for (const requirement of specification.requirements) {
      const result = validateRequirement(element, requirement);
      if (result.failure) {
        failures.push(result.failure);
      }
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    }

    elementResults.push({
      elementId: element.expressId,
      elementType: element.type,
      elementName: element.name,
      specificationName: specification.name,
      passed: failures.length === 0,
      failures,
      warnings,
    });
  }

  const passed = elementResults.filter(r => r.passed).length;
  const failed = elementResults.filter(r => !r.passed).length;
  const warningCount = elementResults.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    name: specification.name,
    description: specification.description,
    totalApplicable: applicableElements.length,
    passed,
    failed,
    warnings: warningCount,
    complianceRate: applicableElements.length > 0 ? (passed / applicableElements.length) * 100 : 0,
    elementResults,
  };
}

/**
 * Verifica si un elemento cumple con la aplicabilidad
 */
function isElementApplicable(
  element: IfcElementData,
  specification: IDSSpecification
): boolean {
  const applicability = specification.applicability;
  if (applicability.length === 0) return true;

  // Todos los criterios de aplicabilidad deben cumplirse (AND lógico)
  for (const condition of applicability) {
    if (condition.type === 'entity') {
      // Verificar tipo de entidad
      if (element.type !== condition.value) {
        return false;
      }

      // Verificar PredefinedType si está especificado
      if (condition.predefinedType) {
        const predefinedType = getPropertyValue(element, 'PredefinedType');
        if (predefinedType !== condition.predefinedType) {
          return false;
        }
      }
    }

    if (condition.type === 'property') {
      // Verificar que tenga una propiedad específica
      const propertyName = condition.predefinedType || condition.value;
      if (!hasProperty(element, propertyName)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Valida un requisito específico contra un elemento
 */
function validateRequirement(
  element: IfcElementData,
  requirement: IDSRequirement
): { failure: ValidationFailure | null; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];

  // Los requisitos opcionales no generan fallos
  if (requirement.cardinality === 'optional') {
    return { failure: null, warnings };
  }

  if (requirement.type === 'property') {
    return validatePropertyRequirement(element, requirement);
  }

  if (requirement.type === 'attribute') {
    return validateAttributeRequirement(element, requirement);
  }

  if (requirement.type === 'material') {
    return validateMaterialRequirement(element, requirement);
  }

  if (requirement.type === 'classification') {
    return validateClassificationRequirement(element, requirement);
  }

  if (requirement.type === 'entity') {
    return validateEntityRequirement(element, requirement);
  }

  return { failure: null, warnings };
}

/**
 * Valida requisito de propiedad
 */
function validatePropertyRequirement(
  element: IfcElementData,
  requirement: IDSRequirement
): { failure: ValidationFailure | null; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];
  const propertyValue = getPropertyValue(element, requirement.name, requirement.propertySet);

  if (requirement.cardinality === 'required') {
    if (propertyValue === null || propertyValue === undefined) {
      return {
        failure: {
          requirementType: 'property',
          requirementName: requirement.name,
          expected: requirement.value ? formatValue(requirement.value) : 'any value',
          actual: 'missing',
          message: `Required property "${requirement.name}"${requirement.propertySet ? ` in property set "${requirement.propertySet}"` : ''} is missing`,
          severity: 'error',
        },
        warnings,
      };
    }

    // Validar valor si está especificado
    if (requirement.value) {
      const expectedValues = Array.isArray(requirement.value)
        ? requirement.value
        : [String(requirement.value)];
      
      const actualValue = String(propertyValue);
      if (!expectedValues.some(expected => matchesValue(actualValue, expected))) {
        return {
          failure: {
            requirementType: 'property',
            requirementName: requirement.name,
            expected: expectedValues.join(' or '),
            actual: actualValue,
            message: `Property "${requirement.name}" has value "${actualValue}" but expected "${expectedValues.join(' or ')}"`,
            severity: 'error',
          },
          warnings,
        };
      }
    }
  }

  if (requirement.cardinality === 'prohibited') {
    if (propertyValue !== null && propertyValue !== undefined) {
      return {
        failure: {
          requirementType: 'property',
          requirementName: requirement.name,
          expected: 'not present',
          actual: String(propertyValue),
          message: `Property "${requirement.name}" should not be present but found with value "${propertyValue}"`,
          severity: 'error',
        },
        warnings,
      };
    }
  }

  return { failure: null, warnings };
}

/**
 * Valida requisito de atributo IFC
 */
function validateAttributeRequirement(
  element: IfcElementData,
  requirement: IDSRequirement
): { failure: ValidationFailure | null; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];
  
  // Mapeo de nombres de atributos IDS a propiedades de elemento
  const attributeMap: Record<string, string> = {
    'Name': 'name',
    'Description': 'description',
    'GlobalId': 'globalId',
    'Tag': 'tag',
  };

  const attributeKey = attributeMap[requirement.name] || requirement.name.toLowerCase();
  const attributeValue = (element as any)[attributeKey];

  if (requirement.cardinality === 'required') {
    if (!attributeValue) {
      return {
        failure: {
          requirementType: 'attribute',
          requirementName: requirement.name,
          expected: requirement.value ? formatValue(requirement.value) : 'any value',
          actual: 'missing',
          message: `Required attribute "${requirement.name}" is missing`,
          severity: 'error',
        },
        warnings,
      };
    }

    if (requirement.value) {
      const expectedValues = Array.isArray(requirement.value)
        ? requirement.value
        : [String(requirement.value)];
      
      const actualValue = String(attributeValue);
      if (!expectedValues.some(expected => matchesValue(actualValue, expected))) {
        return {
          failure: {
            requirementType: 'attribute',
            requirementName: requirement.name,
            expected: expectedValues.join(' or '),
            actual: actualValue,
            message: `Attribute "${requirement.name}" has value "${actualValue}" but expected "${expectedValues.join(' or ')}"`,
            severity: 'error',
          },
          warnings,
        };
      }
    }
  }

  return { failure: null, warnings };
}

/**
 * Valida requisito de material
 */
function validateMaterialRequirement(
  element: IfcElementData,
  requirement: IDSRequirement
): { failure: ValidationFailure | null; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];
  const materialValue = getPropertyValue(element, 'Material') || getPropertyValue(element, 'MaterialName');

  if (requirement.cardinality === 'required') {
    if (!materialValue) {
      return {
        failure: {
          requirementType: 'material',
          requirementName: requirement.name,
          expected: requirement.value ? formatValue(requirement.value) : 'any material',
          actual: 'missing',
          message: `Required material is missing`,
          severity: 'error',
        },
        warnings,
      };
    }

    if (requirement.value) {
      const expectedValues = Array.isArray(requirement.value)
        ? requirement.value
        : [String(requirement.value)];
      
      const actualValue = String(materialValue);
      if (!expectedValues.some(expected => matchesValue(actualValue, expected))) {
        return {
          failure: {
            requirementType: 'material',
            requirementName: requirement.name,
            expected: expectedValues.join(' or '),
            actual: actualValue,
            message: `Material has value "${actualValue}" but expected "${expectedValues.join(' or ')}"`,
            severity: 'error',
          },
          warnings,
        };
      }
    }
  }

  return { failure: null, warnings };
}

/**
 * Valida requisito de clasificación
 */
function validateClassificationRequirement(
  element: IfcElementData,
  requirement: IDSRequirement
): { failure: ValidationFailure | null; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];
  const classificationValue = getPropertyValue(element, 'Classification') || 
                              getPropertyValue(element, 'ClassificationCode');

  if (requirement.cardinality === 'required') {
    if (!classificationValue) {
      return {
        failure: {
          requirementType: 'classification',
          requirementName: requirement.name,
          expected: requirement.value ? formatValue(requirement.value) : 'any classification',
          actual: 'missing',
          message: `Required classification${requirement.system ? ` from system "${requirement.system}"` : ''} is missing`,
          severity: 'error',
        },
        warnings,
      };
    }

    if (requirement.value) {
      const expectedValues = Array.isArray(requirement.value)
        ? requirement.value
        : [String(requirement.value)];
      
      const actualValue = String(classificationValue);
      if (!expectedValues.some(expected => matchesValue(actualValue, expected))) {
        return {
          failure: {
            requirementType: 'classification',
            requirementName: requirement.name,
            expected: expectedValues.join(' or '),
            actual: actualValue,
            message: `Classification has value "${actualValue}" but expected "${expectedValues.join(' or ')}"`,
            severity: 'error',
          },
          warnings,
        };
      }
    }
  }

  return { failure: null, warnings };
}

/**
 * Valida requisito de entidad
 */
function validateEntityRequirement(
  element: IfcElementData,
  requirement: IDSRequirement
): { failure: ValidationFailure | null; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];

  if (requirement.cardinality === 'required') {
    if (element.type !== requirement.name) {
      return {
        failure: {
          requirementType: 'entity',
          requirementName: requirement.name,
          expected: requirement.name,
          actual: element.type,
          message: `Element type is "${element.type}" but expected "${requirement.name}"`,
          severity: 'error',
        },
        warnings,
      };
    }
  }

  return { failure: null, warnings };
}

/**
 * Obtiene el valor de una propiedad del elemento
 * Busca en properties object y en property sets
 */
function getPropertyValue(
  element: IfcElementData,
  propertyName: string,
  propertySet?: string
): any {
  if (!element.properties) return null;

  // Si es un objeto plano, buscar directamente
  if (typeof element.properties === 'object' && !Array.isArray(element.properties)) {
    // Búsqueda case-insensitive
    const key = Object.keys(element.properties).find(
      k => k.toLowerCase() === propertyName.toLowerCase()
    );
    if (key) return element.properties[key];

    // Si se especifica property set, buscar en él
    if (propertySet) {
      const psetKey = Object.keys(element.properties).find(
        k => k.toLowerCase() === propertySet.toLowerCase()
      );
      if (psetKey && typeof element.properties[psetKey] === 'object') {
        const pset = element.properties[psetKey];
        const propKey = Object.keys(pset).find(
          k => k.toLowerCase() === propertyName.toLowerCase()
        );
        if (propKey) return pset[propKey];
      }
    }
  }

  return null;
}

/**
 * Verifica si el elemento tiene una propiedad
 */
function hasProperty(element: IfcElementData, propertyName: string): boolean {
  return getPropertyValue(element, propertyName) !== null;
}

/**
 * Compara dos valores con soporte para wildcards y case-insensitive
 */
function matchesValue(actual: string, expected: string): boolean {
  // Comparación exacta
  if (actual === expected) return true;

  // Comparación case-insensitive
  if (actual.toLowerCase() === expected.toLowerCase()) return true;

  // Soporte para wildcards (* y ?)
  if (expected.includes('*') || expected.includes('?')) {
    const pattern = expected
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escapar caracteres especiales
      .replace(/\*/g, '.*') // * = cualquier secuencia
      .replace(/\?/g, '.'); // ? = cualquier carácter
    const regex = new RegExp(`^${pattern}$`, 'i');
    return regex.test(actual);
  }

  return false;
}

/**
 * Formatea un valor para mostrar
 */
function formatValue(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.join(' or ');
  }
  return String(value);
}
