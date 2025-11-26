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
  SlashCommand,
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

  slashCommands: [
    {
      name: 'task-create',
      description: 'Create task with dedicated prompt',
      argumentHint: '[task-name]',
      templateFile: 'task/create.md',
    },
    {
      name: 'task-start',
      description: 'Start executing a task',
      argumentHint: '[task-id]',
      templateFile: 'task/start.md',
    },
    {
      name: 'task-pause',
      description: 'Pause current task (save state)',
      templateFile: 'task/pause.md',
    },
    {
      name: 'task-resume',
      description: 'Resume a paused task',
      argumentHint: '[task-id]',
      templateFile: 'task/resume.md',
    },
    {
      name: 'task-status',
      description: 'Show current task state',
      templateFile: 'task/status.md',
    },
    {
      name: 'task-list',
      description: 'List all tasks',
      argumentHint: '[filter]',
      templateFile: 'task/list.md',
    },
    {
      name: 'task-incomplete',
      description: 'List unfinished tasks',
      templateFile: 'task/incomplete.md',
    },
    {
      name: 'task-complete',
      description: 'Mark task as complete',
      templateFile: 'task/complete.md',
    },
  ],

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
      lines.push('Two-phase task management: Define → Execute (with session support)');
      lines.push('');

      lines.push('### Workflow');
      lines.push('');
      lines.push('**Phase 1 - Define Task**:');
      lines.push('1. `/task-create <name>` - Create task with dedicated prompt');
      lines.push('2. Review/edit the task prompt');
      lines.push('');
      lines.push('**Phase 2 - Execute Task** (may span multiple sessions):');
      lines.push('1. `/task-start <task-id>` - Begin execution');
      lines.push('2. Work on task...');
      lines.push('3. `/task-pause` - Save state (end of session)');
      lines.push('4. `/task-resume <task-id>` - Continue in new session');
      lines.push('5. Repeat steps 2-4 as needed');
      lines.push('6. `/task-complete` - Mark done');
      lines.push('');

      lines.push('### Available Commands');
      lines.push('');
      lines.push('**Lifecycle**:');
      lines.push('- `/task-create <name>` - Create task + write prompt');
      lines.push('- `/task-start <id>` - Start executing task');
      lines.push('- `/task-pause` - Pause current task');
      lines.push('- `/task-resume [id]` - Resume paused task');
      lines.push('- `/task-complete` - Mark task done');
      lines.push('');
      lines.push('**Query**:');
      lines.push('- `/task-status` - Current task state');
      lines.push('- `/task-list [filter]` - All tasks (active/paused/completed)');
      lines.push('- `/task-incomplete` - Unfinished tasks');
      lines.push('');

      lines.push('### Key Principles');
      lines.push('');
      lines.push('- ✅ **Define before execute**: Write prompt first');
      lines.push('- ✅ **One task at a time**: Focus matters');
      lines.push('- ✅ **Pause between sessions**: Save context');
      lines.push('- ✅ **Resume with full context**: No information loss');
      lines.push('- ❌ **Don\'t skip prompt**: It guides execution');
      lines.push('');

      lines.push('Each task has:');
      lines.push('- Dedicated prompt: `.agent/tasks/prompts/task-NNN-name.md`');
      lines.push('- State file: `.agent/tasks/states/task-NNN.toon`');
      lines.push('- Session history: Multiple sessions in state');
      lines.push('');

      lines.push('Commands handle lifecycle. Prompts define requirements.');

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

      // 5. Slash commands for task operations
      const taskCommands = ['create', 'start', 'pause', 'resume', 'status', 'list', 'incomplete', 'complete'];

      for (const cmd of taskCommands) {
        const cmdPath = path.join(process.cwd(), `templates/commands/task/${cmd}.md`);
        try {
          const cmdContent = await readFile(cmdPath);
          outputs.push({
            path: `commands/task-${cmd}.md`,
            content: cmdContent,
            format: 'markdown',
          });
        } catch (err) {
          // Command template not found, skip
        }
      }

      // 6. Create directories for task structure
      outputs.push({
        path: 'tasks/prompts/README.md',
        content: `# Task Prompts

Each task has a dedicated prompt file defining its requirements.

File format: task-NNN-descriptive-name.md

Created by: /task-create <name>
`,
        format: 'markdown',
      });

      outputs.push({
        path: 'tasks/states/README.md',
        content: `# Task States

TOON files tracking task status, progress, and session history.

File format: task-NNN.toon

Updated by: /task-start, /task-pause, /task-resume, /task-complete
`,
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
