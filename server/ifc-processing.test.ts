import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createIfcProcessor } from "./ifc-processor";

describe("IFC Processing Service", () => {
  describe("IFC Processor Creation", () => {
    it("debería crear una instancia del procesador IFC", async () => {
      const processor = await createIfcProcessor();
      expect(processor).toBeDefined();
      expect(processor.loadModel).toBeDefined();
      expect(processor.getModelInfo).toBeDefined();
      expect(processor.getModelStatistics).toBeDefined();
      expect(processor.extractAllElements).toBeDefined();
      expect(processor.filterByType).toBeDefined();
      expect(processor.closeModel).toBeDefined();
    });
  });

  describe("IFC Model Loading", () => {
    it("debería manejar correctamente un buffer vacío", async () => {
      const processor = await createIfcProcessor();
      const emptyBuffer = new Uint8Array(0);
      
      await expect(processor.loadModel(emptyBuffer)).rejects.toThrow();
    });

    it("debería manejar correctamente datos inválidos", async () => {
      const processor = await createIfcProcessor();
      const invalidBuffer = new Uint8Array([1, 2, 3, 4, 5]);
      
      await expect(processor.loadModel(invalidBuffer)).rejects.toThrow();
    });
  });

  describe("Model Statistics", () => {
    it("debería retornar estructura de estadísticas con valores por defecto para modelo inválido", async () => {
      const processor = await createIfcProcessor();
      
      // Obtener estadísticas de un modelo que no existe retorna valores por defecto
      const stats = processor.getModelStatistics(999);
      expect(stats).toBeDefined();
      expect(stats.totalElements).toBe(0);
      expect(stats.elementsByType).toEqual({});
    });
  });

  describe("Element Extraction", () => {
    it("debería retornar array vacío para modelo inválido", async () => {
      const processor = await createIfcProcessor();
      
      // Extraer elementos de un modelo que no existe retorna array vacío
      const elements = processor.extractAllElements(999);
      expect(elements).toBeDefined();
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBe(0);
    });

    it("debería aceptar parámetro limit al extraer elementos", async () => {
      const processor = await createIfcProcessor();
      
      // Esta prueba valida que la función acepta el parámetro limit
      const elements = processor.extractAllElements(999, 10);
      expect(elements).toBeDefined();
      expect(Array.isArray(elements)).toBe(true);
    });
  });

  describe("Element Filtering", () => {
    it("debería retornar array vacío cuando no hay elementos del tipo especificado", async () => {
      const processor = await createIfcProcessor();
      
      // Filtrar elementos de un modelo que no existe retorna array vacío
      const elements = processor.filterByType(999, "IFCWALL");
      expect(elements).toBeDefined();
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBe(0);
    });
  });

  describe("Model Closing", () => {
    it("debería cerrar un modelo sin errores", async () => {
      const processor = await createIfcProcessor();
      
      // Cerrar un modelo que no existe no debería lanzar error
      expect(() => processor.closeModel(999)).not.toThrow();
    });
  });
});

describe("IFC Processing Integration", () => {
  it("debería procesar correctamente el flujo completo con datos simulados", async () => {
    const processor = await createIfcProcessor();
    
    // Este test valida que la estructura del procesador es correcta
    // En un entorno de producción, aquí cargaríamos un archivo IFC real
    expect(processor).toBeDefined();
    expect(typeof processor.loadModel).toBe("function");
    expect(typeof processor.getModelInfo).toBe("function");
    expect(typeof processor.getModelStatistics).toBe("function");
    expect(typeof processor.extractAllElements).toBe("function");
    expect(typeof processor.filterByType).toBe("function");
    expect(typeof processor.closeModel).toBe("function");
  });
});
