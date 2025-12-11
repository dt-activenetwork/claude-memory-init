/**
 * Interactive Initializer for claude-init v2.0
 *
 * This module implements the main interactive initialization flow with dynamic step calculation.
 * It orchestrates the entire initialization process through a conversational interface.
 */

import * as path from 'path';
import chalk from 'chalk';
import { PluginRegistry } from '../plugin/registry.js';
import { PluginLoader } from '../plugin/loader.js';
import { createPluginContext } from '../plugin/context.js';
import {
  type Plugin,
  type PluginConfig,
  type PluginContext,
  type ConfigurationContext,
  type UIComponents,
  type Logger,
  type FileOutput,
  type PluginDependencyStatus,
} from '../plugin/types.js';
import {
  createDependencyChecker,
  type DependencyChecker,
} from './dependency-checker.js';
import { InitCommandRunner, type InitCommandResult } from './init-command-runner.js';
import { ui } from './ui.js';
import { ProgressIndicator } from '../prompts/components/progress.js';
import * as logger from '../utils/logger.js';
import { t } from '../i18n/index.js';
import {
  isProjectInitialized,
  getMarkerInfo,
  createMarker,
  removeMarker,
  type MarkerInfo,
} from './marker.js';
import { ensureDir } from '../utils/file-ops.js';
import {
  DEFAULT_AGENT_DIR,
  AGENT_SUBDIRS,
  MEMORY_SUBDIRS,
  TASK_SUBDIRS,
  CLAUDE_DIR,
  CLAUDE_SUBDIRS,
  APP_VERSION,
} from '../constants.js';
import { RulesWriter } from './rules-writer.js';
import { ensureUserMemoryStructure } from '../utils/file-ops.js';
import {
  HeavyweightPluginManager,
  separatePluginsByWeight,
  isHeavyweightPlugin,
} from './heavyweight-plugin-manager.js';
import { OutputRouter, DEFAULT_OUTPUT_ROUTES } from './output-router.js';
import { ResourceWriter, DefaultTemplateLoader } from './resource-writer.js';
import { PostInitCollector } from './post-init-collector.js';
import { loadCLIConfig, type CLIConfig } from './plugin-config.js';

/**
 * Project information collected during initialization
 */
export interface ProjectInfo {
  name: string;
  description: string;
}

/**
 * Initialization options
 */
export interface InitializationOptions {
  /** Force re-initialization even if already initialized */
  force?: boolean;
  /** Base directory for Claude files (default: 'claude') */
  baseDir?: string;
}

/**
 * Reinitialize action choices
 */
type ReinitializeAction = 'keep' | 'reconfigure' | 'reinitialize';

/**
 * Interactive Initializer
 *
 * Main class orchestrating the interactive initialization flow with dynamic steps.
 */
export class InteractiveInitializer {
  private pluginRegistry: PluginRegistry;
  private pluginLoader: PluginLoader;
  private logger: Logger;
  private uiComponents: UIComponents;

  /**
   * Create a new InteractiveInitializer
   *
   * @param pluginRegistry Plugin registry containing all available plugins
   */
  constructor(pluginRegistry: PluginRegistry) {
    this.pluginRegistry = pluginRegistry;
    this.pluginLoader = new PluginLoader(pluginRegistry);
    this.logger = logger;
    // Use ui object directly instead of extracting references
    // This allows tests to stub ui methods and have them work in plugins
    this.uiComponents = ui as UIComponents;
  }

