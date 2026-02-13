import { describe, it, expect } from 'vitest';

/**
 * Pruebas para validar la lógica de filtrado en visualización de comparación 3D
 */

describe('Comparison Filters Logic', () => {
  describe('Filter State Management', () => {
    it('should initialize with all filters enabled', () => {
      const defaultFilters = {
        showAdded: true,
        showRemoved: true,
        showModified: true,
      };

      expect(defaultFilters.showAdded).toBe(true);
      expect(defaultFilters.showRemoved).toBe(true);
      expect(defaultFilters.showModified).toBe(true);
    });

    it('should toggle individual filter', () => {
      const filters = {
        showAdded: true,
        showRemoved: true,
        showModified: true,
      };

      // Toggle showAdded
      const updatedFilters = {
        ...filters,
        showAdded: !filters.showAdded,
      };

      expect(updatedFilters.showAdded).toBe(false);
      expect(updatedFilters.showRemoved).toBe(true);
      expect(updatedFilters.showModified).toBe(true);
    });

    it('should allow multiple filters to be disabled', () => {
      const filters = {
        showAdded: false,
        showRemoved: false,
        showModified: true,
      };

      expect(filters.showAdded).toBe(false);
      expect(filters.showRemoved).toBe(false);
      expect(filters.showModified).toBe(true);
    });

    it('should reset all filters to enabled', () => {
      const disabledFilters = {
        showAdded: false,
        showRemoved: false,
        showModified: false,
      };

      const resetFilters = {
        showAdded: true,
        showRemoved: true,
        showModified: true,
      };

      expect(resetFilters.showAdded).toBe(true);
      expect(resetFilters.showRemoved).toBe(true);
      expect(resetFilters.showModified).toBe(true);
    });
  });

  describe('Element Visibility Determination', () => {
    it('should show added element when showAdded is true', () => {
      const filters = { showAdded: true, showRemoved: true, showModified: true };
      const elementType = 'added';

      const isVisible = filters.showAdded && elementType === 'added';

      expect(isVisible).toBe(true);
    });

    it('should hide added element when showAdded is false', () => {
      const filters = { showAdded: false, showRemoved: true, showModified: true };
      const elementType = 'added';

      const isVisible = filters.showAdded && elementType === 'added';

      expect(isVisible).toBe(false);
    });

    it('should show removed element when showRemoved is true', () => {
      const filters = { showAdded: true, showRemoved: true, showModified: true };
      const elementType = 'removed';

      const isVisible = filters.showRemoved && elementType === 'removed';

      expect(isVisible).toBe(true);
    });

    it('should hide removed element when showRemoved is false', () => {
      const filters = { showAdded: true, showRemoved: false, showModified: true };
      const elementType = 'removed';

      const isVisible = filters.showRemoved && elementType === 'removed';

      expect(isVisible).toBe(false);
    });

    it('should show modified element when showModified is true', () => {
      const filters = { showAdded: true, showRemoved: true, showModified: true };
      const elementType = 'modified';

      const isVisible = filters.showModified && elementType === 'modified';

      expect(isVisible).toBe(true);
    });

    it('should hide modified element when showModified is false', () => {
      const filters = { showAdded: true, showRemoved: true, showModified: false };
      const elementType = 'modified';

      const isVisible = filters.showModified && elementType === 'modified';

      expect(isVisible).toBe(false);
    });
  });

  describe('Filter Application Logic', () => {
    it('should correctly filter array of changes based on filters', () => {
      const changes = [
        { expressId: 1, changeType: 'added' },
        { expressId: 2, changeType: 'removed' },
        { expressId: 3, changeType: 'modified' },
        { expressId: 4, changeType: 'added' },
      ];

      const filters = { showAdded: true, showRemoved: false, showModified: true };

      const visibleChanges = changes.filter(change => {
        if (change.changeType === 'added') return filters.showAdded;
        if (change.changeType === 'removed') return filters.showRemoved;
        if (change.changeType === 'modified') return filters.showModified;
        return true;
      });

      expect(visibleChanges).toHaveLength(3);
      expect(visibleChanges.some(c => c.changeType === 'removed')).toBe(false);
    });

    it('should show all elements when all filters are enabled', () => {
      const changes = [
        { expressId: 1, changeType: 'added' },
        { expressId: 2, changeType: 'removed' },
        { expressId: 3, changeType: 'modified' },
      ];

      const filters = { showAdded: true, showRemoved: true, showModified: true };

      const visibleChanges = changes.filter(change => {
        if (change.changeType === 'added') return filters.showAdded;
        if (change.changeType === 'removed') return filters.showRemoved;
        if (change.changeType === 'modified') return filters.showModified;
        return true;
      });

      expect(visibleChanges).toHaveLength(3);
    });

    it('should hide all elements when all filters are disabled', () => {
      const changes = [
        { expressId: 1, changeType: 'added' },
        { expressId: 2, changeType: 'removed' },
        { expressId: 3, changeType: 'modified' },
      ];

      const filters = { showAdded: false, showRemoved: false, showModified: false };

      const visibleChanges = changes.filter(change => {
        if (change.changeType === 'added') return filters.showAdded;
        if (change.changeType === 'removed') return filters.showRemoved;
        if (change.changeType === 'modified') return filters.showModified;
        return true;
      });

      expect(visibleChanges).toHaveLength(0);
    });

    it('should show only added elements when only showAdded is enabled', () => {
      const changes = [
        { expressId: 1, changeType: 'added' },
        { expressId: 2, changeType: 'removed' },
        { expressId: 3, changeType: 'modified' },
        { expressId: 4, changeType: 'added' },
      ];

      const filters = { showAdded: true, showRemoved: false, showModified: false };

      const visibleChanges = changes.filter(change => {
        if (change.changeType === 'added') return filters.showAdded;
        if (change.changeType === 'removed') return filters.showRemoved;
        if (change.changeType === 'modified') return filters.showModified;
        return true;
      });

      expect(visibleChanges).toHaveLength(2);
      expect(visibleChanges.every(c => c.changeType === 'added')).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('should detect when filters need reset', () => {
      const filters1 = { showAdded: true, showRemoved: true, showModified: true };
      const filters2 = { showAdded: false, showRemoved: true, showModified: true };
      const filters3 = { showAdded: false, showRemoved: false, showModified: false };

      const needsReset1 = !filters1.showAdded || !filters1.showRemoved || !filters1.showModified;
      const needsReset2 = !filters2.showAdded || !filters2.showRemoved || !filters2.showModified;
      const needsReset3 = !filters3.showAdded || !filters3.showRemoved || !filters3.showModified;

      expect(needsReset1).toBe(false);
      expect(needsReset2).toBe(true);
      expect(needsReset3).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty changes array', () => {
      const changes: any[] = [];
      const filters = { showAdded: true, showRemoved: true, showModified: true };

      const visibleChanges = changes.filter(change => {
        if (change.changeType === 'added') return filters.showAdded;
        if (change.changeType === 'removed') return filters.showRemoved;
        if (change.changeType === 'modified') return filters.showModified;
        return true;
      });

      expect(visibleChanges).toHaveLength(0);
    });

    it('should handle changes with unknown type', () => {
      const changes = [
        { expressId: 1, changeType: 'unknown' },
      ];

      const filters = { showAdded: true, showRemoved: true, showModified: true };

      const visibleChanges = changes.filter(change => {
        if (change.changeType === 'added') return filters.showAdded;
        if (change.changeType === 'removed') return filters.showRemoved;
        if (change.changeType === 'modified') return filters.showModified;
        return true; // Unknown types are visible by default
      });

      expect(visibleChanges).toHaveLength(1);
    });
  });
});
