/**
 * PMA-GH Plugin (Project Management Assistant - GitHub)
 *
 * Provides GitHub workflow integration:
 * - Fetch and validate GitHub issues
 * - Create PRs linked to issues
 * - Close issues with comments
 *
 * Uses gh CLI for GitHub operations.
 */

import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  PluginContext,
} from '../../plugin/types.js';
import { t } from '../../i18n/index.js';
import type { PmaGhOptions } from './schema.js';

/**
 * Default options
 */
const DEFAULT_OPTIONS: PmaGhOptions = {
  enable_validation: true,
  auto_create_branch: true,
  branch_pattern: '{issue_number}-{short_description}',
};

/**
 * PMA-GH Plugin
 */
export const pmaGhPlugin: Plugin<PmaGhOptions> = {
  meta: {
    name: 'pma-gh',
    commandName: 'pma',
    version: '1.0.0',
    description: 'GitHub project management assistant with issue tracking and PR workflow',
    recommended: false,
    rulesPriority: 70, // 70-79: Workflows
  },

  // Slash commands - CLI automatically writes to .claude/commands/
  slashCommands: [
    {
      name: 'pma-issue',
      description: t().plugins.pmaGh.commands.issueDesc(),
      argumentHint: '<issue-url>',
      templatePath: 'commands/pma/issue.md',
    },
    {
      name: 'pma-pr',
      description: t().plugins.pmaGh.commands.prDesc(),
      templatePath: 'commands/pma/pr.md',
    },
    {
      name: 'pma-close',
      description: t().plugins.pmaGh.commands.closeDesc(),
      templatePath: 'commands/pma/close.md',
    },
  ],

  // Skills - CLI automatically writes to .claude/skills/<name>/SKILL.md
  skills: [
    {
      name: 'gh-issue',
      description: 'Fetch and validate GitHub issues using gh CLI',
      version: '1.1.0',
      templatePath: 'skills/gh-issue.md',
    },
  ],

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig<PmaGhOptions>> {
      const { ui, logger } = context;
      const L = t();

      logger.info('\n' + L.plugins.pmaGh.configTitle());

      // Enable validation?
      const enableValidation = await ui.confirm(
        L.plugins.pmaGh.enableValidation(),
        true
      );

      // Auto-create branch?
      const autoCreateBranch = await ui.confirm(
        L.plugins.pmaGh.autoCreateBranch(),
        true
      );

      // Branch pattern
      let branchPattern = DEFAULT_OPTIONS.branch_pattern;
      if (autoCreateBranch) {
        branchPattern = await ui.input(
          L.plugins.pmaGh.branchPattern(),
          DEFAULT_OPTIONS.branch_pattern
        );
      }

      const options: PmaGhOptions = {
        enable_validation: enableValidation,
        auto_create_branch: autoCreateBranch,
        branch_pattern: branchPattern,
      };

      return {
        enabled: true,
        options,
      };
    },

    getSummary(config: PluginConfig<PmaGhOptions>): string[] {
      const { options } = config;
      const L = t();
      const lines: string[] = [];

      lines.push(options.enable_validation ? L.plugins.pmaGh.validationEnabled() : L.plugins.pmaGh.validationDisabled());
      lines.push(options.auto_create_branch ? L.plugins.pmaGh.autoBranchEnabled() : L.plugins.pmaGh.autoBranchDisabled());

      if (options.auto_create_branch) {
        lines.push(L.plugins.pmaGh.branchPatternLabel({ pattern: options.branch_pattern }));
      }

      return lines;
    },
  },

  hooks: {
    async execute(context: PluginContext): Promise<void> {
      const { logger } = context;
      const L = t();
      logger.info(L.plugins.pmaGh.initialized());
    },
  },

  prompt: {
    placeholder: 'PMA_GH_SECTION',

    generate: (config: PluginConfig<PmaGhOptions>): string => {
      if (!config.enabled) {
        return '';
      }

      const { options } = config;

      const lines = ['## GitHub Workflow (PMA)'];
      lines.push('');
      lines.push('Project management assistant for GitHub-based development workflow.');
      lines.push('');
      lines.push('### Workflow');
      lines.push('');
      lines.push('1. **Start**: `/pma-issue <github-issue-url>`');
      lines.push('   - Fetches issue details via `gh` CLI');

      if (options.enable_validation) {
        lines.push('   - Validates: assigned to you, linked to project');
      }

      lines.push('   - Analyzes requirements and proposes implementation');

      if (options.auto_create_branch) {
        lines.push('   - Creates feature branch automatically');
      }

      lines.push('');
      lines.push('2. **Work**: Implement the issue requirements');
      lines.push('');
      lines.push('3. **Complete**: Choose one:');
      lines.push('   - `/pma-pr` - Create PR to resolve issue');
      lines.push('   - `/pma-close` - Close issue as not planned');
      lines.push('');
      lines.push('### Available Commands');
      lines.push('');
      lines.push('| Command | Description |');
      lines.push('|---------|-------------|');
      lines.push('| `/pma-issue <url>` | Start working on a GitHub issue |');
      lines.push('| `/pma-pr` | Create PR when implementation is complete |');
      lines.push('| `/pma-close` | Close issue as not planned |');
      lines.push('');
      lines.push('### Prerequisites');
      lines.push('');
      lines.push('- `gh` CLI installed and authenticated (`gh auth login`)');
      lines.push('- Access to the GitHub repository');

      return lines.join('\n');
    },
  },

  // No additional data files needed - slash commands and skills are auto-generated
  outputs: {
    generate: async (): Promise<[]> => {
      return [];
    },
  },

  commands: [],
};

export default pmaGhPlugin;