  /**
   * Run the interactive initialization flow
   *
   * @param targetDir Target directory for initialization
   * @param options Initialization options
   */
  async run(targetDir: string, options: InitializationOptions = {}): Promise<void> {
    const baseDir = options.baseDir || DEFAULT_AGENT_DIR;

    try {
      console.clear();
      this.printHeader();

      // Check if already initialized
      if (!options.force && (await isProjectInitialized(targetDir, baseDir))) {
        const action = await this.handleAlreadyInitialized(targetDir, baseDir);
        const L = t();

        if (action === 'keep') {
          logger.info('\n' + L.prompts.keepingSetup());
          return;
        } else if (action === 'reconfigure') {
          // TODO: Implement reconfiguration flow (Phase 5)
          logger.warning('\n' + L.prompts.reconfigNotImpl());
          return;
        }
        // action === 'reinitialize' - continue with normal flow
      }

      // Load CLI configuration for plugin visibility
      const cliConfig = await loadCLIConfig(targetDir);

      // Initialize dependency checker and check all plugins
      const depChecker = createDependencyChecker();
      const availablePlugins = this.pluginRegistry.getVisible(cliConfig);
      const depStatuses = await depChecker.checkAllPlugins(availablePlugins);

      // Step 1: Collect project information (fixed step)
      const projectInfo = await this.promptProjectInfo(1);

      // Step 2: Select plugins (fixed step, with dependency status)
      const selectedPlugins = await this.promptPluginSelection(2, undefined, depStatuses, availablePlugins);

      if (selectedPlugins.length === 0) {
        const L = t();
        logger.warning('\n' + L.prompts.noPlugins());
        return;
      }

      // Calculate plugins needing configuration
      const pluginsNeedingConfig = this.getPluginsNeedingConfiguration(selectedPlugins);

      // Calculate total steps dynamically
      const totalSteps = this.calculateTotalSteps(selectedPlugins);

      // Step 3+: Configure plugins (dynamic steps - only for plugins needing config)
      const pluginConfigs = await this.configurePlugins(
        selectedPlugins,
        pluginsNeedingConfig,
        projectInfo,
        3, // Start from step 3
        totalSteps
      );

      // Last step: Show summary and get confirmation
      const confirmed = await this.showSummaryAndConfirm(
        projectInfo,
        selectedPlugins,
        pluginConfigs,
        totalSteps
      );

      if (!confirmed) {
        const L = t();
        logger.info('\n' + L.prompts.cancelled());
        return;
      }

      // Execute initialization (with dependency checker for tool installation)
      await this.executeInitialization(
        targetDir,
        baseDir,
        projectInfo,
        selectedPlugins,
        pluginConfigs,
        depChecker,
        depStatuses
      );

      // Create marker file
      await createMarker(targetDir, baseDir, projectInfo.name);
    } catch (error) {
      logger.error('\n❌ Initialization failed:');
      if (error instanceof Error) {
        logger.error(error.message);
      }
      throw error;
    }
  }

  /**
   * Handle already initialized project
   */
  private async handleAlreadyInitialized(
    targetDir: string,
    baseDir: string
  ): Promise<ReinitializeAction> {
    const L = t();
    const markerInfo = await getMarkerInfo(targetDir, baseDir);

    logger.warning('\n⚠️  ' + L.prompts.alreadyInitialized.warning() + '\n');

    if (markerInfo) {
      if (markerInfo.project_name) {
        logger.info(L.prompts.alreadyInitialized.projectInfo({ name: markerInfo.project_name }));
      }
      logger.info(L.prompts.alreadyInitialized.initializedDate({ date: markerInfo.date }));
      logger.info(L.prompts.alreadyInitialized.versionInfo({ version: markerInfo.version }) + '\n');
    }

    const action = await ui.radioList(
      L.prompts.alreadyInitialized.whatToDo(),
      [
        {
          name: L.prompts.alreadyInitialized.keepOption(),
          value: 'keep',
          description: L.prompts.alreadyInitialized.keepDesc(),
        },
        {
          name: L.prompts.alreadyInitialized.reconfigOption(),
          value: 'reconfigure',
          description: L.prompts.alreadyInitialized.reconfigDesc(),
        },
        {
          name: L.prompts.alreadyInitialized.reinitOption(),
          value: 'reinitialize',
          description: L.prompts.alreadyInitialized.reinitDesc(),
        },
      ],
      'keep'
    );

    if (action === 'reinitialize') {
      const confirmReinit = await ui.confirm(
        L.prompts.alreadyInitialized.confirmOverwrite(),
        false
      );

      if (!confirmReinit) {
        return 'keep';
      }

      // Remove marker file to allow re-initialization
      await removeMarker(targetDir, baseDir);
    }

    return action as ReinitializeAction;
  }

  /**
   * Calculate total number of steps dynamically
   *
   * Formula: 1 (project info) + 1 (plugin selection) + plugins needing config + 1 (summary)
   */
  private calculateTotalSteps(selectedPlugins: string[]): number {
    const pluginsNeedingConfig = this.getPluginsNeedingConfiguration(selectedPlugins);

    return (
      1 + // Project information
      1 + // Plugin selection
      pluginsNeedingConfig.length + // Plugins needing configuration
      1 // Summary and confirmation
    );
  }

  /**
   * Get list of plugins that need configuration
   */
  private getPluginsNeedingConfiguration(selectedPlugins: string[]): string[] {
    return selectedPlugins.filter((pluginName) => {
      const plugin = this.pluginRegistry.get(pluginName);
      return plugin?.configuration?.needsConfiguration === true;
    });
  }

