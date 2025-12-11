/**
 * Plugin Configuration Module
 *
 * Manages CLI configuration for plugin visibility (enable/disable).
 * Supports both project-level and user-level configuration files.
 */

import * as os from 'os';
import * as path from 'path';
import { fileExists, readJsonFile } from '../utils/file-ops.js';

/**
 * Plugin visibility configuration
 *
 * Controls which plugins are visible during initialization.
 */
export interface PluginVisibilityConfig {
  /**
   * Plugins to hide from selection (blacklist mode)
   *
   * These plugins will not appear in the plugin selection list.
   */
  disabled?: string[];

  /**
   * If specified, only these plugins are shown (whitelist mode)
   *
   * Takes precedence over `disabled`. When specified, only plugins
   * in this list will be visible; all others are hidden.
   */
  enabled?: string[];
}

/**
 * CLI Configuration
 *
 * Top-level configuration for the CLI tool.
 */
export interface CLIConfig {
  /**
   * Plugin visibility settings
   */
  plugins?: PluginVisibilityConfig;
}

/**
 * Empty CLI configuration (all plugins visible)
 */
const EMPTY_CONFIG: CLIConfig = {};

/**
 * Configuration file names to search for (in order of priority)
 */
export const PROJECT_CONFIG_PATHS = [
  '.claude-init.json',
  '.claude-init/config.json',
] as const;

/**
 * User-level configuration directory and file
 */
export const USER_CLI_CONFIG_DIR = '.claude-init';
export const USER_CLI_CONFIG_FILE = 'config.json';

/**
 * Protected plugin names that cannot be disabled
 *
 * The core plugin provides essential functionality and must always be available.
 */
export const PROTECTED_PLUGINS = ['core'] as const;

/**
 * Load CLI configuration
 *
 * Searches for configuration files in the following order:
 * 1. Project-level: .claude-init.json
 * 2. Project-level: .claude-init/config.json
 * 3. User-level: ~/.claude-init/config.json
 *
 * The first found configuration file is used. Project-level takes precedence
 * over user-level.
 *
 * @param projectRoot The project root directory
 * @returns The loaded CLI configuration, or empty config if none found
 */
export async function loadCLIConfig(projectRoot: string): Promise<CLIConfig> {
  // Try project-level configs first
  for (const configPath of PROJECT_CONFIG_PATHS) {
    const fullPath = path.join(projectRoot, configPath);
    const config = await loadConfigFile(fullPath);
    if (config !== null) {
      return config;
    }
  }

  // Try user-level config
  const userConfigPath = path.join(os.homedir(), USER_CLI_CONFIG_DIR, USER_CLI_CONFIG_FILE);
  const userConfig = await loadConfigFile(userConfigPath);
  if (userConfig !== null) {
    return userConfig;
  }

  // No configuration found
  return EMPTY_CONFIG;
}

/**
 * Load a single configuration file
 *
 * @param filePath Absolute path to the configuration file
 * @returns The parsed configuration, or null if file doesn't exist or is invalid
 */
async function loadConfigFile(filePath: string): Promise<CLIConfig | null> {
  try {
    if (!(await fileExists(filePath))) {
      return null;
    }

    const config = await readJsonFile<CLIConfig>(filePath);

    // Validate the configuration structure
    if (!isValidCLIConfig(config)) {
      return null;
    }

    return config;
  } catch {
    // File exists but couldn't be read or parsed
    return null;
  }
}

/**
 * Validate that an object is a valid CLIConfig
 *
 * @param obj The object to validate
 * @returns true if the object is a valid CLIConfig
 */
function isValidCLIConfig(obj: unknown): obj is CLIConfig {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  const config = obj as Record<string, unknown>;

  // Empty config is valid
  if (Object.keys(config).length === 0) {
    return true;
  }

  // If plugins is present, it must be an object
  if ('plugins' in config) {
    if (config.plugins === null || typeof config.plugins !== 'object') {
      return false;
    }

    const plugins = config.plugins as Record<string, unknown>;

    // Validate disabled array
    if ('disabled' in plugins) {
      if (!Array.isArray(plugins.disabled)) {
        return false;
      }
      if (!plugins.disabled.every(item => typeof item === 'string')) {
        return false;
      }
    }

    // Validate enabled array
    if ('enabled' in plugins) {
      if (!Array.isArray(plugins.enabled)) {
        return false;
      }
      if (!plugins.enabled.every(item => typeof item === 'string')) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a plugin should be visible based on configuration
 *
 * Decision logic:
 * 1. Protected plugins (e.g., 'core') are always visible
 * 2. If `enabled` list is specified (whitelist mode):
 *    - Only plugins in the list are visible
 * 3. If `disabled` list is specified (blacklist mode):
 *    - Plugins in the list are hidden
 * 4. Otherwise, the plugin is visible
 *
 * @param pluginName The name of the plugin to check
 * @param config The CLI configuration
 * @returns true if the plugin should be visible
 */
export function isPluginVisible(pluginName: string, config: CLIConfig): boolean {
  // Protected plugins are always visible
  if ((PROTECTED_PLUGINS as readonly string[]).includes(pluginName)) {
    return true;
  }

  const visibility = config.plugins;

  // No visibility config = all plugins visible
  if (!visibility) {
    return true;
  }

  // Whitelist mode: only show plugins in the enabled list
  if (visibility.enabled && visibility.enabled.length > 0) {
    return visibility.enabled.includes(pluginName);
  }

  // Blacklist mode: hide plugins in the disabled list
  if (visibility.disabled && visibility.disabled.length > 0) {
    return !visibility.disabled.includes(pluginName);
  }

  // Default: visible
  return true;
}

/**
 * Filter a list of plugins based on visibility configuration
 *
 * @param pluginNames Array of plugin names to filter
 * @param config The CLI configuration
 * @returns Filtered array of visible plugin names
 */
export function filterVisiblePlugins(pluginNames: string[], config: CLIConfig): string[] {
  return pluginNames.filter(name => isPluginVisible(name, config));
}
