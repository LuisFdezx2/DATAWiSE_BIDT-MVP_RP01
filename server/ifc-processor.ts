import * as WebIFC from "web-ifc";

/**
 * Servicio de procesamiento de archivos IFC
 * Utiliza web-ifc para parsear y extraer información de modelos BIM
 */

export interface IfcGeometry {
  vertices: number[];
  indices: number[];
}

export interface IfcElementData {
  expressId: number;
  type: string;
  globalId?: string;
  name?: string;
  properties: Record<string, any>;
  geometry?: IfcGeometry;
}

export interface IfcModelInfo {
  schema: string;
  elementCount: number;
  elements: IfcElementData[];
}

export class IfcProcessor {
  private api: WebIFC.IfcAPI;

  constructor() {
    this.api = new WebIFC.IfcAPI();
  }

  /**
   * Inicializa la API de web-ifc
   */
  async initialize(): Promise<void> {
    await this.api.Init();
  }

  /**
   * Carga un archivo IFC desde un buffer
   * @param data Buffer del archivo IFC
   * @returns ID del modelo cargado
   */
  async loadModel(data: Uint8Array): Promise<number> {
    const modelID = this.api.OpenModel(data);
    return modelID;
  }

  /**
   * Obtiene información general del modelo IFC
   * @param modelID ID del modelo
   * @returns Información del modelo
   */
  getModelInfo(modelID: number): { schema: string } {
    const schema = this.api.GetModelSchema(modelID);
    return { schema };
  }

  /**
   * Obtiene todos los elementos de un tipo específico
   * @param modelID ID del modelo
   * @param type Tipo IFC (ej: IFCWALL, IFCWINDOW)
   * @returns Array de IDs de elementos
   */
  getElementsByType(modelID: number, type: number): number[] {
    const vector = this.api.GetLineIDsWithType(modelID, type);
    const array: number[] = [];
    for (let i = 0; i < vector.size(); i++) {
      array.push(vector.get(i));
    }
    return array;
  }

  /**
   * Obtiene las propiedades de un elemento
   * @param modelID ID del modelo
   * @param expressID ID del elemento
   * @returns Propiedades del elemento
   */
  getElementProperties(modelID: number, expressID: number): any {
    return this.api.GetLine(modelID, expressID);
  }

  /**
   * Extrae la geometría de un elemento IFC
   * @param modelID ID del modelo
   * @param expressID ID del elemento
   * @returns Geometría del elemento o null si no tiene
   */
  extractGeometry(modelID: number, expressID: number): IfcGeometry | null {
    try {
      const geometry = this.api.GetGeometry(modelID, expressID);
      
      if (!geometry) return null;

      const verts = this.api.GetVertexArray(
        geometry.GetVertexData(),
        geometry.GetVertexDataSize()
      );
      
      const indices = this.api.GetIndexArray(
        geometry.GetIndexData(),
        geometry.GetIndexDataSize()
      );

      return {
        vertices: Array.from(verts),
        indices: Array.from(indices),
      };
    } catch (error) {
      // Muchos elementos IFC no tienen geometría (metadata, relaciones, etc.)
      return null;
    }
  }

  /**
   * Extrae datos básicos de un elemento IFC
   * @param modelID ID del modelo
   * @param expressID ID del elemento
   * @param includeGeometry Si se debe incluir la geometría
   * @returns Datos del elemento
   */
  extractElementData(modelID: number, expressID: number, includeGeometry: boolean = false): IfcElementData | null {
    try {
      const props = this.api.GetLine(modelID, expressID);
      
      if (!props) return null;

      const elementData: IfcElementData = {
        expressId: expressID,
        type: props.constructor?.name || "Unknown",
        globalId: props.GlobalId?.value,
        name: props.Name?.value,
        properties: this.flattenProperties(props),
      };

      // Incluir geometría si se solicita
      if (includeGeometry) {
        const geometry = this.extractGeometry(modelID, expressID);
        if (geometry) {
          elementData.geometry = geometry;
        }
      }

      return elementData;
    } catch (error) {
      console.error(`Error extracting element ${expressID}:`, error);
      return null;
    }
  }