  /**
   * Print header banner
   */
  private printHeader(): void {
    console.log(chalk.bold(`
┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - Interactive Setup                        │
└─────────────────────────────────────────────────────────────┘
    `));
  }

  /**
   * Prompt for project information (Step 1)
   */
  private async promptProjectInfo(currentStep: number, totalSteps?: number): Promise<ProjectInfo> {
    const L = t();
    const stepLabel = totalSteps ? `${L.common.step({ current: currentStep, total: totalSteps })}` : `Step ${currentStep}`;
    console.log(chalk.cyan(`📋 ${stepLabel}: ${L.prompts.projectInfo.stepTitle()}`));
    console.log('─'.repeat(60));
    console.log();

    const name = await ui.input(L.prompts.projectInfo.namePrompt(), path.basename(process.cwd()));

    const description = await ui.input(
      L.prompts.projectInfo.descPrompt(),
      L.prompts.projectInfo.descDefault()
    );

    return { name, description };
  }

  /**
   * Prompt for plugin selection (Step 2)
   *
   * Includes conflict detection - when selecting a plugin, conflicting plugins
   * are automatically deselected with a warning shown to the user.
   *
   * @param currentStep Current step number
   * @param totalSteps Total number of steps (optional)
   * @param depStatuses Map of plugin dependency statuses (optional, for showing install hints)
   * @param visiblePlugins Pre-filtered list of visible plugins (optional, defaults to all plugins)
   */
  private async promptPluginSelection(
    currentStep: number,
    totalSteps?: number,
    depStatuses?: Map<string, PluginDependencyStatus>,
    visiblePlugins?: Plugin[]
  ): Promise<string[]> {
    const L = t();
    const stepLabel = totalSteps ? `${L.common.step({ current: currentStep, total: totalSteps })}` : `Step ${currentStep}`;
    console.log();
    console.log(chalk.cyan(`📦 ${stepLabel}: ${L.prompts.featureSelect.stepTitle()}`));
    console.log('─'.repeat(60));
    console.log();

    const availablePlugins = visiblePlugins ?? this.pluginRegistry.getAll();

    // Build conflict map for quick lookup
    const conflictMap = this.buildConflictMap(availablePlugins);

    // Show heavyweight plugin notice if any exist
    const heavyweightPlugins = availablePlugins.filter(p => p.meta.heavyweight);
    if (heavyweightPlugins.length > 0) {
      console.log(chalk.yellow(L.prompts.featureSelect.heavyweightNote()));
      console.log();
    }

    // Create choices with conflict detection and dependency status
    const choices = availablePlugins.map((plugin) => {
      const isHeavy = plugin.meta.heavyweight;
      const conflictsWith = conflictMap.get(plugin.meta.name) || [];
      const status = depStatuses?.get(plugin.meta.name);

      // Build description with heavyweight indicator, conflicts, and dependency info
      let description = plugin.meta.description;
      if (isHeavy) {
        description = `${L.prompts.featureSelect.heavyweightLabel()} ${description}`;
      }
      if (conflictsWith.length > 0) {
        description += chalk.gray(` ${L.prompts.featureSelect.conflictsWith({ plugins: conflictsWith.join(', ') })}`);
      }

      // Add dependency install hint if there are tools to install
      if (status?.toInstall && status.toInstall.length > 0) {
        const toolNames = status.toInstall.map(d => d.name).join(', ');
        description += chalk.blue(` ${L.dependency.willInstall({ tools: toolNames })}`);
      }

      // Determine if option should be disabled
      let disabled: boolean | string = false;
      if (status && !status.available) {
        disabled = status.disabledReason || L.dependency.missing();
      }

      return {
        name: plugin.meta.name,
        value: plugin.meta.name,
        description,
        checked: plugin.meta.recommended || false,
        disabled,
      };
    });

    const selected = await ui.checkboxList(L.prompts.featureSelect.prompt(), choices);

    // Check for conflicts in selection and resolve them
    const resolvedSelection = this.resolveConflicts(selected, availablePlugins);

    console.log(chalk.gray('\n' + L.prompts.featureSelect.selectedCount({ count: resolvedSelection.length })));

    // Show heavyweight plugin warning if any selected
    const selectedHeavyweight = resolvedSelection.filter(name => {
      const plugin = availablePlugins.find(p => p.meta.name === name);
      return plugin?.meta.heavyweight;
    });

    if (selectedHeavyweight.length > 0) {
      console.log(chalk.yellow('\n' + L.prompts.featureSelect.heavyweightWarning({ plugins: selectedHeavyweight.join(', ') })));
      console.log(chalk.yellow(L.prompts.featureSelect.heavyweightWarningDetail()));
    }

    return resolvedSelection;
  }

