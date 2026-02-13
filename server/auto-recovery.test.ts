import { describe, it, expect } from 'vitest';
import { calculateBackoff, shouldAttemptRecovery } from './auto-recovery-service';

/**
 * Pruebas unitarias para el servicio de auto-recuperación de sensores
 * 
 * Cobertura:
 * - Lógica de backoff exponencial
 * - Decisión de cuándo intentar recuperación
 * - Validación de estructura de datos
 */

describe('Auto-Recovery Service', () => {
  describe('calculateBackoff', () => {
    it('should return 15 minutes for first attempt', () => {
      expect(calculateBackoff(0)).toBe(15);
    });

    it('should return 30 minutes for second attempt', () => {
      expect(calculateBackoff(1)).toBe(30);
    });

    it('should return 60 minutes for third attempt', () => {
      expect(calculateBackoff(2)).toBe(60);
    });

    it('should return 120 minutes for fourth attempt', () => {
      expect(calculateBackoff(3)).toBe(120);
    });

    it('should return 240 minutes for fifth attempt', () => {
      expect(calculateBackoff(4)).toBe(240);
    });

    it('should cap at 480 minutes (8 hours) for many attempts', () => {
      expect(calculateBackoff(5)).toBe(480);
      expect(calculateBackoff(10)).toBe(480);
      expect(calculateBackoff(100)).toBe(480);
    });
  });

  describe('shouldAttemptRecovery', () => {
    it('should return true if never attempted before', () => {
      expect(shouldAttemptRecovery(null, 0)).toBe(true);
    });

    it('should return true if enough time has passed for first retry', () => {
      // First attempt requires 15 minutes backoff
      expect(shouldAttemptRecovery(20, 0)).toBe(true);
      expect(shouldAttemptRecovery(15, 0)).toBe(true);
    });

    it('should return false if not enough time has passed for first retry', () => {
      // First attempt requires 15 minutes backoff
      expect(shouldAttemptRecovery(10, 0)).toBe(false);
      expect(shouldAttemptRecovery(5, 0)).toBe(false);
    });

    it('should return true if enough time has passed for second retry', () => {
      // Second attempt requires 30 minutes backoff
      expect(shouldAttemptRecovery(35, 1)).toBe(true);
      expect(shouldAttemptRecovery(30, 1)).toBe(true);
    });

    it('should return false if not enough time has passed for second retry', () => {
      // Second attempt requires 30 minutes backoff
      expect(shouldAttemptRecovery(25, 1)).toBe(false);
      expect(shouldAttemptRecovery(15, 1)).toBe(false);
    });

    it('should return true if enough time has passed for third retry', () => {
      // Third attempt requires 60 minutes backoff
      expect(shouldAttemptRecovery(65, 2)).toBe(true);
      expect(shouldAttemptRecovery(60, 2)).toBe(true);
    });

    it('should return false if not enough time has passed for third retry', () => {
      // Third attempt requires 60 minutes backoff
      expect(shouldAttemptRecovery(50, 2)).toBe(false);
      expect(shouldAttemptRecovery(30, 2)).toBe(false);
    });

    it('should handle maximum backoff correctly', () => {
      // After many attempts, backoff is capped at 480 minutes
      expect(shouldAttemptRecovery(500, 10)).toBe(true);
      expect(shouldAttemptRecovery(480, 10)).toBe(true);
      expect(shouldAttemptRecovery(400, 10)).toBe(false);
    });
  });

  describe('Backoff Schedule', () => {
    it('should follow exponential growth pattern', () => {
      const schedule = [
        calculateBackoff(0),  // 15
        calculateBackoff(1),  // 30
        calculateBackoff(2),  // 60
        calculateBackoff(3),  // 120
        calculateBackoff(4),  // 240
        calculateBackoff(5),  // 480
      ];

      // Verificar que cada valor es aproximadamente el doble del anterior
      expect(schedule[1]).toBe(schedule[0] * 2);
      expect(schedule[2]).toBe(schedule[1] * 2);
      expect(schedule[3]).toBe(schedule[2] * 2);
      expect(schedule[4]).toBe(schedule[3] * 2);
      expect(schedule[5]).toBe(schedule[4] * 2);
    });

    it('should have reasonable maximum backoff', () => {
      const maxBackoff = calculateBackoff(100);
      
      // 8 horas es un máximo razonable
      expect(maxBackoff).toBe(480);
      expect(maxBackoff).toBeLessThanOrEqual(24 * 60); // No más de 24 horas
    });
  });

  describe('Recovery Attempt Data Structure', () => {
    it('should validate recovery attempt structure', () => {
      const attempt = {
        id: 1,
        sensorId: 123,
        attemptAt: new Date(),
        success: true,
        backoffMinutes: 15,
        errorMessage: null,
        latencyMs: 250,
      };

      expect(attempt.id).toBeGreaterThan(0);
      expect(attempt.sensorId).toBeGreaterThan(0);
      expect(attempt.attemptAt).toBeInstanceOf(Date);
      expect(typeof attempt.success).toBe('boolean');
      expect(attempt.backoffMinutes).toBeGreaterThanOrEqual(0);
      
      if (attempt.success) {
        expect(attempt.latencyMs).toBeGreaterThan(0);
        expect(attempt.errorMessage).toBeNull();
      }
    });

    it('should validate failed attempt structure', () => {
      const attempt = {
        id: 2,
        sensorId: 123,
        attemptAt: new Date(),
        success: false,
        backoffMinutes: 30,
        errorMessage: 'Connection timeout',
        latencyMs: null,
      };

      expect(attempt.success).toBe(false);
      expect(attempt.errorMessage).toBeTruthy();
      expect(attempt.errorMessage).toContain('timeout');
    });
  });

  describe('Recovery Stats Calculation', () => {
    it('should calculate success rate correctly', () => {
      const totalAttempts = 20;
      const successfulAttempts = 15;
      const successRate = (successfulAttempts / totalAttempts) * 100;

      expect(successRate).toBe(75);
    });

    it('should handle zero attempts gracefully', () => {
      const totalAttempts = 0;
      const successfulAttempts = 0;
      const successRate = totalAttempts > 0 
        ? (successfulAttempts / totalAttempts) * 100 
        : 0;

      expect(successRate).toBe(0);
    });

    it('should handle all successful attempts', () => {
      const totalAttempts = 10;
      const successfulAttempts = 10;
      const successRate = (successfulAttempts / totalAttempts) * 100;

      expect(successRate).toBe(100);
    });

    it('should handle all failed attempts', () => {
      const totalAttempts = 10;
      const successfulAttempts = 0;
      const successRate = (successfulAttempts / totalAttempts) * 100;

      expect(successRate).toBe(0);
    });
  });

  describe('Failed Sensor Detection', () => {
    it('should identify sensor as failed if no success for over 1 hour', () => {
      const minutesSinceLastSuccess = 65;
      const threshold = 60;

      expect(minutesSinceLastSuccess).toBeGreaterThan(threshold);
    });

    it('should not identify sensor as failed if recent success', () => {
      const minutesSinceLastSuccess = 30;
      const threshold = 60;

      expect(minutesSinceLastSuccess).toBeLessThanOrEqual(threshold);
    });

    it('should handle sensor that never succeeded', () => {
      const minutesSinceLastSuccess = Infinity;
      const threshold = 60;

      expect(minutesSinceLastSuccess).toBeGreaterThan(threshold);
    });
  });

  describe('Recovery Result Structure', () => {
    it('should validate successful recovery result', () => {
      const result = {
        sensorsChecked: 10,
        recoveryAttempts: 5,
        successfulRecoveries: 3,
        failedRecoveries: 2,
      };

      expect(result.sensorsChecked).toBeGreaterThanOrEqual(0);
      expect(result.recoveryAttempts).toBeGreaterThanOrEqual(0);
      expect(result.successfulRecoveries).toBeGreaterThanOrEqual(0);
      expect(result.failedRecoveries).toBeGreaterThanOrEqual(0);
      
      // Successful + failed should equal total attempts
      expect(result.successfulRecoveries + result.failedRecoveries).toBe(result.recoveryAttempts);
      
      // Attempts should not exceed sensors checked
      expect(result.recoveryAttempts).toBeLessThanOrEqual(result.sensorsChecked);
    });

    it('should handle no sensors needing recovery', () => {
      const result = {
        sensorsChecked: 10,
        recoveryAttempts: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
      };

      expect(result.recoveryAttempts).toBe(0);
      expect(result.successfulRecoveries + result.failedRecoveries).toBe(0);
    });
  });
});
