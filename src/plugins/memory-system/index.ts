/**
 * Memory System Plugin
 *
 * Manages the memory system: semantic, episodic, procedural knowledge with TOON indexes.
 */

import * as path from 'path';
import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  PluginContext,
  FileOutput,
} from '../../plugin/types.js';
import { readFile, writeFile, ensureDir, copyFile } from '../../utils/file-ops.js';
import { getCurrentDate } from '../../utils/date-utils.js';

/**
 * Memory System Plugin Options
 */
export interface MemorySystemOptions {
  /** Enabled memory types */
  memory_types: string[]; // ['knowledge', 'history']

  /** Include system knowledge layer */
  include_system: boolean;
}

/**
 * Memory System Plugin
 */
export const memorySystemPlugin: Plugin = {
  meta: {
    name: 'memory-system',
    commandName: 'memory',
    version: '1.0.0',
    description: 'Memory system for knowledge persistence',
    recommended: true,
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig> {
      const { ui } = context;

      // Select memory types
      const memoryTypes = await ui.checkboxList(
        'Which memory types do you want to enable?',
        [
          {
            name: 'Knowledge',
            value: 'knowledge',
            description: 'Stable architectural knowledge',
            checked: true,
          },
          {
            name: 'History',
            value: 'history',
            description: 'Task history records',
            checked: true,
          },
        ]
      );

      // Ask about system knowledge layer
      const includeSystem = await ui.confirm(
        'Include system knowledge layer (universal tools, standards)?',
        false
      );

      const options: MemorySystemOptions = {
        memory_types: memoryTypes,
        include_system: includeSystem,
      };

      return {
        enabled: memoryTypes.length > 0,
        options: options as any,
      };
    },

    getSummary(config: PluginConfig): string[] {
      const options = config.options as unknown as MemorySystemOptions;
      const lines: string[] = [];

      lines.push(`Memory types: ${options.memory_types.join(', ')}`);

      if (options.include_system) {
        lines.push('System knowledge: included');
      }

      return lines;
    },
  },

  hooks: {
    async execute(context: PluginContext): Promise<void> {
      const config = context.config.plugins.get('memory-system');
      if (!config) return;

      // Store memory config in shared context
      context.shared.set('memory_config', config.options);
      context.logger.info('Memory system initialized');
    },
  },

  prompt: {
    placeholder: 'MEMORY_SECTION',

    generate: (config: PluginConfig): string => {
      if (!config.enabled) {
        return '';
      }

      return `## Memory System

This project uses a memory system in \`.agent/memory/\`.

**CRITICAL**: Use indexes, not find/grep. Read \`.agent/memory/index/tags.toon\` and \`topics.toon\`, then read notes by ID.

See \`.agent/memory/workflow.md\` for complete workflow.`;
    },
  },

  outputs: {
    generate: async (config: PluginConfig, context: PluginContext): Promise<FileOutput[]> => {
      if (!config.enabled) {
        return [];
      }

      const options = config.options as unknown as MemorySystemOptions;
      const outputs: FileOutput[] = [];

      // 1. workflow.md
      const workflowTemplate = await readFile(
        path.join(process.cwd(), 'templates/memory-workflow.md')
      );
      outputs.push({
        path: 'memory/workflow.md',
        content: workflowTemplate,
        format: 'markdown',
      });

      // 2. tags.toon (empty template)
      const tagsTemplate = await readFile(
        path.join(process.cwd(), 'templates/tags.toon.template')
      );
      const tagsContent = tagsTemplate.replace('{{CURRENT_DATE}}', new Date().toISOString());
      outputs.push({
        path: 'memory/index/tags.toon',
        content: tagsContent,
        format: 'toon',
      });

      // 3. topics.toon (empty template)
      const topicsTemplate = await readFile(
        path.join(process.cwd(), 'templates/topics.toon.template')
      );
      const topicsContent = topicsTemplate.replace('{{CURRENT_DATE}}', new Date().toISOString());
      outputs.push({
        path: 'memory/index/topics.toon',
        content: topicsContent,
        format: 'toon',
      });

      // 4. README files for each memory type
      for (const type of options.memory_types) {
        const readmeContent = generateMemoryTypeReadme(type);
        outputs.push({
          path: `memory/${type}/README.md`,
          content: readmeContent,
          format: 'markdown',
        });
      }

      // 5. System knowledge (if included)
      if (options.include_system) {
        const systemReadme = `# System Knowledge

Universal, project-agnostic knowledge (tools, standards).

To be managed separately (future: Skills system).
`;
        outputs.push({
          path: 'memory/system/README.md',
          content: systemReadme,
          format: 'markdown',
        });
      }

      return outputs;
    },
  },

  commands: [],
};

/**
 * Generate README for memory type
 */
function generateMemoryTypeReadme(type: string): string {
  const descriptions: Record<string, { purpose: string; format: string; example: string }> = {
    knowledge: {
      purpose: 'Stable architectural knowledge and design facts',
      format: 'know-NNN-descriptive-name.md',
      example: 'know-001-authentication-architecture.md',
    },
    history: {
      purpose: 'Task history and session records',
      format: 'hist-NNN-descriptive-name.md',
      example: 'hist-001-initial-analysis-session.md',
    },
  };

  const desc = descriptions[type];
  if (!desc) {
    return `# ${type.charAt(0).toUpperCase() + type.slice(1)}\n\nMemory type: ${type}\n`;
  }

  return `# ${type.charAt(0).toUpperCase() + type.slice(1)}

Purpose: ${desc.purpose}

File format: ${desc.format}
Example: ${desc.example}

Create notes as discoveries are made.
Update indexes (tags.toon, topics.toon) after creating notes.
`;
}

export default memorySystemPlugin;