  /**
   * Build a map of plugin conflicts
   *
   * @param plugins All available plugins
   * @returns Map of plugin name -> array of conflicting plugin names
   */
  private buildConflictMap(plugins: Plugin[]): Map<string, string[]> {
    const conflictMap = new Map<string, string[]>();

    for (const plugin of plugins) {
      const conflicts = plugin.meta.conflicts || [];
      conflictMap.set(plugin.meta.name, conflicts);
    }

    return conflictMap;
  }

  /**
   * Resolve conflicts in plugin selection
   *
   * When conflicts exist, the first selected plugin wins.
   * Shows warning for removed plugins.
   *
   * @param selected Initially selected plugin names
   * @param plugins All available plugins
   * @returns Resolved selection with conflicts removed
   */
  private resolveConflicts(selected: string[], plugins: Plugin[]): string[] {
    const resolved: string[] = [];
    const removed: string[] = [];

    for (const name of selected) {
      const plugin = plugins.find(p => p.meta.name === name);
      if (!plugin) continue;

      // Check if this plugin conflicts with any already-resolved plugin
      let hasConflict = false;
      for (const resolvedName of resolved) {
        const resolvedPlugin = plugins.find(p => p.meta.name === resolvedName);
        if (resolvedPlugin?.meta.conflicts?.includes(name)) {
          hasConflict = true;
          removed.push(`${name} (conflicts with ${resolvedName})`);
          break;
        }
      }

      // Check if any already-resolved plugin conflicts with this one
      if (!hasConflict && plugin.meta.conflicts) {
        for (const conflictName of plugin.meta.conflicts) {
          if (resolved.includes(conflictName)) {
            hasConflict = true;
            removed.push(`${name} (conflicts with ${conflictName})`);
            break;
          }
        }
      }

      if (!hasConflict) {
        resolved.push(name);
      }
    }

    // Show warning for removed plugins
    if (removed.length > 0) {
      const L = t();
      console.log();
      console.log(chalk.yellow(L.prompts.conflictResolution.title()));
      for (const item of removed) {
        console.log(chalk.yellow(L.prompts.conflictResolution.removed({ item })));
      }
    }

    return resolved;
  }

  /**
   * Configure plugins (Steps 3+, dynamic)
   *
   * Only shows configuration steps for plugins that need configuration.
   * Plugins without configuration are configured silently.
   */
  private async configurePlugins(
    selectedPlugins: string[],
    pluginsNeedingConfig: string[],
    projectInfo: ProjectInfo,
    startStep: number,
    totalSteps: number
  ): Promise<Map<string, PluginConfig>> {
    const configs = new Map<string, PluginConfig>();
    const context: ConfigurationContext = {
      projectName: projectInfo.name,
      projectRoot: process.cwd(),
      otherPlugins: configs,
      ui: this.uiComponents,
      logger: this.logger,
    };

    let currentStep = startStep;

    // Configure all selected plugins
    for (const pluginName of selectedPlugins) {
      const plugin = this.pluginRegistry.get(pluginName);
      const L = t();

      if (!plugin) {
        logger.warning(L.prompts.pluginConfig.notFound({ name: pluginName }));
        continue;
      }

      if (pluginsNeedingConfig.includes(pluginName)) {
        // Plugin needs configuration - show step and prompt
        console.log();
        console.log(chalk.cyan(`📝 ${L.common.step({ current: currentStep, total: totalSteps })}: ${L.prompts.pluginConfig.stepTitle({ plugin: plugin.meta.name })}`));
        console.log('─'.repeat(60));
        console.log();

        if (plugin.configuration?.configure) {
          const config = await plugin.configuration.configure(context);
          configs.set(pluginName, config);
        } else {
          // Fallback - should not happen if needsConfiguration is true
          configs.set(pluginName, { enabled: true, options: {} });
        }

        currentStep++;
      } else {
        // Plugin doesn't need configuration - configure silently
        if (plugin.configuration?.configure) {
          const config = await plugin.configuration.configure(context);
          configs.set(pluginName, config);
        } else {
          // Default configuration
          configs.set(pluginName, { enabled: true, options: {} });
        }
      }
    }

    return configs;
  }

