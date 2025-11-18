/**
 * Plugin Registry
 *
 * Manages plugin registration and retrieval with validation
 */

import type { Plugin, PluginConfig, CoreConfig } from './types.js';

/**
 * Registry for managing plugins
 *
 * Provides methods to register, query, and filter plugins
 */
export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private commandNameIndex: Map<string, string> = new Map(); // commandName -> pluginName

  /**
   * Register a plugin
   *
   * Validates the plugin and stores it in the registry
   *
   * @param plugin Plugin to register
   * @throws Error if validation fails or if there's a name/commandName conflict
   */
  register(plugin: Plugin): void {
    // Validate plugin
    this.validatePlugin(plugin);

    // Check for name conflicts
    if (this.plugins.has(plugin.meta.name)) {
      throw new Error(
        `Plugin with name '${plugin.meta.name}' is already registered`
      );
    }

    // Check for commandName conflicts
    if (this.commandNameIndex.has(plugin.meta.commandName)) {
      const existingPluginName = this.commandNameIndex.get(plugin.meta.commandName);
      throw new Error(
        `Plugin commandName '${plugin.meta.commandName}' is already used by plugin '${existingPluginName}'`
      );
    }

    // Register the plugin
    this.plugins.set(plugin.meta.name, plugin);
    this.commandNameIndex.set(plugin.meta.commandName, plugin.meta.name);
  }

  /**
   * Get a plugin by name
   *
   * @param name Plugin name
   * @returns Plugin instance
   * @throws Error if plugin not found
   */
  get(name: string): Plugin {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found in registry`);
    }
    return plugin;
  }

  /**
   * Get plugin by command name
   *
   * @param commandName CLI command name
   * @returns Plugin instance or undefined if not found
   */
  getByCommandName(commandName: string): Plugin | undefined {
    const pluginName = this.commandNameIndex.get(commandName);
    return pluginName ? this.plugins.get(pluginName) : undefined;
  }

  /**
   * Get all registered plugins
   *
   * @returns Array of all plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is registered
   *
   * @param name Plugin name
   * @returns True if plugin exists
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get enabled plugins based on configuration
   *
   * Filters plugins that are explicitly disabled in the config
   *
   * @param config Core configuration
   * @returns Array of enabled plugins
   */
  getEnabled(config: CoreConfig): Plugin[] {
    return Array.from(this.plugins.values()).filter(
      plugin => config.plugins[plugin.meta.name]?.enabled !== false
    );
  }

  /**
   * Get the number of registered plugins
   *
   * @returns Number of plugins in the registry
   */
  count(): number {
    return this.plugins.size;
  }

  /**
   * Clear all plugins from the registry
   *
   * Useful for testing or re-initialization
   */
  clear(): void {
    this.plugins.clear();
    this.commandNameIndex.clear();
  }

  /**
   * Validate a plugin
   *
   * Ensures the plugin has all required fields and valid values
   *
   * @param plugin Plugin to validate
   * @throws Error if validation fails
   */
  private validatePlugin(plugin: Plugin): void {
    // Validate meta
    if (!plugin.meta) {
      throw new Error('Plugin must have metadata');
    }

    if (!plugin.meta.name || typeof plugin.meta.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }

    if (!plugin.meta.commandName || typeof plugin.meta.commandName !== 'string') {
      throw new Error(`Plugin '${plugin.meta.name}' must have a valid commandName`);
    }

    if (!plugin.meta.version || typeof plugin.meta.version !== 'string') {
      throw new Error(`Plugin '${plugin.meta.name}' must have a valid version`);
    }

    if (!plugin.meta.description || typeof plugin.meta.description !== 'string') {
      throw new Error(`Plugin '${plugin.meta.name}' must have a description`);
    }

    // Validate dependencies (if present)
    if (plugin.meta.dependencies) {
      if (!Array.isArray(plugin.meta.dependencies)) {
        throw new Error(
          `Plugin '${plugin.meta.name}' dependencies must be an array`
        );
      }

      for (const dep of plugin.meta.dependencies) {
        if (typeof dep !== 'string') {
          throw new Error(
            `Plugin '${plugin.meta.name}' dependency names must be strings`
          );
        }
      }
    }

    // Validate configuration (if present)
    if (plugin.configuration) {
      if (typeof plugin.configuration.needsConfiguration !== 'boolean') {
        throw new Error(
          `Plugin '${plugin.meta.name}' configuration.needsConfiguration must be a boolean`
        );
      }

      if (typeof plugin.configuration.configure !== 'function') {
        throw new Error(
          `Plugin '${plugin.meta.name}' configuration.configure must be a function`
        );
      }

      if (typeof plugin.configuration.getSummary !== 'function') {
        throw new Error(
          `Plugin '${plugin.meta.name}' configuration.getSummary must be a function`
        );
      }
    }

    // Validate hooks (if present)
    if (plugin.hooks) {
      const validHooks = ['beforeInit', 'execute', 'afterInit', 'cleanup'];
      for (const [hookName, hookFn] of Object.entries(plugin.hooks)) {
        if (!validHooks.includes(hookName)) {
          throw new Error(
            `Plugin '${plugin.meta.name}' has invalid hook '${hookName}'`
          );
        }

        if (typeof hookFn !== 'function') {
          throw new Error(
            `Plugin '${plugin.meta.name}' hook '${hookName}' must be a function`
          );
        }
      }
    }

    // Validate commands (if present)
    if (plugin.commands) {
      if (!Array.isArray(plugin.commands)) {
        throw new Error(`Plugin '${plugin.meta.name}' commands must be an array`);
      }

      for (const command of plugin.commands) {
        if (!command.name || typeof command.name !== 'string') {
          throw new Error(
            `Plugin '${plugin.meta.name}' command must have a valid name`
          );
        }

        if (!command.description || typeof command.description !== 'string') {
          throw new Error(
            `Plugin '${plugin.meta.name}' command '${command.name}' must have a description`
          );
        }

        if (typeof command.action !== 'function') {
          throw new Error(
            `Plugin '${plugin.meta.name}' command '${command.name}' must have an action function`
          );
        }

        // Validate options (if present)
        if (command.options) {
          if (!Array.isArray(command.options)) {
            throw new Error(
              `Plugin '${plugin.meta.name}' command '${command.name}' options must be an array`
            );
          }

          for (const option of command.options) {
            if (!option.flags || typeof option.flags !== 'string') {
              throw new Error(
                `Plugin '${plugin.meta.name}' command '${command.name}' option must have flags`
              );
            }

            if (!option.description || typeof option.description !== 'string') {
              throw new Error(
                `Plugin '${plugin.meta.name}' command '${command.name}' option must have a description`
              );
            }
          }
        }
      }
    }
  }
}
