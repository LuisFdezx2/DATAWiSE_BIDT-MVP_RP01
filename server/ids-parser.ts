import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

/**
 * Estructura de una especificación IDS
 */
export interface IDSSpecification {
  name: string;
  description?: string;
  applicability: IDSApplicability[];
  requirements: IDSRequirement[];
}

/**
 * Condición de aplicabilidad (qué elementos deben validarse)
 */
export interface IDSApplicability {
  type: 'entity' | 'attribute' | 'property' | 'classification' | 'material';
  value: string;
  predefinedType?: string;
}

/**
 * Requisito que debe cumplir el elemento
 */
export interface IDSRequirement {
  type: 'entity' | 'attribute' | 'property' | 'classification' | 'material';
  name: string;
  value?: string | string[];
  dataType?: string;
  cardinality: 'required' | 'prohibited' | 'optional';
  propertySet?: string; // Para requisitos de tipo property
  system?: string; // Para requisitos de tipo classification
}

/**
 * Resultado del parseo de un archivo IDS
 */
export interface IDSDocument {
  version: string;
  specifications: IDSSpecification[];
}

/**
 * Parsea un archivo IDS XML y extrae las especificaciones
 */
export async function parseIDSFile(xmlContent: string): Promise<IDSDocument> {
  try {
    const result = await parseXML(xmlContent) as any;
    
    // Extraer información básica del IDS
    const ids = result.ids || result.IDS;
    if (!ids) {
      throw new Error('Invalid IDS file: missing root element');
    }

    const specifications: IDSSpecification[] = [];
    const specs = ids.specifications?.[0]?.specification || [];

    for (const spec of specs) {
      const specification: IDSSpecification = {
        name: spec.$.name || 'Unnamed Specification',
        description: spec.$.description,
        applicability: [],
        requirements: [],
      };

      // Parsear aplicabilidad
      if (spec.applicability?.[0]) {
        const applicability = spec.applicability[0];
        
        // Entity (ej: IfcWall)
        if (applicability.entity) {
          for (const entity of applicability.entity) {
            specification.applicability.push({
              type: 'entity',
              value: entity.name?.[0]?.simpleValue?.[0] || entity.name?.[0] || '',
              predefinedType: entity.predefinedType?.[0]?.simpleValue?.[0],
            });
          }
        }

        // Property
        if (applicability.property) {
          for (const prop of applicability.property) {
            specification.applicability.push({
              type: 'property',
              value: prop.propertySet?.[0]?.simpleValue?.[0] || '',
              predefinedType: prop.name?.[0]?.simpleValue?.[0],
            });
          }
        }
      }

      // Parsear requisitos
      if (spec.requirements?.[0]) {
        const requirements = spec.requirements[0];

        // Entity requirements
        if (requirements.entity) {
          for (const entity of requirements.entity) {
            specification.requirements.push({
              type: 'entity',
              name: entity.name?.[0]?.simpleValue?.[0] || entity.name?.[0] || '',
              cardinality: entity.$.cardinality || 'required',
            });
          }
        }

        // Property requirements
        if (requirements.property) {
          for (const prop of requirements.property) {
            const propName = prop.name?.[0]?.simpleValue?.[0] || prop.name?.[0] || '';
            const propSet = prop.propertySet?.[0]?.simpleValue?.[0] || prop.propertySet?.[0];
            let propValue: string | string[] | undefined;

            if (prop.value?.[0]?.simpleValue) {
              propValue = prop.value[0].simpleValue[0];
            } else if (prop.value?.[0]?.restriction) {
              // Enumeration or pattern
              const restriction = prop.value[0].restriction[0];
              if (restriction.enumeration) {
                propValue = restriction.enumeration.map((e: any) => e.$.value);
              }
            }

            specification.requirements.push({
              type: 'property',
              name: propName,
              value: propValue,
              dataType: prop.$.dataType,
              cardinality: prop.$.cardinality || 'required',
              propertySet: propSet,
            });
          }
        }

        // Attribute requirements
        if (requirements.attribute) {
          for (const attr of requirements.attribute) {
            specification.requirements.push({
              type: 'attribute',
              name: attr.name?.[0]?.simpleValue?.[0] || attr.name?.[0] || '',
              value: attr.value?.[0]?.simpleValue?.[0],
              cardinality: attr.$.cardinality || 'required',
            });
          }
        }

        // Material requirements
        if (requirements.material) {
          for (const mat of requirements.material) {
            specification.requirements.push({
              type: 'material',
              name: mat.value?.[0]?.simpleValue?.[0] || 'Material',
              value: mat.value?.[0]?.simpleValue?.[0],
              cardinality: mat.$.cardinality || 'required',
            });
          }
        }

        // Classification requirements
        if (requirements.classification) {
          for (const cls of requirements.classification) {
            const system = cls.system?.[0]?.simpleValue?.[0] || cls.system?.[0];
            const value = cls.value?.[0]?.simpleValue?.[0] || cls.value?.[0];
            specification.requirements.push({
              type: 'classification',
              name: value || 'Classification',
              value: value,
              cardinality: cls.$.cardinality || 'required',
              system: system,
            });
          }
        }
      }

      specifications.push(specification);
    }

    return {
      version: ids.$.version || '1.0',
      specifications,
    };
  } catch (error) {
    throw new Error(`Failed to parse IDS file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Crea un archivo IDS de ejemplo para testing
 */
export function createSampleIDSXML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" version="1.0">
  <specifications>
    <specification name="Load-Bearing Walls" description="All load-bearing walls must have the LoadBearing property set to TRUE">
      <applicability>
        <entity>
          <name>
            <simpleValue>IfcWall</simpleValue>
          </name>
        </entity>
      </applicability>
      <requirements>
        <property cardinality="required" dataType="IfcBoolean">
          <propertySet>
            <simpleValue>Pset_WallCommon</simpleValue>
          </propertySet>
          <name>
            <simpleValue>LoadBearing</simpleValue>
          </name>
          <value>
            <simpleValue>TRUE</simpleValue>
          </value>
        </property>
      </requirements>
    </specification>
    <specification name="Fire Rating for Doors" description="All doors must have a fire rating property">
      <applicability>
        <entity>
          <name>
            <simpleValue>IfcDoor</simpleValue>
          </name>
        </entity>
      </applicability>
      <requirements>
        <property cardinality="required" dataType="IfcLabel">
          <propertySet>
            <simpleValue>Pset_DoorCommon</simpleValue>
          </propertySet>
          <name>
            <simpleValue>FireRating</simpleValue>
          </name>
        </property>
      </requirements>
    </specification>
  </specifications>
</ids>`;
}
