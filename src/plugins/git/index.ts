/**
 * Git Plugin
 *
 * Manages Git operations including auto-commit and remote sync.
 * This is the first plugin to implement because its goals are very clear.
 */

import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  PluginContext,
  FileOutput,
} from '../../plugin/types.js';
import { formatPluginConfigAsToon } from '../../utils/toon-utils.js';
import { t } from '../../i18n/index.js';
import type { GitPluginOptions } from './schema.js';


/**
 * Generate Git rules markdown file
 */
function generateGitRulesMarkdown(options: GitPluginOptions): string {
  const sections: string[] = [];

  sections.push('# Git Operations Guide');
  sections.push('');
  sections.push('This document defines Git rules and workflows for this project.');
  sections.push('');
  sections.push('---');
  sections.push('');

  // Auto-commit section
  sections.push('## Auto-Commit');
  sections.push('');
  if (options.auto_commit) {
    sections.push('**Status**: ✅ ENABLED');
    sections.push('');
    sections.push('Memory system files are automatically committed after initialization.');
    sections.push('');
    sections.push('**Commit Strategy**:');
    if (options.commit_separately) {
      sections.push('- Memory system files (`.agent/` directory) are committed SEPARATELY');
      sections.push('- This keeps memory updates isolated and easier to review');
    } else {
      sections.push('- All changes are committed TOGETHER');
      sections.push('- Single commit includes memory and other modifications');
    }
    sections.push('');
    sections.push('**Commit Message Format**:');
    sections.push('```');
    sections.push('chore: update memory system (config, prompts, memory)');
    sections.push('');
    sections.push('Update memory system configuration and files.');
    sections.push('');
    sections.push('Date: YYYY-MM-DD');
    sections.push('Files updated: N');
    sections.push('');
    sections.push('Auto-generated commit by claude-memory-init.');
    sections.push('```');
  } else {
    sections.push('**Status**: ❌ DISABLED');
    sections.push('');
    sections.push('Memory system files are NOT automatically committed.');
    sections.push('You must commit changes manually using standard git commands.');
  }

  sections.push('');
  sections.push('---');
  sections.push('');

  // Remote sync section
  sections.push('## Remote Sync');
  sections.push('');
  if (options.remote_sync.enabled) {
    sections.push('**Status**: ✅ ENABLED');
    sections.push('');
    sections.push(`**Repository**: \`${options.remote_sync.remote_url}\``);
    sections.push('');
    sections.push('System memory files can be synced to the remote template repository.');
    sections.push('');
    sections.push('**What Gets Synced**:');
    sections.push('- ✅ `.agent/memory/system/` (team-shared knowledge)');
    sections.push('- ❌ `.agent/memory/knowledge/` (project-specific)');
    sections.push('- ❌ `.agent/memory/history/` (task history)');
    sections.push('');
    sections.push('**Workflow**:');
    sections.push('1. Make changes to system memory files');
    sections.push('2. Run sync command');
    sections.push('3. Changes are filtered to system memory only');
    sections.push('4. Branch created: `sp-{hash}`');
    sections.push('5. Commit with descriptive message');
    sections.push('6. Push to remote');

    if (options.remote_sync.auto_pr) {
      sections.push('7. PR automatically created using GitHub CLI');
      sections.push(`8. PR labeled: \`${options.remote_sync.pr_label}\``);
    } else {
      sections.push('7. Manual PR creation required');
    }
  } else {
    sections.push('**Status**: ❌ DISABLED');
    sections.push('');
    sections.push('Remote sync is not configured.');
    sections.push('System memory files remain local only.');
  }

  sections.push('');
  sections.push('---');
  sections.push('');

  // AI git operations section
  sections.push('## AI Agent Git Rules');
  sections.push('');
  if (options.ai_git_operations) {
    sections.push('**Status**: ✅ AI CAN PERFORM GIT OPERATIONS');
    sections.push('');
    sections.push('The AI agent is permitted to use git with these constraints:');
    sections.push('');
    sections.push('**Allowed**:');
    sections.push('- ✅ `git status` - Check repository status');
    sections.push('- ✅ `git add` - Stage files for commit');
    sections.push('- ✅ `git commit` - Create commits with descriptive messages');
    sections.push('- ✅ `git push` - Push to remote branches');
    sections.push('- ✅ `git diff` - View changes');
    sections.push('');
    sections.push('**Forbidden**:');
    sections.push('- ❌ `git push --force` - Never force push');
    sections.push('- ❌ `git reset --hard` - Never hard reset');
    sections.push('- ❌ `git commit --amend` - Never amend other authors commits');
    sections.push('- ❌ `--no-verify` - Never skip hooks');
    sections.push('- ❌ `--no-gpg-sign` - Never skip signing');
    sections.push('');
    sections.push('**Before amending commits**:');
    sections.push('```bash');
    sections.push("# ALWAYS check authorship first");
    sections.push("git log -1 --format='%an %ae'");
    sections.push('# Only amend if YOU are the author');
    sections.push('```');
  } else {
    sections.push('**Status**: 🚫 AI FORBIDDEN FROM GIT OPERATIONS');
    sections.push('');
    sections.push('The AI agent is ABSOLUTELY PROHIBITED from performing ANY git operations.');
    sections.push('');
    sections.push('**Rationale**: Version control is EXCLUSIVELY the user\'s responsibility.');
    sections.push('');
    sections.push('**When work is complete**:');
    sections.push('1. ✅ Inform user: "Work complete. Files have been created/updated."');
    sections.push('2. ✅ List affected files');
    sections.push('3. ❌ DO NOT offer to commit or suggest git commands');
    sections.push('');
    sections.push('**The user will handle all git operations themselves.**');
  }

  sections.push('');
  sections.push('---');
  sections.push('');

  // Gitignore section
  sections.push('## Git Ignore Patterns');
  sections.push('');
  sections.push('The following patterns are automatically added to `.gitignore`:');
  sections.push('');
  for (const pattern of options.ignore_patterns) {
    sections.push(`- \`${pattern}\``);
  }

  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push('*Configuration stored in `.agent/git/config.toon`*');

  return sections.join('\n');
}

