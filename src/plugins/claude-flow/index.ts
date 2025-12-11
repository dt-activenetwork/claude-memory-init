/**
 * Claude Flow Plugin (Heavyweight)
 *
 * Integrates Claude Flow for advanced AI orchestration with multi-agent support.
 * This is a heavyweight plugin that runs its own initialization command
 * and requires file protection/merging.
 *
 * Claude Flow generates ~200 files including:
 * - CLAUDE.md (needs merging with our AGENT.md content)
 * - .claude/settings.json (needs JSON merging)
 * - .claude/agents/, commands/, skills/ (preserved)
 * - .hive-mind/, memory/, .claude-flow/ (preserved)
 *
 * @see https://github.com/ruvnet/claude-flow
 */

import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  PluginContext,
  HeavyweightPluginConfig,
  ProtectedFile,
} from '../../plugin/types.js';
import {
  createMarkdownMerger,
  createJsonMerger,
  createGitignoreMerger,
} from '../../utils/merge-utils.js';
import { t } from '../../i18n/index.js';
import type { ClaudeFlowOptions, ClaudeFlowMode, MCPServer } from './schema.js';

/**
 * Default options
 */
const DEFAULT_OPTIONS: ClaudeFlowOptions = {
  mode: 'standard',
  enableSwarm: true,
  enableHiveMind: true,
  mcpServers: ['claude-flow'],
  autoConfirm: true,
};

/**
 * Build the init command based on options
 */
function buildInitCommand(options: ClaudeFlowOptions): string {
  const parts = ['pnpm', 'dlx', 'claude-flow@alpha', 'init'];

  // Add mode flag if not standard
  if (options.mode !== 'standard') {
    parts.push(`--mode=${options.mode}`);
  }

  // Add --yes flag for auto-confirmation
  if (options.autoConfirm) {
    parts.push('--yes');
  }

  return parts.join(' ');
}

// Create merge functions using utilities
const mergeClaudeMd = createMarkdownMerger({
  theirHeader: '# Claude Flow Configuration',
  headerReplacement: {
    pattern: '# Claude Code Configuration',
    replacement: '## Claude Flow - SPARC Development Environment',
  },
});

const mergeSettingsJson = createJsonMerger(2);

const mergeGitignoreWithHeader = createGitignoreMerger('# Claude Flow generated files');

/**
 * Claude Flow Plugin
 */
