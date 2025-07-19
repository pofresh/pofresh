import { describe, it, expect } from 'vitest';
import plugin from '../index.js';

describe('pofresh-status-plugin', () => {
  it('should export plugin configuration', () => {
    expect(plugin).toBeDefined();
    expect(typeof plugin).toBe('object');
  });

  it('should have components property', () => {
    expect(plugin.components).toBeDefined();
    expect(typeof plugin.components).toBe('string');
    expect(plugin.components).toContain('lib/components/');
  });

  it('should have events property', () => {
    expect(plugin.events).toBeDefined();
    expect(typeof plugin.events).toBe('string');
    expect(plugin.events).toContain('lib/events');
  });

  it('should point to correct directories', () => {
    expect(plugin.components.endsWith('lib/components/')).toBe(true);
    expect(plugin.events.endsWith('lib/events')).toBe(true);
  });
});