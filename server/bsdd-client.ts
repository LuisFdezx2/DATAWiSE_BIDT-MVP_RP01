import axios, { AxiosError } from 'axios';
import { bsddCache } from './bsdd-cache-service';

/**
 * Cliente para la API de buildingSMART Data Dictionary (bSDD)
 * Documentación: https://github.com/buildingSMART/bSDD
 * 
 * Mejoras:
 * - Sistema de caché para reducir llamadas API
 * - Retry logic con backoff exponencial
 * - Manejo robusto de errores y rate limits
 */

const BSDD_API_BASE_URL = 'https://api.bsdd.buildingsmart.org/api';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 segundo

/**
 * Ejecuta una petición con retry logic y backoff exponencial
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    // Si es error 429 (rate limit), esperar más tiempo
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay * 2;
      
      console.warn(`Rate limit reached, waiting ${waitTime}ms before retry`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return retryWithBackoff(fn, retries - 1, waitTime);
    }

    // Para otros errores, usar backoff exponencial
    if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 500) {
      console.warn(`Server error ${error.response.status}, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }

    // No reintentar para errores 4xx (excepto 429)
    throw error;
  }
}

export interface BsddClass {
  uri: string;
  code: string;
  name: string;
  definition?: string;
  synonyms?: string[];
  relatedIfcEntityNames?: string[];
}

export interface BsddProperty {
  uri: string;
  code: string;
  name: string;
  definition?: string;
  dataType?: string;
  unit?: string;
  possibleValues?: string[];
}

export interface BsddDomain {
  uri: string;
  name: string;
  version: string;
  organizationName: string;
  defaultLanguageCode: string;
}

export interface BsddSearchResult {
  classes: BsddClass[];
  totalCount: number;
}

/**
 * Busca clases en bSDD por nombre o código
 */
export async function searchBsddClasses(
  searchText: string,
  domainUri?: string,
  languageCode: string = 'en-GB'
): Promise<BsddSearchResult> {
  // Usar caché para búsquedas
  return bsddCache.cachedSearchClasses(
    async () => {
      try {
        return await retryWithBackoff(async () => {
          const params: any = {
            SearchText: searchText,
            LanguageCode: languageCode,
          };

          if (domainUri) {
            params.DomainNamespaceUri = domainUri;
          }

          const response = await axios.get(`${BSDD_API_BASE_URL}/Class/Search`, {
            params,
            headers: {
              'Accept': 'application/json',
            },
            timeout: 10000, // 10 segundos timeout
          });

          return {
            classes: response.data.classes || [],
            totalCount: response.data.totalCount || 0,
          };
        });
      } catch (error) {
        console.error('Error searching bSDD classes:', error);
        
        // Proporcionar información detallada del error
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (axiosError.response) {
            console.error(`API Error: ${axiosError.response.status} - ${axiosError.response.statusText}`);
          } else if (axiosError.request) {
            console.error('Network error: No response received from bSDD API');
          }
        }
        
        return {
          classes: [],
          totalCount: 0,
        };
      }
    },
    searchText,
    domainUri,
    languageCode
  );
}

/**
 * Obtiene detalles de una clase específica incluyendo sus propiedades
 */
export async function getBsddClass(
  classUri: string,
  includeProperties: boolean = true,
  languageCode: string = 'en-GB'
): Promise<BsddClass & { properties?: BsddProperty[] } | null> {
  // Usar caché para clases
  return bsddCache.cachedGetClass(
    async () => {
      try {
        return await retryWithBackoff(async () => {
          const params: any = {
            Uri: classUri,
            LanguageCode: languageCode,
            IncludeClassProperties: includeProperties,
          };

          const response = await axios.get(`${BSDD_API_BASE_URL}/Class`, {
            params,
            headers: {
              'Accept': 'application/json',
            },
            timeout: 10000,
          });

          const classData = response.data;

          return {
            uri: classData.uri,
            code: classData.code,
            name: classData.name,
            definition: classData.definition,
            synonyms: classData.synonyms,
            relatedIfcEntityNames: classData.relatedIfcEntityNames,
            properties: classData.classProperties?.map((prop: any) => ({
              uri: prop.propertyUri,
              code: prop.propertyCode,
              name: prop.propertyName,
              definition: prop.definition,
              dataType: prop.dataType,
              unit: prop.unit,
              possibleValues: prop.possibleValues?.map((v: any) => v.value),
            })),
          };
        });
      } catch (error) {
        console.error('Error getting bSDD class:', error);
        
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (axiosError.response?.status === 404) {
            console.error(`Class not found: ${classUri}`);
          }
        }
        
        return null;
      }
    },
    classUri,
    includeProperties,
    languageCode
  );
}

