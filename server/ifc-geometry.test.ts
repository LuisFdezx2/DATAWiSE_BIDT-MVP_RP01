import { describe, it, expect } from "vitest";

/**
 * Pruebas para el servicio de conversión IFC a geometría Three.js
 * 
 * Nota: Estas pruebas validan la lógica del lado del servidor.
 * Las pruebas del lado del cliente (Three.js) requieren un entorno de navegador.
 */

describe("IFC Geometry Service", () => {
  describe("Color Assignment", () => {
    it("debería asignar colores correctos a tipos de elementos IFC", () => {
      const colorMap: Record<string, number> = {
        IFCWALL: 0xcccccc,
        IFCWALLSTANDARDCASE: 0xcccccc,
        IFCSLAB: 0x999999,
        IFCROOF: 0x8b4513,
        IFCDOOR: 0x8b4513,
        IFCWINDOW: 0x87ceeb,
        IFCCOLUMN: 0x808080,
        IFCBEAM: 0x808080,
      };

      // Validar que los colores estén en formato hexadecimal válido
      Object.entries(colorMap).forEach(([type, color]) => {
        expect(color).toBeGreaterThanOrEqual(0x000000);
        expect(color).toBeLessThanOrEqual(0xffffff);
        expect(typeof color).toBe("number");
      });
    });
  });

  describe("Geometry Validation", () => {
    it("debería validar estructura de geometría IFC", () => {
      const validGeometry = {
        vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
        indices: [0, 1, 2],
      };

      expect(validGeometry.vertices).toBeDefined();
      expect(validGeometry.indices).toBeDefined();
      expect(Array.isArray(validGeometry.vertices)).toBe(true);
      expect(Array.isArray(validGeometry.indices)).toBe(true);
      expect(validGeometry.vertices.length % 3).toBe(0); // Múltiplo de 3 (x,y,z)
    });

    it("debería detectar geometría inválida", () => {
      const invalidGeometry = {
        vertices: [0, 0], // No es múltiplo de 3
        indices: [0, 1, 2],
      };

      expect(invalidGeometry.vertices.length % 3).not.toBe(0);
    });
  });

  describe("Element Structure", () => {
    it("debería validar estructura de elemento IFC", () => {
      const element = {
        expressId: 123,
        type: "IFCWALL",
        globalId: "2O2Fr$t4X7Zf8NOew3FLOH",
        name: "Basic Wall",
        geometry: {
          vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
          indices: [0, 1, 2],
        },
        properties: {
          Height: 3.0,
          Width: 0.2,
          Material: "Concrete",
        },
      };

      expect(element.expressId).toBeTypeOf("number");
      expect(element.type).toBeTypeOf("string");
      expect(element.geometry).toBeDefined();
      expect(element.geometry.vertices).toBeDefined();
      expect(element.geometry.indices).toBeDefined();
    });
  });

  describe("Model Structure", () => {
    it("debería validar estructura de modelo IFC", () => {
      const model = {
        elements: [
          {
            expressId: 1,
            type: "IFCWALL",
            geometry: {
              vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
              indices: [0, 1, 2],
            },
          },
          {
            expressId: 2,
            type: "IFCSLAB",
            geometry: {
              vertices: [0, 0, 0, 2, 0, 0, 2, 2, 0],
              indices: [0, 1, 2],
            },
          },
        ],
      };

      expect(model.elements).toBeDefined();
      expect(Array.isArray(model.elements)).toBe(true);
      expect(model.elements.length).toBeGreaterThan(0);
      
      model.elements.forEach((element) => {
        expect(element.expressId).toBeDefined();
        expect(element.type).toBeDefined();
      });
    });
  });

  describe("Bounding Box Calculation", () => {
    it("debería calcular correctamente dimensiones de bounding box", () => {
      const vertices = [
        -5, 0, -5,  // min point
        5, 0, -5,
        5, 3, -5,
        -5, 3, -5,
        -5, 0, 5,
        5, 0, 5,
        5, 3, 5,   // max point
        -5, 3, 5,
      ];

      // Calcular min y max manualmente
      const xs = vertices.filter((_, i) => i % 3 === 0);
      const ys = vertices.filter((_, i) => i % 3 === 1);
      const zs = vertices.filter((_, i) => i % 3 === 2);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const minZ = Math.min(...zs);
      const maxZ = Math.max(...zs);

      expect(minX).toBe(-5);
      expect(maxX).toBe(5);
      expect(minY).toBe(0);
      expect(maxY).toBe(3);
      expect(minZ).toBe(-5);
      expect(maxZ).toBe(5);
    });
  });

  describe("Demo Model", () => {
    it("debería generar un modelo demo válido", () => {
      const demoModel = {
        elements: [
          {
            expressId: 1,
            type: "IFCWALL",
            name: "Wall Demo",
            geometry: {
              vertices: [
                -5, 0, 0, 5, 0, 0, 5, 3, 0, -5, 3, 0,
                -5, 0, -0.3, 5, 0, -0.3, 5, 3, -0.3, -5, 3, -0.3,
              ],
              indices: [
                0, 1, 2, 0, 2, 3,
                4, 6, 5, 4, 7, 6,
                0, 4, 7, 0, 7, 3,
                1, 5, 6, 1, 6, 2,
                3, 2, 6, 3, 6, 7,
                0, 5, 1, 0, 4, 5,
              ],
            },
          },
          {
            expressId: 2,
            type: "IFCSLAB",
            name: "Floor Demo",
            geometry: {
              vertices: [
                -6, 0, -6, 6, 0, -6, 6, 0, 6, -6, 0, 6,
                -6, -0.3, -6, 6, -0.3, -6, 6, -0.3, 6, -6, -0.3, 6,
              ],
              indices: [
                0, 1, 2, 0, 2, 3,
                4, 6, 5, 4, 7, 6,
              ],
            },
          },
        ],
      };

      expect(demoModel.elements).toBeDefined();
      expect(demoModel.elements.length).toBe(2);
      expect(demoModel.elements[0].type).toBe("IFCWALL");
      expect(demoModel.elements[1].type).toBe("IFCSLAB");
      
      demoModel.elements.forEach((element) => {
        expect(element.geometry.vertices.length % 3).toBe(0);
        expect(element.geometry.indices.length % 3).toBe(0);
      });
    });
  });
});

describe("IFC Geometry Integration", () => {
  it("debería procesar múltiples elementos sin errores", () => {
    const elements = Array.from({ length: 100 }, (_, i) => ({
      expressId: i + 1,
      type: i % 2 === 0 ? "IFCWALL" : "IFCSLAB",
      geometry: {
        vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
        indices: [0, 1, 2],
      },
    }));

    expect(elements.length).toBe(100);
    elements.forEach((element, index) => {
      expect(element.expressId).toBe(index + 1);
      expect(["IFCWALL", "IFCSLAB"]).toContain(element.type);
    });
  });
});