  /**
   * Show summary and get confirmation (Final step)
   */
  private async showSummaryAndConfirm(
    projectInfo: ProjectInfo,
    selectedPlugins: string[],
    pluginConfigs: Map<string, PluginConfig>,
    totalSteps: number
  ): Promise<boolean> {
    const L = t();
    console.log();
    console.log(chalk.cyan(`✨ ${L.common.step({ current: totalSteps, total: totalSteps })}: ${L.prompts.summary.stepTitle()}`));
    console.log('─'.repeat(60));
    console.log();

    console.log(chalk.bold(L.prompts.summary.project()), projectInfo.name);
    console.log(chalk.bold(L.prompts.summary.location()), process.cwd());
    console.log();

    console.log(chalk.bold(L.prompts.summary.features()));
    for (const pluginName of selectedPlugins) {
      const plugin = this.pluginRegistry.get(pluginName);
      if (!plugin) continue;

      const config = pluginConfigs.get(pluginName);
      if (!config) continue;

      console.log(chalk.green(L.prompts.summary.featureItem({ name: plugin.meta.name })));

      // Show plugin-specific summary if available
      if (plugin.configuration?.getSummary) {
        const summary = plugin.configuration.getSummary(config);
        summary.forEach((line) => {
          console.log(chalk.gray(`    ${line}`));
        });
      }
    }

    console.log();

    return await ui.confirm(L.prompts.summary.confirmPrompt(), true);
  }