/**
 * Obtiene la lista de dominios disponibles en bSDD
 */
export async function getBsddDomains(
  languageCode: string = 'en-GB'
): Promise<BsddDomain[]> {
  // Usar caché para dominios (cambian raramente)
  return bsddCache.cachedGetDomains(
    async () => {
      try {
        return await retryWithBackoff(async () => {
          const response = await axios.get(`${BSDD_API_BASE_URL}/Domain`, {
            params: {
              LanguageCode: languageCode,
            },
            headers: {
              'Accept': 'application/json',
            },
            timeout: 10000,
          });

          return response.data.domains || [];
        });
      } catch (error) {
        console.error('Error getting bSDD domains:', error);
        return [];
      }
    },
    languageCode
  );
}

/**
 * Busca la clase bSDD correspondiente a un tipo IFC
 */
export async function findBsddClassForIfcType(
  ifcType: string,
  domainUri?: string
): Promise<BsddClass | null> {
  // Primero intentar búsqueda exacta por nombre IFC
  const exactSearch = await searchBsddClasses(ifcType, domainUri);
  
  if (exactSearch.classes.length > 0) {
    // Buscar coincidencia exacta en relatedIfcEntityNames
    const exactMatch = exactSearch.classes.find(
      cls => cls.relatedIfcEntityNames?.includes(ifcType)
    );
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // Si no hay coincidencia exacta, devolver el primer resultado
    return exactSearch.classes[0];
  }

  // Si no hay resultados, intentar sin el prefijo "Ifc"
  const simplifiedName = ifcType.replace(/^Ifc/, '');
  const simplifiedSearch = await searchBsddClasses(simplifiedName, domainUri);
  
  if (simplifiedSearch.classes.length > 0) {
    return simplifiedSearch.classes[0];
  }

  return null;
}

/**
 * Enriquece un elemento IFC con propiedades de bSDD
 */
export async function enrichIfcElementWithBsdd(
  ifcType: string,
  existingProperties: Record<string, any>,
  domainUri?: string
): Promise<{
  bsddClass: BsddClass | null;
  enrichedProperties: Record<string, any>;
  suggestedProperties: BsddProperty[];
}> {
  const bsddClass = await findBsddClassForIfcType(ifcType, domainUri);
  
  if (!bsddClass) {
    return {
      bsddClass: null,
      enrichedProperties: existingProperties,
      suggestedProperties: [],
    };
  }

  // Obtener detalles completos de la clase incluyendo propiedades
  const classDetails = await getBsddClass(bsddClass.uri, true);
  
  if (!classDetails || !classDetails.properties) {
    return {
      bsddClass,
      enrichedProperties: existingProperties,
      suggestedProperties: [],
    };
  }

  // Identificar propiedades que faltan
  const suggestedProperties = classDetails.properties.filter(
    prop => !(prop.name in existingProperties)
  );

  // Enriquecer con metadatos de bSDD
  const enrichedProperties = { ...existingProperties };
  
  for (const [key, value] of Object.entries(existingProperties)) {
    const bsddProp = classDetails.properties.find(
      p => p.name === key || p.code === key
    );
    
    if (bsddProp) {
      // Añadir metadatos de bSDD como propiedades adicionales
      enrichedProperties[`${key}_bsdd_uri`] = bsddProp.uri;
      enrichedProperties[`${key}_bsdd_definition`] = bsddProp.definition;
      enrichedProperties[`${key}_bsdd_unit`] = bsddProp.unit;
      enrichedProperties[`${key}_bsdd_dataType`] = bsddProp.dataType;
    }
  }

  return {
    bsddClass,
    enrichedProperties,
    suggestedProperties,
  };
}
