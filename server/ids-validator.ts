import type { IDSDocument, IDSSpecification, IDSApplicability, IDSRequirement } from './ids-parser';
import type { IfcElementData } from './ifc-processor';

// Alias para compatibilidad
type IfcElement = IfcElementData & {
  expressID: number;
  properties?: Array<{ name: string; value: any }>;
};

/**
 * Resultado de validación de un elemento
 */
export interface ValidationResult {
  elementId: number;
  elementType: string;
  specificationName: string;
  passed: boolean;
  failures: ValidationFailure[];
}

/**
 * Detalle de un fallo de validación
 */
export interface ValidationFailure {
  requirementType: string;
  requirementName: string;
  expected: string;
  actual: string;
  message: string;
}

/**
 * Reporte completo de validación IDS
 */
export interface IDSValidationReport {
  totalElements: number;
  validatedElements: number;
  passedElements: number;
  failedElements: number;
  complianceRate: number;
  specificationResults: SpecificationResult[];
  elementResults: ValidationResult[];
}

/**
 * Resultado por especificación
 */
export interface SpecificationResult {
  name: string;
  description?: string;
  totalApplicable: number;
  passed: number;
  failed: number;
  complianceRate: number;
}

/**
 * Valida elementos IFC contra un documento IDS
 */
export function validateAgainstIDS(
  elements: IfcElementData[],
  idsDocument: IDSDocument
): IDSValidationReport {
  const elementResults: ValidationResult[] = [];
  const specificationResults: SpecificationResult[] = [];

  // Validar cada especificación
  for (const specification of idsDocument.specifications) {
    const specResult = validateSpecification(elements, specification);
    specificationResults.push(specResult);
    elementResults.push(...specResult.elementResults);
  }

  // Calcular estadísticas globales
  const validatedElements = new Set(elementResults.map(r => r.elementId)).size;
  const passedElements = elementResults.filter(r => r.passed).length;
  const failedElements = elementResults.filter(r => !r.passed).length;

  return {
    totalElements: elements.length,
    validatedElements,
    passedElements,
    failedElements,
    complianceRate: validatedElements > 0 ? (passedElements / validatedElements) * 100 : 0,
    specificationResults,
    elementResults,
  };
}

/**
 * Valida elementos contra una especificación específica
 */
function validateSpecification(
  elements: IfcElementData[],
  specification: IDSSpecification
): SpecificationResult & { elementResults: ValidationResult[] } {
  const elementResults: ValidationResult[] = [];

  // Filtrar elementos aplicables
  const applicableElements = elements.filter(element =>
    isElementApplicable(element, specification.applicability)
  );

  // Validar cada elemento aplicable
  for (const element of applicableElements) {
    const failures: ValidationFailure[] = [];

    // Validar cada requisito
    for (const requirement of specification.requirements) {
      const failure = validateRequirement(element, requirement);
      if (failure) {
        failures.push(failure);
      }
    }

    elementResults.push({
      elementId: element.expressId,
      elementType: element.type,
      specificationName: specification.name,
      passed: failures.length === 0,
      failures,
    });
  }

  const passed = elementResults.filter(r => r.passed).length;
  const failed = elementResults.filter(r => !r.passed).length;

  return {
    name: specification.name,
    description: specification.description,
    totalApplicable: applicableElements.length,
    passed,
    failed,
    complianceRate: applicableElements.length > 0 ? (passed / applicableElements.length) * 100 : 0,
    elementResults,
  };
}

/**
 * Verifica si un elemento cumple con la aplicabilidad
 */
