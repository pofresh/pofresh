import { describe, it, expect, vi, beforeAll } from 'vitest';

describe('Command', () => {
  let Command;
  let command;

  beforeAll(async () => {
    // Import Command
    const commandModule = await import('../lib/command.js');
    Command = commandModule.default;
    command = Command();
  });

  it('should create a Command instance', () => {
    expect(command).toBeDefined();
    expect(typeof command.handle).toBe('function');
    expect(typeof command.quit).toBe('function');
    expect(typeof command.kill).toBe('function');
  });

  it('should initialize with default context', () => {
    expect(command.getContext()).toBe('all');
  });

  it('should allow setting and getting context', () => {
    command.setContext('test-server');
    expect(command.getContext()).toBe('test-server');
    // Reset to default
    command.setContext('all');
  });

  it('should have commands property', () => {
    expect(command.commands).toBeDefined();
    expect(typeof command.commands).toBe('object');
  });

  it('should quit properly', () => {
    const mockRl = { emit: vi.fn() };
    command.quit(mockRl);
    expect(mockRl.emit).toHaveBeenCalledWith('close');
  });

  it('should handle basic functionality without errors', () => {
    expect(() => {
      const mockRl = { prompt: vi.fn(), question: vi.fn() };
      const mockClient = { request: vi.fn() };
      const mockMsg = {};
      
      // Test that handle method exists and can be called
      command.handle('help', mockMsg, mockRl, mockClient);
    }).not.toThrow();
  });
});