/**
 * Servicio de Importación y Validación COBie
 * 
 * Maneja la importación de datos COBie parseados a la base de datos
 * Implementa validación de estructura y referencias cruzadas
 */

import { getDb } from './db';
import {
  cobieFacilities,
  cobieFloors,
  cobieSpaces,
  cobieZones,
  cobieTypes,
  cobieComponents,
  cobieSystems,
  cobieAssemblies,
  cobieConnections,
  cobieSpareParts,
  cobieResources,
  cobieJobs,
  cobieDocuments,
  cobieAttributes,
  cobieCoordinates,
} from '../drizzle/schema';
import type { ParsedCobieData } from './cobie-parser-service';

// ============================================================================
// TIPOS DE VALIDACIÓN
// ============================================================================

export interface ValidationError {
  type: 'error' | 'warning';
  entity: string;
  field?: string;
  message: string;
  value?: any;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalEntities: number;
    validEntities: number;
    errorCount: number;
    warningCount: number;
  };
}

// ============================================================================
// VALIDACIÓN DE ESTRUCTURA COBIE
// ============================================================================

/**
 * Valida la estructura y contenido de datos COBie
 */
export function validateCobieStructure(data: ParsedCobieData): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Validar Facility (obligatorio)
  if (!data.facility || !data.facility.name) {
    errors.push({
      type: 'error',
      entity: 'Facility',
      field: 'name',
      message: 'Facility name is required',
    });
  }
  
  // Validar Floors
  data.floors.forEach((floor, index) => {
    if (!floor.name) {
      errors.push({
        type: 'error',
        entity: 'Floor',
        field: 'name',
        message: `Floor at index ${index} is missing required field 'name'`,
      });
    }
  });
  
  // Validar Spaces
  const floorNames = new Set(data.floors.map(f => f.name));
  data.spaces.forEach((space, index) => {
    if (!space.name) {
      errors.push({
        type: 'error',
        entity: 'Space',
        field: 'name',
        message: `Space at index ${index} is missing required field 'name'`,
      });
    }
    if (space.floorName && !floorNames.has(space.floorName)) {
      warnings.push({
        type: 'warning',
        entity: 'Space',
        field: 'floorName',
        message: `Space '${space.name}' references non-existent floor '${space.floorName}'`,
        value: space.floorName,
      });
    }
  });
  
  // Validar Types
  data.types.forEach((type, index) => {
    if (!type.name) {
      errors.push({
        type: 'error',
        entity: 'Type',
        field: 'name',
        message: `Type at index ${index} is missing required field 'name'`,
      });
    }
  });
  
  // Validar Components
  const typeNames = new Set(data.types.map(t => t.name));
  const spaceNames = new Set(data.spaces.map(s => s.name));
  
  data.components.forEach((component, index) => {
    if (!component.name) {
      errors.push({
        type: 'error',
        entity: 'Component',
        field: 'name',
        message: `Component at index ${index} is missing required field 'name'`,
      });
    }
    if (!component.typeName) {
      errors.push({
        type: 'error',
        entity: 'Component',
        field: 'typeName',
        message: `Component '${component.name}' is missing required field 'typeName'`,
      });
    } else if (!typeNames.has(component.typeName)) {
      warnings.push({
        type: 'warning',
        entity: 'Component',
        field: 'typeName',
        message: `Component '${component.name}' references non-existent type '${component.typeName}'`,
        value: component.typeName,
      });
    }
    if (component.spaceName && !spaceNames.has(component.spaceName)) {
      warnings.push({
        type: 'warning',
        entity: 'Component',
        field: 'spaceName',
        message: `Component '${component.name}' references non-existent space '${component.spaceName}'`,
        value: component.spaceName,
      });
    }
  });
  
  // Validar Systems
  const componentNames = new Set(data.components.map(c => c.name));
  data.systems.forEach((system, index) => {
    if (!system.name) {
      errors.push({
        type: 'error',
        entity: 'System',
        field: 'name',
        message: `System at index ${index} is missing required field 'name'`,
      });
    }
    if (system.componentNames) {
      const components = system.componentNames.split(',').map(s => s.trim());
      components.forEach(compName => {
        if (compName && !componentNames.has(compName)) {
          warnings.push({
            type: 'warning',
            entity: 'System',
            field: 'componentNames',
            message: `System '${system.name}' references non-existent component '${compName}'`,
            value: compName,
          });
        }
      });
    }
  });
  
  // Validar Connections
  data.connections.forEach((connection, index) => {
    if (!connection.name) {
      errors.push({
        type: 'error',
        entity: 'Connection',
        field: 'name',
        message: `Connection at index ${index} is missing required field 'name'`,
      });
    }
    if (connection.component1 && !componentNames.has(connection.component1)) {
      warnings.push({
        type: 'warning',
        entity: 'Connection',
        field: 'component1',
        message: `Connection '${connection.name}' references non-existent component '${connection.component1}'`,
        value: connection.component1,
      });
    }
    if (connection.component2 && !componentNames.has(connection.component2)) {
      warnings.push({
        type: 'warning',
        entity: 'Connection',
        field: 'component2',
        message: `Connection '${connection.name}' references non-existent component '${connection.component2}'`,
        value: connection.component2,
      });
    }
  });
  
  // Validar Spare Parts
  data.spareParts.forEach((spare, index) => {
    if (!spare.name) {
      errors.push({
        type: 'error',
        entity: 'SparePart',
        field: 'name',
        message: `SparePart at index ${index} is missing required field 'name'`,
      });
    }
    if (!spare.typeName) {
      errors.push({
        type: 'error',
        entity: 'SparePart',
        field: 'typeName',
        message: `SparePart '${spare.name}' is missing required field 'typeName'`,
      });
    } else if (!typeNames.has(spare.typeName)) {
      warnings.push({
        type: 'warning',
        entity: 'SparePart',
        field: 'typeName',
        message: `SparePart '${spare.name}' references non-existent type '${spare.typeName}'`,
        value: spare.typeName,
      });
    }
  });
  
  // Validar Jobs
  data.jobs.forEach((job, index) => {
    if (!job.name) {
      errors.push({
        type: 'error',
        entity: 'Job',
        field: 'name',
        message: `Job at index ${index} is missing required field 'name'`,
      });
    }
    if (!job.typeName) {
      errors.push({
        type: 'error',
        entity: 'Job',
        field: 'typeName',
        message: `Job '${job.name}' is missing required field 'typeName'`,
      });
    } else if (!typeNames.has(job.typeName)) {
      warnings.push({
        type: 'warning',
        entity: 'Job',
        field: 'typeName',
        message: `Job '${job.name}' references non-existent type '${job.typeName}'`,
        value: job.typeName,
      });
    }
  });
  
  // Calcular resumen
  const totalEntities =
    1 + // facility
    data.floors.length +
    data.spaces.length +
    data.zones.length +
    data.types.length +
    data.components.length +
    data.systems.length +
    data.assemblies.length +
    data.connections.length +
    data.spareParts.length +
    data.resources.length +
    data.jobs.length +
    data.documents.length +
    data.attributes.length +
    data.coordinates.length;
  
  const errorCount = errors.length;
  const warningCount = warnings.length;
  const validEntities = totalEntities - errorCount;
  
  return {
    valid: errorCount === 0,
    errors,
    warnings,
    summary: {
      totalEntities,
      validEntities,
      errorCount,
      warningCount,
    },
  };
}

