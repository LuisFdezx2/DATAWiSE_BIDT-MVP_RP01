/**
 * Biblioteca de Especificaciones IDS Predefinidas
 * 
 * Contiene especificaciones IDS comunes y estándares para validación rápida
 */

export interface IDSTemplate {
  id: string;
  name: string;
  description: string;
  category: 'building_codes' | 'iso_standards' | 'industry_best_practices' | 'custom';
  region?: string;
  xmlContent: string;
}

/**
 * Biblioteca de plantillas IDS predefinidas
 */
export const IDS_LIBRARY: IDSTemplate[] = [
  {
    id: 'cte-basic',
    name: 'CTE - Código Técnico de la Edificación (Básico)',
    description: 'Validación básica de requisitos del CTE español para elementos estructurales y envolvente',
    category: 'building_codes',
    region: 'ES',
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://standards.buildingsmart.org/IDS http://standards.buildingsmart.org/IDS/1.0/ids.xsd">
  <info>
    <title>CTE - Requisitos Básicos</title>
    <description>Validación de requisitos mínimos del Código Técnico de la Edificación</description>
  </info>
  <specifications>
    <specification name="Muros Exteriores - Propiedades Térmicas" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <simpleValue>IFCWALL</simpleValue>
          </name>
          <predefinedType>
            <simpleValue>EXTERNAL</simpleValue>
          </predefinedType>
        </entity>
      </applicability>
      <requirements>
        <property dataType="IFCREAL" cardinality="required">
          <propertySet>
            <simpleValue>Pset_WallCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>ThermalTransmittance</simpleValue>
          </baseName>
        </property>
        <property dataType="IFCBOOLEAN" cardinality="required">
          <propertySet>
            <simpleValue>Pset_WallCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>IsExternal</simpleValue>
          </baseName>
          <value>
            <simpleValue>TRUE</simpleValue>
          </value>
        </property>
      </requirements>
    </specification>
    <specification name="Elementos Estructurales - Resistencia al Fuego" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <xs:restriction base="xs:string">
              <xs:enumeration value="IFCBEAM"/>
              <xs:enumeration value="IFCCOLUMN"/>
              <xs:enumeration value="IFCSLAB"/>
            </xs:restriction>
          </name>
        </entity>
      </applicability>
      <requirements>
        <property dataType="IFCLABEL" cardinality="required">
          <propertySet>
            <simpleValue>Pset_ConcreteElementGeneral</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>FireRating</simpleValue>
          </baseName>
        </property>
      </requirements>
    </specification>
  </specifications>
</ids>`,
  },
  {
    id: 'iso-19650-lod',
    name: 'ISO 19650 - Level of Information Need',
    description: 'Validación de requisitos de información según ISO 19650 para diferentes niveles de desarrollo',
    category: 'iso_standards',
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://standards.buildingsmart.org/IDS http://standards.buildingsmart.org/IDS/1.0/ids.xsd">
  <info>
    <title>ISO 19650 - Level of Information Need</title>
    <description>Requisitos de información según ISO 19650 para gestión de información en BIM</description>
  </info>
  <specifications>
    <specification name="LOD 300 - Elementos de Construcción" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <xs:restriction base="xs:string">
              <xs:enumeration value="IFCWALL"/>
              <xs:enumeration value="IFCSLAB"/>
              <xs:enumeration value="IFCBEAM"/>
              <xs:enumeration value="IFCCOLUMN"/>
              <xs:enumeration value="IFCDOOR"/>
              <xs:enumeration value="IFCWINDOW"/>
            </xs:restriction>
          </name>
        </entity>
      </applicability>
      <requirements>
        <attribute cardinality="required">
          <name>
            <simpleValue>Name</simpleValue>
          </name>
        </attribute>
        <attribute cardinality="required">
          <name>
            <simpleValue>GlobalId</simpleValue>
          </name>
        </attribute>
        <property dataType="IFCLABEL" cardinality="required">
          <propertySet>
            <simpleValue>Pset_*</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>Reference</simpleValue>
          </baseName>
        </property>
        <classification cardinality="required">
          <system>
            <simpleValue>*</simpleValue>
          </system>
        </classification>
      </requirements>
    </specification>
    <specification name="Información de Fabricante" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <xs:restriction base="xs:string">
              <xs:enumeration value="IFCFURNISHINGELEMENT"/>
              <xs:enumeration value="IFCDOOR"/>
              <xs:enumeration value="IFCWINDOW"/>
            </xs:restriction>
          </name>
        </entity>
      </applicability>
      <requirements>
        <property dataType="IFCLABEL" cardinality="required">
          <propertySet>
            <simpleValue>Pset_ManufacturerTypeInformation</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>Manufacturer</simpleValue>
          </baseName>
        </property>
        <property dataType="IFCLABEL" cardinality="required">
          <propertySet>
            <simpleValue>Pset_ManufacturerTypeInformation</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>ModelReference</simpleValue>
          </baseName>
        </property>
      </requirements>
    </specification>
  </specifications>
</ids>`,
  },
  {
    id: 'structural-basic',
    name: 'Elementos Estructurales - Validación Básica',
    description: 'Validación de propiedades mínimas para elementos estructurales (vigas, columnas, losas)',
    category: 'industry_best_practices',
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://standards.buildingsmart.org/IDS http://standards.buildingsmart.org/IDS/1.0/ids.xsd">
  <info>
    <title>Elementos Estructurales - Validación Básica</title>
    <description>Requisitos mínimos para elementos estructurales en modelos IFC</description>
  </info>
  <specifications>
    <specification name="Vigas - Propiedades Geométricas" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <simpleValue>IFCBEAM</simpleValue>
          </name>
        </entity>
      </applicability>
      <requirements>
        <attribute cardinality="required">
          <name>
            <simpleValue>Name</simpleValue>
          </name>
        </attribute>
        <property dataType="IFCLENGTHMEASURE" cardinality="required">
          <propertySet>
            <simpleValue>Pset_BeamCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>Span</simpleValue>
          </baseName>
        </property>
        <property dataType="IFCBOOLEAN" cardinality="required">
          <propertySet>
            <simpleValue>Pset_BeamCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>IsExternal</simpleValue>
          </baseName>
        </property>
      </requirements>
    </specification>
    <specification name="Columnas - Material y Carga" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <simpleValue>IFCCOLUMN</simpleValue>
          </name>
        </entity>
      </applicability>
      <requirements>
        <attribute cardinality="required">
          <name>
            <simpleValue>Name</simpleValue>
          </name>
        </attribute>
        <material cardinality="required"/>
        <property dataType="IFCBOOLEAN" cardinality="required">
          <propertySet>
            <simpleValue>Pset_ColumnCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>LoadBearing</simpleValue>
          </baseName>
          <value>
            <simpleValue>TRUE</simpleValue>
          </value>
        </property>
      </requirements>
    </specification>
    <specification name="Losas - Espesor y Material" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <simpleValue>IFCSLAB</simpleValue>
          </name>
        </entity>
      </applicability>
      <requirements>
        <attribute cardinality="required">
          <name>
            <simpleValue>Name</simpleValue>
          </name>
        </attribute>
        <material cardinality="required"/>
        <property dataType="IFCLENGTHMEASURE" cardinality="required">
          <propertySet>
            <simpleValue>Pset_SlabCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>Thickness</simpleValue>
          </baseName>
        </property>
      </requirements>
    </specification>
  </specifications>
</ids>`,
  },
  {
    id: 'mep-basic',
    name: 'Instalaciones MEP - Validación Básica',
    description: 'Validación de propiedades mínimas para elementos de instalaciones (HVAC, fontanería, eléctrico)',
    category: 'industry_best_practices',
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://standards.buildingsmart.org/IDS http://standards.buildingsmart.org/IDS/1.0/ids.xsd">
  <info>
    <title>Instalaciones MEP - Validación Básica</title>
    <description>Requisitos mínimos para elementos de instalaciones MEP en modelos IFC</description>
  </info>
  <specifications>
    <specification name="Equipos HVAC - Información Básica" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <xs:restriction base="xs:string">
              <xs:enumeration value="IFCAIRTERMINAL"/>
              <xs:enumeration value="IFCFAN"/>
              <xs:enumeration value="IFCPUMP"/>
            </xs:restriction>
          </name>
        </entity>
      </applicability>
      <requirements>
        <attribute cardinality="required">
          <name>
            <simpleValue>Name</simpleValue>
          </name>
        </attribute>
        <property dataType="IFCLABEL" cardinality="required">
          <propertySet>
            <simpleValue>Pset_ManufacturerTypeInformation</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>Manufacturer</simpleValue>
          </baseName>
        </property>
        <property dataType="IFCLABEL" cardinality="required">
          <propertySet>
            <simpleValue>Pset_ManufacturerTypeInformation</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>ModelReference</simpleValue>
          </baseName>
        </property>
      </requirements>
    </specification>
    <specification name="Tuberías - Diámetro y Material" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <simpleValue>IFCPIPESEGMENT</simpleValue>
          </name>
        </entity>
      </applicability>
      <requirements>
        <attribute cardinality="required">
          <name>
            <simpleValue>Name</simpleValue>
          </name>
        </attribute>
        <material cardinality="required"/>
        <property dataType="IFCLENGTHMEASURE" cardinality="required">
          <propertySet>
            <simpleValue>Pset_PipeSegmentTypeCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>NominalDiameter</simpleValue>
          </baseName>
        </property>
      </requirements>
    </specification>
  </specifications>
</ids>`,
  },
  {
    id: 'accessibility-basic',
    name: 'Accesibilidad - Requisitos Básicos',
    description: 'Validación de requisitos de accesibilidad para puertas, rampas y espacios',
    category: 'building_codes',
    xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
<ids xmlns="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://standards.buildingsmart.org/IDS http://standards.buildingsmart.org/IDS/1.0/ids.xsd">
  <info>
    <title>Accesibilidad - Requisitos Básicos</title>
    <description>Validación de requisitos de accesibilidad universal en edificación</description>
  </info>
  <specifications>
    <specification name="Puertas Accesibles - Ancho Mínimo" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <simpleValue>IFCDOOR</simpleValue>
          </name>
        </entity>
        <property>
          <propertySet>
            <simpleValue>Pset_DoorCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>IsExternal</simpleValue>
          </baseName>
          <value>
            <simpleValue>FALSE</simpleValue>
          </value>
        </property>
      </applicability>
      <requirements>
        <property dataType="IFCLENGTHMEASURE" cardinality="required">
          <propertySet>
            <simpleValue>Pset_DoorCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>Width</simpleValue>
          </baseName>
        </property>
        <property dataType="IFCBOOLEAN" cardinality="optional">
          <propertySet>
            <simpleValue>Pset_DoorCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>HandicapAccessible</simpleValue>
          </baseName>
        </property>
      </requirements>
    </specification>
    <specification name="Rampas - Pendiente Máxima" ifcVersion="IFC4">
      <applicability>
        <entity>
          <name>
            <simpleValue>IFCRAMP</simpleValue>
          </name>
        </entity>
      </applicability>
      <requirements>
        <attribute cardinality="required">
          <name>
            <simpleValue>Name</simpleValue>
          </name>
        </attribute>
        <property dataType="IFCREAL" cardinality="required">
          <propertySet>
            <simpleValue>Pset_RampCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>Slope</simpleValue>
          </baseName>
        </property>
        <property dataType="IFCBOOLEAN" cardinality="required">
          <propertySet>
            <simpleValue>Pset_RampCommon</simpleValue>
          </propertySet>
          <baseName>
            <simpleValue>HandicapAccessible</simpleValue>
          </baseName>
          <value>
            <simpleValue>TRUE</simpleValue>
          </value>
        </property>
      </requirements>
    </specification>
  </specifications>
</ids>`,
  },
];

/**
 * Obtener todas las plantillas IDS
 */
export function getAllIDSTemplates(): IDSTemplate[] {
  return IDS_LIBRARY;
}

/**
 * Obtener plantilla por ID
 */
export function getIDSTemplateById(id: string): IDSTemplate | undefined {
  return IDS_LIBRARY.find(template => template.id === id);
}

/**
 * Obtener plantillas por categoría
 */
export function getIDSTemplatesByCategory(category: IDSTemplate['category']): IDSTemplate[] {
  return IDS_LIBRARY.filter(template => template.category === category);
}

/**
 * Obtener plantillas por región
 */
export function getIDSTemplatesByRegion(region: string): IDSTemplate[] {
  return IDS_LIBRARY.filter(template => template.region === region);
}