export const claudeFlowPlugin: Plugin<ClaudeFlowOptions> = {
  meta: {
    name: 'claude-flow',
    commandName: 'flow',
    version: '1.0.0',
    description: 'Claude Flow integration for AI orchestration with multi-agent support',
    recommended: false,
    heavyweight: true,
    conflicts: ['task-system'], // Claude Flow provides its own task management
    rulesPriority: 85, // 80-89: Heavyweight plugins
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig<ClaudeFlowOptions>> {
      const { ui, logger } = context;
      const L = t();

      // 1. Select initialization mode
      const mode = (await ui.radioList(
        L.plugins.claudeFlow.selectMode(),
        [
          {
            name: L.plugins.claudeFlow.modes.standard.name(),
            value: 'standard',
            description: L.plugins.claudeFlow.modes.standard.desc(),
          },
          {
            name: L.plugins.claudeFlow.modes.sparc.name(),
            value: 'sparc',
            description: L.plugins.claudeFlow.modes.sparc.desc(),
          },
          {
            name: L.plugins.claudeFlow.modes.minimal.name(),
            value: 'minimal',
            description: L.plugins.claudeFlow.modes.minimal.desc(),
          },
          {
            name: L.plugins.claudeFlow.modes.skip.name(),
            value: 'skip',
            description: L.plugins.claudeFlow.modes.skip.desc(),
          },
        ],
        'standard'
      )) as ClaudeFlowMode;

      // If skip, return disabled config
      if (mode === 'skip') {
        return {
          enabled: false,
          options: {
            mode: 'skip',
            enableSwarm: false,
            enableHiveMind: false,
            mcpServers: [],
            autoConfirm: false,
          },
        };
      }

      // 2. Enable swarm mode?
      const enableSwarm = await ui.confirm(
        L.plugins.claudeFlow.enableSwarm(),
        true
      );

      // 3. Enable Hive Mind?
      const enableHiveMind = await ui.confirm(
        L.plugins.claudeFlow.enableHiveMind(),
        true
      );

      // 4. Select MCP servers
      const mcpServers = (await ui.checkboxList(L.plugins.claudeFlow.selectMcp(), [
        {
          name: L.plugins.claudeFlow.mcpServers.claudeFlow.name(),
          value: 'claude-flow',
          description: L.plugins.claudeFlow.mcpServers.claudeFlow.desc(),
          checked: true,
        },
        {
          name: L.plugins.claudeFlow.mcpServers.ruvSwarm.name(),
          value: 'ruv-swarm',
          description: L.plugins.claudeFlow.mcpServers.ruvSwarm.desc(),
          checked: enableSwarm,
        },
        {
          name: L.plugins.claudeFlow.mcpServers.flowNexus.name(),
          value: 'flow-nexus',
          description: L.plugins.claudeFlow.mcpServers.flowNexus.desc(),
          checked: false,
        },
      ])) as MCPServer[];

      return {
        enabled: true,
        options: {
          mode,
          enableSwarm,
          enableHiveMind,
          mcpServers,
          autoConfirm: true,
        },
      };
    },

    getSummary(config: PluginConfig): string[] {
      const L = t();
      if (!config.enabled) {
        return [L.plugins.claudeFlow.skipped()];
      }

      const options = config.options as unknown as ClaudeFlowOptions;
      const lines: string[] = [];

      lines.push(L.plugins.claudeFlow.modeSelected({ mode: options.mode }));

      if (options.enableSwarm) {
        lines.push(L.plugins.claudeFlow.swarmEnabled());
      }

      if (options.enableHiveMind) {
        lines.push(L.plugins.claudeFlow.hiveMindEnabled());
      }

      if (options.mcpServers.length > 0) {
        lines.push(L.plugins.claudeFlow.mcpSelected({ list: options.mcpServers.join(', ') }));
      }

      return lines;
    },
  },

  // Heavyweight plugin configuration
  getHeavyweightConfig: async (context: PluginContext): Promise<HeavyweightPluginConfig> => {
    const config = context.config.plugins.get('claude-flow');

    // If not enabled or skip mode, don't run init command
    if (!config || !config.enabled) {
      return {
        protectedFiles: [],
        initCommand: null,
      };
    }

    const options = config.options as unknown as ClaudeFlowOptions;

    if (options.mode === 'skip') {
      return {
        protectedFiles: [],
        initCommand: null,
      };
    }

    // Define protected files with merge strategies
    const protectedFiles: ProtectedFile[] = [
      // CLAUDE.md - Our content first, then claude-flow's additions
      { path: 'CLAUDE.md', mergeStrategy: 'custom' },

      // Also check for AGENT.md (legacy name)
      { path: 'AGENT.md', mergeStrategy: 'custom' },

      // .gitignore - Append claude-flow entries to existing
      { path: '.gitignore', mergeStrategy: 'append' },

      // .claude/settings.json - Deep merge JSON objects
      { path: '.claude/settings.json', mergeStrategy: 'custom' },
    ];

    return {
      protectedFiles,
      initCommand: buildInitCommand(options),
      timeout: 180000, // 3 minutes (claude-flow init can be slow)
      env: {
        // Ensure non-interactive mode
        CI: 'true',
        FORCE_COLOR: '0',
      },
    };
  },

  // Custom file merge function
  mergeFile: async (
    filePath: string,
    ourContent: string | null,
    theirContent: string,
    context: PluginContext
  ): Promise<string> => {
    // Handle CLAUDE.md / AGENT.md
    if (filePath === 'CLAUDE.md' || filePath === 'AGENT.md') {
      return mergeClaudeMd(ourContent, theirContent);
    }

    // Handle .claude/settings.json
    if (filePath === '.claude/settings.json') {
      return mergeSettingsJson(ourContent, theirContent);
    }

    // Handle .gitignore
    if (filePath === '.gitignore') {
      return mergeGitignoreWithHeader(ourContent, theirContent);
    }

    // Default: append with separator
    if (!ourContent) {
      return theirContent;
    }
    return `${ourContent.trimEnd()}\n\n---\n\n${theirContent.trimStart()}`;
  },

  // Rules contribution (new architecture - .claude/rules/)
  rules: {
    baseName: 'claude-flow',

    generate: (config: PluginConfig<ClaudeFlowOptions>): string => {
      if (!config.enabled) {
        return '';
      }

      const { options } = config;

      if (options.mode === 'skip') {
        return '';
      }

      const sections: string[] = ['# Claude Flow'];
      sections.push('');
      sections.push('This project uses Claude Flow for AI orchestration.');
      sections.push('');
      sections.push(`- **Mode**: ${options.mode}`);

      if (options.enableSwarm) {
        sections.push('- **Swarm Mode**: Enabled (multi-agent coordination)');
      }

      if (options.enableHiveMind) {
        sections.push('- **Hive Mind**: Enabled (collective intelligence)');
      }

      sections.push('');
      sections.push('See `.claude/commands/` for available slash commands.');
      sections.push('See `.claude/agents/` for agent definitions.');

      return sections.join('\n');
    },
  },

  // Gitignore patterns
  gitignore: {
    getPatterns: (config: PluginConfig): string[] => {
      if (!config.enabled) {
        return [];
      }

      // These will be merged with claude-flow's gitignore
      return [
        '.claude/settings.local.json',
        '.hive-mind/',
        '.claude-flow/',
        'memory/',
        '*.db',
        '*.db-journal',
        '*.sqlite',
      ];
    },
    comment: 'Claude Flow generated files',
  },

  // CLI commands (minimal - claude-flow provides its own CLI)
  commands: [
    {
      name: 'status',
      description: t().plugins.claudeFlow.statusDesc(),
      action: async (options, context) => {
        context.logger.info('Claude Flow Status:');
        context.logger.info('  Run: npx claude-flow@alpha status');
      },
    },
  ],
};

export default claudeFlowPlugin;
