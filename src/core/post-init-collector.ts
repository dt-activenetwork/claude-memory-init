/**
 * Post-Init Collector
 *
 * Collects and aggregates post-initialization data from plugins,
 * including manual steps, messages, warnings, skills, and slash commands.
 *
 * This module is responsible for gathering all information needed
 * to display a comprehensive completion message after initialization.
 */

import type {
  Plugin,
  PluginConfig,
  PluginContext,
  ManualStep,
  PostInitContribution,
  Skill,
  SlashCommand,
} from '../plugin/types.js';
import type { InitCommandResult } from './init-command-runner.js';

/**
 * Aggregated post-initialization data from all plugins
 *
 * Contains all information needed to display the completion message.
 */
export interface AggregatedPostInitData {
  /** Manual steps requiring user action */
  manualSteps: ManualStep[];

  /** Informational messages from plugins */
  messages: Array<{ pluginName: string; message: string }>;

  /** Warning messages from plugins */
  warnings: Array<{ pluginName: string; warning: string }>;

  /** Results of init commands, grouped by category */
  initCommandResults: InitCommandResult[];

  /**
   * MCP servers registered during initialization
   * @deprecated Use initCommandResults filtered by category='mcp'
   */
  mcpServers: Array<{ name: string; scope: string; success: boolean }>;

  /** Skills available after initialization */
  skills: Array<{ name: string; description: string }>;

  /** Slash commands available after initialization */
  slashCommands: Array<{ name: string; description: string; argumentHint?: string }>;

  /** Dependencies that were installed during initialization */
  installedDependencies: string[];
}

/**
 * Post-Init Collector
 *
 * Responsible for collecting and aggregating post-initialization data
 * from all enabled plugins.
 */
export class PostInitCollector {
  /**
   * Collect all post-initialization data from plugins
   *
   * @param plugins Array of plugins to collect data from
   * @param configs Map of plugin configurations
   * @param context Plugin context
   * @returns Aggregated post-init data
   */
  async collectAll(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>,
    context: PluginContext
  ): Promise<AggregatedPostInitData> {
    // Collect skills and slash commands from all plugins
    const skills = this.collectSkills(plugins, configs);
    const slashCommands = this.collectSlashCommands(plugins, configs);

    // Generate manual steps for skills (since CLI cannot add them directly)
    const skillInstallSteps = this.generateSkillInstallSteps(skills);

    // Collect contributions from plugins that implement getPostInitContribution
    const contributions = this.collectContributions(plugins, configs, context);

    // Aggregate all data
    return this.aggregate(skills, slashCommands, skillInstallSteps, contributions, context);
  }

  /**
   * Collect skills from all enabled plugins
   *
   * @param plugins Array of plugins
   * @param configs Map of plugin configurations
   * @returns Array of skills with metadata
   */
  private collectSkills(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Array<{ name: string; description: string }> {
    const skills: Array<{ name: string; description: string }> = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.skills?.length) continue;

      for (const skill of plugin.skills) {
        skills.push({
          name: skill.name,
          description: skill.description,
        });
      }
    }

    return skills;
  }

  /**
   * Collect slash commands from all enabled plugins
   *
   * @param plugins Array of plugins
   * @param configs Map of plugin configurations
   * @returns Array of slash commands with metadata
   */
  private collectSlashCommands(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Array<{ name: string; description: string; argumentHint?: string }> {
    const commands: Array<{ name: string; description: string; argumentHint?: string }> = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.slashCommands?.length) continue;

      for (const cmd of plugin.slashCommands) {
        commands.push({
          name: cmd.name,
          description: cmd.description,
          argumentHint: cmd.argumentHint,
        });
      }
    }

    return commands;
  }

  /**
   * Generate manual steps for skill installation
   *
   * Since the CLI cannot directly add skills to Claude Code, we generate
   * manual steps that inform the user where the skill files are located.
   *
   * @param skills Array of skills
   * @returns Array of manual steps for skill awareness
   */
  private generateSkillInstallSteps(
    skills: Array<{ name: string; description: string }>
  ): ManualStep[] {
    if (skills.length === 0) {
      return [];
    }

    // Generate a single step that informs users about available skills
    const skillNames = skills.map(s => s.name).join(', ');
    return [
      {
        description: `Skills available in .claude/skills/: ${skillNames}. Claude will automatically use these when relevant.`,
        command: 'ls .claude/skills/',
        optional: true,
        category: 'skill-install',
      },
    ];
  }

  /**
   * Collect post-init contributions from plugins
   *
   * @param plugins Array of plugins
   * @param configs Map of plugin configurations
   * @param context Plugin context
   * @returns Array of post-init contributions
   */
  private collectContributions(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>,
    context: PluginContext
  ): PostInitContribution[] {
    const contributions: PostInitContribution[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.getPostInitContribution) continue;

      try {
        const contribution = plugin.getPostInitContribution(context, config);
        if (contribution) {
          contributions.push(contribution);
        }
      } catch (error) {
        // Log error but continue collecting from other plugins
        context.logger.warning(
          `Failed to get post-init contribution from ${plugin.meta.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return contributions;
  }

  /**
   * Aggregate all collected data into a single structure
   *
   * @param skills Collected skills
   * @param slashCommands Collected slash commands
   * @param skillInstallSteps Generated skill install steps
   * @param contributions Plugin contributions
   * @param context Plugin context
   * @returns Aggregated post-init data
   */
  private aggregate(
    skills: Array<{ name: string; description: string }>,
    slashCommands: Array<{ name: string; description: string; argumentHint?: string }>,
    skillInstallSteps: ManualStep[],
    contributions: PostInitContribution[],
    context: PluginContext
  ): AggregatedPostInitData {
    // Aggregate manual steps from all contributions plus generated ones
    const manualSteps: ManualStep[] = [...skillInstallSteps];
    for (const contribution of contributions) {
      if (contribution.manualSteps) {
        manualSteps.push(...contribution.manualSteps);
      }
    }

    // Aggregate messages from all contributions
    const messages: Array<{ pluginName: string; message: string }> = [];
    for (const contribution of contributions) {
      if (contribution.messages) {
        for (const message of contribution.messages) {
          messages.push({
            pluginName: contribution.pluginName,
            message,
          });
        }
      }
    }

    // Aggregate warnings from all contributions
    const warnings: Array<{ pluginName: string; warning: string }> = [];
    for (const contribution of contributions) {
      if (contribution.warnings) {
        for (const warning of contribution.warnings) {
          warnings.push({
            pluginName: contribution.pluginName,
            warning,
          });
        }
      }
    }

    // Get init command results from shared context (populated by InitCommandRunner)
    const initCommandResults = (context.shared.get('init_command_results') as InitCommandResult[]) || [];

    // Get MCP servers from shared context (populated by InitCommandRunner for backward compatibility)
    const mcpServers = (context.shared.get('mcp_results') as Array<{ name: string; scope: string; success: boolean }>) || [];

    // Get installed dependencies from shared context (populated by dependency checker if available)
    const installedDependencies = (context.shared.get('installed_dependencies') as string[]) || [];

    return {
      manualSteps,
      messages,
      warnings,
      initCommandResults,
      mcpServers,
      skills,
      slashCommands,
      installedDependencies,
    };
  }
}
