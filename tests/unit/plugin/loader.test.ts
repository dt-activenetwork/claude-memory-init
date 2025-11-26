/**
 * Tests for PluginLoader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies that have ESM import issues
vi.mock('../../../src/utils/logger.js', () => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  step: vi.fn(),
  blank: vi.fn()
}));

vi.mock('../../../src/utils/file-ops.js', () => ({
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  fileExists: vi.fn(),
  dirExists: vi.fn(),
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn()
}));

vi.mock('../../../src/core/template-engine.js', () => ({
  loadTemplate: vi.fn(),
  renderTemplate: vi.fn(),
  loadAndRenderTemplate: vi.fn()
}));

import { PluginRegistry } from '../../../src/plugin/registry.js';
import { PluginLoader } from '../../../src/plugin/loader.js';
import { createMockPluginContext } from '../../../src/plugin/context.js';
import type { Plugin, PluginContext, CoreConfig } from '../../../src/plugin/types.js';
import { createMockPlugin, createMockCoreConfig } from './helpers.js';

describe('PluginLoader', () => {
  let registry: PluginRegistry;
  let loader: PluginLoader;
  let context: PluginContext;

  beforeEach(() => {
    registry = new PluginRegistry();
    loader = new PluginLoader(registry);
    context = createMockPluginContext();
  });

  describe('sortByDependencies', () => {
    it('should sort plugins with no dependencies', () => {
      const plugin1 = createMockPlugin('plugin1', { commandName: 'cmd1' });
      const plugin2 = createMockPlugin('plugin2', { commandName: 'cmd2' });
      const plugin3 = createMockPlugin('plugin3', { commandName: 'cmd3' });

      const sorted = loader.sortByDependencies([plugin1, plugin2, plugin3]);

      expect(sorted).toHaveLength(3);
      // Order doesn't matter when there are no dependencies
      expect(sorted).toContain(plugin1);
      expect(sorted).toContain(plugin2);
      expect(sorted).toContain(plugin3);
    });

    it('should sort plugins with linear dependencies', () => {
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA' });
      const pluginB = createMockPlugin('pluginB', { commandName: 'cmdB', dependencies: ['pluginA'] });
      const pluginC = createMockPlugin('pluginC', { commandName: 'cmdC', dependencies: ['pluginB'] });

      const sorted = loader.sortByDependencies([pluginC, pluginB, pluginA]);

      const names = sorted.map(p => p.meta.name);
      expect(names.indexOf('pluginA')).toBeLessThan(names.indexOf('pluginB'));
      expect(names.indexOf('pluginB')).toBeLessThan(names.indexOf('pluginC'));
    });

    it('should sort plugins with multiple dependencies', () => {
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA' });
      const pluginB = createMockPlugin('pluginB', { commandName: 'cmdB' });
      const pluginC = createMockPlugin('pluginC', { commandName: 'cmdC', dependencies: ['pluginA', 'pluginB'] });
      const pluginD = createMockPlugin('pluginD', { commandName: 'cmdD', dependencies: ['pluginC'] });

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
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA' });
      const pluginB = createMockPlugin('pluginB', { commandName: 'cmdB' });
      const pluginC = createMockPlugin('pluginC', { commandName: 'cmdC', dependencies: ['pluginA', 'pluginB'] });
      const pluginD = createMockPlugin('pluginD', { commandName: 'cmdD' });
      const pluginE = createMockPlugin('pluginE', { commandName: 'cmdE', dependencies: ['pluginC', 'pluginD'] });

      const sorted = loader.sortByDependencies([pluginE, pluginD, pluginC, pluginB, pluginA]);

      const names = sorted.map(p => p.meta.name);
      expect(names.indexOf('pluginA')).toBeLessThan(names.indexOf('pluginC'));
      expect(names.indexOf('pluginB')).toBeLessThan(names.indexOf('pluginC'));
      expect(names.indexOf('pluginC')).toBeLessThan(names.indexOf('pluginE'));
      expect(names.indexOf('pluginD')).toBeLessThan(names.indexOf('pluginE'));
    });

    it('should detect circular dependencies (2 plugins)', () => {
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA', dependencies: ['pluginB'] });
      const pluginB = createMockPlugin('pluginB', { commandName: 'cmdB', dependencies: ['pluginA'] });

      expect(() => loader.sortByDependencies([pluginA, pluginB])).toThrow(
        'Circular dependency detected among plugins: pluginA, pluginB'
      );
    });

    it('should detect circular dependencies (3 plugins)', () => {
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA', dependencies: ['pluginC'] });
      const pluginB = createMockPlugin('pluginB', { commandName: 'cmdB', dependencies: ['pluginA'] });
      const pluginC = createMockPlugin('pluginC', { commandName: 'cmdC', dependencies: ['pluginB'] });

      expect(() => loader.sortByDependencies([pluginA, pluginB, pluginC])).toThrow(
        'Circular dependency detected'
      );
    });

    it('should throw error for missing dependency', () => {
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA', dependencies: ['pluginB'] });

      expect(() => loader.sortByDependencies([pluginA])).toThrow(
        "Plugin 'pluginA' depends on 'pluginB', but 'pluginB' is not registered or enabled"
      );
    });

    it('should handle self-dependency as circular', () => {
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA', dependencies: ['pluginA'] });

      expect(() => loader.sortByDependencies([pluginA])).toThrow(
        'Circular dependency detected'
      );
    });
  });

  describe('load', () => {
    it('should load plugins in dependency order', async () => {
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA' });
      const pluginB = createMockPlugin('pluginB', { commandName: 'cmdB', dependencies: ['pluginA'] });
      const pluginC = createMockPlugin('pluginC', { commandName: 'cmdC', dependencies: ['pluginB'] });

      registry.register(pluginA);
      registry.register(pluginB);
      registry.register(pluginC);

      const config = createMockCoreConfig(['pluginA', 'pluginB', 'pluginC']);

      await loader.load(config, context);

      const loaded = loader.getLoadedPlugins();
      expect(loaded).toHaveLength(3);

      const names = loaded.map(p => p.meta.name);
      expect(names.indexOf('pluginA')).toBeLessThan(names.indexOf('pluginB'));
      expect(names.indexOf('pluginB')).toBeLessThan(names.indexOf('pluginC'));
    });

    it('should only load enabled plugins', async () => {
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA' });
      const pluginB = createMockPlugin('pluginB', { commandName: 'cmdB' });
      const pluginC = createMockPlugin('pluginC', { commandName: 'cmdC' });

      registry.register(pluginA);
      registry.register(pluginB);
      registry.register(pluginC);

      const config = createMockCoreConfig(['pluginA', 'pluginC'], ['pluginB']);

      await loader.load(config, context);

      const loaded = loader.getLoadedPlugins();
      expect(loaded).toHaveLength(2);
      expect(loaded.map(p => p.meta.name)).toEqual(['pluginA', 'pluginC']);
    });

    it('should handle empty plugin list', async () => {
      const config = createMockCoreConfig();

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

      const config = createMockCoreConfig(['pluginA', 'pluginB']);
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

      const config = createMockCoreConfig(['pluginA', 'pluginB']);
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

      const config = createMockCoreConfig(['pluginA']);
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

      const config = createMockCoreConfig(['plugin']);
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
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA' });
      const pluginB = createMockPlugin('pluginB', { commandName: 'cmdB' });

      registry.register(pluginA);
      registry.register(pluginB);

      const config = createMockCoreConfig(['pluginA', 'pluginB']);
      await loader.load(config, context);

      const loaded = loader.getLoadedPlugins();

      expect(loaded).toHaveLength(2);
      expect(loaded).toContain(pluginA);
      expect(loaded).toContain(pluginB);
    });
  });

  describe('clear', () => {
    it('should clear loaded plugins', async () => {
      const pluginA = createMockPlugin('pluginA', { commandName: 'cmdA' });

      registry.register(pluginA);

      const config = createMockCoreConfig(['pluginA']);
      await loader.load(config, context);

      expect(loader.getLoadedPlugins()).toHaveLength(1);

      loader.clear();

      expect(loader.getLoadedPlugins()).toHaveLength(0);
    });
  });

  describe('dependency resolution edge cases', () => {
    it('should handle diamond dependency pattern', () => {
      // A depends on B and C, B depends on D, C depends on D
      const A = createMockPlugin('A', { dependencies: ['B', 'C'] });
      const B = createMockPlugin('B', { dependencies: ['D'] });
      const C = createMockPlugin('C', { dependencies: ['D'] });
      const D = createMockPlugin('D');

      const sorted = loader.sortByDependencies([A, B, C, D]);
      const names = sorted.map(p => p.meta.name);

      expect(names.indexOf('D')).toBeLessThan(names.indexOf('B'));
      expect(names.indexOf('D')).toBeLessThan(names.indexOf('C'));
      expect(names.indexOf('B')).toBeLessThan(names.indexOf('A'));
      expect(names.indexOf('C')).toBeLessThan(names.indexOf('A'));
    });
  });

  describe('hook execution', () => {
    it('should pass context to hooks', async () => {
      const executeFn = vi.fn();
      const plugin: Plugin = {
        meta: { name: 'test', commandName: 'test', version: '1.0.0', description: 'test' },
        hooks: { execute: executeFn },
      };

      registry.register(plugin);
      const config = createMockCoreConfig(['test']);
      await loader.load(config, context);
      await loader.executeHook('execute', context);

      expect(executeFn).toHaveBeenCalledWith(context);
    });
  });
});
