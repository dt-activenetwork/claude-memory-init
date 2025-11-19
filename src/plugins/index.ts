/**
 * Built-in Plugins Registry
 *
 * Exports all built-in plugins for registration.
 */

import { systemDetectorPlugin } from './system-detector/index.js';
import { gitPlugin } from './git/index.js';
import { promptPresetsPlugin } from './prompt-presets/index.js';
import type { Plugin } from '../plugin/types.js';

/**
 * All built-in plugins
 *
 * Order doesn't matter - the PluginLoader handles dependency sorting.
 */
export const builtinPlugins: Plugin[] = [
  systemDetectorPlugin,
  gitPlugin,
  promptPresetsPlugin,
  // TODO: Add memory-system plugin (needs gradual extraction from legacy)
  // memorySystemPlugin,
];

/**
 * Get plugin by name
 */
export function getPluginByName(name: string): Plugin | undefined {
  return builtinPlugins.find((p) => p.meta.name === name);
}

/**
 * Get all plugin names
 */
export function getAllPluginNames(): string[] {
  return builtinPlugins.map((p) => p.meta.name);
}
