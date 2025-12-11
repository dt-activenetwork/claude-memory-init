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
  SlashCommand,
} from '../../plugin/types.js';
import { readFile, writeFile, ensureDir, copyFile } from '../../utils/file-ops.js';
import { getCurrentDate } from '../../utils/date-utils.js';
import { t } from '../../i18n/index.js';
import type { MemorySystemOptions } from './schema.js';

/**
 * Memory System Plugin
 */
export const memorySystemPlugin: Plugin<MemorySystemOptions> = {
  meta: {
    name: 'memory-system',
    commandName: 'memory',
    version: '1.0.0',
    description: 'Memory system for knowledge persistence',
    recommended: true,
    rulesPriority: 40, // 40-49: Core systems
  },

  slashCommands: [
    {
      name: 'memory-search',
      description: t().plugins.memorySystem.commands.searchDesc(),
      argumentHint: '[tag-name]',
      templatePath: 'commands/memory/search.md',
    },
    {
      name: 'memory-query',
      description: t().plugins.memorySystem.commands.queryDesc(),
      argumentHint: '[topic-path]',
      templatePath: 'commands/memory/query.md',
    },
    {
      name: 'memory-index',
      description: t().plugins.memorySystem.commands.indexDesc(),
      templatePath: 'commands/memory/index.md',
    },
    {
      name: 'memory-recent',
      description: t().plugins.memorySystem.commands.recentDesc(),
      argumentHint: '[count]',
      templatePath: 'commands/memory/recent.md',
    },
  ],

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig<MemorySystemOptions>> {
      const { ui } = context;
      const L = t();

      // Select memory types
      const memoryTypes = await ui.checkboxList(
        L.plugins.memorySystem.selectTypes(),
        [
          {
            name: L.plugins.memorySystem.knowledge(),
            value: 'knowledge',
            description: L.plugins.memorySystem.knowledgeDesc(),
            checked: true,
          },
          {
            name: L.plugins.memorySystem.history(),
            value: 'history',
            description: L.plugins.memorySystem.historyDesc(),
            checked: true,
          },
        ]
      );

      // Ask about system knowledge layer
      const includeSystem = await ui.confirm(
        L.plugins.memorySystem.includeSystem(),
        false
      );

      const options: MemorySystemOptions = {
        memory_types: memoryTypes,
        include_system: includeSystem,
      };

      return {
        enabled: memoryTypes.length > 0,
        options,
      };
    },

    getSummary(config: PluginConfig<MemorySystemOptions>): string[] {
      const { options } = config;
      const L = t();
      const lines: string[] = [];

      lines.push(L.plugins.memorySystem.typesSelected({ types: options.memory_types.join(', ') }));

      if (options.include_system) {
        lines.push(L.plugins.memorySystem.systemIncluded());
      }

      return lines;
    },
  },

  hooks: {
    async execute(context: PluginContext): Promise<void> {
      const config = context.config.plugins.get('memory-system');
      if (!config) return;
      const L = t();

      // Store memory config in shared context
      context.shared.set('memory_config', config.options);
      context.logger.info(L.plugins.memorySystem.initialized());
    },
  },

  // Rules contribution (new architecture - .claude/rules/)
  rules: {
    baseName: 'memory',

    generate: (config: PluginConfig): string => {
      if (!config.enabled) {
        return '';
      }

      return `# Memory System

Memory-driven workflow for efficient knowledge reuse.

## Workflow

**Before work**:
1. Use \`/memory-search <tag>\` or \`/memory-query <topic>\` to find relevant knowledge
2. Read identified notes completely

**During work**:
- Apply existing knowledge
- Don't re-analyze what's documented

**After work**:
1. Create/update memory notes in \`.agent/memory/knowledge/\` or \`.agent/memory/history/\`
2. Update indexes in \`.agent/memory/index/tags.toon\` and \`topics.toon\`

## Available Commands

- \`/memory-search <tag>\` - Find notes by tag
- \`/memory-query <topic>\` - Query notes by topic
- \`/memory-index\` - Show all tags and topics
- \`/memory-recent [N]\` - Show N most recent notes

## Key Principles

- Use commands to query (efficient, structured)
- Read complete note files (don't skip)
- Never use find/grep on memory (use indexes via commands)

Commands contain detailed steps. Just call them when needed.`;
    },
  },

  // @deprecated - Use rules instead. Will be removed in v3.0.
  prompt: {
    placeholder: 'MEMORY_SECTION',

    generate: (config: PluginConfig): string => {
      if (!config.enabled) {
        return '';
      }

      return `## Memory System

Memory-driven workflow for efficient knowledge reuse.

### Workflow

**Before work**:
1. Use \`/memory-search <tag>\` or \`/memory-query <topic>\` to find relevant knowledge
2. Read identified notes completely

**During work**:
- Apply existing knowledge
- Don't re-analyze what's documented

**After work**:
1. Create/update memory notes in \`.agent/memory/knowledge/\` or \`.agent/memory/history/\`
2. Update indexes in \`.agent/memory/index/tags.toon\` and \`topics.toon\`

### Available Commands

- \`/memory-search <tag>\` - Find notes by tag
- \`/memory-query <topic>\` - Query notes by topic
- \`/memory-index\` - Show all tags and topics
- \`/memory-recent [N]\` - Show N most recent notes

### Key Principles

- ✅ Use commands to query (efficient, structured)
- ✅ Read complete note files (don't skip)
- ❌ Never use find/grep on memory (use indexes via commands)

Commands contain detailed steps. Just call them when needed.`;
    },
  },

  outputs: {
    generate: async (config: PluginConfig<MemorySystemOptions>, context: PluginContext): Promise<FileOutput[]> => {
      if (!config.enabled) {
        return [];
      }

      const { options } = config;
      const outputs: FileOutput[] = [];

      // 1. workflow.md
      const workflowTemplate = await readFile(
        path.join(process.cwd(), 'templates/memory/memory-workflow.md')
      );
      outputs.push({
        path: 'memory/workflow.md',
        content: workflowTemplate,
        format: 'markdown',
      });

      // 2. tags.toon (empty template)
      const tagsTemplate = await readFile(
        path.join(process.cwd(), 'templates/memory/tags.toon.template')
      );
      const tagsContent = tagsTemplate.replace('{{CURRENT_DATE}}', new Date().toISOString());
      outputs.push({
        path: 'memory/index/tags.toon',
        content: tagsContent,
        format: 'toon',
      });

      // 3. topics.toon (empty template)
      const topicsTemplate = await readFile(
        path.join(process.cwd(), 'templates/memory/topics.toon.template')
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
