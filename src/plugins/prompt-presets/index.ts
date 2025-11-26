/**
 * Prompt Presets Plugin
 *
 * Two-layer architecture:
 * 1. Base template (single choice): code-review, documentation, etc.
 * 2. Enhancement modules (multi-select): system-info, memory, git, etc.
 *
 * Final preset = Base + Selected enhancements
 */

import * as path from 'path';
import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  PluginContext,
  FileOutput,
} from '../../plugin/types.js';
import { readFile } from '../../utils/file-ops.js';

/**
 * Prompt Presets Plugin Options
 */
export interface PromptPresetsOptions {
  /** Selected base template (single choice) */
  base_template: string;

  /** Selected enhancements (multi-select, 0 to N) */
  enhancements: string[];
}

/**
 * Available base templates
 */
const BASE_TEMPLATES = [
  { name: 'Code Review', value: 'code-review', description: 'Code quality and security review' },
  { name: 'Documentation', value: 'documentation', description: 'Generate and maintain docs' },
  { name: 'Refactoring', value: 'refactoring', description: 'Code improvement and cleanup' },
  { name: 'Testing', value: 'testing', description: 'Test generation and quality' },
  { name: 'Architecture', value: 'architecture', description: 'System design analysis' },
  { name: 'Bug Fixing', value: 'bug-fixing', description: 'Debugging and troubleshooting' },
];

/**
 * Available enhancement modules
 */
const ENHANCEMENTS = [
  { name: 'System Information', value: 'system-information', description: 'OS, Python, Node.js environment' },
  { name: 'Memory Instructions', value: 'memory-instructions', description: 'How to use memory system' },
  { name: 'Full Context Reading', value: 'full-context-reading', description: 'Read files completely, use all available tokens' },
  { name: 'Git Rules', value: 'git-rules', description: 'Git operation guidelines' },
  { name: 'Task Workflow', value: 'task-workflow', description: 'Task management instructions' },
  { name: 'TOON Reference', value: 'toon-reference', description: 'TOON format quick reference' },
];

/**
 * Prompt Presets Plugin
 */
