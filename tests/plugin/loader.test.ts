/**
 * Tests for PluginLoader
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies that have ESM import issues
jest.mock('../../src/utils/logger.js', () => ({
  info: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  step: jest.fn(),
  blank: jest.fn()
}));

jest.mock('../../src/utils/file-ops.js', () => ({
  ensureDir: jest.fn(),
  copyFile: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  fileExists: jest.fn(),
  dirExists: jest.fn(),
  readJsonFile: jest.fn(),
  writeJsonFile: jest.fn()
}));

jest.mock('../../src/core/template-engine.js', () => ({
  loadTemplate: jest.fn(),
  renderTemplate: jest.fn(),
  loadAndRenderTemplate: jest.fn()
}));

import { PluginRegistry } from '../../src/plugin/registry.js';
import { PluginLoader } from '../../src/plugin/loader.js';
import { createMockPluginContext } from '../../src/plugin/context.js';
import type { Plugin, PluginContext, CoreConfig } from '../../src/plugin/types.js';

describe('PluginLoader', () => {
  let registry: PluginRegistry;
  let loader: PluginLoader;
  let context: PluginContext;

  // Helper to create a plugin
  const createPlugin = (
    name: string,
    commandName: string = name,
    deps: string[] = [],
    hasHooks = false
  ): Plugin => ({
    meta: {
      name,
      commandName,
      version: '1.0.0',
      description: `Test plugin ${name}`,
      dependencies: deps.length > 0 ? deps : undefined
    },
    hooks: hasHooks ? {
      beforeInit: async () => {},
      execute: async () => {},
      afterInit: async () => {}
    } : undefined
  });

  // Helper to create a config
  const createConfig = (enabledPlugins: string[] = []): CoreConfig => ({
    project: { name: 'test', root: '.' },
    output: { base_dir: 'claude' },
    plugins: enabledPlugins.reduce((acc, name) => {
      acc[name] = { enabled: true, options: {} };
      return acc;
    }, {} as any)
  });

  beforeEach(() => {
    registry = new PluginRegistry();
    loader = new PluginLoader(registry);
    context = createMockPluginContext();
  });

  describe('sortByDependencies', () => {
    it('should sort plugins with no dependencies', () => {
      const plugin1 = createPlugin('plugin1', 'cmd1');
      const plugin2 = createPlugin('plugin2', 'cmd2');
      const plugin3 = createPlugin('plugin3', 'cmd3');

      const sorted = loader.sortByDependencies([plugin1, plugin2, plugin3]);

      expect(sorted).toHaveLength(3);
      // Order doesn't matter when there are no dependencies
      expect(sorted).toContain(plugin1);
      expect(sorted).toContain(plugin2);
      expect(sorted).toContain(plugin3);
    });

    it('should sort plugins with linear dependencies', () => {
      const pluginA = createPlugin('pluginA', 'cmdA', []);
      const pluginB = createPlugin('pluginB', 'cmdB', ['pluginA']);
      const pluginC = createPlugin('pluginC', 'cmdC', ['pluginB']);

      const sorted = loader.sortByDependencies([pluginC, pluginB, pluginA]);

      const names = sorted.map(p => p.meta.name);
      expect(names.indexOf('pluginA')).toBeLessThan(names.indexOf('pluginB'));
      expect(names.indexOf('pluginB')).toBeLessThan(names.indexOf('pluginC'));
    });

    it('should sort plugins with multiple dependencies', () => {
      const pluginA = createPlugin('pluginA', 'cmdA', []);
      const pluginB = createPlugin('pluginB', 'cmdB', []);
      const pluginC = createPlugin('pluginC', 'cmdC', ['pluginA', 'pluginB']);
      const pluginD = createPlugin('pluginD', 'cmdD', ['pluginC']);

      const sorted = loader.sortByDependencies([pluginD, pluginC, pluginB, pluginA]);

      const names = sorted.map(p => p.meta.name);
      expect(names.indexOf('pluginA')).toBeLessThan(names.indexOf('pluginC'));
      expect(names.indexOf('pluginB')).toBeLessThan(names.indexOf('pluginC'));
      expect(names.indexOf('pluginC')).toBeLessThan(names.indexOf('pluginD'));
    });

    it('should handle complex dependency graph', () => {
      /*
        Graph:
        A → C → E
        B → C → E
        D → E
      */
      const pluginA = createPlugin('pluginA', 'cmdA', []);
      const pluginB = createPlugin('pluginB', 'cmdB', []);
      const pluginC = createPlugin('pluginC', 'cmdC', ['pluginA', 'pluginB']);
      const pluginD = createPlugin('pluginD', 'cmdD', []);
      const pluginE = createPlugin('pluginE', 'cmdE', ['pluginC', 'pluginD']);

      const sorted = loader.sortByDependencies([pluginE, pluginD, pluginC, pluginB, pluginA]);

      const names = sorted.map(p => p.meta.name);
      expect(names.indexOf('pluginA')).toBeLessThan(names.indexOf('pluginC'));
      expect(names.indexOf('pluginB')).toBeLessThan(names.indexOf('pluginC'));
      expect(names.indexOf('pluginC')).toBeLessThan(names.indexOf('pluginE'));
      expect(names.indexOf('pluginD')).toBeLessThan(names.indexOf('pluginE'));
    });

    it('should detect circular dependencies (2 plugins)', () => {
      const pluginA = createPlugin('pluginA', 'cmdA', ['pluginB']);
      const pluginB = createPlugin('pluginB', 'cmdB', ['pluginA']);

      expect(() => loader.sortByDependencies([pluginA, pluginB])).toThrow(
        'Circular dependency detected among plugins: pluginA, pluginB'
      );
    });

    it('should detect circular dependencies (3 plugins)', () => {
      const pluginA = createPlugin('pluginA', 'cmdA', ['pluginC']);
      const pluginB = createPlugin('pluginB', 'cmdB', ['pluginA']);
      const pluginC = createPlugin('pluginC', 'cmdC', ['pluginB']);

      expect(() => loader.sortByDependencies([pluginA, pluginB, pluginC])).toThrow(
        'Circular dependency detected'
      );
    });

    it('should throw error for missing dependency', () => {
      const pluginA = createPlugin('pluginA', 'cmdA', ['pluginB']);

      expect(() => loader.sortByDependencies([pluginA])).toThrow(
        "Plugin 'pluginA' depends on 'pluginB', but 'pluginB' is not registered or enabled"
      );
    });

    it('should handle self-dependency as circular', () => {
      const pluginA = createPlugin('pluginA', 'cmdA', ['pluginA']);

      expect(() => loader.sortByDependencies([pluginA])).toThrow(
        'Circular dependency detected'
      );
    });
  });

  describe('load', () => {
    it('should load plugins in dependency order', async () => {
      const pluginA = createPlugin('pluginA', 'cmdA', []);
      const pluginB = createPlugin('pluginB', 'cmdB', ['pluginA']);
      const pluginC = createPlugin('pluginC', 'cmdC', ['pluginB']);

      registry.register(pluginA);
      registry.register(pluginB);
      registry.register(pluginC);

      const config = createConfig(['pluginA', 'pluginB', 'pluginC']);

      await loader.load(config, context);

      const loaded = loader.getLoadedPlugins();
      expect(loaded).toHaveLength(3);

      const names = loaded.map(p => p.meta.name);
      expect(names.indexOf('pluginA')).toBeLessThan(names.indexOf('pluginB'));
      expect(names.indexOf('pluginB')).toBeLessThan(names.indexOf('pluginC'));
    });

    it('should only load enabled plugins', async () => {
      const pluginA = createPlugin('pluginA', 'cmdA', []);
      const pluginB = createPlugin('pluginB', 'cmdB', []);
      const pluginC = createPlugin('pluginC', 'cmdC', []);

      registry.register(pluginA);
      registry.register(pluginB);
      registry.register(pluginC);

      const config: CoreConfig = {
        project: { name: 'test', root: '.' },
        output: { base_dir: 'claude' },
        plugins: {
          pluginA: { enabled: true, options: {} },
          pluginB: { enabled: false, options: {} },
          pluginC: { enabled: true, options: {} }
        }
      };

      await loader.load(config, context);

      const loaded = loader.getLoadedPlugins();
      expect(loaded).toHaveLength(2);
      expect(loaded.map(p => p.meta.name)).toEqual(['pluginA', 'pluginC']);
    });

    it('should handle empty plugin list', async () => {
      const config = createConfig([]);

      await loader.load(config, context);

      const loaded = loader.getLoadedPlugins();
      expect(loaded).toHaveLength(0);
    });
  });

  describe('executeHook', () => {
    it('should execute hook for all loaded plugins', async () => {
      const executionOrder: string[] = [];

      const pluginA: Plugin = {
        meta: { name: 'pluginA', commandName: 'cmdA', version: '1.0.0', description: 'Test' },
        hooks: {
          execute: async () => { executionOrder.push('A'); }
        }
      };

      const pluginB: Plugin = {
        meta: { name: 'pluginB', commandName: 'cmdB', version: '1.0.0', description: 'Test' },
        hooks: {
          execute: async () => { executionOrder.push('B'); }
        }
      };

      registry.register(pluginA);
      registry.register(pluginB);

      const config = createConfig(['pluginA', 'pluginB']);
      await loader.load(config, context);

      await loader.executeHook('execute', context);

      expect(executionOrder).toEqual(['A', 'B']);
    });

    it('should skip plugins without the hook', async () => {
      const executionOrder: string[] = [];

      const pluginA: Plugin = {
        meta: { name: 'pluginA', commandName: 'cmdA', version: '1.0.0', description: 'Test' },
        hooks: {
          execute: async () => { executionOrder.push('A'); }
        }
      };

      const pluginB: Plugin = {
        meta: { name: 'pluginB', commandName: 'cmdB', version: '1.0.0', description: 'Test' }
        // No hooks
      };

      registry.register(pluginA);
      registry.register(pluginB);

      const config = createConfig(['pluginA', 'pluginB']);
      await loader.load(config, context);

      await loader.executeHook('execute', context);

      expect(executionOrder).toEqual(['A']);
    });

    it('should throw error when hook fails', async () => {
      const pluginA: Plugin = {
        meta: { name: 'pluginA', commandName: 'cmdA', version: '1.0.0', description: 'Test' },
        hooks: {
          execute: async () => { throw new Error('Hook failed'); }
        }
      };

      registry.register(pluginA);

      const config = createConfig(['pluginA']);
      await loader.load(config, context);

      await expect(loader.executeHook('execute', context)).rejects.toThrow(
        "Plugin 'pluginA' failed during 'execute' hook: Hook failed"
      );
    });

    it('should execute different hooks', async () => {
      const executionOrder: string[] = [];

      const plugin: Plugin = {
        meta: { name: 'plugin', commandName: 'cmd', version: '1.0.0', description: 'Test' },
        hooks: {
          beforeInit: async () => { executionOrder.push('beforeInit'); },
          execute: async () => { executionOrder.push('execute'); },
          afterInit: async () => { executionOrder.push('afterInit'); },
          cleanup: async () => { executionOrder.push('cleanup'); }
        }
      };

      registry.register(plugin);

      const config = createConfig(['plugin']);
      await loader.load(config, context);

      await loader.executeHook('beforeInit', context);
      await loader.executeHook('execute', context);
      await loader.executeHook('afterInit', context);
      await loader.executeHook('cleanup', context);

      expect(executionOrder).toEqual(['beforeInit', 'execute', 'afterInit', 'cleanup']);
    });
  });

  describe('getLoadedPlugins', () => {
    it('should return empty array when no plugins loaded', () => {
      const loaded = loader.getLoadedPlugins();

      expect(loaded).toEqual([]);
    });

    it('should return all loaded plugins', async () => {
      const pluginA = createPlugin('pluginA', 'cmdA');
      const pluginB = createPlugin('pluginB', 'cmdB');

      registry.register(pluginA);
      registry.register(pluginB);

      const config = createConfig(['pluginA', 'pluginB']);
      await loader.load(config, context);

      const loaded = loader.getLoadedPlugins();

      expect(loaded).toHaveLength(2);
      expect(loaded).toContain(pluginA);
      expect(loaded).toContain(pluginB);
    });
  });

  describe('clear', () => {
    it('should clear loaded plugins', async () => {
      const pluginA = createPlugin('pluginA', 'cmdA');

      registry.register(pluginA);

      const config = createConfig(['pluginA']);
      await loader.load(config, context);

      expect(loader.getLoadedPlugins()).toHaveLength(1);

      loader.clear();

      expect(loader.getLoadedPlugins()).toHaveLength(0);
    });
  });
});