// ============================================================================
// IMPORTACIÓN A BASE DE DATOS
// ============================================================================

/**
 * Importa datos COBie parseados a la base de datos
 * Retorna el ID de la instalación creada
 */
export async function importCobieToDatabase(
  data: ParsedCobieData,
  projectId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Insertar Facility
  const [facility] = await db.insert(cobieFacilities).values({
    projectId,
    name: data.facility.name,
    createdOn: data.facility.createdOn,
    createdBy: data.facility.createdBy,
    category: data.facility.category,
    description: data.facility.description,
    projectPhase: data.facility.projectPhase,
    siteName: data.facility.siteName,
    linearUnits: data.facility.linearUnits,
    areaUnits: data.facility.areaUnits,
    volumeUnits: data.facility.volumeUnits,
    currencyUnit: data.facility.currencyUnit,
    areaMeasurement: data.facility.areaMeasurement,
    extAttributes: data.facility.extAttributes ? JSON.stringify(data.facility.extAttributes) : null,
  });
  
  const facilityId = Number(facility.insertId);
  
  // Insertar Floors
  const floorMap = new Map<string, number>();
  for (const floor of data.floors) {
    const [result] = await db.insert(cobieFloors).values({
      facilityId,
      name: floor.name,
      createdOn: floor.createdOn,
      createdBy: floor.createdBy,
      category: floor.category,
      description: floor.description,
      elevation: floor.elevation,
      height: floor.height,
      extAttributes: floor.extAttributes ? JSON.stringify(floor.extAttributes) : null,
    });
    floorMap.set(floor.name, Number(result.insertId));
  }
  
  // Insertar Spaces
  const spaceMap = new Map<string, number>();
  for (const space of data.spaces) {
    const floorId = floorMap.get(space.floorName);
    if (!floorId) continue; // Skip if floor not found
    
    const [result] = await db.insert(cobieSpaces).values({
      floorId,
      name: space.name,
      createdOn: space.createdOn,
      createdBy: space.createdBy,
      category: space.category,
      description: space.description,
      grossArea: space.grossArea,
      netArea: space.netArea,
      usableHeight: space.usableHeight,
      extAttributes: space.extAttributes ? JSON.stringify(space.extAttributes) : null,
    });
    spaceMap.set(space.name, Number(result.insertId));
  }
  
  // Insertar Zones
  for (const zone of data.zones) {
    await db.insert(cobieZones).values({
      facilityId,
      name: zone.name,
      createdOn: zone.createdOn,
      createdBy: zone.createdBy,
      category: zone.category,
      description: zone.description,
      spaceNames: zone.spaceNames,
      extAttributes: zone.extAttributes ? JSON.stringify(zone.extAttributes) : null,
    });
  }
  
  // Insertar Types
  const typeMap = new Map<string, number>();
  for (const type of data.types) {
    const [result] = await db.insert(cobieTypes).values({
      facilityId,
      name: type.name,
      createdOn: type.createdOn,
      createdBy: type.createdBy,
      category: type.category,
      description: type.description,
      assetType: type.assetType,
      manufacturer: type.manufacturer,
      modelNumber: type.modelNumber,
      warrantyGuarantorParts: type.warrantyGuarantorParts,
      warrantyDurationParts: type.warrantyDurationParts,
      warrantyGuarantorLabor: type.warrantyGuarantorLabor,
      warrantyDurationLabor: type.warrantyDurationLabor,
      expectedLife: type.expectedLife,
      durationUnit: type.durationUnit,
      replacementCost: type.replacementCost,
      warrantyDescription: type.warrantyDescription,
      extAttributes: type.extAttributes ? JSON.stringify(type.extAttributes) : null,
    });
    typeMap.set(type.name, Number(result.insertId));
  }
  
  // Insertar Components
  for (const component of data.components) {
    const typeId = typeMap.get(component.typeName);
    if (!typeId) continue; // Skip if type not found
    
    const spaceId = component.spaceName ? spaceMap.get(component.spaceName) : null;
    
    await db.insert(cobieComponents).values({
      typeId,
      spaceId: spaceId || null,
      name: component.name,
      createdOn: component.createdOn,
      createdBy: component.createdBy,
      description: component.description,
      serialNumber: component.serialNumber,
      installationDate: component.installationDate,
      warrantyStartDate: component.warrantyStartDate,
      barCode: component.barCode,
      assetIdentifier: component.assetIdentifier,
      ifcGuid: component.ifcGuid,
      extAttributes: component.extAttributes ? JSON.stringify(component.extAttributes) : null,
    });
  }
  
  // Insertar Systems
  for (const system of data.systems) {
    await db.insert(cobieSystems).values({
      facilityId,
      name: system.name,
      createdOn: system.createdOn,
      createdBy: system.createdBy,
      category: system.category,
      description: system.description,
      componentNames: system.componentNames,
      extAttributes: system.extAttributes ? JSON.stringify(system.extAttributes) : null,
    });
  }
  
  // Insertar Assemblies
  for (const assembly of data.assemblies) {
    await db.insert(cobieAssemblies).values({
      facilityId,
      name: assembly.name,
      createdOn: assembly.createdOn,
      createdBy: assembly.createdBy,
      description: assembly.description,
      assemblyType: assembly.assemblyType,
      parentName: assembly.parentName,
      childNames: assembly.childNames,
      extAttributes: assembly.extAttributes ? JSON.stringify(assembly.extAttributes) : null,
    });
  }
  
  // Insertar Connections
  for (const connection of data.connections) {
    await db.insert(cobieConnections).values({
      facilityId,
      name: connection.name,
      createdOn: connection.createdOn,
      createdBy: connection.createdBy,
      description: connection.description,
      connectionType: connection.connectionType,
      component1: connection.component1,
      component2: connection.component2,
      realizingElement1: connection.realizingElement1,
      realizingElement2: connection.realizingElement2,
      extAttributes: connection.extAttributes ? JSON.stringify(connection.extAttributes) : null,
    });
  }
  
  // Insertar Spare Parts
  for (const spare of data.spareParts) {
    const typeId = typeMap.get(spare.typeName);
    if (!typeId) continue;
    
    await db.insert(cobieSpareParts).values({
      typeId,
      name: spare.name,
      createdOn: spare.createdOn,
      createdBy: spare.createdBy,
      description: spare.description,
      suppliers: spare.suppliers,
      partNumber: spare.partNumber,
      quantity: spare.quantity,
      extAttributes: spare.extAttributes ? JSON.stringify(spare.extAttributes) : null,
    });
  }
  
  // Insertar Resources
  for (const resource of data.resources) {
    await db.insert(cobieResources).values({
      facilityId,
      name: resource.name,
      createdOn: resource.createdOn,
      createdBy: resource.createdBy,
      category: resource.category,
      email: resource.email,
      phone: resource.phone,
      department: resource.department,
      organizationCode: resource.organizationCode,
      street: resource.street,
      city: resource.city,
      postalCode: resource.postalCode,
      country: resource.country,
      extAttributes: resource.extAttributes ? JSON.stringify(resource.extAttributes) : null,
    });
  }
  
  // Insertar Jobs
  for (const job of data.jobs) {
    const typeId = typeMap.get(job.typeName);
    if (!typeId) continue;
    
    await db.insert(cobieJobs).values({
      typeId,
      name: job.name,
      createdOn: job.createdOn,
      createdBy: job.createdBy,
      description: job.description,
      status: job.status,
      taskCategory: job.taskCategory,
      frequency: job.frequency,
      frequencyUnit: job.frequencyUnit,
      start: job.start,
      taskDuration: job.taskDuration,
      durationUnit: job.durationUnit,
      resources: job.resources,
      extAttributes: job.extAttributes ? JSON.stringify(job.extAttributes) : null,
    });
  }
  
  // Insertar Documents
  for (const document of data.documents) {
    await db.insert(cobieDocuments).values({
      facilityId,
      name: document.name,
      createdOn: document.createdOn,
      createdBy: document.createdBy,
      category: document.category,
      description: document.description,
      referenceSheet: document.referenceSheet,
      referenceName: document.referenceName,
      documentUrl: document.documentUrl,
      directory: document.directory,
      file: document.file,
      extAttributes: document.extAttributes ? JSON.stringify(document.extAttributes) : null,
    });
  }
  
  // Insertar Attributes
  for (const attribute of data.attributes) {
    await db.insert(cobieAttributes).values({
      facilityId,
      name: attribute.name,
      createdOn: attribute.createdOn,
      createdBy: attribute.createdBy,
      category: attribute.category,
      sheetName: attribute.sheetName,
      rowName: attribute.rowName,
      value: attribute.value,
      unit: attribute.unit,
      allowedValues: attribute.allowedValues,
      description: attribute.description,
    });
  }
  
  // Insertar Coordinates
  for (const coordinate of data.coordinates) {
    await db.insert(cobieCoordinates).values({
      facilityId,
      name: coordinate.name,
      createdOn: coordinate.createdOn,
      createdBy: coordinate.createdBy,
      category: coordinate.category,
      sheetName: coordinate.sheetName,
      rowName: coordinate.rowName,
      coordinateX: coordinate.coordinateX,
      coordinateY: coordinate.coordinateY,
      coordinateZ: coordinate.coordinateZ,
      axisX: coordinate.axisX,
      axisY: coordinate.axisY,
      axisZ: coordinate.axisZ,
      description: coordinate.description,
    });
  }
  
  return facilityId;
}

/**
 * Función principal de importación COBie
 * Valida y luego importa los datos
 */
export async function importCobieFile(
  data: ParsedCobieData,
  projectId: number
): Promise<{ facilityId: number; validation: ValidationReport }> {
  // Validar estructura
  const validation = validateCobieStructure(data);
  
  // Si hay errores críticos, no importar
  if (!validation.valid) {
    throw new Error(`COBie validation failed with ${validation.errors.length} errors`);
  }
  
  // Importar a base de datos
  const facilityId = await importCobieToDatabase(data, projectId);
  
  return {
    facilityId,
    validation,
  };
}
