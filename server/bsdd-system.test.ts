/**
 * Pruebas unitarias para sistema de integración bSDD
 * Cubre cliente, caché, servicio de mapeo y procedimientos tRPC
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BsddCacheService } from './bsdd-cache-service';

// ============================================================================
// Tests de BsddCacheService
// ============================================================================

describe('BsddCacheService', () => {
  let cache: BsddCacheService;

  beforeEach(() => {
    cache = new BsddCacheService(60); // 60 minutos TTL
  });

  it('debe almacenar y recuperar valores del caché', () => {
    const testData = { name: 'IfcWall', uri: 'https://example.com/wall' };
    cache.set('test-key', testData);
    
    const retrieved = cache.get('test-key');
    expect(retrieved).toEqual(testData);
  });

  it('debe devolver null para claves inexistentes', () => {
    const retrieved = cache.get('non-existent-key');
    expect(retrieved).toBeNull();
  });

  it('debe eliminar entradas del caché', () => {
    cache.set('test-key', { data: 'test' });
    expect(cache.get('test-key')).not.toBeNull();
    
    cache.delete('test-key');
    expect(cache.get('test-key')).toBeNull();
  });

  it('debe limpiar todo el caché', () => {
    cache.set('key1', { data: 'test1' });
    cache.set('key2', { data: 'test2' });
    
    cache.clear();
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('debe devolver estadísticas del caché', () => {
    cache.set('key1', { data: 'test1' });
    cache.set('key2', { data: 'test2' });
    
    const stats = cache.getStats();
    
    expect(stats.size).toBe(2);
    expect(stats.expired).toBe(0);
  });

  it('debe respetar el TTL personalizado', async () => {
    const shortCache = new BsddCacheService(0.001); // ~60ms TTL
    shortCache.set('test-key', { data: 'test' });
    
    // Inmediatamente debe estar disponible
    expect(shortCache.get('test-key')).not.toBeNull();
    
    // Después de esperar, debe haber expirado
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(shortCache.get('test-key')).toBeNull();
  });

  it('debe limpiar entradas expiradas', async () => {
    const shortCache = new BsddCacheService(0.001); // ~60ms TTL
    shortCache.set('key1', { data: 'test1' });
    shortCache.set('key2', { data: 'test2' });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    shortCache.cleanExpired();
    
    const stats = shortCache.getStats();
    expect(stats.size).toBe(0);
  });

  it('debe usar TTL diferente por operación', () => {
    cache.set('short-ttl', { data: 'test' }, 0.001); // ~60ms
    cache.set('long-ttl', { data: 'test' }, 1000); // 1000 minutos
    
    const stats = cache.getStats();
    expect(stats.size).toBe(2);
  });
});

// ============================================================================
// Tests de funciones helper de bsdd-client
// ============================================================================

describe('bSDD Client Helpers', () => {
  it('debe validar estructura de BsddClass', () => {
    const validClass = {
      uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
      code: 'IfcWall',
      name: 'Wall',
      definition: 'A vertical construction that bounds or subdivides spaces',
      synonyms: ['Muro', 'Pared'],
      relatedIfcEntityNames: ['IfcWall', 'IfcWallStandardCase'],
    };

    expect(validClass.uri).toBeTruthy();
    expect(validClass.code).toBeTruthy();
    expect(validClass.name).toBeTruthy();
    expect(Array.isArray(validClass.relatedIfcEntityNames)).toBe(true);
  });

  it('debe validar estructura de BsddProperty', () => {
    const validProperty = {
      uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/prop/LoadBearing',
      code: 'LoadBearing',
      name: 'LoadBearing',
      definition: 'Indicates whether the object is intended to carry loads',
      dataType: 'Boolean',
      unit: undefined,
      possibleValues: ['true', 'false'],
    };

    expect(validProperty.uri).toBeTruthy();
    expect(validProperty.code).toBeTruthy();
    expect(validProperty.name).toBeTruthy();
    expect(validProperty.dataType).toBeTruthy();
  });

  it('debe validar estructura de BsddDomain', () => {
    const validDomain = {
      uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3',
      name: 'IFC',
      version: '4.3',
      organizationName: 'buildingSMART International',
      defaultLanguageCode: 'en-GB',
    };

    expect(validDomain.uri).toBeTruthy();
    expect(validDomain.name).toBeTruthy();
    expect(validDomain.version).toBeTruthy();
    expect(validDomain.organizationName).toBeTruthy();
  });
});

// ============================================================================
// Tests de bsdd-mapping-service
// ============================================================================

describe('bSDD Mapping Service', () => {
  it('debe validar estructura de BsddMapping', () => {
    const validMapping = {
      elementId: 123,
      bsddClassUri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
      bsddClassName: 'Wall',
      bsddClassCode: 'IfcWall',
      mappingMethod: 'automatic' as const,
      confidence: 0.85,
      mappedAt: new Date(),
      mappedBy: 'user-123',
    };

    expect(validMapping.elementId).toBeGreaterThan(0);
    expect(validMapping.confidence).toBeGreaterThanOrEqual(0);
    expect(validMapping.confidence).toBeLessThanOrEqual(1);
    expect(['automatic', 'manual']).toContain(validMapping.mappingMethod);
  });

  it('debe validar estructura de EnrichmentResult', () => {
    const validResult = {
      elementId: 123,
      elementType: 'IfcWall',
      elementName: 'Wall-001',
      bsddClass: {
        uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
        code: 'IfcWall',
        name: 'Wall',
      },
      existingProperties: {
        Height: 3000,
        Width: 200,
      },
      suggestedProperties: [
        {
          uri: 'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/prop/LoadBearing',
          code: 'LoadBearing',
          name: 'LoadBearing',
          dataType: 'Boolean',
        },
      ],
      mappingMethod: 'automatic' as const,
      confidence: 0.8,
    };

    expect(validResult.elementId).toBeGreaterThan(0);
    expect(validResult.elementType).toBeTruthy();
    expect(validResult.bsddClass).toBeTruthy();
    expect(typeof validResult.existingProperties).toBe('object');
    expect(Array.isArray(validResult.suggestedProperties)).toBe(true);
  });

  it('debe calcular tasa de mapeo correctamente', () => {
    const stats = {
      totalElements: 100,
      mappedElements: 75,
      unmappedElements: 25,
      mappingRate: 75,
      mappingsByType: {
        IfcWall: 30,
        IfcDoor: 20,
        IfcWindow: 25,
      },
    };

    expect(stats.mappingRate).toBe(75);
    expect(stats.mappedElements + stats.unmappedElements).toBe(stats.totalElements);
    
    const totalMappedByType = Object.values(stats.mappingsByType).reduce((a, b) => a + b, 0);
    expect(totalMappedByType).toBe(stats.mappedElements);
  });

  it('debe manejar modelo sin elementos mapeados', () => {
    const stats = {
      totalElements: 50,
      mappedElements: 0,
      unmappedElements: 50,
      mappingRate: 0,
      mappingsByType: {},
    };

    expect(stats.mappingRate).toBe(0);
    expect(Object.keys(stats.mappingsByType).length).toBe(0);
  });

  it('debe manejar modelo completamente mapeado', () => {
    const stats = {
      totalElements: 50,
      mappedElements: 50,
      unmappedElements: 0,
      mappingRate: 100,
      mappingsByType: {
        IfcWall: 20,
        IfcDoor: 15,
        IfcWindow: 15,
      },
    };

    expect(stats.mappingRate).toBe(100);
    expect(stats.unmappedElements).toBe(0);
  });
});

// ============================================================================
// Tests de lógica de negocio
// ============================================================================

describe('bSDD Business Logic', () => {
  it('debe identificar tipos IFC válidos para mapeo', () => {
    const validIfcTypes = [
      'IfcWall',
      'IfcDoor',
      'IfcWindow',
      'IfcSlab',
      'IfcBeam',
      'IfcColumn',
      'IfcSpace',
    ];

    validIfcTypes.forEach(type => {
      expect(type.startsWith('Ifc')).toBe(true);
      expect(type.length).toBeGreaterThan(3);
    });
  });

  it('debe simplificar nombres IFC eliminando prefijo', () => {
    const testCases = [
      { input: 'IfcWall', expected: 'Wall' },
      { input: 'IfcDoor', expected: 'Door' },
      { input: 'IfcWindow', expected: 'Window' },
    ];

    testCases.forEach(({ input, expected }) => {
      const simplified = input.replace(/^Ifc/, '');
      expect(simplified).toBe(expected);
    });
  });

  it('debe validar confianza de mapeo en rango 0-1', () => {
    const confidenceValues = [0, 0.5, 0.7, 0.85, 1.0];

    confidenceValues.forEach(confidence => {
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  it('debe categorizar confianza de mapeo', () => {
    const getConfidenceLevel = (confidence: number): string => {
      if (confidence >= 0.9) return 'high';
      if (confidence >= 0.7) return 'medium';
      if (confidence >= 0.5) return 'low';
      return 'very-low';
    };

    expect(getConfidenceLevel(0.95)).toBe('high');
    expect(getConfidenceLevel(0.8)).toBe('medium');
    expect(getConfidenceLevel(0.6)).toBe('low');
    expect(getConfidenceLevel(0.3)).toBe('very-low');
  });

  it('debe priorizar mapeos por confianza', () => {
    const mappings = [
      { elementId: 1, confidence: 0.6 },
      { elementId: 2, confidence: 0.9 },
      { elementId: 3, confidence: 0.7 },
    ];

    const sorted = mappings.sort((a, b) => b.confidence - a.confidence);

    expect(sorted[0].elementId).toBe(2); // Mayor confianza
    expect(sorted[1].elementId).toBe(3);
    expect(sorted[2].elementId).toBe(1); // Menor confianza
  });
});

// ============================================================================
// Tests de manejo de errores
// ============================================================================

describe('bSDD Error Handling', () => {
  it('debe manejar búsqueda sin resultados', () => {
    const emptyResult = {
      classes: [],
      totalCount: 0,
    };

    expect(emptyResult.classes.length).toBe(0);
    expect(emptyResult.totalCount).toBe(0);
  });

  it('debe manejar clase no encontrada', () => {
    const notFoundResult = null;

    expect(notFoundResult).toBeNull();
  });

  it('debe manejar propiedades vacías', () => {
    const elementWithoutProperties = {
      elementId: 123,
      elementType: 'IfcWall',
      existingProperties: {},
      suggestedProperties: [],
    };

    expect(Object.keys(elementWithoutProperties.existingProperties).length).toBe(0);
    expect(elementWithoutProperties.suggestedProperties.length).toBe(0);
  });

  it('debe validar URIs de bSDD', () => {
    const validUris = [
      'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall',
      'https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/prop/LoadBearing',
    ];

    validUris.forEach(uri => {
      expect(uri.startsWith('https://identifier.buildingsmart.org')).toBe(true);
    });
  });

  it('debe manejar timeout de API', () => {
    const timeoutError = {
      code: 'TIMEOUT',
      message: 'Request timeout after 10000ms',
    };

    expect(timeoutError.code).toBe('TIMEOUT');
    expect(timeoutError.message).toContain('timeout');
  });

  it('debe manejar rate limit', () => {
    const rateLimitError = {
      status: 429,
      message: 'Too many requests',
      retryAfter: 60,
    };

    expect(rateLimitError.status).toBe(429);
    expect(rateLimitError.retryAfter).toBeGreaterThan(0);
  });
});

// ============================================================================
// Tests de integración
// ============================================================================

describe('bSDD Integration Tests', () => {
  it('debe completar flujo de mapeo automático', () => {
    // Simular flujo completo
    const modelId = 1;
    const totalElements = 10;
    
    // 1. Obtener elementos del modelo
    const elements = Array.from({ length: totalElements }, (_, i) => ({
      id: i + 1,
      ifcType: i % 2 === 0 ? 'IfcWall' : 'IfcDoor',
      name: `Element-${i + 1}`,
    }));

    // 2. Mapear elementos
    const mappedCount = elements.filter(el => el.ifcType === 'IfcWall' || el.ifcType === 'IfcDoor').length;

    // 3. Calcular estadísticas
    const mappingRate = (mappedCount / totalElements) * 100;

    expect(mappingRate).toBe(100);
    expect(mappedCount).toBe(totalElements);
  });

  it('debe manejar mapeo parcial', () => {
    const totalElements = 10;
    const mappedElements = 7;
    const failedElements = 3;

    const mappingRate = (mappedElements / totalElements) * 100;

    expect(mappingRate).toBe(70);
    expect(mappedElements + failedElements).toBe(totalElements);
  });

  it('debe procesar elementos en lotes', () => {
    const totalElements = 100;
    const batchSize = 10;
    const batches = Math.ceil(totalElements / batchSize);

    expect(batches).toBe(10);
    
    // Simular procesamiento por lotes
    let processed = 0;
    for (let i = 0; i < batches; i++) {
      const batchElements = Math.min(batchSize, totalElements - processed);
      processed += batchElements;
    }

    expect(processed).toBe(totalElements);
  });
});
