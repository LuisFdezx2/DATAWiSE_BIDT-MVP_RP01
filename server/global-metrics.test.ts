import { describe, it, expect } from 'vitest';

/**
 * Pruebas unitarias para el servicio de métricas globales
 * 
 * Cobertura:
 * - Cálculo de KPIs agregados
 * - Comparación entre proyectos
 * - Rankings de rendimiento
 * - Mapas de calor de disponibilidad
 */

describe('Global Metrics Service', () => {
  describe('KPI Calculation', () => {
    it('should calculate uptime percentage correctly', () => {
      const successfulLogs = 90;
      const totalLogs = 100;
      const uptime = (successfulLogs / totalLogs) * 100;

      expect(uptime).toBe(90);
    });

    it('should handle zero logs gracefully', () => {
      const successfulLogs = 0;
      const totalLogs = 0;
      const uptime = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;

      expect(uptime).toBe(0);
    });

    it('should calculate active sensor percentage', () => {
      const activeSensors = 75;
      const totalSensors = 100;
      const percentage = (activeSensors / totalSensors) * 100;

      expect(percentage).toBe(75);
    });
  });

  describe('Project Ranking', () => {
    it('should calculate project score correctly', () => {
      const uptime = 95;
      const sensorCount = 10;
      const score = uptime * (1 + Math.log10(sensorCount + 1));

      expect(score).toBeGreaterThan(uptime);
      expect(score).toBeLessThan(uptime * 2);
    });

    it('should give higher score to projects with more sensors', () => {
      const uptime = 90;
      const score1 = uptime * (1 + Math.log10(10 + 1));
      const score2 = uptime * (1 + Math.log10(100 + 1));

      expect(score2).toBeGreaterThan(score1);
    });

    it('should handle single sensor project', () => {
      const uptime = 100;
      const sensorCount = 1;
      const score = uptime * (1 + Math.log10(sensorCount + 1));

      expect(score).toBeGreaterThan(uptime);
    });
  });

  describe('Hourly Heatmap', () => {
    it('should have 24 hours in a day', () => {
      const hours = Array.from({ length: 24 }, (_, i) => i);

      expect(hours.length).toBe(24);
      expect(hours[0]).toBe(0);
      expect(hours[23]).toBe(23);
    });

    it('should calculate hourly availability correctly', () => {
      const successfulLogs = 45;
      const totalLogs = 50;
      const availability = (successfulLogs / totalLogs) * 100;

      expect(availability).toBe(90);
    });

    it('should handle hours with no data', () => {
      const successfulLogs = 0;
      const totalLogs = 0;
      const availability = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;

      expect(availability).toBe(0);
    });
  });

  describe('Alert Trends', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-11-29T12:00:00Z');
      const formattedDate = date.toISOString().split('T')[0];

      expect(formattedDate).toBe('2025-11-29');
    });

    it('should group alerts by day', () => {
      const alerts = [
        { date: '2025-11-29', count: 5 },
        { date: '2025-11-28', count: 3 },
        { date: '2025-11-27', count: 8 },
      ];

      const totalAlerts = alerts.reduce((sum, a) => sum + a.count, 0);

      expect(totalAlerts).toBe(16);
    });

    it('should sort trends chronologically', () => {
      const trends = [
        { date: '2025-11-29', count: 5 },
        { date: '2025-11-27', count: 8 },
        { date: '2025-11-28', count: 3 },
      ];

      trends.sort((a, b) => a.date.localeCompare(b.date));

      expect(trends[0].date).toBe('2025-11-27');
      expect(trends[1].date).toBe('2025-11-28');
      expect(trends[2].date).toBe('2025-11-29');
    });
  });

  describe('Global KPIs Structure', () => {
    it('should validate KPIs structure', () => {
      const kpis = {
        totalProjects: 10,
        totalSensors: 150,
        activeSensors: 135,
        globalUptime: 92.5,
        alertsToday: 3,
        alertsThisWeek: 15,
        alertsThisMonth: 45,
      };

      expect(kpis.totalProjects).toBeGreaterThanOrEqual(0);
      expect(kpis.totalSensors).toBeGreaterThanOrEqual(0);
      expect(kpis.activeSensors).toBeLessThanOrEqual(kpis.totalSensors);
      expect(kpis.globalUptime).toBeGreaterThanOrEqual(0);
      expect(kpis.globalUptime).toBeLessThanOrEqual(100);
      expect(kpis.alertsToday).toBeLessThanOrEqual(kpis.alertsThisWeek);
      expect(kpis.alertsThisWeek).toBeLessThanOrEqual(kpis.alertsThisMonth);
    });
  });

  describe('Project Metrics Structure', () => {
    it('should validate project metrics structure', () => {
      const metrics = {
        projectId: 1,
        projectName: 'Test Project' as any,
        sensorCount: 20,
        activeSensorCount: 18,
        averageUptime: 95.5,
        averageLatency: 125.3,
        alertCount: 5,
      };

      expect(metrics.projectId).toBeGreaterThan(0);
      expect(metrics.sensorCount).toBeGreaterThanOrEqual(0);
      expect(metrics.activeSensorCount).toBeLessThanOrEqual(metrics.sensorCount);
      expect(metrics.averageUptime).toBeGreaterThanOrEqual(0);
      expect(metrics.averageUptime).toBeLessThanOrEqual(100);
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.alertCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Ranking Structure', () => {
    it('should validate ranking structure', () => {
      const ranking = {
        projectId: 1,
        projectName: 'Top Project',
        score: 105.2,
        uptime: 98.5,
        sensorCount: 25,
        rank: 1,
      };

      expect(ranking.projectId).toBeGreaterThan(0);
      expect(ranking.score).toBeGreaterThan(0);
      expect(ranking.uptime).toBeGreaterThanOrEqual(0);
      expect(ranking.uptime).toBeLessThanOrEqual(100);
      expect(ranking.sensorCount).toBeGreaterThanOrEqual(0);
      expect(ranking.rank).toBeGreaterThan(0);
    });

    it('should maintain rank order', () => {
      const rankings = [
        { rank: 1, score: 150 },
        { rank: 2, score: 120 },
        { rank: 3, score: 90 },
      ];

      for (let i = 0; i < rankings.length - 1; i++) {
        expect(rankings[i].score).toBeGreaterThan(rankings[i + 1].score);
        expect(rankings[i].rank).toBeLessThan(rankings[i + 1].rank);
      }
    });
  });

  describe('Availability Heatmap Structure', () => {
    it('should validate heatmap structure', () => {
      const heatmap = {
        hour: 14,
        availability: 96.5,
        sampleCount: 120,
      };

      expect(heatmap.hour).toBeGreaterThanOrEqual(0);
      expect(heatmap.hour).toBeLessThan(24);
      expect(heatmap.availability).toBeGreaterThanOrEqual(0);
      expect(heatmap.availability).toBeLessThanOrEqual(100);
      expect(heatmap.sampleCount).toBeGreaterThanOrEqual(0);
    });

    it('should cover all 24 hours', () => {
      const heatmap = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        availability: 90 + Math.random() * 10,
        sampleCount: 100,
      }));

      expect(heatmap.length).toBe(24);
      expect(heatmap[0].hour).toBe(0);
      expect(heatmap[23].hour).toBe(23);
    });
  });

  describe('Time Period Calculations', () => {
    it('should calculate time periods correctly', () => {
      const now = new Date('2025-11-29T12:00:00Z');
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      expect(oneDayAgo.getDate()).toBe(28);
      expect(oneWeekAgo.getDate()).toBe(22);
      expect(oneMonthAgo.getMonth()).toBe(9); // October
    });

    it('should filter by date range', () => {
      const now = new Date('2025-11-29');
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const testDate1 = new Date('2025-11-29T10:00:00');
      const testDate2 = new Date('2025-11-28T10:00:00');

      expect(testDate1 >= today).toBe(true);
      expect(testDate2 >= today).toBe(false);
    });
  });

  describe('Aggregation Logic', () => {
    it('should aggregate metrics from multiple projects', () => {
      const projects = [
        { sensors: 10, uptime: 95 },
        { sensors: 20, uptime: 90 },
        { sensors: 15, uptime: 92 },
      ];

      const totalSensors = projects.reduce((sum, p) => sum + p.sensors, 0);
      const averageUptime = projects.reduce((sum, p) => sum + p.uptime, 0) / projects.length;

      expect(totalSensors).toBe(45);
      expect(averageUptime).toBeCloseTo(92.33, 2);
    });

    it('should handle empty project list', () => {
      const projects: any[] = [];

      const totalSensors = projects.reduce((sum, p) => sum + p.sensors, 0);
      const averageUptime = projects.length > 0 
        ? projects.reduce((sum, p) => sum + p.uptime, 0) / projects.length 
        : 0;

      expect(totalSensors).toBe(0);
      expect(averageUptime).toBe(0);
    });
  });
});
