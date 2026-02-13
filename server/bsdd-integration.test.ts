import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  searchBsddClasses,
  getBsddClass,
  getBsddDomains,
  findBsddClassForIfcType,
  enrichIfcElementWithBsdd,
} from './bsdd-client';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('bSDD Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchBsddClasses', () => {
    it('debería buscar clases por nombre', async () => {
      const mockResponse = {
        data: {
          classes: [
            {
              uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
              code: 'IfcWall',
              name: 'Wall',
              definition: 'A vertical construction that bounds or subdivides spaces',
              relatedIfcEntityNames: ['IfcWall'],
            },
          ],
          totalCount: 1,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await searchBsddClasses('Wall');

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('Wall');
      expect(result.totalCount).toBe(1);
    });

    it('debería manejar errores de API', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const result = await searchBsddClasses('InvalidClass');

      expect(result.classes).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getBsddClass', () => {
    it('debería obtener detalles de una clase con propiedades', async () => {
      const mockResponse = {
        data: {
          uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
          code: 'IfcWall',
          name: 'Wall',
          definition: 'A vertical construction that bounds or subdivides spaces',
          relatedIfcEntityNames: ['IfcWall'],
          classProperties: [
            {
              propertyUri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/prop/LoadBearing',
              propertyCode: 'LoadBearing',
              propertyName: 'LoadBearing',
              definition: 'Indicates whether the object is intended to carry loads',
              dataType: 'Boolean',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getBsddClass(
        'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
        true
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('Wall');
      expect(result?.properties).toHaveLength(1);
      expect(result?.properties?.[0].name).toBe('LoadBearing');
    });

    it('debería manejar errores al obtener clase', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const result = await getBsddClass('invalid-uri');

      expect(result).toBeNull();
    });
  });

  describe('getBsddDomains', () => {
    it('debería obtener lista de dominios', async () => {
      const mockResponse = {
        data: {
          domains: [
            {
              uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3',
              name: 'IFC',
              version: '4.3',
              organizationName: 'buildingSMART International',
              defaultLanguageCode: 'en-GB',
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getBsddDomains();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('IFC');
      expect(result[0].version).toBe('4.3');
    });

    it('debería manejar errores al obtener dominios', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const result = await getBsddDomains();

      expect(result).toHaveLength(0);
    });
  });

  describe('findBsddClassForIfcType', () => {
    it('debería encontrar clase bSDD para tipo IFC', async () => {
      const mockSearchResponse = {
        data: {
          classes: [
            {
              uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
              code: 'IfcWall',
              name: 'Wall',
              relatedIfcEntityNames: ['IfcWall'],
            },
          ],
          totalCount: 1,
        },
      };

      mockedAxios.get.mockResolvedValue(mockSearchResponse);

      const result = await findBsddClassForIfcType('IfcWall');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Wall');
      expect(result?.relatedIfcEntityNames).toContain('IfcWall');
    });

    it('debería intentar búsqueda sin prefijo Ifc si no encuentra resultados', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { classes: [], totalCount: 0 } }) // Primera búsqueda falla
        .mockResolvedValueOnce({
          data: {
            classes: [
              {
                uri: 'https://example.com/Wall',
                code: 'Wall',
                name: 'Wall',
              },
            ],
            totalCount: 1,
          },
        }); // Segunda búsqueda exitosa

      const result = await findBsddClassForIfcType('IfcWall');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Wall');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('debería retornar null si no encuentra clase', async () => {
      mockedAxios.get.mockResolvedValue({ data: { classes: [], totalCount: 0 } });

      const result = await findBsddClassForIfcType('IfcUnknownType');

      expect(result).toBeNull();
    });
  });

  describe('enrichIfcElementWithBsdd', () => {
    it('debería enriquecer elemento con propiedades bSDD', async () => {
      // Mock para searchBsddClasses
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          classes: [
            {
              uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
              code: 'IfcWall',
              name: 'Wall',
              relatedIfcEntityNames: ['IfcWall'],
            },
          ],
          totalCount: 1,
        },
      });

      // Mock para getBsddClass
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
          code: 'IfcWall',
          name: 'Wall',
          classProperties: [
            {
              propertyUri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/prop/LoadBearing',
              propertyCode: 'LoadBearing',
              propertyName: 'LoadBearing',
              definition: 'Indicates whether the object is intended to carry loads',
              dataType: 'Boolean',
            },
            {
              propertyUri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/prop/IsExternal',
              propertyCode: 'IsExternal',
              propertyName: 'IsExternal',
              definition: 'Indicates whether the element is external',
              dataType: 'Boolean',
            },
          ],
        },
      });

      const existingProperties = {
        LoadBearing: true,
      };

      const result = await enrichIfcElementWithBsdd('IfcWall', existingProperties);

      expect(result.bsddClass).toBeDefined();
      expect(result.bsddClass?.name).toBe('Wall');
      expect(result.enrichedProperties).toHaveProperty('LoadBearing');
      expect(result.enrichedProperties).toHaveProperty('LoadBearing_bsdd_uri');
      expect(result.enrichedProperties).toHaveProperty('LoadBearing_bsdd_definition');
      expect(result.suggestedProperties).toHaveLength(1);
      expect(result.suggestedProperties[0].name).toBe('IsExternal');
    });

    it('debería manejar elementos sin clase bSDD', async () => {
      mockedAxios.get.mockResolvedValue({ data: { classes: [], totalCount: 0 } });

      const existingProperties = { SomeProperty: 'value' };

      const result = await enrichIfcElementWithBsdd('IfcUnknownType', existingProperties);

      expect(result.bsddClass).toBeNull();
      expect(result.enrichedProperties).toEqual(existingProperties);
      expect(result.suggestedProperties).toHaveLength(0);
    });
  });
});
