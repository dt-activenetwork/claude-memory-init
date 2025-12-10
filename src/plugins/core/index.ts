/**
 * Core Plugin
 *
 * Provides essential commands that are always available regardless of
 * other plugin selections. These are fundamental utility commands.
 */

import type {
  Plugin,
  PluginConfig,
} from '../../plugin/types.js';

/**
 * Core Plugin
 *
 * This plugin is always enabled and provides essential commands.
 */
export const corePlugin: Plugin = {
  meta: {
    name: 'core',
    commandName: 'core',
    version: '1.0.0',
    description: 'Essential commands (always enabled)',
    recommended: true,
  },

  // Core slash commands - always available
  slashCommands: [
    {
      name: 'session-init',
      description: 'Initialize session by reading project configuration',
      templatePath: 'commands/core/session-init.md',
    },
  ],

  // No configuration needed - always enabled with defaults
  configuration: {
    needsConfiguration: false,

    configure: (): PluginConfig => ({
      enabled: true,
      options: {},
    }),

    getSummary: (): string[] => ['Core commands enabled'],
  },

  // No prompt contribution - this is a utility plugin
  prompt: {
    placeholder: 'CORE_SECTION',
    generate: (): string => '',
  },

  // No outputs
  outputs: {
    generate: async (): Promise<[]> => [],
  },

  commands: [],
};

export default corePlugin;
