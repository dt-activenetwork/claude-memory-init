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
  memory_types: string[]; // ['semantic', 'episodic', 'procedural', 'system']

  /** Copy system tools from mem repository */
  include_system_tools: boolean;
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
            name: 'Semantic',
            value: 'semantic',
            description: 'Stable architectural knowledge',
            checked: true,
          },
          {
            name: 'Episodic',
            value: 'episodic',
            description: 'Task history and sessions',
            checked: true,
          },
          {
            name: 'Procedural',
            value: 'procedural',
            description: 'Reusable workflows',
            checked: true,
          },
          {
            name: 'System',
            value: 'system',
            description: 'System-level knowledge',
            checked: false,
          },
        ]
      );

      // Ask about system tools (for now, keep in memory/system/)
      const includeSystemTools = await ui.confirm(
        'Include system tools (mermaid, markdown, code-reference)?',
        true
      );

      const options: MemorySystemOptions = {
        memory_types: memoryTypes,
        include_system_tools: includeSystemTools,
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

      if (options.include_system_tools) {
        lines.push('System tools: included');
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

This project uses a memory system in \`.agent/memory/\`. See \`.agent/memory/workflow.md\` for usage.`;
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

      // 5. System tools (if included) - keep in memory/system/tools/ for now
      if (options.include_system_tools && options.memory_types.includes('system')) {
        // TODO: Copy from mem repository or embed
        // For now, create placeholder
        const toolsReadme = `# System Tools

Universal tool knowledge (mermaid, markdown, code-reference).

See individual tool files for usage guidelines.
`;
        outputs.push({
          path: 'memory/system/tools/README.md',
          content: toolsReadme,
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
    semantic: {
      purpose: 'Stable architectural knowledge and facts',
      format: 'sem-NNN-descriptive-name.md',
      example: 'sem-001-authentication-architecture.md',
    },
    episodic: {
      purpose: 'Task history and session records',
      format: 'ep-NNN-descriptive-name.md',
      example: 'ep-001-initial-analysis-session.md',
    },
    procedural: {
      purpose: 'Reusable workflows and procedures',
      format: 'proc-descriptive-name.md',
      example: 'proc-code-review-workflow.md',
    },
    system: {
      purpose: 'System-level shared knowledge',
      format: 'sys-descriptive-name.md',
      example: 'sys-mermaid-guidelines.md',
    },
  };

  const desc = descriptions[type];
  if (!desc) {
    return `# ${type.charAt(0).toUpperCase() + type.slice(1)} Memory\n\nMemory type: ${type}\n`;
  }

  return `# ${type.charAt(0).toUpperCase() + type.slice(1)} Memory

Purpose: ${desc.purpose}

File format: ${desc.format}
Example: ${desc.example}

Create notes as discoveries are made during work.
Update indexes (tags.toon, topics.toon) after creating notes.
`;
}

export default memorySystemPlugin;