export const promptPresetsPlugin: Plugin = {
  meta: {
    name: 'prompt-presets',
    commandName: 'presets',
    version: '2.0.0',
    description: 'Base prompt templates with optional enhancements',
    recommended: true,
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig> {
      const { ui, logger } = context;

      logger.info('\n[Prompt Presets]');

      // Step 1: Select base template (single choice)
      const baseTemplate = await ui.radioList(
        'Select a base prompt template:',
        BASE_TEMPLATES.map(t => ({
          name: t.name,
          value: t.value,
          description: t.description,
        })),
        'code-review' // Default
      );

      logger.info(`✓ Selected base: ${BASE_TEMPLATES.find(t => t.value === baseTemplate)?.name}\n`);

      // Step 2: Select enhancements (multi-select, 0 to N)
      const enhancements = await ui.checkboxList(
        'Select enhancement modules to include (optional):',
        ENHANCEMENTS.map(e => ({
          name: e.name,
          value: e.value,
          description: e.description,
          checked: e.value === 'system-information' ||
                   e.value === 'memory-instructions' ||
                   e.value === 'full-context-reading', // Default checked
        }))
      );

      if (enhancements.length > 0) {
        logger.info(`✓ Selected enhancements: ${enhancements.join(', ')}\n`);
      } else {
        logger.info('✓ No enhancements selected (minimal preset)\n');
      }

      const options: PromptPresetsOptions = {
        base_template: baseTemplate,
        enhancements: enhancements,
      };

      return {
        enabled: true,
        options: options as any,
      };
    },

    getSummary(config: PluginConfig): string[] {
      const options = config.options as unknown as PromptPresetsOptions;
      const lines: string[] = [];

      const baseName = BASE_TEMPLATES.find(t => t.value === options.base_template)?.name || options.base_template;
      lines.push(`Base: ${baseName}`);

      if (options.enhancements.length > 0) {
        lines.push(`Enhancements (${options.enhancements.length}): ${options.enhancements.join(', ')}`);
      } else {
        lines.push('Enhancements: none (minimal)');
      }

      return lines;
    },
  },

  hooks: {
    async execute(context: PluginContext): Promise<void> {
      const { logger } = context;
      logger.info('Prompt preset will be generated');
    },
  },

  prompt: {
    placeholder: 'PRESETS_SECTION',

    generate: (config: PluginConfig): string => {
      if (!config.enabled) {
        return '';
      }

      const options = config.options as unknown as PromptPresetsOptions;
      const baseName = BASE_TEMPLATES.find(t => t.value === options.base_template)?.name;

      const lines: string[] = [];
      lines.push('## Active Prompt Preset');
      lines.push('');
      lines.push(`**Base Template**: ${baseName}`);
      lines.push(`**Location**: \`.agent/presets/${options.base_template}.md\``);
      lines.push('');

      if (options.enhancements.length > 0) {
        lines.push('**Includes**:');
        for (const enhancement of options.enhancements) {
          const enhName = ENHANCEMENTS.find(e => e.value === enhancement)?.name;
          lines.push(`- ${enhName}`);
        }
        lines.push('');
      }

      lines.push('See the preset file for complete instructions.');

      return lines.join('\n');
    },
  },

  outputs: {
    generate: async (config: PluginConfig, context: PluginContext): Promise<FileOutput[]> => {
      if (!config.enabled) {
        return [];
      }

      const options = config.options as unknown as PromptPresetsOptions;
      const outputs: FileOutput[] = [];

      try {
        // 1. Load base template
        const basePath = path.join(
          process.cwd(),
          'templates/presets/bases',
          `${options.base_template}.md`
        );
        let baseContent = await readFile(basePath);

        // 2. Load and combine enhancements
        let enhancementsContent = '';

        if (options.enhancements.length > 0) {
          const enhancementTexts: string[] = [];

          for (const enhancement of options.enhancements) {
            const enhancementPath = path.join(
              process.cwd(),
              'templates/presets/enhancements',
              `${enhancement}.md`
            );

            try {
              let enhContent = await readFile(enhancementPath);

              // Replace variables in enhancement with actual values
              enhContent = replaceEnhancementVariables(enhContent, context);

              enhancementTexts.push(enhContent);
            } catch (err) {
              console.error(`Warning: Enhancement ${enhancement} not found`);
            }
          }

          // Join with separators
          enhancementsContent = enhancementTexts.join('\n\n---\n\n');
        }

        // 3. Replace {{ENHANCEMENTS}} placeholder
        const finalContent = baseContent.replace('{{ENHANCEMENTS}}', enhancementsContent);

        // 4. Output the assembled preset
        outputs.push({
          path: `presets/${options.base_template}.md`,
          content: finalContent,
          format: 'markdown',
        });

        // 5. Create README
        const readme = `# Prompt Preset

**Base**: ${BASE_TEMPLATES.find(t => t.value === options.base_template)?.name}
**Enhancements**: ${options.enhancements.length > 0 ? options.enhancements.join(', ') : 'none'}

This prompt provides instructions for the selected task type with optional context enhancements.
`;

        outputs.push({
          path: 'presets/README.md',
          content: readme,
          format: 'markdown',
        });

      } catch (error) {
        console.error('Failed to generate preset:', error);
      }

      return outputs;
    },
  },

  commands: [],
};

/**
 * Replace variables in enhancement content with actual values
 */