  /**
   * Execute initialization with plugins
   *
   * Handles both lightweight and heavyweight plugins:
   * 1. Lightweight plugins are executed first (standard lifecycle)
   * 2. Heavyweight plugins are executed last (with file protection/merging)
   *
   * @param targetDir Target directory for initialization
   * @param baseDir Base directory name (e.g., '.agent')
   * @param projectInfo Project information
   * @param selectedPlugins Array of selected plugin names
   * @param pluginConfigs Map of plugin configurations
   * @param depChecker Dependency checker instance (optional, for tool installation)
   * @param depStatuses Map of plugin dependency statuses (optional)
   */
  private async executeInitialization(
    targetDir: string,
    baseDir: string,
    projectInfo: ProjectInfo,
    selectedPlugins: string[],
    pluginConfigs: Map<string, PluginConfig>,
    depChecker?: DependencyChecker,
    depStatuses?: Map<string, PluginDependencyStatus>
  ): Promise<void> {
    const L = t();

    // Load all plugins
    const allPlugins = selectedPlugins
      .map((name) => this.pluginRegistry.get(name))
      .filter((p): p is Plugin => p !== undefined);

    // Separate lightweight and heavyweight plugins
    const { lightweight, heavyweight } = separatePluginsByWeight(allPlugins);

    // Check if there are tools to install
    const toolsToInstall = depChecker && depStatuses
      ? depChecker.getToolsToInstall(allPlugins, depStatuses)
      : [];

    // Check if there are init commands to run (including legacy MCP servers)
    const hasInitCommands = allPlugins.some(p =>
      (p.initCommands && p.initCommands.length > 0) ||
      (p.mcpServers && p.mcpServers.length > 0)
    );

    // Determine progress steps based on what needs to be done
    const progressSteps = [
      'Creating directory structure',
    ];

    if (toolsToInstall.length > 0) {
      progressSteps.push('Installing dependencies');
    }

    progressSteps.push('Initializing lightweight plugins');
    progressSteps.push('Writing plugin outputs');
    progressSteps.push('Writing rules files');

    if (hasInitCommands) {
      progressSteps.push('Running init commands');
    }

    if (heavyweight.length > 0) {
      progressSteps.push('Initializing heavyweight plugins');
    }

    progressSteps.push('Finalizing setup');

    const progress = new ProgressIndicator(progressSteps);

    progress.start();

    try {
      // Step 1: Create base directory structure
      const agentDir = path.join(targetDir, baseDir);
      await ensureDir(agentDir);

      // Core directories
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.SYSTEM));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.GIT));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.SCRIPTS));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.SKILLS));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.PRESETS));

      // Memory directories
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.MEMORY));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.MEMORY, MEMORY_SUBDIRS.KNOWLEDGE));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.MEMORY, MEMORY_SUBDIRS.HISTORY));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.MEMORY, MEMORY_SUBDIRS.INDEX));

      // Task directories
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.TASKS));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.TASKS, TASK_SUBDIRS.WORKFLOWS));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.TASKS, TASK_SUBDIRS.OUTPUT));
      await ensureDir(path.join(agentDir, AGENT_SUBDIRS.TASKS, TASK_SUBDIRS.TMP));

      // Create .claude directories for commands, skills, and rules
      await ensureDir(path.join(targetDir, CLAUDE_DIR));
      await ensureDir(path.join(targetDir, CLAUDE_DIR, CLAUDE_SUBDIRS.COMMANDS));
      await ensureDir(path.join(targetDir, CLAUDE_DIR, CLAUDE_SUBDIRS.SKILLS));
      await ensureDir(path.join(targetDir, CLAUDE_DIR, CLAUDE_SUBDIRS.RULES));

      progress.nextStep();

      // Step 2 (optional): Install dependencies
      const installedDependencies: string[] = [];
      if (toolsToInstall.length > 0 && depChecker) {
        logger.info(L.dependency.checking());

        const installResults = await depChecker.installTools(
          toolsToInstall,
          (tool, status) => {
            if (status === 'installing') {
              logger.info(L.dependency.installing({ name: tool }));
            } else if (status === 'success') {
              logger.success(`  ✓ ${L.dependency.installed({ name: tool })}`);
              installedDependencies.push(tool);
            } else {
              logger.warning(`  ⚠ ${tool} installation failed`);
            }
          }
        );

        // Log any failures
        for (const [name, result] of installResults) {
          if (!result.success && result.error) {
            logger.warning(L.dependency.installFailed({ name, error: result.error }));
          }
        }

        progress.nextStep();
      }

      // Step 3: Initialize lightweight plugins (standard lifecycle)
      // Set loaded plugins (all plugins, so configs are available)
      this.pluginLoader.setLoadedPlugins(allPlugins);

      // Build shared config
      const sharedConfig = {
        core: {
          project: {
            name: projectInfo.name,
            root: targetDir,
          },
          output: {
            base_dir: baseDir,
          },
          plugins: Object.fromEntries(pluginConfigs),
        },
        plugins: pluginConfigs,
      };

      const context = createPluginContext(targetDir, agentDir, sharedConfig);

      // Create resource writer for unified output handling
      const templatesDir = path.join(process.cwd(), 'templates');
      const outputRouter = new OutputRouter(targetDir);
      const templateLoader = new DefaultTemplateLoader(templatesDir);
      const resourceWriter = new ResourceWriter(outputRouter, templateLoader, context.logger);

      // Ensure User Memory structure exists if any plugin uses it
      await ensureUserMemoryStructure();

      // Execute lifecycle hooks for lightweight plugins only
      // (heavyweight plugins will be executed after AGENT.md generation)
      if (lightweight.length > 0) {
        const lightweightLoader = new PluginLoader(this.pluginRegistry);
        lightweightLoader.setLoadedPlugins(lightweight);

        await lightweightLoader.executeHook('beforeInit', context);
        await lightweightLoader.executeHook('execute', context);
        await lightweightLoader.executeHook('afterInit', context);
      }
      progress.nextStep();

      // Step 3: Write all plugin resources (slash commands, skills, data files)
      await resourceWriter.writeAllResources(lightweight, pluginConfigs, context);
      progress.nextStep();

      // Step 4: Write rules files to .claude/rules/
      // All plugins can contribute rules (lightweight now, heavyweight after their init)
      const rulesWriter = new RulesWriter(targetDir, context.logger);

      // Write project info rules file first
      await rulesWriter.writeProjectRules(projectInfo.name, APP_VERSION);

      // Write lightweight plugin rules (heavyweight plugins will write rules after their init)
      await rulesWriter.writeAllPluginRules(lightweight, pluginConfigs, context);
      progress.nextStep();

      // Step 5 (optional): Run init commands (including MCP server registration)
      let initCommandResults: InitCommandResult[] = [];
      if (hasInitCommands) {
        const commandRunner = new InitCommandRunner(context.logger, targetDir, projectInfo.name);
        initCommandResults = await commandRunner.runAllCommands(allPlugins, pluginConfigs);

        // Store init command results in shared context for post-init collector
        context.shared.set('init_command_results', initCommandResults);

        // Also store MCP-specific results for backward compatibility
        const mcpResults = initCommandResults
          .filter(r => r.category === 'mcp')
          .map(r => ({
            name: r.name.replace(/^mcp-/, ''),
            scope: 'project' as const, // Default scope for display purposes
            success: r.success,
          }));
        if (mcpResults.length > 0) {
          context.shared.set('mcp_results', mcpResults);
        }

        progress.nextStep();
      }

      // Store installed dependencies in shared context for post-init collector
      if (installedDependencies.length > 0) {
        context.shared.set('installed_dependencies', installedDependencies);
      }

      // Step 6: Initialize heavyweight plugins (if any)
      if (heavyweight.length > 0) {
        await this.executeHeavyweightPlugins(heavyweight, context, targetDir);
        progress.nextStep();
      }

      // Step 7: Finalize and show enhanced completion message
      progress.nextStep();

      progress.succeed('Initialization complete!');

      // Show enhanced completion message with all collected data
      await this.showEnhancedCompletionMessage(
        targetDir,
        baseDir,
        allPlugins,
        pluginConfigs,
        context
      );
    } catch (error) {
      progress.fail('Initialization failed');
      throw error;
    }
  }

  /**
   * Execute heavyweight plugins
   *
   * Heavyweight plugins have their own initialization commands that may
   * generate files conflicting with our generated files. We handle this by:
   * 1. Backing up protected files
   * 2. Running the plugin's init command
   * 3. Merging the protected files according to plugin's merge strategy
   *
   * @param plugins Heavyweight plugins to execute
   * @param context Plugin context
   * @param targetDir Target directory
   */
  private async executeHeavyweightPlugins(
    plugins: Plugin[],
    context: PluginContext,
    targetDir: string
  ): Promise<void> {
    const heavyManager = new HeavyweightPluginManager(targetDir, this.logger);

    for (const plugin of plugins) {
      const result = await heavyManager.executeHeavyweightPlugin(plugin, context);

      if (!result.success) {
        logger.warning(`Heavyweight plugin '${plugin.meta.name}' had issues:`);
        if (result.error) {
          logger.warning(`  ${result.error}`);
        }
        for (const mergeResult of result.mergeResults) {
          if (!mergeResult.success) {
            logger.warning(`  File merge failed: ${mergeResult.path} - ${mergeResult.error}`);
          }
        }
      }
    }
  }


  /**
   * Show completion message with next steps
   */
  private showCompletionMessage(targetDir: string, baseDir: string): void {
    const L = t();
    console.log();
    console.log(chalk.green.bold('🎉 ' + L.prompts.complete.title()));
    console.log('─'.repeat(60));
    console.log();

    console.log(chalk.bold(L.prompts.complete.filesCreated()));
    console.log(chalk.gray(`  ${CLAUDE_DIR}/${CLAUDE_SUBDIRS.RULES}/  - Rules for Claude behavior`));
    console.log(chalk.gray(`  ${CLAUDE_DIR}/${CLAUDE_SUBDIRS.COMMANDS}/  - Slash commands`));
    console.log(chalk.gray(`  ${baseDir}/  - Project data and configuration`));
    console.log();

    // Show available slash commands
    const allSlashCommands = this.collectAllSlashCommands();

    if (allSlashCommands.length > 0) {
      console.log(chalk.bold(L.prompts.complete.slashCommands()));
      for (const cmd of allSlashCommands) {
        const hint = cmd.argumentHint ? ` ${cmd.argumentHint}` : '';
        console.log(chalk.gray(L.prompts.complete.commandItem({ name: cmd.name, hint, description: cmd.description })));
      }
      console.log();
    }

    console.log(chalk.bold(L.prompts.complete.nextSteps()));
    console.log(chalk.gray(`  1. Review rules in ${CLAUDE_DIR}/${CLAUDE_SUBDIRS.RULES}/`));
    console.log(chalk.gray(L.prompts.complete.step2()));
    if (allSlashCommands.length > 0) {
      console.log(chalk.gray(L.prompts.complete.step3()));
    }
    console.log(chalk.gray(L.prompts.complete.step4()));
    console.log();
  }

  /**
   * Collect all slash commands from enabled plugins
   */
  private collectAllSlashCommands(): Array<{ name: string; description: string; argumentHint?: string }> {
    const commands: Array<{ name: string; description: string; argumentHint?: string }> = [];

    const plugins = this.pluginLoader.getLoadedPlugins();

    for (const plugin of plugins) {
      if (plugin.slashCommands && plugin.slashCommands.length > 0) {
        for (const cmd of plugin.slashCommands) {
          commands.push({
            name: cmd.name,
            description: cmd.description,
            argumentHint: cmd.argumentHint,
          });
        }
      }
    }

    return commands;
  }

  /**
   * Show enhanced completion message with detailed post-init information
   *
   * This method collects and displays comprehensive information about:
   * - Files created
   * - MCP servers registered
   * - Slash commands available
   * - Skills available
   * - Manual steps required
   * - Warnings from plugins
   * - Generic next steps
   *
   * @param targetDir Target directory for initialization
   * @param baseDir Base directory name (e.g., '.agent')
   * @param plugins Array of all selected plugins
   * @param pluginConfigs Map of plugin configurations
   * @param context Plugin context
   */
  private async showEnhancedCompletionMessage(
    targetDir: string,
    baseDir: string,
    plugins: Plugin[],
    pluginConfigs: Map<string, PluginConfig>,
    context: PluginContext
  ): Promise<void> {
    const L = t();
    const collector = new PostInitCollector();
    const data = await collector.collectAll(plugins, pluginConfigs, context);

    console.log();
    console.log(chalk.green.bold('🎉 ' + L.prompts.complete.title()));
    console.log('─'.repeat(60));
    console.log();

    // Section 1: Files Created
    console.log(chalk.bold(L.prompts.complete.filesCreated()));
    console.log(chalk.gray(`  ${CLAUDE_DIR}/${CLAUDE_SUBDIRS.RULES}/  - Rules for Claude behavior`));
    console.log(chalk.gray(`  ${CLAUDE_DIR}/${CLAUDE_SUBDIRS.COMMANDS}/  - Slash commands`));
    console.log(chalk.gray(`  ${baseDir}/  - Project data and configuration`));
    console.log();

    // Section 2: MCP Servers (if any)
    if (data.mcpServers.length > 0) {
      console.log(chalk.bold('MCP Servers Registered:'));
      for (const server of data.mcpServers) {
        const status = server.success ? chalk.green('✓') : chalk.red('✗');
        console.log(chalk.gray(`  ${status} ${server.name} (${server.scope})`));
      }
      console.log();
    }

    // Section 3: Slash Commands
    if (data.slashCommands.length > 0) {
      console.log(chalk.bold(L.prompts.complete.slashCommands()));
      for (const cmd of data.slashCommands) {
        const hint = cmd.argumentHint ? ` ${cmd.argumentHint}` : '';
        console.log(chalk.gray(L.prompts.complete.commandItem({ name: cmd.name, hint, description: cmd.description })));
      }
      console.log();
    }

    // Section 4: Skills Available
    if (data.skills.length > 0) {
      console.log(chalk.bold('Skills Available:'));
      for (const skill of data.skills) {
        console.log(chalk.gray(`  - ${skill.name}: ${skill.description}`));
      }
      console.log();
    }

    // Section 5: Installed Dependencies (if any)
    if (data.installedDependencies.length > 0) {
      console.log(chalk.bold('Dependencies Installed:'));
      for (const dep of data.installedDependencies) {
        console.log(chalk.gray(`  - ${dep}`));
      }
      console.log();
    }

    // Section 6: Plugin Messages (if any)
    if (data.messages.length > 0) {
      console.log(chalk.bold('Plugin Messages:'));
      for (const { pluginName, message } of data.messages) {
        console.log(chalk.gray(`  [${pluginName}] ${message}`));
      }
      console.log();
    }

    // Section 7: Manual Steps Required (yellow, numbered)
    const requiredSteps = data.manualSteps.filter(s => !s.optional);
    if (requiredSteps.length > 0) {
      console.log(chalk.bold.yellow('Manual Steps Required:'));
      for (let i = 0; i < requiredSteps.length; i++) {
        const step = requiredSteps[i];
        console.log(chalk.yellow(`  ${i + 1}. ${step.description}`));
        console.log(chalk.cyan(`     $ ${step.command}`));
      }
      console.log();
    }

    // Section 8: Optional Steps (gray)
    const optionalSteps = data.manualSteps.filter(s => s.optional);
    if (optionalSteps.length > 0) {
      console.log(chalk.bold.gray('Optional Steps:'));
      for (const step of optionalSteps) {
        console.log(chalk.gray(`  - ${step.description}`));
        console.log(chalk.gray(`    $ ${step.command}`));
      }
      console.log();
    }

    // Section 9: Warnings (yellow)
    if (data.warnings.length > 0) {
      console.log(chalk.bold.yellow('Warnings:'));
      for (const { pluginName, warning } of data.warnings) {
        console.log(chalk.yellow(`  [${pluginName}] ${warning}`));
      }
      console.log();
    }

    // Section 10: Next Steps (generic)
    console.log(chalk.bold(L.prompts.complete.nextSteps()));
    console.log(chalk.gray(`  1. Review rules in ${CLAUDE_DIR}/${CLAUDE_SUBDIRS.RULES}/`));
    console.log(chalk.gray(L.prompts.complete.step2()));
    if (data.slashCommands.length > 0) {
      console.log(chalk.gray(L.prompts.complete.step3()));
    }
    console.log(chalk.gray(L.prompts.complete.step4()));
    console.log();
  }
}
