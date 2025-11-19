/**
 * Prompt Presets Plugin
 *
 * Provides pre-built prompt templates for common development tasks.
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  PluginContext,
  FileOutput,
} from '../../plugin/types.js';
import { readFile } from '../../utils/file-ops.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Available preset definitions
 */
export const AVAILABLE_PRESETS = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Systematic code review guidelines',
    filename: 'code-review.md',
    recommended: true,
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Technical documentation generation',
    filename: 'documentation.md',
    recommended: true,
  },
  {
    id: 'refactoring',
    name: 'Refactoring',
    description: 'Safe code refactoring guidelines',
    filename: 'refactoring.md',
    recommended: false,
  },
  {
    id: 'testing',
    name: 'Testing',
    description: 'Test generation and quality',
    filename: 'testing.md',
    recommended: false,
  },
  {
    id: 'architecture',
    name: 'Architecture',
    description: 'System architecture analysis',
    filename: 'architecture.md',
    recommended: true,
  },
  {
    id: 'bug-fixing',
    name: 'Bug Fixing',
    description: 'Systematic debugging and fixes',
    filename: 'bug-fixing.md',
    recommended: false,
  },
] as const;

/**
 * Prompt Presets Plugin Options
 */
export interface PromptPresetsOptions {
  /** Selected preset IDs */
  presets: string[];

  /** Allow custom user-created presets */
  allow_custom: boolean;

  /** Custom presets directory (if allowed) */
  custom_dir?: string;
}

/**
 * Prompt Presets Plugin
 */
export const promptPresetsPlugin: Plugin = {
  meta: {
    name: 'prompt-presets',
    commandName: 'presets',
    version: '1.0.0',
    description: 'Pre-built prompt templates for common tasks',
    recommended: true,
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig> {
      const { ui } = context;

      // 1. Select presets
      const selectedPresets = await ui.checkboxList(
        'Which prompt presets would you like to install?',
        AVAILABLE_PRESETS.map((preset) => ({
          name: preset.name,
          value: preset.id,
          description: preset.description,
          checked: preset.recommended,
        }))
      );

      if (selectedPresets.length === 0) {
        context.logger.warning('No presets selected. You can add them later.');
      }

      // 2. Ask about custom presets
      const allowCustom = await ui.confirm('Allow custom prompt templates?', true);

      const options: PromptPresetsOptions = {
        presets: selectedPresets,
        allow_custom: allowCustom,
        custom_dir: allowCustom ? 'custom' : undefined,
      };

      return {
        enabled: selectedPresets.length > 0 || allowCustom,
        options: options as any,
      };
    },

    getSummary(config: PluginConfig): string[] {
      const options = config.options as unknown as PromptPresetsOptions;
      const lines: string[] = [];

      if (options.presets.length > 0) {
        const presetNames = options.presets
          .map((id) => AVAILABLE_PRESETS.find((p) => p.id === id)?.name)
          .filter(Boolean);
        lines.push(`Presets: ${presetNames.join(', ')}`);
      } else {
        lines.push('No presets selected');
      }

      if (options.allow_custom) {
        lines.push('Custom templates: enabled');
      }

      return lines;
    },
  },

  hooks: {
    async execute(context: PluginContext): Promise<void> {
      const config = context.config.plugins.get('prompt-presets');
      if (!config) return;

      context.logger.info('Prompt presets configured');
    },
  },

  prompt: {
    placeholder: 'PRESETS_SECTION',

    generate: (config: PluginConfig): string => {
      if (!config.enabled) {
        return '';
      }

      const options = config.options as unknown as PromptPresetsOptions;

      if (options.presets.length === 0 && !options.allow_custom) {
        return '';
      }

      const sections: string[] = ['## Task Presets'];
      sections.push('');

      if (options.presets.length > 0) {
        sections.push('**Installed Presets**:');
        sections.push('');

        for (const presetId of options.presets) {
          const preset = AVAILABLE_PRESETS.find((p) => p.id === presetId);
          if (preset) {
            sections.push(`- **${preset.name}**: ${preset.description}`);
            sections.push(`  See \`.agent/presets/${preset.filename}\``);
          }
        }

        sections.push('');
        sections.push('**Usage**: Read the preset file when starting the corresponding task.');
      }

      if (options.allow_custom) {
        sections.push('');
        sections.push('**Custom Presets**: You can create custom presets in `.agent/presets/custom/`');
      }

      return sections.join('\n');
    },
  },

  outputs: {
    generate: async (config: PluginConfig, context: PluginContext): Promise<FileOutput[]> => {
      if (!config.enabled) {
        return [];
      }

      const options = config.options as unknown as PromptPresetsOptions;
      const outputs: FileOutput[] = [];

      // Copy selected preset files
      for (const presetId of options.presets) {
        const preset = AVAILABLE_PRESETS.find((p) => p.id === presetId);
        if (!preset) continue;

        // Read preset template from plugin directory
        const presetPath = path.join(__dirname, 'presets', preset.filename);
        const content = await readFile(presetPath);

        outputs.push({
          path: `presets/${preset.filename}`,
          content,
          format: 'markdown',
        });
      }

      // Create custom directory readme if allowed
      if (options.allow_custom) {
        const customReadme = `# Custom Presets

This directory is for your custom prompt templates.

## How to Create Custom Presets

1. Create a new markdown file in this directory
2. Follow the same format as built-in presets:
   - Purpose and use cases
   - Role definition
   - Task instructions
   - Output format
   - Key principles

3. Reference it in your work by reading the file when needed

## Example Structure

\`\`\`markdown
# My Custom Preset

**Purpose**: What this preset does
**Use When**: Specific scenarios

## Instructions
[Your specific instructions]
\`\`\`

Presets are guidelines to help focus on specific tasks while maintaining quality standards.
`;

        outputs.push({
          path: 'presets/custom/README.md',
          content: customReadme,
          format: 'markdown',
        });
      }

      return outputs;
    },
  },

  commands: [],
};

export default promptPresetsPlugin;
