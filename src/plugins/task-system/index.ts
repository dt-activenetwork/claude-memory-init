/**
 * Task System Plugin
 *
 * Manages task workflows, current task state, outputs, and temporary workspace.
 * Separated from Memory System (which manages knowledge).
 */

import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  PluginContext,
  FileOutput,
} from '../../plugin/types.js';
import { readFile } from '../../utils/file-ops.js';
import * as path from 'path';

/**
 * Task System Plugin Options
 */
export interface TaskSystemOptions {
  /** Enable task tracking */
  enable_tracking: boolean;

  /** Enable task output directory */
  enable_output: boolean;
}

/**
 * Task System Plugin
 */
export const taskSystemPlugin: Plugin = {
  meta: {
    name: 'task-system',
    commandName: 'task',
    version: '1.0.0',
    description: 'Task workflows, state tracking, and outputs',
    recommended: true,
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig> {
      const { ui } = context;

      const enableTracking = await ui.confirm(
        'Enable task state tracking (current.toon)?',
        true
      );

      const enableOutput = await ui.confirm(
        'Enable task output directory (.agent/tasks/output/)?',
        true
      );

      const options: TaskSystemOptions = {
        enable_tracking: enableTracking,
        enable_output: enableOutput,
      };

      return {
        enabled: true,
        options: options as any,
      };
    },

    getSummary(config: PluginConfig): string[] {
      const options = config.options as unknown as TaskSystemOptions;
      const lines: string[] = [];

      if (options.enable_tracking) {
        lines.push('Task tracking: enabled');
      }

      if (options.enable_output) {
        lines.push('Output directory: enabled');
      }

      return lines;
    },
  },

  hooks: {
    async execute(context: PluginContext): Promise<void> {
      context.logger.info('Task system initialized');
    },
  },

  prompt: {
    placeholder: 'TASK_SECTION',

    generate: (config: PluginConfig): string => {
      if (!config.enabled) {
        return '';
      }

      const options = config.options as unknown as TaskSystemOptions;

      const lines = ['## Task System'];
      lines.push('');
      lines.push('Task workflows and outputs managed in `.agent/tasks/`.');
      lines.push('');

      if (options.enable_tracking) {
        lines.push('**Current task**: See `.agent/tasks/current.toon` for active task state.');
      }

      if (options.enable_output) {
        lines.push('**Task outputs**: Store in `.agent/tasks/output/`.');
      }

      lines.push('');
      lines.push('**Workflows**: See `.agent/tasks/workflows/` for reusable procedures.');

      return lines.join('\n');
    },
  },

  outputs: {
    generate: async (config: PluginConfig): Promise<FileOutput[]> => {
      if (!config.enabled) {
        return [];
      }

      const options = config.options as unknown as TaskSystemOptions;
      const outputs: FileOutput[] = [];

      // 1. workflows/ README
      const workflowsReadme = `# Task Workflows

Reusable procedures and workflows for common tasks.

File format: workflow-descriptive-name.md
Example: workflow-code-review.md

Create workflows as you establish patterns.
`;
      outputs.push({
        path: 'tasks/workflows/README.md',
        content: workflowsReadme,
        format: 'markdown',
      });

      // 2. current.toon template (if tracking enabled)
      if (options.enable_tracking) {
        const currentTaskTemplate = `# Current Task State
# TOON format

task:
  id: ""
  name: ""
  status: pending
  started_at: ""

# Update this file as task progresses
`;
        outputs.push({
          path: 'tasks/current.toon',
          content: currentTaskTemplate,
          format: 'toon',
        });
      }

      // 3. output/ README (if output enabled)
      if (options.enable_output) {
        const outputReadme = `# Task Outputs

Task outputs and deliverables.

Organization:
- Create subdirectories per task or category
- Name files descriptively
- Link from history notes

Example:
tasks/output/
├── analysis/
│   └── auth-module-analysis.md
└── documentation/
    └── api-reference.md
`;
        outputs.push({
          path: 'tasks/output/README.md',
          content: outputReadme,
          format: 'markdown',
        });
      }

      // 4. tmp/ README
      const tmpReadme = `# Task Temporary Files

Temporary working directory for task execution.

Contents are not committed (see .gitignore).
Use for intermediate files, scratch work, etc.
`;
      outputs.push({
        path: 'tasks/tmp/README.md',
        content: tmpReadme,
        format: 'markdown',
      });

      return outputs;
    },
  },

  gitignore: {
    getPatterns: (config: PluginConfig): string[] => {
      const options = config.options as unknown as TaskSystemOptions;
      return [
        '.agent/tasks/tmp/',
        '.agent/tasks/output/*.tmp',
      ];
    },
    comment: 'Task temporary files and scratch work',
  },

  commands: [],
};

export default taskSystemPlugin;
