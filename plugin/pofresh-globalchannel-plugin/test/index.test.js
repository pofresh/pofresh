import { describe, it, expect } from 'vitest';
import plugin from '../index.js';

describe('pofresh-globalchannel-plugin', () => {
  it('should export plugin configuration', () => {
    expect(plugin).toBeDefined();
    expect(typeof plugin).toBe('object');
  });

  it('should have components property', () => {
    expect(plugin.components).toBeDefined();
    expect(typeof plugin.components).toBe('string');
    expect(plugin.components).toContain('lib/components/');
  });

  it('should point to correct components directory', () => {
    expect(plugin.components.endsWith('lib/components/')).toBe(true);
  });
});