function isElementApplicable(
  element: IfcElementData,
  applicability: IDSApplicability[]
): boolean {
  if (applicability.length === 0) return true;

  for (const condition of applicability) {
    if (condition.type === 'entity') {
      // Verificar tipo de entidad
      if (element.type !== condition.value) {
        return false;
      }

      // Verificar PredefinedType si está especificado
      if (condition.predefinedType) {
        const predefinedType = element.properties?.PredefinedType;
        if (predefinedType !== condition.predefinedType) {
          return false;
        }
      }
    }

    if (condition.type === 'property') {
      // Verificar que tenga una propiedad específica
      const hasProperty = condition.predefinedType && condition.predefinedType in (element.properties || {});
      if (!hasProperty) {
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
): ValidationFailure | null {
  if (requirement.cardinality === 'optional') {
    return null; // Los requisitos opcionales no fallan
  }

  if (requirement.type === 'property') {
    const propertyValue = element.properties?.[requirement.name];

    if (requirement.cardinality === 'required') {
      if (!propertyValue) {
        return {
          requirementType: 'property',
          requirementName: requirement.name,
          expected: requirement.value ? (Array.isArray(requirement.value) ? requirement.value.join(', ') : String(requirement.value)) : 'any value',
          actual: 'missing',
          message: `Required property "${requirement.name}" is missing`,
        };
      }

      // Validar valor si está especificado
      if (requirement.value) {
        const expectedValues = Array.isArray(requirement.value)
          ? requirement.value
          : [String(requirement.value)];
        
        const actualValue = String(propertyValue);
        if (!expectedValues.includes(actualValue)) {
          return {
            requirementType: 'property',
            requirementName: requirement.name,
            expected: expectedValues.join(' or '),
            actual: actualValue,
            message: `Property "${requirement.name}" has value "${actualValue}" but expected "${expectedValues.join(' or ')}"`,
          };
        }
      }
    }

    if (requirement.cardinality === 'prohibited') {
      if (propertyValue) {
        return {
          requirementType: 'property',
          requirementName: requirement.name,
          expected: 'not present',
          actual: String(propertyValue),
          message: `Property "${requirement.name}" should not be present but found with value "${propertyValue}"`,
        };
      }
    }
  }

  if (requirement.type === 'attribute') {
    // Validar atributos IFC (Name, Description, etc.)
    const attributeValue = (element as any)[requirement.name];

    if (requirement.cardinality === 'required') {
      if (!attributeValue) {
        return {
          requirementType: 'attribute',
          requirementName: requirement.name,
          expected: requirement.value ? (Array.isArray(requirement.value) ? requirement.value.join(', ') : String(requirement.value)) : 'any value',
          actual: 'missing',
          message: `Required attribute "${requirement.name}" is missing`,
        };
      }

      if (requirement.value && attributeValue !== requirement.value) {
        return {
          requirementType: 'attribute',
          requirementName: requirement.name,
          expected: Array.isArray(requirement.value) ? requirement.value.join(', ') : String(requirement.value),
          actual: String(attributeValue),
          message: `Attribute "${requirement.name}" has value "${attributeValue}" but expected "${requirement.value}"`,
        };
      }
    }
  }

  if (requirement.type === 'material') {
    // Validar material
    const hasMaterial = element.properties?.some((p: any) => 
      p.name.toLowerCase().includes('material')
    );

    if (requirement.cardinality === 'required' && !hasMaterial) {
      return {
        requirementType: 'material',
        requirementName: requirement.name,
        expected: requirement.value ? (Array.isArray(requirement.value) ? requirement.value.join(', ') : String(requirement.value)) : 'any material',
        actual: 'missing',
        message: `Required material is missing`,
      };
    }
  }

  if (requirement.type === 'classification') {
    // Validar clasificación
    const hasClassification = element.properties?.some((p: any) => 
      p.name.toLowerCase().includes('classification')
    );

    if (requirement.cardinality === 'required' && !hasClassification) {
      return {
        requirementType: 'classification',
        requirementName: requirement.name,
        expected: requirement.value ? (Array.isArray(requirement.value) ? requirement.value.join(', ') : String(requirement.value)) : 'any classification',
        actual: 'missing',
        message: `Required classification is missing`,
      };
    }
  }

  return null; // Validación pasada
}
