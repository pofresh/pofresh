import { describe, it, expect } from 'vitest';
import httpPlugin from '../index.js';

describe('pofresh-http', () => {
  it('should export HttpPlugin instance', () => {
    expect(httpPlugin).toBeDefined();
    expect(typeof httpPlugin).toBe('object');
  });

  it('should have components property', () => {
    expect(httpPlugin.components).toBeDefined();
    expect(typeof httpPlugin.components).toBe('string');
    expect(httpPlugin.components).toContain('lib/components/');
  });

  it('should have filter arrays', () => {
    expect(Array.isArray(httpPlugin.beforeFilters)).toBe(true);
    expect(Array.isArray(httpPlugin.afterFilters)).toBe(true);
  });

  it('should have filter methods', () => {
    expect(typeof httpPlugin.filter).toBe('function');
    expect(typeof httpPlugin.beforeFilter).toBe('function');
    expect(typeof httpPlugin.afterFilter).toBe('function');
  });

  describe('filter management', () => {
    it('should add before filter', () => {
      const initialLength = httpPlugin.beforeFilters.length;
      const testFilter = () => {};
      
      httpPlugin.beforeFilter(testFilter);
      
      expect(httpPlugin.beforeFilters.length).toBe(initialLength + 1);
      expect(httpPlugin.beforeFilters).toContain(testFilter);
    });

    it('should add after filter', () => {
      const initialLength = httpPlugin.afterFilters.length;
      const testFilter = () => {};
      
      httpPlugin.afterFilter(testFilter);
      
      expect(httpPlugin.afterFilters.length).toBe(initialLength + 1);
      expect(httpPlugin.afterFilters).toContain(testFilter);
    });

    it('should add both before and after filters with filter method', () => {
      const initialBeforeLength = httpPlugin.beforeFilters.length;
      const initialAfterLength = httpPlugin.afterFilters.length;
      
      const testFilter = {
        before: function() { return 'before'; },
        after: function() { return 'after'; }
      };
      
      httpPlugin.filter(testFilter);
      
      expect(httpPlugin.beforeFilters.length).toBe(initialBeforeLength + 1);
      expect(httpPlugin.afterFilters.length).toBe(initialAfterLength + 1);
    });

    it('should handle filter with only before method', () => {
      const initialLength = httpPlugin.beforeFilters.length;
      
      const testFilter = {
        before: function() { return 'before only'; }
      };
      
      httpPlugin.filter(testFilter);
      
      expect(httpPlugin.beforeFilters.length).toBe(initialLength + 1);
    });

    it('should handle filter with only after method', () => {
      const initialLength = httpPlugin.afterFilters.length;
      
      const testFilter = {
        after: function() { return 'after only'; }
      };
      
      httpPlugin.filter(testFilter);
      
      expect(httpPlugin.afterFilters.length).toBe(initialLength + 1);
    });
  });
});