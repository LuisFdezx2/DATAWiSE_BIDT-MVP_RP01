/**
 * 3D Performance Optimization Service
 * Implements LOD (Level of Detail) and frustum culling for better performance
 */

export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface Camera {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  aspect: number;
  near: number;
  far: number;
}

export interface Element3D {
  id: string;
  boundingBox: BoundingBox;
  geometry: any; // Original high-detail geometry
  lodLevels?: {
    high: any;
    medium: any;
    low: any;
  };
  visible: boolean;
  lodLevel: 'high' | 'medium' | 'low' | 'hidden';
}

export class PerformanceOptimizer {
  private elements: Map<string, Element3D> = new Map();
  private camera: Camera | null = null;
  private lodDistances = {
    high: 50,    // Within 50 units: full detail
    medium: 150, // 50-150 units: medium detail
    low: 300,    // 150-300 units: low detail
    // Beyond 300: hidden
  };

  /**
   * Register an element for optimization
   */
  registerElement(element: Element3D): void {
    this.elements.set(element.id, element);
  }

  /**
   * Unregister an element
   */
  unregisterElement(elementId: string): void {
    this.elements.delete(elementId);
  }

  /**
   * Update camera position for frustum culling
   */
  updateCamera(camera: Camera): void {
    this.camera = camera;
  }

  /**
   * Calculate distance from camera to element
   */
  private getDistanceToCamera(element: Element3D): number {
    if (!this.camera) return 0;

    const center = {
      x: (element.boundingBox.min.x + element.boundingBox.max.x) / 2,
      y: (element.boundingBox.min.y + element.boundingBox.max.y) / 2,
      z: (element.boundingBox.min.z + element.boundingBox.max.z) / 2,
    };

    const dx = center.x - this.camera.position.x;
    const dy = center.y - this.camera.position.y;
    const dz = center.z - this.camera.position.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Check if element is within camera frustum (simplified)
   */
  private isInFrustum(element: Element3D): boolean {
    if (!this.camera) return true;

    const distance = this.getDistanceToCamera(element);
    
    // Simple distance-based culling
    // In production, use proper frustum planes
    return distance <= this.camera.far;
  }

  /**
   * Determine appropriate LOD level based on distance
   */
  private determineLODLevel(distance: number): 'high' | 'medium' | 'low' | 'hidden' {
    if (distance <= this.lodDistances.high) return 'high';
    if (distance <= this.lodDistances.medium) return 'medium';
    if (distance <= this.lodDistances.low) return 'low';
    return 'hidden';
  }

  /**
   * Update all elements based on camera position
   * Returns optimization statistics
   */
  optimize(): {
    total: number;
    visible: number;
    hidden: number;
    high: number;
    medium: number;
    low: number;
  } {
    if (!this.camera) {
      return {
        total: this.elements.size,
        visible: this.elements.size,
        hidden: 0,
        high: this.elements.size,
        medium: 0,
        low: 0,
      };
    }

    const stats = {
      total: this.elements.size,
      visible: 0,
      hidden: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    this.elements.forEach((element) => {
      // Frustum culling
      const inFrustum = this.isInFrustum(element);
      
      if (!inFrustum) {
        element.visible = false;
        element.lodLevel = 'hidden';
        stats.hidden++;
        return;
      }

      // LOD selection
      const distance = this.getDistanceToCamera(element);
      const lodLevel = this.determineLODLevel(distance);

      element.visible = lodLevel !== 'hidden';
      element.lodLevel = lodLevel;

      if (element.visible) {
        stats.visible++;
        stats[lodLevel]++;
      } else {
        stats.hidden++;
      }
    });

    return stats;
  }

  /**
   * Get visible elements with their LOD levels
   */
  getVisibleElements(): Array<{ id: string; lodLevel: string }> {
    return Array.from(this.elements.values())
      .filter(el => el.visible)
      .map(el => ({ id: el.id, lodLevel: el.lodLevel }));
  }

  /**
   * Configure LOD distances
   */
  setLODDistances(distances: { high: number; medium: number; low: number }): void {
    this.lodDistances = distances;
  }

  /**
   * Get current optimization statistics
   */
  getStats() {
    return this.optimize();
  }

  /**
   * Clear all registered elements
   */
  clear(): void {
    this.elements.clear();
  }
}

/**
 * Progressive loading manager for large models
 */
export class ProgressiveLoader {
  private totalElements: number = 0;
  private loadedElements: number = 0;
  private batchSize: number = 100;
  private onProgress?: (loaded: number, total: number) => void;

  constructor(totalElements: number, batchSize: number = 100) {
    this.totalElements = totalElements;
    this.batchSize = batchSize;
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: (loaded: number, total: number) => void): void {
    this.onProgress = callback;
  }

  /**
   * Load next batch of elements
   */
  async loadNextBatch<T>(
    elements: T[],
    processFn: (element: T) => Promise<void>
  ): Promise<boolean> {
    const start = this.loadedElements;
    const end = Math.min(start + this.batchSize, this.totalElements);
    
    if (start >= this.totalElements) {
      return false; // No more elements to load
    }

    const batch = elements.slice(start, end);
    
    // Process batch
    await Promise.all(batch.map(el => processFn(el)));
    
    this.loadedElements = end;
    
    if (this.onProgress) {
      this.onProgress(this.loadedElements, this.totalElements);
    }

    return this.loadedElements < this.totalElements;
  }

  /**
   * Get loading progress (0-100)
   */
  getProgress(): number {
    if (this.totalElements === 0) return 100;
    return (this.loadedElements / this.totalElements) * 100;
  }

  /**
   * Check if loading is complete
   */
  isComplete(): boolean {
    return this.loadedElements >= this.totalElements;
  }

  /**
   * Reset loader
   */
  reset(): void {
    this.loadedElements = 0;
  }
}

/**
 * FPS Monitor for performance tracking
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime: number = performance.now();
  private sampleSize: number = 60;

  /**
   * Update FPS counter (call once per frame)
   */
  update(): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    const fps = 1000 / delta;
    this.frames.push(fps);

    if (this.frames.length > this.sampleSize) {
      this.frames.shift();
    }
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    if (this.frames.length === 0) return 0;
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.frames.length);
  }

  /**
   * Get min FPS in sample
   */
  getMinFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.round(Math.min(...this.frames));
  }

  /**
   * Get max FPS in sample
   */
  getMaxFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.round(Math.max(...this.frames));
  }

  /**
   * Reset monitor
   */
  reset(): void {
    this.frames = [];
    this.lastTime = performance.now();
  }
}

// Export singleton instances
export const performanceOptimizer = new PerformanceOptimizer();
export const fpsMonitor = new FPSMonitor();