  /**
   * Aplana las propiedades de un elemento IFC para facilitar su almacenamiento
   * @param props Propiedades del elemento
   * @returns Objeto con propiedades aplanadas
   */
  private flattenProperties(props: any): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const key in props) {
      if (props.hasOwnProperty(key)) {
        const value = props[key];
        
        // Extraer valores simples
        if (value && typeof value === "object" && "value" in value) {
          flattened[key] = value.value;
        } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          flattened[key] = value;
        }
      }
    }

    return flattened;
  }

  /**
   * Extrae todos los elementos de un modelo
   * @param modelID ID del modelo
   * @param limit Límite de elementos a extraer (opcional)
   * @param includeGeometry Si se debe incluir la geometría
   * @returns Array de datos de elementos
   */
  extractAllElements(modelID: number, limit?: number, includeGeometry: boolean = false): IfcElementData[] {
    const elements: IfcElementData[] = [];
    
    // Tipos IFC comunes que queremos extraer
    const commonTypes = [
      WebIFC.IFCWALL,
      WebIFC.IFCWALLSTANDARDCASE,
      WebIFC.IFCWINDOW,
      WebIFC.IFCDOOR,
      WebIFC.IFCSLAB,
      WebIFC.IFCCOLUMN,
      WebIFC.IFCBEAM,
      WebIFC.IFCSPACE,
      WebIFC.IFCBUILDING,
      WebIFC.IFCBUILDINGSTOREY,
      WebIFC.IFCSITE,
      WebIFC.IFCPROJECT,
    ];

    let count = 0;
    
    for (const type of commonTypes) {
      if (limit && count >= limit) break;
      
      try {
        const elementIds = this.getElementsByType(modelID, type);
        
        for (const id of elementIds) {
          if (limit && count >= limit) break;
          
          const elementData = this.extractElementData(modelID, id, includeGeometry);
          if (elementData) {
            elements.push(elementData);
            count++;
          }
        }
      } catch (error) {
        console.error(`Error processing type ${type}:`, error);
      }
    }

    return elements;
  }

  /**
   * Filtra elementos por tipo IFC
   * @param modelID ID del modelo
   * @param ifcType Nombre del tipo IFC (ej: "IfcWall")
   * @returns Array de datos de elementos
   */
  filterByType(modelID: number, ifcType: string): IfcElementData[] {
    const elements: IfcElementData[] = [];
    
    // Mapeo de nombres de tipos a constantes de web-ifc
    const typeMap: Record<string, number> = {
      "IfcWall": WebIFC.IFCWALL,
      "IfcWallStandardCase": WebIFC.IFCWALLSTANDARDCASE,
      "IfcWindow": WebIFC.IFCWINDOW,
      "IfcDoor": WebIFC.IFCDOOR,
      "IfcSlab": WebIFC.IFCSLAB,
      "IfcColumn": WebIFC.IFCCOLUMN,
      "IfcBeam": WebIFC.IFCBEAM,
      "IfcSpace": WebIFC.IFCSPACE,
      "IfcBuilding": WebIFC.IFCBUILDING,
      "IfcBuildingStorey": WebIFC.IFCBUILDINGSTOREY,
      "IfcSite": WebIFC.IFCSITE,
      "IfcProject": WebIFC.IFCPROJECT,
    };

    const typeCode = typeMap[ifcType];
    if (!typeCode) {
      console.warn(`Unknown IFC type: ${ifcType}`);
      return elements;
    }

    try {
      const elementIds = this.getElementsByType(modelID, typeCode);
      
      for (const id of elementIds) {
        const elementData = this.extractElementData(modelID, id);
        if (elementData) {
          elements.push(elementData);
        }
      }
    } catch (error) {
      console.error(`Error filtering by type ${ifcType}:`, error);
    }

    return elements;
  }

  /**
   * Filtra elementos por valor de propiedad
   * @param elements Array de elementos a filtrar
   * @param propertyName Nombre de la propiedad
   * @param propertyValue Valor de la propiedad
   * @returns Array de elementos filtrados
   */
  filterByProperty(
    elements: IfcElementData[],
    propertyName: string,
    propertyValue: any
  ): IfcElementData[] {
    return elements.filter((element) => {
      const value = element.properties[propertyName];
      return value === propertyValue;
    });
  }

  /**
   * Calcula estadísticas básicas del modelo
   * @param modelID ID del modelo
   * @returns Estadísticas del modelo
   */
  getModelStatistics(modelID: number): {
    totalElements: number;
    elementsByType: Record<string, number>;
  } {
    const stats = {
      totalElements: 0,
      elementsByType: {} as Record<string, number>,
    };

    const commonTypes = [
      { name: "IfcWall", code: WebIFC.IFCWALL },
      { name: "IfcWindow", code: WebIFC.IFCWINDOW },
      { name: "IfcDoor", code: WebIFC.IFCDOOR },
      { name: "IfcSlab", code: WebIFC.IFCSLAB },
      { name: "IfcColumn", code: WebIFC.IFCCOLUMN },
      { name: "IfcBeam", code: WebIFC.IFCBEAM },
      { name: "IfcSpace", code: WebIFC.IFCSPACE },
    ];

    for (const type of commonTypes) {
      try {
        const elementIds = this.getElementsByType(modelID, type.code);
        const count = elementIds.length;
        
        if (count > 0) {
          stats.elementsByType[type.name] = count;
          stats.totalElements += count;
        }
      } catch (error) {
        console.error(`Error counting type ${type.name}:`, error);
      }
    }

    return stats;
  }

  /**
   * Cierra un modelo y libera memoria
   * @param modelID ID del modelo
   */
  closeModel(modelID: number): void {
    this.api.CloseModel(modelID);
  }

  /**
   * Libera todos los recursos
   */
  dispose(): void {
    // web-ifc no tiene un método dispose explícito
    // pero podemos limpiar referencias
  }
}

/**
 * Crea una instancia del procesador IFC
 */
export async function createIfcProcessor(): Promise<IfcProcessor> {
  const processor = new IfcProcessor();
  await processor.initialize();
  return processor;
}
