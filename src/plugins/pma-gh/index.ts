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
    rulesPriority: 35, // 30-39: Feature plugins
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

  // Rules contribution (new architecture - .claude/rules/)
  rules: {
    baseName: 'pma',

    generate: (config: PluginConfig<PmaGhOptions>): string => {
      if (!config.enabled) {
        return '';
      }

      const { options } = config;
      const sections: string[] = ['# GitHub Workflow (PMA)'];
      sections.push('');
      sections.push('Project management assistant for GitHub-based development workflow.');
      sections.push('');
      sections.push('## Workflow');
      sections.push('');
      sections.push('1. **Start**: `/pma-issue <github-issue-url>`');
      sections.push('   - Fetches issue details via `gh` CLI');

      if (options.enable_validation) {
        sections.push('   - Validates: assigned to you, linked to project');
      }

      sections.push('   - Analyzes requirements and proposes implementation');

      if (options.auto_create_branch) {
        sections.push('   - Creates feature branch automatically');
      }

      sections.push('');
      sections.push('2. **Work**: Implement the issue requirements');
      sections.push('');
      sections.push('3. **Complete**: Choose one:');
      sections.push('   - `/pma-pr` - Create PR to resolve issue');
      sections.push('   - `/pma-close` - Close issue as not planned');
      sections.push('');
      sections.push('## Available Commands');
      sections.push('');
      sections.push('| Command | Description |');
      sections.push('|---------|-------------|');
      sections.push('| `/pma-issue <url>` | Start working on a GitHub issue |');
      sections.push('| `/pma-pr` | Create PR when implementation is complete |');
      sections.push('| `/pma-close` | Close issue as not planned |');
      sections.push('');
      sections.push('## Prerequisites');
      sections.push('');
      sections.push('- `gh` CLI installed and authenticated (`gh auth login`)');
      sections.push('- Access to the GitHub repository');

      return sections.join('\n');
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
