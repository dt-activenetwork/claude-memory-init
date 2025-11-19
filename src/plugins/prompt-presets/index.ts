/**
 * Prompt Presets Plugin (Removed)
 *
 * This plugin has been removed as the preset templates were not needed.
 * Users can create their own prompts in .agent/presets/ as needed.
 */

import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  FileOutput,
} from '../../plugin/types.js';

/**
 * Prompt Presets Plugin Options
 */
export interface PromptPresetsOptions {
  /** Create presets directory */
  create_directory: boolean;
}

/**
 * Prompt Presets Plugin
 */
export const promptPresetsPlugin: Plugin = {
  meta: {
    name: 'prompt-presets',
    commandName: 'presets',
    version: '1.0.0',
    description: 'Custom prompt templates directory',
    recommended: false,
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig> {
      const { ui } = context;

      const createDir = await ui.confirm(
        'Create .agent/presets/ directory for custom prompts?',
        false
      );

      const options: PromptPresetsOptions = {
        create_directory: createDir,
      };

      return {
        enabled: createDir,
        options: options as any,
      };
    },

    getSummary(config: PluginConfig): string[] {
      const options = config.options as unknown as PromptPresetsOptions;

      if (options.create_directory) {
        return ['Custom presets directory: enabled'];
      }

      return ['Presets: disabled'];
    },
  },

  prompt: {
    placeholder: 'PRESETS_SECTION',

    generate: (config: PluginConfig): string => {
      if (!config.enabled) {
        return '';
      }

      return `## Custom Prompts

Directory: \`.agent/presets/\`

Create custom prompt templates as needed.`;
    },
  },

  outputs: {
    generate: (config: PluginConfig): FileOutput[] => {
      if (!config.enabled) {
        return [];
      }

      const readme = `# Custom Prompts

Create custom prompt templates in this directory.

Example: task-specific instructions, domain guidelines, etc.
`;

      return [
        {
          path: 'presets/README.md',
          content: readme,
          format: 'markdown',
        },
      ];
    },
  },

  commands: [],
};

export default promptPresetsPlugin;
