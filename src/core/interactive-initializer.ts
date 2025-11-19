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
} from '../plugin/types.js';
import * as ui from '../prompts/components/index.js';
import { ProgressIndicator } from '../prompts/components/progress.js';
import * as logger from '../utils/logger.js';
import {
  isProjectInitialized,
  getMarkerInfo,
  createMarker,
  removeMarker,
  type MarkerInfo,
} from './marker.js';
import { ensureDir } from '../utils/file-ops.js';

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
    this.uiComponents = {
      checkboxList: ui.checkboxList,
      radioList: ui.radioList,
      confirm: ui.confirm,
      input: ui.input,
    };
  }

  /**
   * Run the interactive initialization flow
   *
   * @param targetDir Target directory for initialization
   * @param options Initialization options
   */
  async run(targetDir: string, options: InitializationOptions = {}): Promise<void> {
    const baseDir = options.baseDir || 'claude';

    try {
      console.clear();
      this.printHeader();

      // Check if already initialized
      if (!options.force && (await isProjectInitialized(targetDir, baseDir))) {
        const action = await this.handleAlreadyInitialized(targetDir, baseDir);

        if (action === 'keep') {
          logger.info('\nKeeping existing setup. No changes made.');
          return;
        } else if (action === 'reconfigure') {
          // TODO: Implement reconfiguration flow (Phase 5)
          logger.warning('\nReconfiguration is not yet implemented.');
          return;
        }
        // action === 'reinitialize' - continue with normal flow
      }

      // Step 1: Collect project information (fixed step)
      const projectInfo = await this.promptProjectInfo(1);

      // Step 2: Select plugins (fixed step)
      const selectedPlugins = await this.promptPluginSelection(2);

      if (selectedPlugins.length === 0) {
        logger.warning('\nNo plugins selected. Initialization cancelled.');
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
        logger.info('\nInitialization cancelled.');
        return;
      }

      // Execute initialization
      await this.executeInitialization(targetDir, baseDir, projectInfo, selectedPlugins, pluginConfigs);

      // Show completion message
      this.showCompletionMessage(targetDir, baseDir);

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
    const markerInfo = await getMarkerInfo(targetDir, baseDir);

    logger.warning('\n⚠️  This project is already initialized!\n');

    if (markerInfo) {
      if (markerInfo.project_name) {
        logger.info(`Project: ${markerInfo.project_name}`);
      }
      logger.info(`Initialized: ${markerInfo.date}`);
      logger.info(`Version: ${markerInfo.version}\n`);
    }

    const action = await ui.radioList(
      'What would you like to do?',
      [
        {
          name: 'Keep existing setup',
          value: 'keep',
          description: '(no changes)',
        },
        {
          name: 'Reconfigure',
          value: 'reconfigure',
          description: '(modify settings)',
        },
        {
          name: 'Reinitialize',
          value: 'reinitialize',
          description: '(start from scratch)',
        },
      ],
      'keep'
    );

    if (action === 'reinitialize') {
      const confirmReinit = await ui.confirm(
        'This will overwrite existing files. Are you sure?',
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
    const stepLabel = totalSteps ? `Step ${currentStep}/${totalSteps}` : `Step ${currentStep}`;
    console.log(chalk.cyan(`📋 ${stepLabel}: Project Information`));
    console.log('─'.repeat(60));
    console.log();

    const name = await ui.input('Project name:', path.basename(process.cwd()));

    const description = await ui.input(
      'Project description:',
      'A project with Claude integration'
    );

    return { name, description };
  }

  /**
   * Prompt for plugin selection (Step 2)
   */
  private async promptPluginSelection(currentStep: number, totalSteps?: number): Promise<string[]> {
    const stepLabel = totalSteps ? `Step ${currentStep}/${totalSteps}` : `Step ${currentStep}`;
    console.log();
    console.log(chalk.cyan(`📦 ${stepLabel}: Select Features`));
    console.log('─'.repeat(60));
    console.log();

    const availablePlugins = this.pluginRegistry.getAll();

    const selected = await ui.checkboxList(
      'What features do you want to enable?',
      availablePlugins.map((plugin) => ({
        name: plugin.meta.name,
        value: plugin.meta.name,
        description: plugin.meta.description,
        checked: plugin.meta.recommended || false,
      }))
    );

    console.log(chalk.gray(`\nSelected: ${selected.length} feature${selected.length !== 1 ? 's' : ''}`));

    return selected;
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

      if (!plugin) {
        logger.warning(`Plugin '${pluginName}' not found. Skipping.`);
        continue;
      }

      if (pluginsNeedingConfig.includes(pluginName)) {
        // Plugin needs configuration - show step and prompt
        console.log();
        console.log(chalk.cyan(`📝 Step ${currentStep}/${totalSteps}: Configure ${plugin.meta.name}`));
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
    console.log();
    console.log(chalk.cyan(`✨ Step ${totalSteps}/${totalSteps}: Summary`));
    console.log('─'.repeat(60));
    console.log();

    console.log(chalk.bold('Project:'), projectInfo.name);
    console.log(chalk.bold('Location:'), process.cwd());
    console.log();

    console.log(chalk.bold('Features:'));
    for (const pluginName of selectedPlugins) {
      const plugin = this.pluginRegistry.get(pluginName);
      if (!plugin) continue;

      const config = pluginConfigs.get(pluginName);
      if (!config) continue;

      console.log(chalk.green(`  ✓ ${plugin.meta.name}`));

      // Show plugin-specific summary if available
      if (plugin.configuration?.getSummary) {
        const summary = plugin.configuration.getSummary(config);
        summary.forEach((line) => {
          console.log(chalk.gray(`    ${line}`));
        });
      }
    }

    console.log();

    return await ui.confirm('Proceed with initialization?', true);
  }

  /**
   * Execute initialization with plugins
   */
  private async executeInitialization(
    targetDir: string,
    baseDir: string,
    projectInfo: ProjectInfo,
    selectedPlugins: string[],
    pluginConfigs: Map<string, PluginConfig>
  ): Promise<void> {
    const progress = new ProgressIndicator([
      'Creating directory structure',
      'Initializing plugins',
      'Executing plugin hooks',
      'Finalizing setup',
    ]);

    progress.start();

    try {
      // Step 1: Create base directory structure
      const claudeDir = path.join(targetDir, baseDir);
      await ensureDir(claudeDir);
      await ensureDir(path.join(claudeDir, 'prompts'));
      await ensureDir(path.join(claudeDir, 'memory'));
      await ensureDir(path.join(claudeDir, 'temp'));
      progress.nextStep();

      // Step 2: Load plugins into loader
      const plugins = selectedPlugins
        .map((name) => this.pluginRegistry.get(name))
        .filter((p): p is Plugin => p !== undefined);

      // Set loaded plugins
      this.pluginLoader.setLoadedPlugins(plugins);

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

      const context = createPluginContext(targetDir, claudeDir, sharedConfig);
      progress.nextStep();

      // Step 3: Execute plugin lifecycle hooks
      await this.pluginLoader.executeHook('beforeInit', context);
      await this.pluginLoader.executeHook('execute', context);
      await this.pluginLoader.executeHook('afterInit', context);
      progress.nextStep();

      // Step 4: Finalize
      // (Cleanup, final checks, etc.)
      progress.nextStep();

      progress.succeed('✨ Initialization complete!');
    } catch (error) {
      progress.fail('❌ Initialization failed');
      throw error;
    }
  }

  /**
   * Show completion message with next steps
   */
  private showCompletionMessage(targetDir: string, baseDir: string): void {
    console.log();
    console.log(chalk.green.bold('🎉 Initialization complete!'));
    console.log('─'.repeat(60));
    console.log();

    console.log(chalk.bold('Files created:'));
    console.log(chalk.gray(`  ✓ ${baseDir}/`));
    console.log(chalk.gray(`  ✓ CLAUDE.md (symlink)`));
    console.log();

    console.log(chalk.bold('Next steps:'));
    console.log(chalk.gray('  • Review CLAUDE.md and customize as needed'));
    console.log(chalk.gray('  • Start chatting with Claude in this project'));
    console.log(chalk.gray(`  • Run 'claude-init --help' for more commands`));
    console.log();
  }
}
