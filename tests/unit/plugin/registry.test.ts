/**
 * Tests for PluginRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '../../../src/plugin/registry.js';
import type { Plugin, CoreConfig } from '../../../src/plugin/types.js';
import { createMockPlugin, createMockCoreConfig } from './helpers.js';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('register', () => {
    it('should register a valid plugin', () => {
      const plugin = createMockPlugin('test-plugin', { commandName: 'test' });

      expect(() => registry.register(plugin)).not.toThrow();
      expect(registry.has('test-plugin')).toBe(true);
      expect(registry.count()).toBe(1);
    });

    it('should throw error when registering plugin without meta', () => {
      const invalidPlugin = {} as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow('Plugin must have metadata');
    });

    it('should throw error when registering plugin without name', () => {
      const invalidPlugin = {
        meta: { version: '1.0.0', description: 'Test' }
      } as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow('Plugin must have a valid name');
    });

    it('should throw error when registering plugin without commandName', () => {
      const invalidPlugin = {
        meta: { name: 'test', version: '1.0.0', description: 'Test' }
      } as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow('must have a valid commandName');
    });

    it('should throw error when registering plugin without version', () => {
      const invalidPlugin = {
        meta: { name: 'test', commandName: 'test', description: 'Test' }
      } as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow('must have a valid version');
    });

    it('should throw error when registering plugin without description', () => {
      const invalidPlugin = {
        meta: { name: 'test', commandName: 'test', version: '1.0.0' }
      } as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow('must have a description');
    });

    it('should throw error when registering duplicate plugin name', () => {
      const plugin1 = createMockPlugin('test-plugin', { commandName: 'test1' });
      const plugin2 = createMockPlugin('test-plugin', { commandName: 'test2' });

      registry.register(plugin1);

      expect(() => registry.register(plugin2)).toThrow(
        "Plugin with name 'test-plugin' is already registered"
      );
    });

    it('should throw error when registering duplicate commandName', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'test' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'test' });

      registry.register(plugin1);

      expect(() => registry.register(plugin2)).toThrow(
        "Plugin commandName 'test' is already used by plugin 'plugin1'"
      );
    });

    it('should validate dependencies array', () => {
      const invalidPlugin = {
        meta: {
          name: 'test',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test',
          dependencies: 'not-an-array' as any
        }
      } as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow('dependencies must be an array');
    });

    it('should validate configuration structure', () => {
      const invalidPlugin = {
        meta: {
          name: 'test',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test'
        },
        configuration: {
          needsConfiguration: 'yes' as any,
          configure: async () => ({ enabled: true, options: {} }),
          getSummary: () => []
        }
      } as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow(
        'configuration.needsConfiguration must be a boolean'
      );
    });

    it('should validate hooks are functions', () => {
      const invalidPlugin = {
        meta: {
          name: 'test',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test'
        },
        hooks: {
          execute: 'not a function' as any
        }
      } as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow(
        "hook 'execute' must be a function"
      );
    });

    it('should validate commands structure', () => {
      const invalidPlugin = {
        meta: {
          name: 'test',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test'
        },
        commands: [
          {
            name: 'cmd1',
            description: 'Command 1',
            action: 'not a function' as any
          }
        ]
      } as Plugin;

      expect(() => registry.register(invalidPlugin)).toThrow(
        "command 'cmd1' must have an action function"
      );
    });
  });

  describe('get', () => {
    it('should retrieve a registered plugin', () => {
      const plugin = createMockPlugin('test-plugin', { commandName: 'test' });
      registry.register(plugin);

      const retrieved = registry.get('test-plugin');

      expect(retrieved).toBe(plugin);
      expect(retrieved.meta.name).toBe('test-plugin');
    });

    it('should throw error when getting non-existent plugin', () => {
      expect(() => registry.get('non-existent')).toThrow(
        "Plugin 'non-existent' not found in registry"
      );
    });
  });

  describe('getByCommandName', () => {
    it('should retrieve plugin by command name', () => {
      const plugin = createMockPlugin('test-plugin', { commandName: 'test-cmd' });
      registry.register(plugin);

      const retrieved = registry.getByCommandName('test-cmd');

      expect(retrieved).toBe(plugin);
      expect(retrieved?.meta.commandName).toBe('test-cmd');
    });

    it('should return undefined for non-existent command name', () => {
      const retrieved = registry.getByCommandName('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no plugins registered', () => {
      const plugins = registry.getAll();

      expect(plugins).toEqual([]);
    });

    it('should return all registered plugins', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });
      const plugin3 = createMockPlugin('plugin3', { commandName: 'cmd3' });

      registry.register(plugin1);
      registry.register(plugin2);
      registry.register(plugin3);

      const plugins = registry.getAll();

      expect(plugins).toHaveLength(3);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
      expect(plugins).toContain(plugin3);
    });
  });

  describe('has', () => {
    it('should return true for registered plugin', () => {
      const plugin = createMockPlugin('test-plugin', { commandName: 'test' });
      registry.register(plugin);

      expect(registry.has('test-plugin')).toBe(true);
    });

    it('should return false for non-registered plugin', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('getEnabled', () => {
    it('should return all plugins when config is empty', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });

      registry.register(plugin1);
      registry.register(plugin2);

      const config = createMockCoreConfig();

      const enabled = registry.getEnabled(config);

      expect(enabled).toHaveLength(2);
    });

    it('should filter out explicitly disabled plugins', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });
      const plugin3 = createMockPlugin('plugin3', { commandName: 'cmd3' });

      registry.register(plugin1);
      registry.register(plugin2);
      registry.register(plugin3);

      const config = createMockCoreConfig(['plugin1', 'plugin3'], ['plugin2']);

      const enabled = registry.getEnabled(config);

      expect(enabled).toHaveLength(2);
      expect(enabled.map(p => p.meta.name)).toEqual(['plugin1', 'plugin3']);
    });

    it('should include plugins not mentioned in config', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });

      registry.register(plugin1);
      registry.register(plugin2);

      const config = createMockCoreConfig(['plugin1']);

      const enabled = registry.getEnabled(config);

      expect(enabled).toHaveLength(2);
    });
  });

  describe('count', () => {
    it('should return 0 when no plugins registered', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return correct count of registered plugins', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });

      registry.register(plugin1);
      expect(registry.count()).toBe(1);

      registry.register(plugin2);
      expect(registry.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all plugins from registry', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });

      registry.register(plugin1);
      registry.register(plugin2);

      expect(registry.count()).toBe(2);

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.has('plugin1')).toBe(false);
      expect(registry.has('plugin2')).toBe(false);
    });

    it('should allow re-registration after clear', () => {
      const plugin = createMockPlugin('test-plugin', { commandName: 'test' });

      registry.register(plugin);
      registry.clear();

      expect(() => registry.register(plugin)).not.toThrow();
      expect(registry.has('test-plugin')).toBe(true);
    });
  });

  describe('getVisible', () => {
    it('should return all plugins when CLI config is empty', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });

      registry.register(plugin1);
      registry.register(plugin2);

      const visible = registry.getVisible({});

      expect(visible).toHaveLength(2);
      expect(visible).toContain(plugin1);
      expect(visible).toContain(plugin2);
    });

    it('should filter out disabled plugins', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });
      const plugin3 = createMockPlugin('plugin3', { commandName: 'cmd3' });

      registry.register(plugin1);
      registry.register(plugin2);
      registry.register(plugin3);

      const visible = registry.getVisible({
        plugins: {
          disabled: ['plugin2'],
        },
      });

      expect(visible).toHaveLength(2);
      expect(visible.map(p => p.meta.name)).toEqual(['plugin1', 'plugin3']);
    });

    it('should only show enabled plugins in whitelist mode', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });
      const plugin3 = createMockPlugin('plugin3', { commandName: 'cmd3' });

      registry.register(plugin1);
      registry.register(plugin2);
      registry.register(plugin3);

      const visible = registry.getVisible({
        plugins: {
          enabled: ['plugin1', 'plugin3'],
        },
      });

      expect(visible).toHaveLength(2);
      expect(visible.map(p => p.meta.name)).toEqual(['plugin1', 'plugin3']);
    });

    it('should always show core plugin even when disabled', () => {
      const corePlugin = createMockPlugin('core', { commandName: 'core' });
      const otherPlugin = createMockPlugin('other', { commandName: 'other' });

      registry.register(corePlugin);
      registry.register(otherPlugin);

      const visible = registry.getVisible({
        plugins: {
          disabled: ['core', 'other'],
        },
      });

      expect(visible).toHaveLength(1);
      expect(visible[0].meta.name).toBe('core');
    });

    it('should always show core plugin even with whitelist mode', () => {
      const corePlugin = createMockPlugin('core', { commandName: 'core' });
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });

      registry.register(corePlugin);
      registry.register(plugin1);
      registry.register(plugin2);

      const visible = registry.getVisible({
        plugins: {
          enabled: ['plugin1'],
        },
      });

      expect(visible).toHaveLength(2);
      expect(visible.map(p => p.meta.name).sort()).toEqual(['core', 'plugin1']);
    });
  });

  describe('edge cases', () => {
    it('should handle plugin with all optional fields', () => {
      const fullPlugin = createMockPlugin('full-plugin', {
        hasHooks: true,
        hasConfiguration: true,
        dependencies: ['dep1', 'dep2'],
      });

      expect(() => registry.register(fullPlugin)).not.toThrow();
      expect(registry.has('full-plugin')).toBe(true);
    });

    it('should validate hook types are functions', () => {
      const invalidPlugin = {
        meta: { name: 'invalid', commandName: 'inv', version: '1.0.0', description: 'test' },
        hooks: { execute: 'not a function' as any },
      };

      expect(() => registry.register(invalidPlugin)).toThrow();
    });
  });
});
