/**
 * Plugin System
 *
 * Main exports for the plugin system
 */

export * from './types.js';
export { PluginRegistry } from './registry.js';
export { PluginLoader } from './loader.js';
export { createPluginContext, createMockPluginContext } from './context.js';

// Re-export heavyweight plugin types explicitly for convenience
export type {
  MergeStrategy,
  ProtectedFile,
  HeavyweightPluginConfig,
  FileMergeResult,
  HeavyweightExecutionResult,
  Skill,
} from './types.js';