function replaceEnhancementVariables(content: string, context: PluginContext): string {
  // Get system-detector configuration if available
  const systemDetectorConfig = context.config.plugins.get('system-detector');
  const systemOptions = systemDetectorConfig?.options as any;

  // Get git configuration if available
  const gitConfig = context.config.plugins.get('git');
  const gitOptions = gitConfig?.options as any;

  // Get task-system configuration if available
  const taskConfig = context.config.plugins.get('task-system');
  const taskOptions = taskConfig?.options as any;

  // Build variables map
  const variables: Record<string, string> = {
    // OS variables
    OS_NAME: systemOptions?.os?.name || 'Unknown',
    OS_VERSION: systemOptions?.os?.version || '',
    OS_PACKAGE_MANAGER: systemOptions?.os?.package_manager || '',

    // Python variables
    PYTHON_AVAILABLE: systemOptions?.python ? 'true' : 'false',
    PYTHON_VERSION: systemOptions?.python?.version || '',
    PYTHON_SELECTED_MANAGER: systemOptions?.python?.selected_manager || '',
    PYTHON_OTHER_MANAGERS: systemOptions?.python?.available_managers
      ?.filter((m: string) => m !== systemOptions.python.selected_manager)
      .join(', ') || '',

    // Node.js variables
    NODE_AVAILABLE: systemOptions?.node ? 'true' : 'false',
    NODE_VERSION: systemOptions?.node?.version || '',
    NODE_SELECTED_MANAGER: systemOptions?.node?.selected_manager || '',
    NODE_OTHER_MANAGERS: systemOptions?.node?.available_managers
      ?.filter((m: string) => m !== systemOptions.node.selected_manager)
      .join(', ') || '',

    // Locale variables
    TIMEZONE: systemOptions?.locale?.timezone || '',
    LANGUAGE: systemOptions?.locale?.language || '',

    // Git variables
    GIT_AI_OPERATIONS_ALLOWED: gitOptions?.ai_git_operations ? 'true' : 'false',
    GIT_AUTO_COMMIT: gitOptions?.auto_commit ? 'true' : 'false',
    GIT_COMMIT_SEPARATELY: gitOptions?.commit_separately ? 'true' : 'false',

    // Task variables
    TASK_TRACKING_ENABLED: taskOptions?.enable_tracking ? 'true' : 'false',
    TASK_OUTPUT_ENABLED: taskOptions?.enable_output ? 'true' : 'false',
  };

  // Replace simple variables {{VAR}}
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }

  // Handle conditional blocks {{#if VAR}}...{{/if}}
  result = processConditionals(result, variables);

  // Handle each loops {{#each VAR}}...{{/each}}
  result = processEachLoops(result, {
    GIT_IGNORE_PATTERNS: gitOptions?.ignore_patterns || [],
  });

  return result;
}

/**
 * Process conditional blocks: {{#if VAR}}...{{else}}...{{/if}}
 */
function processConditionals(content: string, variables: Record<string, string>): string {
  let result = content;

  // Pattern: {{#if VAR}}content{{/if}}
  const ifPattern = /\{\{#if ([A-Z_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

  result = result.replace(ifPattern, (match, varName, ifContent) => {
    const value = variables[varName];
    const isTrue = value === 'true' || (value && value !== 'false' && value !== '');

    // Check for {{else}}
    const elseParts = ifContent.split('{{else}}');
    if (elseParts.length === 2) {
      return isTrue ? elseParts[0] : elseParts[1];
    }

    return isTrue ? ifContent : '';
  });

  return result;
}

/**
 * Process each loops: {{#each VAR}}...{{/each}}
 */
function processEachLoops(content: string, arrays: Record<string, any[]>): string {
  let result = content;

  // Pattern: {{#each VAR}}content{{/each}}
  const eachPattern = /\{\{#each ([A-Z_]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  result = result.replace(eachPattern, (match, varName, loopContent) => {
    const array = arrays[varName];
    if (!array || array.length === 0) {
      return '';
    }

    // Replace {{this}} with each item
    const items = array.map(item => {
      return loopContent.replace(/\{\{this\}\}/g, item);
    });

    return items.join('\n');
  });

  return result;
}

export default promptPresetsPlugin;

