/**
 * Servicio de Parsers COBie Multi-Formato
 * 
 * Soporta importación de datos COBie desde:
 * - Excel (.xlsx) - Formato prioritario
 * - IFC (.ifc) - IFC no geométrico optimizado para COBie
 * - XML (.xml) - Formato estructurado COBie
 * 
 * Implementa detección automática de formato y parseo unificado
 */

import * as XLSX from 'xlsx';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

// ============================================================================
// TIPOS DE DATOS COBIE
// ============================================================================

export interface CobieFacilityData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  description?: string;
  projectPhase?: string;
  siteName?: string;
  linearUnits?: string;
  areaUnits?: string;
  volumeUnits?: string;
  currencyUnit?: string;
  areaMeasurement?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieFloorData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  description?: string;
  elevation?: string;
  height?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieSpaceData {
  floorName: string;
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  description?: string;
  grossArea?: string;
  netArea?: string;
  usableHeight?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieZoneData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  description?: string;
  spaceNames?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieTypeData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  description?: string;
  assetType?: string;
  manufacturer?: string;
  modelNumber?: string;
  warrantyGuarantorParts?: string;
  warrantyDurationParts?: string;
  warrantyGuarantorLabor?: string;
  warrantyDurationLabor?: string;
  expectedLife?: string;
  durationUnit?: string;
  replacementCost?: string;
  warrantyDescription?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieComponentData {
  typeName: string;
  spaceName?: string;
  name: string;
  createdOn?: Date;
  createdBy?: string;
  description?: string;
  serialNumber?: string;
  installationDate?: Date;
  warrantyStartDate?: Date;
  barCode?: string;
  assetIdentifier?: string;
  ifcGuid?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieSystemData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  description?: string;
  componentNames?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieAssemblyData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  description?: string;
  assemblyType?: string;
  parentName?: string;
  childNames?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieConnectionData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  description?: string;
  connectionType?: string;
  component1?: string;
  component2?: string;
  realizingElement1?: string;
  realizingElement2?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieSparePartData {
  typeName: string;
  name: string;
  createdOn?: Date;
  createdBy?: string;
  description?: string;
  suppliers?: string;
  partNumber?: string;
  quantity?: number;
  extAttributes?: Record<string, any>;
}

export interface CobieResourceData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  email?: string;
  phone?: string;
  department?: string;
  organizationCode?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieJobData {
  typeName: string;
  name: string;
  createdOn?: Date;
  createdBy?: string;
  description?: string;
  status?: string;
  taskCategory?: string;
  frequency?: string;
  frequencyUnit?: string;
  start?: Date;
  taskDuration?: string;
  durationUnit?: string;
  resources?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieDocumentData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  description?: string;
  referenceSheet?: string;
  referenceName?: string;
  documentUrl?: string;
  directory?: string;
  file?: string;
  extAttributes?: Record<string, any>;
}

export interface CobieAttributeData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  sheetName?: string;
  rowName?: string;
  value?: string;
  unit?: string;
  allowedValues?: string;
  description?: string;
}

export interface CobieCoordinateData {
  name: string;
  createdOn?: Date;
  createdBy?: string;
  category?: string;
  sheetName?: string;
  rowName?: string;
  coordinateX?: string;
  coordinateY?: string;
  coordinateZ?: string;
  axisX?: string;
  axisY?: string;
  axisZ?: string;
  description?: string;
}

export interface ParsedCobieData {
  facility: CobieFacilityData;
  floors: CobieFloorData[];
  spaces: CobieSpaceData[];
  zones: CobieZoneData[];
  types: CobieTypeData[];
  components: CobieComponentData[];
  systems: CobieSystemData[];
  assemblies: CobieAssemblyData[];
  connections: CobieConnectionData[];
  spareParts: CobieSparePartData[];
  resources: CobieResourceData[];
  jobs: CobieJobData[];
  documents: CobieDocumentData[];
  attributes: CobieAttributeData[];
  coordinates: CobieCoordinateData[];
}

// ============================================================================
// DETECCIÓN DE FORMATO
// ============================================================================

export type CobieFormat = 'xlsx' | 'ifc' | 'xml' | 'unknown';

/**
 * Detecta el formato de un archivo COBie basándose en su contenido
 */
export function detectCobieFormat(buffer: Buffer, filename: string): CobieFormat {
  const extension = filename.toLowerCase().split('.').pop();
  
  // Detección por extensión
  if (extension === 'xlsx' || extension === 'xls') {
    return 'xlsx';
  }
  if (extension === 'ifc') {
    return 'ifc';
  }
  if (extension === 'xml') {
    return 'xml';
  }
  
  // Detección por contenido (magic bytes)
  const header = buffer.toString('utf8', 0, 100);
  
  if (header.includes('ISO-10303-21') || header.includes('HEADER')) {
    return 'ifc';
  }
  if (header.includes('<?xml') || header.includes('<COBie')) {
    return 'xml';
  }
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) { // PK (ZIP header for .xlsx)
    return 'xlsx';
  }
  
  return 'unknown';
}

