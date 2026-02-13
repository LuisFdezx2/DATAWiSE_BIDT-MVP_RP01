import { describe, it, expect } from 'vitest';
import { generateSensorValue, evaluateSensorStatus } from './iot-service';

describe('IoT Service', () => {
  describe('generateSensorValue', () => {
    it('debe generar valores de temperatura en rango esperado', () => {
      const value = generateSensorValue('temperature');
      expect(value).toBeGreaterThanOrEqual(15);
      expect(value).toBeLessThanOrEqual(30);
    });

    it('debe generar valores de humedad en rango esperado', () => {
      const value = generateSensorValue('humidity');
      expect(value).toBeGreaterThanOrEqual(20);
      expect(value).toBeLessThanOrEqual(80);
    });

    it('debe generar valores de energía en rango esperado', () => {
      const value = generateSensorValue('energy');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });

    it('debe generar valores binarios para ocupación', () => {
      const value = generateSensorValue('occupancy');
      expect([0, 1]).toContain(value);
    });

    it('debe usar valor base cuando se proporciona', () => {
      const baseValue = 25;
      const value = generateSensorValue('temperature', baseValue);
      // Debe estar cerca del valor base (±3 por el ruido)
      expect(Math.abs(value - baseValue)).toBeLessThanOrEqual(5);
    });
  });

  describe('evaluateSensorStatus', () => {
    it('debe retornar "normal" cuando el valor está dentro de umbrales', () => {
      const status = evaluateSensorStatus(50, 20, 80);
      expect(status).toBe('normal');
    });

    it('debe retornar "alert" cuando el valor está por debajo del mínimo', () => {
      const status = evaluateSensorStatus(15, 20, 80);
      expect(status).toBe('alert');
    });

    it('debe retornar "alert" cuando el valor está por encima del máximo', () => {
      const status = evaluateSensorStatus(85, 20, 80);
      expect(status).toBe('alert');
    });

    it('debe retornar "warning" cuando el valor está cerca del mínimo', () => {
      const status = evaluateSensorStatus(21, 20, 80);
      expect(status).toBe('warning');
    });

    it('debe retornar "warning" cuando el valor está cerca del máximo', () => {
      const status = evaluateSensorStatus(75, 20, 80);
      expect(status).toBe('warning');
    });

    it('debe manejar umbrales nulos correctamente', () => {
      const status1 = evaluateSensorStatus(50, null, null);
      expect(status1).toBe('normal');

      const status2 = evaluateSensorStatus(50, null, 60);
      expect(status2).toBe('normal');

      const status3 = evaluateSensorStatus(50, 40, null);
      expect(status3).toBe('normal');
    });

    it('debe retornar "alert" con solo umbral máximo excedido', () => {
      const status = evaluateSensorStatus(70, null, 60);
      expect(status).toBe('alert');
    });

    it('debe retornar "alert" con solo umbral mínimo no alcanzado', () => {
      const status = evaluateSensorStatus(30, 40, null);
      expect(status).toBe('alert');
    });
  });
});
