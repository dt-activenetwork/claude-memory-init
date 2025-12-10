/**
 * Built-in Plugins Registry
 *
 * Exports all built-in plugins for registration.
 */

import { corePlugin } from './core/index.js';
import { systemDetectorPlugin } from './system-detector/index.js';
import { gitPlugin } from './git/index.js';
import { promptPresetsPlugin } from './prompt-presets/index.js';
import { memorySystemPlugin } from './memory-system/index.js';
import { taskSystemPlugin } from './task-system/index.js';
import { claudeFlowPlugin } from './claude-flow/index.js';
import { pmaGhPlugin } from './pma-gh/index.js';
import type { Plugin } from '../plugin/types.js';

/**
 * All built-in plugins
 *
 * Order doesn't matter - the PluginLoader handles dependency sorting.
 *
 * Note: Heavyweight plugins (like claude-flow) are executed after all
 * lightweight plugins, with file protection and merging.
 */
export const builtinPlugins: Plugin[] = [
  // Core plugin (always enabled, essential commands)
  corePlugin,

  // Lightweight plugins (executed first)
  systemDetectorPlugin,
  gitPlugin,
  memorySystemPlugin,
  taskSystemPlugin,
  promptPresetsPlugin,
  pmaGhPlugin,

  // Heavyweight plugins (executed after lightweight, with file protection)
  claudeFlowPlugin,
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