// ============================================================================
// PARSER EXCEL (.xlsx)
// ============================================================================

/**
 * Parsea un archivo COBie Excel (.xlsx)
 * Lee las 16 hojas estándar del formato COBie
 */
export function parseCobieExcel(buffer: Buffer): ParsedCobieData {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  // Función auxiliar para leer una hoja
  const readSheet = (sheetName: string): any[] => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet);
  };
  
  // Función auxiliar para parsear fecha
  const parseDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      // Excel serial date
      return new Date((value - 25569) * 86400 * 1000);
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };
  
  // Leer hoja Facility
  const facilityRows = readSheet('Facility');
  const facility: CobieFacilityData = facilityRows[0] ? {
    name: facilityRows[0].Name || 'Unnamed Facility',
    createdOn: parseDate(facilityRows[0].CreatedOn),
    createdBy: facilityRows[0].CreatedBy,
    category: facilityRows[0].Category,
    description: facilityRows[0].Description,
    projectPhase: facilityRows[0].ProjectPhase,
    siteName: facilityRows[0].SiteName,
    linearUnits: facilityRows[0].LinearUnits,
    areaUnits: facilityRows[0].AreaUnits,
    volumeUnits: facilityRows[0].VolumeUnits,
    currencyUnit: facilityRows[0].CurrencyUnit,
    areaMeasurement: facilityRows[0].AreaMeasurement,
  } : {
    name: 'Unnamed Facility',
  };
  
  // Leer hoja Floor
  const floors: CobieFloorData[] = readSheet('Floor').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    category: row.Category,
    description: row.Description,
    elevation: row.Elevation,
    height: row.Height,
  }));
  
  // Leer hoja Space
  const spaces: CobieSpaceData[] = readSheet('Space').map((row: any) => ({
    floorName: row.FloorName,
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    category: row.Category,
    description: row.Description,
    grossArea: row.GrossArea,
    netArea: row.NetArea,
    usableHeight: row.UsableHeight,
  }));
  
  // Leer hoja Zone
  const zones: CobieZoneData[] = readSheet('Zone').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    category: row.Category,
    description: row.Description,
    spaceNames: row.SpaceNames,
  }));
  
  // Leer hoja Type
  const types: CobieTypeData[] = readSheet('Type').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    category: row.Category,
    description: row.Description,
    assetType: row.AssetType,
    manufacturer: row.Manufacturer,
    modelNumber: row.ModelNumber,
    warrantyGuarantorParts: row.WarrantyGuarantorParts,
    warrantyDurationParts: row.WarrantyDurationParts,
    warrantyGuarantorLabor: row.WarrantyGuarantorLabor,
    warrantyDurationLabor: row.WarrantyDurationLabor,
    expectedLife: row.ExpectedLife,
    durationUnit: row.DurationUnit,
    replacementCost: row.ReplacementCost,
    warrantyDescription: row.WarrantyDescription,
  }));
  
  // Leer hoja Component
  const components: CobieComponentData[] = readSheet('Component').map((row: any) => ({
    typeName: row.TypeName,
    spaceName: row.Space,
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    description: row.Description,
    serialNumber: row.SerialNumber,
    installationDate: parseDate(row.InstallationDate),
    warrantyStartDate: parseDate(row.WarrantyStartDate),
    barCode: row.BarCode,
    assetIdentifier: row.AssetIdentifier,
    ifcGuid: row.IfcGuid,
  }));
  
  // Leer hoja System
  const systems: CobieSystemData[] = readSheet('System').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    category: row.Category,
    description: row.Description,
    componentNames: row.ComponentNames,
  }));
  
  // Leer hoja Assembly
  const assemblies: CobieAssemblyData[] = readSheet('Assembly').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    description: row.Description,
    assemblyType: row.AssemblyType,
    parentName: row.ParentName,
    childNames: row.ChildNames,
  }));
  
  // Leer hoja Connection
  const connections: CobieConnectionData[] = readSheet('Connection').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    description: row.Description,
    connectionType: row.ConnectionType,
    component1: row.Component1,
    component2: row.Component2,
    realizingElement1: row.RealizingElement1,
    realizingElement2: row.RealizingElement2,
  }));
  
  // Leer hoja Spare
  const spareParts: CobieSparePartData[] = readSheet('Spare').map((row: any) => ({
    typeName: row.TypeName,
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    description: row.Description,
    suppliers: row.Suppliers,
    partNumber: row.PartNumber,
    quantity: row.Quantity ? parseInt(row.Quantity) : undefined,
  }));
  
  // Leer hoja Resource
  const resources: CobieResourceData[] = readSheet('Resource').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    category: row.Category,
    email: row.Email,
    phone: row.Phone,
    department: row.Department,
    organizationCode: row.OrganizationCode,
    street: row.Street,
    city: row.City,
    postalCode: row.PostalCode,
    country: row.Country,
  }));
  
  // Leer hoja Job
  const jobs: CobieJobData[] = readSheet('Job').map((row: any) => ({
    typeName: row.TypeName,
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    description: row.Description,
    status: row.Status,
    taskCategory: row.TaskCategory,
    frequency: row.Frequency,
    frequencyUnit: row.FrequencyUnit,
    start: parseDate(row.Start),
    taskDuration: row.TaskDuration,
    durationUnit: row.DurationUnit,
    resources: row.Resources,
  }));
  
  // Leer hoja Document
  const documents: CobieDocumentData[] = readSheet('Document').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    category: row.Category,
    description: row.Description,
    referenceSheet: row.ReferenceSheet,
    referenceName: row.ReferenceName,
    documentUrl: row.DocumentURL,
    directory: row.Directory,
    file: row.File,
  }));
  
  // Leer hoja Attribute
  const attributes: CobieAttributeData[] = readSheet('Attribute').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    category: row.Category,
    sheetName: row.SheetName,
    rowName: row.RowName,
    value: row.Value,
    unit: row.Unit,
    allowedValues: row.AllowedValues,
    description: row.Description,
  }));
  
  // Leer hoja Coordinate
  const coordinates: CobieCoordinateData[] = readSheet('Coordinate').map((row: any) => ({
    name: row.Name,
    createdOn: parseDate(row.CreatedOn),
    createdBy: row.CreatedBy,
    category: row.Category,
    sheetName: row.SheetName,
    rowName: row.RowName,
    coordinateX: row.CoordinateX,
    coordinateY: row.CoordinateY,
    coordinateZ: row.CoordinateZ,
    axisX: row.AxisX,
    axisY: row.AxisY,
    axisZ: row.AxisZ,
    description: row.Description,
  }));
  
  return {
    facility,
    floors,
    spaces,
    zones,
    types,
    components,
    systems,
    assemblies,
    connections,
    spareParts,
    resources,
    jobs,
    documents,
    attributes,
    coordinates,
  };
}

