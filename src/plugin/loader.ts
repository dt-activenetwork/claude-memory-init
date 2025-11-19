/**
 * Plugin Loader
 *
 * Handles plugin loading, dependency resolution, and lifecycle hook execution
 */

import type { Plugin, PluginContext, PluginHooks, CoreConfig } from './types.js';
import { PluginRegistry } from './registry.js';

/**
 * Plugin loader with dependency resolution using topological sort
 */
export class PluginLoader {
  private registry: PluginRegistry;
  private loadedPlugins: Map<string, Plugin> = new Map();

  constructor(registry: PluginRegistry) {
    this.registry = registry;
  }

  /**
   * Load plugins in dependency order
   *
   * Resolves dependencies and loads plugins in the correct order
   *
   * @param config Core configuration
   * @param context Plugin context
   * @throws Error if circular dependencies are detected or dependencies are missing
   */
  async load(config: CoreConfig, context: PluginContext): Promise<void> {
    const enabledPlugins = this.registry.getEnabled(config);

    // Sort plugins by dependencies (topological sort)
    const sortedPlugins = this.sortByDependencies(enabledPlugins);

    // Load each plugin
    for (const plugin of sortedPlugins) {
      await this.loadPlugin(plugin, context);
    }
  }

  /**
   * Execute a lifecycle hook for all loaded plugins
   *
   * @param hookName Name of the hook to execute
   * @param context Plugin context
   */
  async executeHook(
    hookName: keyof PluginHooks,
    context: PluginContext
  ): Promise<void> {
    for (const plugin of this.loadedPlugins.values()) {
      const hook = plugin.hooks?.[hookName];
      if (hook) {
        try {
          await hook(context);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Plugin '${plugin.meta.name}' failed during '${hookName}' hook: ${errorMessage}`
          );
        }
      }
    }
  }

  /**
   * Get loaded plugins
   *
   * @returns Array of loaded plugins
   */
  getLoadedPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Clear loaded plugins
   *
   * Useful for testing or re-initialization
   */
  clear(): void {
    this.loadedPlugins.clear();
  }

  /**
   * Set loaded plugins directly (for manual plugin management)
   *
   * This is useful when you want to bypass the normal load() flow
   * and manage plugin loading manually.
   *
   * @param plugins Array of plugins to set as loaded
   */
  setLoadedPlugins(plugins: Plugin[]): void {
    this.loadedPlugins.clear();
    for (const plugin of plugins) {
      this.loadedPlugins.set(plugin.meta.name, plugin);
    }
  }

  /**
   * Sort plugins by dependencies using topological sort (Kahn's algorithm)
   *
   * @param plugins Plugins to sort
   * @returns Plugins sorted in dependency order
   * @throws Error if circular dependencies are detected
   */
  sortByDependencies(plugins: Plugin[]): Plugin[] {
    // Build adjacency list and in-degree map
    const pluginMap = new Map<string, Plugin>();
    const inDegree = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();

    // Initialize maps
    for (const plugin of plugins) {
      pluginMap.set(plugin.meta.name, plugin);
      inDegree.set(plugin.meta.name, 0);
      adjacencyList.set(plugin.meta.name, []);
    }

    // Build graph
    for (const plugin of plugins) {
      if (plugin.meta.dependencies) {
        for (const depName of plugin.meta.dependencies) {
          // Check if dependency exists
          if (!pluginMap.has(depName)) {
            throw new Error(
              `Plugin '${plugin.meta.name}' depends on '${depName}', but '${depName}' is not registered or enabled`
            );
          }

          // Add edge: dependency -> dependent
          adjacencyList.get(depName)!.push(plugin.meta.name);

          // Increase in-degree of dependent
          inDegree.set(plugin.meta.name, inDegree.get(plugin.meta.name)! + 1);
        }
      }
    }

    // Kahn's algorithm: find all nodes with in-degree 0
    const queue: string[] = [];
    for (const [pluginName, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(pluginName);
      }
    }

    // Process nodes in topological order
    const sorted: Plugin[] = [];

    while (queue.length > 0) {
      const pluginName = queue.shift()!;
      const plugin = pluginMap.get(pluginName)!;
      sorted.push(plugin);

      // Reduce in-degree of neighbors
      const neighbors = adjacencyList.get(pluginName) || [];
      for (const neighbor of neighbors) {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for circular dependencies
    if (sorted.length !== plugins.length) {
      // Find plugins involved in the cycle
      const processedNames = new Set(sorted.map(p => p.meta.name));
      const cyclePlugins = plugins
        .filter(p => !processedNames.has(p.meta.name))
        .map(p => p.meta.name);

      throw new Error(
        `Circular dependency detected among plugins: ${cyclePlugins.join(', ')}`
      );
    }

    return sorted;
  }

  /**
   * Load a single plugin
   *
   * @param plugin Plugin to load
   * @param context Plugin context
   */
  private async loadPlugin(plugin: Plugin, context: PluginContext): Promise<void> {
    this.loadedPlugins.set(plugin.meta.name, plugin);

    // Log plugin loading
    context.logger.info(`Loading plugin: ${plugin.meta.name}`);
  }
}