/**
 * Git Plugin
 */
export const gitPlugin: Plugin<GitPluginOptions> = {
  meta: {
    name: 'git',
    commandName: 'git',
    version: '1.0.0',
    description: 'Git operations and auto-commit',
    recommended: false,
    rulesPriority: 35, // 30-39: Feature plugins
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig<GitPluginOptions>> {
      const { ui } = context;
      const L = t();

      // Auto-commit configuration
      const autoCommit = await ui.confirm(
        L.plugins.git.enableAutoCommit(),
        false
      );

      let commitSeparately = true;
      if (autoCommit) {
        commitSeparately = await ui.confirm(
          L.plugins.git.separateCommits(),
          true
        );
      }

      // Remote sync configuration
      const enableSync = await ui.confirm(L.plugins.git.enableRemoteSync(), false);

      let remoteSyncConfig: GitPluginOptions['remote_sync'] = {
        enabled: false,
      };

      if (enableSync) {
        const remoteUrl = await ui.input(
          L.plugins.git.remoteUrl(),
          'git@github.com:dt-activenetwork/mem.git'
        );

        const autoPR = await ui.confirm(L.plugins.git.autoCreatePr(), false);

        remoteSyncConfig = {
          enabled: true,
          remote_url: remoteUrl,
          auto_pr: autoPR,
          pr_label: 'system-prompt-update',
        };
      }

      // AI git operations
      const aiGitOps = await ui.confirm(L.plugins.git.allowAiGit(), autoCommit);

      const options: GitPluginOptions = {
        auto_commit: autoCommit,
        commit_separately: commitSeparately,
        ignore_patterns: ['.agent/temp/', '.agent/.cache/'],
        remote_sync: remoteSyncConfig,
        ai_git_operations: aiGitOps,
      };

      return {
        enabled: true,
        options,
      };
    },

    getSummary(config: PluginConfig<GitPluginOptions>): string[] {
      const { options } = config;
      const L = t();
      const lines: string[] = [];

      if (options.auto_commit) {
        lines.push(L.plugins.git.autoCommitEnabled());
      }

      if (options.remote_sync.enabled) {
        lines.push(L.plugins.git.remoteSyncEnabled());
      }

      lines.push(options.ai_git_operations ? L.plugins.git.aiGitAllowed() : L.plugins.git.aiGitForbidden());

      return lines;
    },
  },

  hooks: {
    async execute(context: PluginContext): Promise<void> {
      const config = context.config.plugins.get('git');
      if (!config) return;
      const L = t();

      const options = config.options as unknown as GitPluginOptions;
      context.shared.set('git_config', options);
      context.logger.info(L.plugins.git.configStored());
    },
  },

  // Rules contribution (new architecture - .claude/rules/)
  rules: {
    baseName: 'git',

    generate: (config: PluginConfig<GitPluginOptions>): string => {
      if (!config.enabled) {
        return '';
      }

      const { options } = config;
      const sections: string[] = ['# Git Operations'];
      sections.push('');

      if (options.auto_commit) {
        sections.push('**Auto-commit**: ENABLED');
        sections.push(
          `**Strategy**: ${options.commit_separately ? 'Separate commits' : 'Combined commits'}`
        );
      } else {
        sections.push('**Auto-commit**: DISABLED');
      }

      sections.push('');

      if (options.ai_git_operations) {
        sections.push('**AI Git Operations**: ALLOWED (with constraints)');
      } else {
        sections.push('**AI Git Operations**: FORBIDDEN');
      }

      sections.push('');
      sections.push('See `.agent/git/rules.md` for detailed guidelines.');
      sections.push('See `.agent/git/config.toon` for configuration.');

      return sections.join('\n');
    },
  },

  // @deprecated - Use rules instead. Will be removed in v3.0.
  prompt: {
    placeholder: 'GIT_SECTION',

    generate: (config: PluginConfig<GitPluginOptions>): string => {
      if (!config.enabled) {
        return '';
      }

      const { options } = config;
      const sections: string[] = ['## Git Operations'];
      sections.push('');

      if (options.auto_commit) {
        sections.push('**Auto-commit**: ENABLED');
        sections.push(
          `**Strategy**: ${options.commit_separately ? 'Separate commits' : 'Combined commits'}`
        );
      } else {
        sections.push('**Auto-commit**: DISABLED');
      }

      sections.push('');

      if (options.ai_git_operations) {
        sections.push('**AI Git Operations**: ALLOWED (with constraints)');
      } else {
        sections.push('**AI Git Operations**: FORBIDDEN');
      }

      sections.push('');
      sections.push('See `.agent/git/rules.md` for complete guidelines.');

      return sections.join('\n');
    },
  },

  outputs: {
    generate: (config: PluginConfig<GitPluginOptions>): FileOutput[] => {
      if (!config.enabled) {
        return [];
      }

      const { options } = config;

      return [
        {
          path: 'git/rules.md',
          content: generateGitRulesMarkdown(options),
          format: 'markdown',
        },
        {
          path: 'git/config.toon',
          content: formatPluginConfigAsToon('git', options as unknown as Record<string, unknown>),
          format: 'toon',
        },
      ];
    },
  },

  commands: [],
};

export default gitPlugin;