// ============================================================================
// PARSER IFC (Simplificado - extracción de datos no geométricos)
// ============================================================================

/**
 * Parsea un archivo IFC optimizado para COBie
 * Extrae datos no geométricos relevantes para gestión de activos
 */
export function parseCobieIFC(buffer: Buffer): ParsedCobieData {
  const content = buffer.toString('utf8');
  
  // Parser simplificado - extrae entidades IFC relevantes para COBie
  // En una implementación completa, usaríamos una librería IFC como web-ifc
  
  const facility: CobieFacilityData = {
    name: 'IFC Facility',
    description: 'Imported from IFC file',
  };
  
  // Extraer IFCBUILDING
  const buildingMatch = content.match(/IFCBUILDING\('([^']+)'/);
  if (buildingMatch) {
    facility.name = buildingMatch[1] || facility.name;
  }
  
  // Extraer IFCBUILDINGSTOREY (floors)
  const floorRegex = /IFCBUILDINGSTOREY\('([^']+)'[^)]*'([^']*)'/g;
  const floors: CobieFloorData[] = [];
  let floorMatch;
  while ((floorMatch = floorRegex.exec(content)) !== null) {
    floors.push({
      name: floorMatch[2] || floorMatch[1],
      description: 'Imported from IFC',
    });
  }
  
  // Extraer IFCSPACE (spaces)
  const spaceRegex = /IFCSPACE\('([^']+)'[^)]*'([^']*)'/g;
  const spaces: CobieSpaceData[] = [];
  let spaceMatch;
  while ((spaceMatch = spaceRegex.exec(content)) !== null) {
    spaces.push({
      floorName: floors[0]?.name || 'Ground Floor',
      name: spaceMatch[2] || spaceMatch[1],
      description: 'Imported from IFC',
    });
  }
  
  // Extraer componentes (equipos, elementos)
  const componentMatches = content.matchAll(/IFC[A-Z]+\('([^']+)'[^)]*'([^']*)'/g);
  const components: CobieComponentData[] = [];
  const types: CobieTypeData[] = [];
  
  // Nota: Esta es una implementación simplificada
  // Una implementación completa requeriría parseo completo del IFC
  
  return {
    facility,
    floors,
    spaces,
    zones: [],
    types,
    components,
    systems: [],
    assemblies: [],
    connections: [],
    spareParts: [],
    resources: [],
    jobs: [],
    documents: [],
    attributes: [],
    coordinates: [],
  };
}

// ============================================================================
// PARSER XML
// ============================================================================

/**
 * Parsea un archivo COBie XML
 */
export async function parseCobieXML(buffer: Buffer): Promise<ParsedCobieData> {
  const content = buffer.toString('utf8');
  const parsed = await parseXML(content) as any;
  
  // Estructura típica de COBie XML
  const cobie = parsed?.COBie || parsed?.Facility || {};
  
  const facility: CobieFacilityData = {
    name: cobie.Facility?.[0]?.Name?.[0] || 'XML Facility',
    description: cobie.Facility?.[0]?.Description?.[0],
    category: cobie.Facility?.[0]?.Category?.[0],
  };
  
  const floors: CobieFloorData[] = (cobie.Floor || []).map((floor: any) => ({
    name: floor.Name?.[0],
    description: floor.Description?.[0],
    elevation: floor.Elevation?.[0],
    height: floor.Height?.[0],
  }));
  
  const spaces: CobieSpaceData[] = (cobie.Space || []).map((space: any) => ({
    floorName: space.FloorName?.[0],
    name: space.Name?.[0],
    description: space.Description?.[0],
    grossArea: space.GrossArea?.[0],
    netArea: space.NetArea?.[0],
  }));
  
  const types: CobieTypeData[] = (cobie.Type || []).map((type: any) => ({
    name: type.Name?.[0],
    description: type.Description?.[0],
    manufacturer: type.Manufacturer?.[0],
    modelNumber: type.ModelNumber?.[0],
  }));
  
  const components: CobieComponentData[] = (cobie.Component || []).map((comp: any) => ({
    typeName: comp.TypeName?.[0],
    spaceName: comp.Space?.[0],
    name: comp.Name?.[0],
    description: comp.Description?.[0],
    serialNumber: comp.SerialNumber?.[0],
  }));
  
  return {
    facility,
    floors,
    spaces,
    zones: [],
    types,
    components,
    systems: [],
    assemblies: [],
    connections: [],
    spareParts: [],
    resources: [],
    jobs: [],
    documents: [],
    attributes: [],
    coordinates: [],
  };
}

// ============================================================================
// PARSER UNIFICADO
// ============================================================================

/**
 * Parsea un archivo COBie detectando automáticamente el formato
 */
export async function parseCobieFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedCobieData> {
  const format = detectCobieFormat(buffer, filename);
  
  switch (format) {
    case 'xlsx':
      return parseCobieExcel(buffer);
    
    case 'ifc':
      return parseCobieIFC(buffer);
    
    case 'xml':
      return await parseCobieXML(buffer);
    
    default:
      throw new Error(`Unsupported COBie format: ${format}`);
  }
}
