/**
 * Servicio de caché para API bSDD
 * Reduce llamadas a la API y mejora rendimiento
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class BsddCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number; // Time to live en milisegundos

  constructor(defaultTTLMinutes: number = 60) {
    this.cache = new Map();
    this.defaultTTL = defaultTTLMinutes * 60 * 1000;
  }

  /**
   * Genera clave de caché a partir de parámetros
   */
  private generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Obtiene valor del caché si existe y no ha expirado
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar si ha expirado
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Almacena valor en caché
   */
  set<T>(key: string, data: T, ttlMinutes?: number): void {
    const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    this.cache.set(key, entry);
  }

  /**
   * Elimina entrada del caché
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Limpia entradas expiradas
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): {
    size: number;
    expired: number;
    hitRate: number;
  } {
    const now = Date.now();
    let expired = 0;
    
    this.cache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expired++;
      }
    });

    return {
      size: this.cache.size,
      expired,
      hitRate: 0, // TODO: Implementar tracking de hits/misses
    };
  }

  /**
   * Wrapper para búsqueda de clases con caché
   */
  async cachedSearchClasses<T>(
    searchFn: () => Promise<T>,
    searchText: string,
    domainUri?: string,
    languageCode: string = 'en-GB'
  ): Promise<T> {
    const key = this.generateKey('search', { searchText, domainUri, languageCode });
    
    // Intentar obtener del caché
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Si no está en caché, ejecutar búsqueda
    const result = await searchFn();
    
    // Almacenar en caché (búsquedas se cachean por 30 minutos)
    this.set(key, result, 30);
    
    return result;
  }

  /**
   * Wrapper para obtener clase con caché
   */
  async cachedGetClass<T>(
    getFn: () => Promise<T>,
    classUri: string,
    includeProperties: boolean = true,
    languageCode: string = 'en-GB'
  ): Promise<T> {
    const key = this.generateKey('class', { classUri, includeProperties, languageCode });
    
    // Intentar obtener del caché
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Si no está en caché, ejecutar búsqueda
    const result = await getFn();
    
    // Almacenar en caché (clases se cachean por 24 horas)
    this.set(key, result, 24 * 60);
    
    return result;
  }

  /**
   * Wrapper para obtener dominios con caché
   */
  async cachedGetDomains<T>(
    getFn: () => Promise<T>,
    languageCode: string = 'en-GB'
  ): Promise<T> {
    const key = this.generateKey('domains', { languageCode });
    
    // Intentar obtener del caché
    const cached = this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Si no está en caché, ejecutar búsqueda
    const result = await getFn();
    
    // Almacenar en caché (dominios se cachean por 7 días)
    this.set(key, result, 7 * 24 * 60);
    
    return result;
  }
}

// Instancia singleton del servicio de caché
export const bsddCache = new BsddCacheService(60);

// Limpiar caché expirado cada hora
setInterval(() => {
  bsddCache.cleanExpired();
}, 60 * 60 * 1000);
