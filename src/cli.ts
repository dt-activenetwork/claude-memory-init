/**
 * CLI interface using Commander.js
 */
import { Command } from 'commander';
import * as path from 'path';
import ora from 'ora';
import YAML from 'yaml';
import { loadConfigFromYaml, saveConfigToYaml } from './core/config-loader.js';
import { validateConfig, validatePaths } from './core/validator.js';
import { initialize } from './core/initializer.js';
import { promptProjectInfo, promptLanguageConfig, promptPathsConfig } from './prompts/project-info.js';
import { promptObjectives, promptAssumptions, promptDomainTerms } from './prompts/objectives.js';
import { promptSystemInfo } from './prompts/system-info.js';
import { promptProjectInfoSimple, promptLanguageConfigSimple } from './prompts/simple-prompts.js';
import { ensureDir, fileExists } from './utils/file-ops.js';
import * as logger from './utils/logger.js';
import type { FullConfig } from './types/config.js';

const program = new Command();

/**
 * Initialize from config file
 */
async function initFromConfig(configPath: string, targetDir: string, force: boolean = false): Promise<void> {
  logger.info('🚀 Claude Memory System Initializer');
  logger.blank();

  // 0. Check if already initialized
  const { isProjectInitialized, getMarkerInfo } = await import('./core/marker.js');
  const alreadyInitialized = await isProjectInitialized(targetDir);

  if (alreadyInitialized && !force) {
    const markerInfo = await getMarkerInfo(targetDir);
    logger.warning('⚠️  This project is already initialized!');
    logger.blank();
    if (markerInfo) {
      logger.info(`  Project: ${markerInfo.project_name || 'Unknown'}`);
      logger.info(`  Initialized: ${markerInfo.date}`);
      logger.info(`  Version: ${markerInfo.version}`);
    }
    logger.blank();
    logger.info('Use --force to re-initialize (this will overwrite existing files)');
    logger.info('Or use configuration management commands:');
    logger.info('  claude-memory-init show');
    logger.info('  claude-memory-init add-objective "..."');
    logger.info('  claude-memory-init edit');
    process.exit(0);
  }

  if (force && alreadyInitialized) {
    logger.warning('⚠️  Re-initializing project (--force mode)');
    logger.blank();
  }

  // 1. Load configuration
  const spinner = ora('Loading configuration...').start();
  let config: FullConfig;
  try {
    config = await loadConfigFromYaml(configPath);
    spinner.succeed('Configuration loaded');
  } catch (error) {
    spinner.fail('Failed to load configuration');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // 2. Validate configuration
  spinner.start('Validating configuration...');
  const validation = validateConfig(config);
  if (!validation.valid) {
    spinner.fail('Configuration validation failed');
    validation.errors.forEach(err => logger.error(`  ✗ ${err}`));
    process.exit(1);
  }
  if (validation.warnings.length > 0) {
    spinner.warn('Configuration validated with warnings');
    validation.warnings.forEach(warn => logger.warning(`  ⚠ ${warn}`));
  } else {
    spinner.succeed('Configuration validated');
  }

  // 3. Validate paths
  spinner.start('Validating paths...');
  const pathErrors = await validatePaths(config);
  if (pathErrors.length > 0) {
    spinner.fail('Path validation failed');
    pathErrors.forEach(err => logger.error(`  ✗ ${err}`));
    process.exit(1);
  }
  spinner.succeed('Paths validated');

  // 4. Execute initialization
  spinner.start('Initializing memory system...');
  try {
    await initialize(config, targetDir);
    spinner.succeed('Memory system initialized');
  } catch (error) {
    spinner.fail('Initialization failed');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // 5. Display success message
  logger.blank();
  logger.success('✅ Initialization complete!');
  logger.blank();
  logger.info('Next steps:');
  logger.info('  1. Review the generated CLAUDE.md');
  logger.info('  2. Customize the configuration in config.yaml if needed');
  logger.info('  3. Start using the memory system with Claude');
  logger.blank();
}

/**
 * Interactive mode initialization
 */
async function initInteractive(targetDir: string, force: boolean = false): Promise<void> {
  logger.info('🚀 Claude Memory System Initializer (Interactive Mode)');
  logger.blank();

  // Check if already initialized
  const { isProjectInitialized, getMarkerInfo } = await import('./core/marker.js');
  const alreadyInitialized = await isProjectInitialized(targetDir);

  if (alreadyInitialized && !force) {
    const markerInfo = await getMarkerInfo(targetDir);
    logger.warning('⚠️  This project is already initialized!');
    logger.blank();
    if (markerInfo) {
      logger.info(`  Project: ${markerInfo.project_name || 'Unknown'}`);
      logger.info(`  Initialized: ${markerInfo.date}`);
    }
    logger.blank();
    logger.info('Use --force to re-initialize');
    process.exit(0);
  }

  if (force && alreadyInitialized) {
    logger.warning('⚠️  Re-initializing project (--force mode)');
    logger.blank();
  }

  try {
    // 1. Gather project information
    logger.info('📋 Project Information');
    const projectInfo = await promptProjectInfo();
    logger.blank();

    logger.info('🌐 Language Configuration');
    const languageConfig = await promptLanguageConfig();
    logger.blank();

    logger.info('📁 Directory Paths');
    const pathsConfig = await promptPathsConfig(targetDir);
    logger.blank();

    // 1.5. Detect system information
    const systemConfig = await promptSystemInfo();

    // 2. Gather objectives
    const objectives = await promptObjectives();
    logger.blank();

    // 3. Gather assumptions
    const assumptions = await promptAssumptions();
    logger.blank();

    // 4. Optional: domain terms
    const domainTerms = await promptDomainTerms();
    logger.blank();

    // 5. Build configuration with defaults
    const config: FullConfig = {
      project: projectInfo,
      language: languageConfig,
      paths: pathsConfig,
      system: systemConfig,
      objectives,
      assumptions,
      domain: {
        terms: domainTerms,
        evidence: [
          'All claims must include code quotes with file:line references',
          'Architecture claims must cite design docs or authoritative sources'
        ],
        external_sources: []
      },
      tasks: {
        use_task_specific_indexes: true,
        use_incremental_work: true,
        max_context_per_step: 2000,
        max_task_context: 10000,
        hygiene_cycle_frequency: 5
      },
      output: {
        format: 'markdown',
        include_diagrams: true,
        diagram_types: ['flowchart', 'sequence', 'class'],
        code_reference_format: 'file:line'
      },
      git: {
        ai_git_operations: false,
        ignore_patterns: [`${pathsConfig.base_dir}/temp/`]
      },
      advanced: {
        max_tags: 100,
        max_topics: 50,
        max_cross_refs: 10,
        target_context_reduction: 0.80,
        target_index_lookup_time: 1.0
      }
    };

    // 6. Save configuration
    const spinner = ora('Saving configuration...').start();
    const configDir = path.join(targetDir, pathsConfig.base_dir);
    await ensureDir(configDir);
    const configPath = path.join(configDir, 'config.yaml');
    await saveConfigToYaml(configPath, config);
    spinner.succeed(`Configuration saved to ${configPath}`);

    // 7. Execute initialization
    spinner.start('Initializing memory system...');
    await initialize(config, targetDir);
    spinner.succeed('Memory system initialized');

    logger.blank();
    logger.success('✅ Initialization complete!');
    logger.blank();
  } catch (error) {
    logger.blank();
    logger.error('Initialization failed:');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Quick mode initialization with defaults (completely silent)
 */
async function initQuick(targetDir: string, force: boolean = false): Promise<void> {
  // Check if already initialized
  const { isProjectInitialized } = await import('./core/marker.js');
  const alreadyInitialized = await isProjectInitialized(targetDir);

  if (alreadyInitialized && !force) {
    logger.error('Project already initialized. Use --force to re-initialize.');
    process.exit(1);
  }

  const projectName = path.basename(targetDir);

  // Detect system information (non-interactive)
  const { getSystemInfoQuick } = await import('./prompts/system-info.js');
  const systemConfig = await getSystemInfoQuick();

  const config: FullConfig = {
    project: {
      name: projectName,
      type: 'Multi-language Repository',
      description: 'Code analysis and documentation project'
    },
    language: {
      user_language: 'English',
      think_language: 'English'
    },
    paths: {
      base_dir: 'claude',
      codebase: targetDir
    },
    system: systemConfig,
    objectives: [
      {
        objective: 'Analyze and document the codebase architecture',
        memory_check: 'Query semantic notes for architecture patterns',
        memory_update: 'Create semantic notes for architectural discoveries'
      }
    ],
    assumptions: [
      'The codebase structure will be analyzed incrementally'
    ],
    domain: {
      terms: [],
      evidence: [
        'All claims must include code quotes with file:line references'
      ],
      external_sources: []
    },
    tasks: {
      use_task_specific_indexes: true,
      use_incremental_work: true,
      max_context_per_step: 2000,
      max_task_context: 10000,
      hygiene_cycle_frequency: 5
    },
    output: {
      format: 'markdown',
      include_diagrams: true,
      diagram_types: ['flowchart', 'sequence', 'class'],
      code_reference_format: 'file:line'
    },
    git: {
      ai_git_operations: false,
      ignore_patterns: ['claude/temp/']
    },
    advanced: {
      max_tags: 100,
      max_topics: 50,
      max_cross_refs: 10,
      target_context_reduction: 0.80,
      target_index_lookup_time: 1.0
    }
  };

  try {
    await initialize(config, targetDir);

    // Save config to file
    const configDir = path.join(targetDir, config.paths.base_dir);
    await ensureDir(configDir);
    const configPath = path.join(configDir, 'config.yaml');
    await saveConfigToYaml(configPath, config);

    logger.success('✅ Initialization complete');
  } catch (error) {
    logger.error('Initialization failed: ' + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

/**
 * Simple mode initialization (essential prompts only)
 */
async function initSimple(targetDir: string, force: boolean = false): Promise<void> {
  logger.info('🚀 Claude Memory System Initializer (Simple Mode)');
  logger.blank();

  // Check if already initialized
  const { isProjectInitialized, getMarkerInfo } = await import('./core/marker.js');
  const alreadyInitialized = await isProjectInitialized(targetDir);

  if (alreadyInitialized && !force) {
    const markerInfo = await getMarkerInfo(targetDir);
    logger.warning('⚠️  This project is already initialized!');
    logger.blank();
    if (markerInfo) {
      logger.info(`  Project: ${markerInfo.project_name || 'Unknown'}`);
      logger.info(`  Initialized: ${markerInfo.date}`);
    }
    logger.blank();
    logger.info('Use --force to re-initialize');
    process.exit(0);
  }

  if (force && alreadyInitialized) {
    logger.warning('⚠️  Re-initializing project (--force mode)');
    logger.blank();
  }

  try {
    // 1. Essential project information
    logger.info('📋 Project Information');
    const projectInfo = await promptProjectInfoSimple(targetDir);
    logger.blank();

    // 2. Language configuration (simplified)
    logger.info('🌐 Language');
    const languageConfig = await promptLanguageConfigSimple();
    logger.blank();

    // 3. System information (auto-detect with user selection if needed)
    const systemConfig = await promptSystemInfo();

    // 4. Build configuration with defaults
    const config: FullConfig = {
      project: projectInfo,
      language: languageConfig,
      paths: {
        base_dir: 'claude',
        codebase: targetDir
      },
      system: systemConfig,
      objectives: [
        {
          objective: 'Analyze and document the codebase architecture',
          memory_check: 'Query semantic notes for architecture patterns',
          memory_update: 'Create semantic notes for architectural discoveries'
        }
      ],
      assumptions: [
        'The codebase structure will be analyzed incrementally'
      ],
      domain: {
        terms: [],
        evidence: [
          'All claims must include code quotes with file:line references'
        ],
        external_sources: []
      },
      tasks: {
        use_task_specific_indexes: true,
        use_incremental_work: true,
        max_context_per_step: 2000,
        max_task_context: 10000,
        hygiene_cycle_frequency: 5
      },
      output: {
        format: 'markdown',
        include_diagrams: true,
        diagram_types: ['flowchart', 'sequence', 'class'],
        code_reference_format: 'file:line'
      },
      git: {
        ai_git_operations: false,
        ignore_patterns: ['claude/temp/']
      },
      advanced: {
        max_tags: 100,
        max_topics: 50,
        max_cross_refs: 10,
        target_context_reduction: 0.80,
        target_index_lookup_time: 1.0
      }
    };

    // 5. Save configuration
    const spinner = ora('Saving configuration...').start();
    const configDir = path.join(targetDir, config.paths.base_dir);
    await ensureDir(configDir);
    const configPath = path.join(configDir, 'config.yaml');
    await saveConfigToYaml(configPath, config);
    spinner.succeed('Configuration saved');

    // 6. Execute initialization
    spinner.start('Initializing memory system...');
    await initialize(config, targetDir);
    spinner.succeed('Memory system initialized');

    logger.blank();
    logger.success('✅ Initialization complete!');
    logger.blank();
    logger.info('Next steps:');
    logger.info('  claude-memory-init show         # View configuration');
    logger.info('  claude-memory-init add-objective "..." # Add objectives');
    logger.info('  claude-memory-init edit         # Edit configuration');
    logger.blank();
  } catch (error) {
    logger.blank();
    logger.error('Initialization failed:');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Validate configuration file
 */
async function validateConfigFile(configPath: string): Promise<void> {
  logger.info('🔍 Validating configuration...');
  logger.blank();

  const spinner = ora('Loading configuration...').start();
  let config: FullConfig;
  try {
    config = await loadConfigFromYaml(configPath);
    spinner.succeed('Configuration loaded');
  } catch (error) {
    spinner.fail('Failed to load configuration');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  spinner.start('Validating...');
  const validation = validateConfig(config);

  if (validation.valid) {
    spinner.succeed('Configuration is valid');
    if (validation.warnings.length > 0) {
      logger.blank();
      logger.warning('Warnings:');
      validation.warnings.forEach(warn => logger.warning(`  ⚠ ${warn}`));
    }
  } else {
    spinner.fail('Configuration validation failed');
    logger.blank();
    logger.error('Errors:');
    validation.errors.forEach(err => logger.error(`  ✗ ${err}`));
    if (validation.warnings.length > 0) {
      logger.blank();
      logger.warning('Warnings:');
      validation.warnings.forEach(warn => logger.warning(`  ⚠ ${warn}`));
    }
    process.exit(1);
  }

  logger.blank();
}

/**
 * Setup CLI commands
 */
export function setupCLI(): Command {
  program
    .name('claude-memory-init')
    .description('CLI tool for initializing Claude Memory System')
    .version('1.0.0');

  program
    .command('init')
    .description('Initialize Claude Memory System')
    .option('-c, --config <path>', 'Path to config.yaml file')
    .option('-i, --interactive', 'Interactive mode (all configuration options)')
    .option('-s, --simple', 'Simple mode (essential settings only)')
    .option('-q, --quick', 'Quick mode (fully automated, no prompts)')
    .option('-f, --force', 'Force re-initialization (overwrite existing)')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (options) => {
      const targetDir = path.resolve(options.target);
      const force = options.force || false;

      if (options.config) {
        const configPath = path.resolve(options.config);
        if (!(await fileExists(configPath))) {
          logger.error(`Config file not found: ${configPath}`);
          process.exit(1);
        }
        await initFromConfig(configPath, targetDir, force);
      } else if (options.interactive) {
        await initInteractive(targetDir, force);
      } else if (options.simple) {
        await initSimple(targetDir, force);
      } else if (options.quick) {
        await initQuick(targetDir, force);
      } else {
        // Default: look for config.yaml in target/claude/
        const defaultConfigPath = path.join(targetDir, 'claude', 'config.yaml');
        if (await fileExists(defaultConfigPath)) {
          await initFromConfig(defaultConfigPath, targetDir, force);
        } else {
          logger.error('No initialization mode specified. Use one of:');
          logger.info('  --config <path>   Use specific config file');
          logger.info('  --interactive     Full interactive mode');
          logger.info('  --simple          Simple mode (recommended)');
          logger.info('  --quick           Quick automated mode');
          process.exit(1);
        }
      }
    });

  program
    .command('validate')
    .description('Validate configuration file')
    .option('-c, --config <path>', 'Path to config.yaml file')
    .action(async (options) => {
      if (!options.config) {
        logger.error('Config file path is required');
        logger.info('Usage: claude-memory-init validate --config <path>');
        process.exit(1);
      }

      const configPath = path.resolve(options.config);
      if (!(await fileExists(configPath))) {
        logger.error(`Config file not found: ${configPath}`);
        process.exit(1);
      }

      await validateConfigFile(configPath);
    });

  program
    .command('submodule')
    .description('Manage git submodule (mem/ template)')
    .option('--init', 'Initialize submodule')
    .option('--update', 'Update submodule to latest')
    .option('--status', 'Check submodule status')
    .action(async (options) => {
      const { ensureSubmodule, isSubmoduleInitialized, updateSubmoduleToLatest } = await import('./utils/git-ops.js');
      // Get project root: from dist/cli.js -> dist/ -> project root
      const currentFileUrl = new URL(import.meta.url).pathname;
      const projectRoot = path.resolve(path.dirname(currentFileUrl), '..');

      if (options.status) {
        const initialized = await isSubmoduleInitialized(projectRoot);
        if (initialized) {
          logger.success('✅ Submodule is initialized');
        } else {
          logger.warning('⚠️  Submodule is not initialized');
          logger.info('Run: claude-memory-init submodule --init');
        }
      } else if (options.init) {
        try {
          await ensureSubmodule(projectRoot);
          logger.success('✅ Submodule initialized');
        } catch (error) {
          logger.error('Failed to initialize submodule');
          logger.error(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      } else if (options.update) {
        try {
          await updateSubmoduleToLatest(projectRoot);
          logger.success('✅ Submodule updated to latest');
        } catch (error) {
          logger.error('Failed to update submodule');
          logger.error(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      } else {
        logger.error('Please specify an action: --init, --update, or --status');
        process.exit(1);
      }
    });

  // Configuration management commands
  program
    .command('status')
    .description('Check if project is initialized')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (options) => {
      const { isProjectInitialized, getMarkerInfo } = await import('./core/marker.js');
      try {
        const targetDir = path.resolve(options.target);
        const initialized = await isProjectInitialized(targetDir);

        if (initialized) {
          const markerInfo = await getMarkerInfo(targetDir);
          logger.success('✅ Project is initialized');
          logger.blank();
          if (markerInfo) {
            logger.info(`  Project: ${markerInfo.project_name || 'Unknown'}`);
            logger.info(`  Base directory: ${markerInfo.base_dir}`);
            logger.info(`  Initialized: ${markerInfo.date}`);
            logger.info(`  Tool version: ${markerInfo.version}`);
          }
          logger.blank();
          logger.info('Use "claude-memory-init show" to view configuration');
        } else {
          logger.warning('⚠️  Project is not initialized');
          logger.blank();
          logger.info('Initialize with:');
          logger.info('  claude-memory-init init --quick');
          logger.info('  claude-memory-init init --interactive');
          logger.blank();
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command('show')
    .description('Show current configuration')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (options) => {
      const { loadConfig } = await import('./core/config-manager.js');
      try {
        const targetDir = path.resolve(options.target);
        const { config } = await loadConfig(targetDir);

        logger.info('📋 Current Configuration');
        logger.blank();
        logger.info(`Project: ${config.project.name} (${config.project.type})`);
        logger.info(`Description: ${config.project.description}`);
        logger.blank();

        logger.info('🎯 Objectives:');
        config.objectives.forEach((obj, i) => {
          logger.info(`  ${i}. ${obj.objective}`);
        });
        logger.blank();

        logger.info('📝 Assumptions:');
        config.assumptions.forEach((assumption, i) => {
          logger.info(`  ${i}. ${assumption}`);
        });
        logger.blank();

        logger.info('🌐 Language:');
        logger.info(`  User: ${config.language.user_language}`);
        logger.info(`  Think: ${config.language.think_language}`);
        logger.blank();
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command('add-objective <objective>')
    .description('Add a new objective to the configuration')
    .option('-c, --check <text>', 'Custom memory_check text')
    .option('-u, --update <text>', 'Custom memory_update text')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (objective, options) => {
      const { addObjective } = await import('./core/config-manager.js');
      try {
        const targetDir = path.resolve(options.target);
        await addObjective(targetDir, objective, options.check, options.update);
        logger.success(`✅ Added objective: ${objective}`);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command('add-assumption <assumption>')
    .description('Add a new assumption to the configuration')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (assumption, options) => {
      const { addAssumption } = await import('./core/config-manager.js');
      try {
        const targetDir = path.resolve(options.target);
        await addAssumption(targetDir, assumption);
        logger.success(`✅ Added assumption: ${assumption}`);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command('set <key> <value>')
    .description('Set a configuration value (e.g., "language.user_language Chinese")')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (key, value, options) => {
      const { setConfigValue } = await import('./core/config-manager.js');
      try {
        const targetDir = path.resolve(options.target);
        // Try to parse value as JSON, otherwise use as string
        let parsedValue = value;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string
        }
        await setConfigValue(targetDir, key, parsedValue);
        logger.success(`✅ Set ${key} = ${value}`);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command('remove-objective <index>')
    .description('Remove an objective by index (see "show" command)')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (index, options) => {
      const { removeObjective } = await import('./core/config-manager.js');
      try {
        const targetDir = path.resolve(options.target);
        await removeObjective(targetDir, parseInt(index, 10));
        logger.success(`✅ Removed objective at index ${index}`);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command('remove-assumption <index>')
    .description('Remove an assumption by index (see "show" command)')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (index, options) => {
      const { removeAssumption } = await import('./core/config-manager.js');
      try {
        const targetDir = path.resolve(options.target);
        await removeAssumption(targetDir, parseInt(index, 10));
        logger.success(`✅ Removed assumption at index ${index}`);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command('edit')
    .description('Open configuration file in your default editor')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (options) => {
      const { findConfigFile } = await import('./core/config-manager.js');
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      try {
        const targetDir = path.resolve(options.target);
        const configPath = await findConfigFile(targetDir);
        if (!configPath) {
          logger.error('Config file not found. Run "claude-memory-init init" first.');
          process.exit(1);
        }

        const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
        logger.info(`Opening ${configPath} with ${editor}...`);

        // Use spawn instead of exec for interactive editing
        const { spawn } = await import('child_process');
        const child = spawn(editor, [configPath], {
          stdio: 'inherit'
        });

        child.on('exit', (code) => {
          if (code === 0) {
            logger.success('✅ Configuration file updated');
          } else {
            process.exit(code || 1);
          }
        });
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  program
    .command('sync')
    .description('Sync local memory with remote repository and optionally create PR')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .option('--pr', 'Create a PR for differences (interactive)')
    .option('--no-cleanup', 'Keep temporary directory (for debugging)')
    .option('--no-interactive', 'Non-interactive mode (display instructions only)')
    .option('--auto-confirm', 'Auto-confirm all prompts (skip interactive questions)')
    .action(async (options) => {
      const { isProjectInitialized, getMarkerInfo } = await import('./core/marker.js');
      const { cloneMemoryRepoToTmp, diffMemoryRepos, cleanupTmpDir, getSubmoduleUrl, createPRInteractive } = await import('./utils/git-ops.js');

      try {
        const targetDir = path.resolve(options.target);

        // Check if project is initialized
        const initialized = await isProjectInitialized(targetDir);
        if (!initialized) {
          logger.error('Project is not initialized. Run "claude-memory-init init" first.');
          process.exit(1);
        }

        // Get submodule URL from tool's .gitmodules (or use default)
        const currentFileUrl = new URL(import.meta.url).pathname;
        const projectRoot = path.resolve(path.dirname(currentFileUrl), '..');
        const submoduleUrl = await getSubmoduleUrl(projectRoot, 'mem');

        const markerInfo = await getMarkerInfo(targetDir);
        const localMemoryDir = path.join(targetDir, markerInfo?.base_dir || 'claude');

        logger.info('🔄 Syncing memory repository...');
        logger.info(`📦 Memory repo: ${submoduleUrl}`);
        logger.blank();

        // Clone to tmp
        const spinner = ora('Cloning remote repository...').start();
        const tmpDir = await cloneMemoryRepoToTmp(submoduleUrl);
        spinner.succeed('Repository cloned');

        // Compare
        spinner.start('Comparing local and remote memory...');
        const differences = await diffMemoryRepos(localMemoryDir, tmpDir);

        if (differences.length === 0) {
          spinner.succeed('No differences found');
          logger.blank();

          // Cleanup
          if (options.cleanup !== false) {
            await cleanupTmpDir(tmpDir);
          }

          return;
        }

        spinner.succeed(`Found ${differences.length} difference(s)`);
        logger.blank();

        // Show all changed files
        logger.info('📝 Files that changed:');
        differences.forEach(file => {
          const isSystemMemory = file.replace(/\\/g, '/').startsWith('memory/system/');
          if (isSystemMemory) {
            logger.info(`  ✓ ${file} (system memory - will be included in PR)`);
          } else {
            logger.info(`  - ${file} (skipped - not system memory)`);
          }
        });
        logger.blank();

        // Handle PR creation
        if (options.pr) {
          // Determine interactive mode
          const interactive = options.interactive !== false;
          const autoConfirm = options.autoConfirm || false;

          // Use interactive PR creation flow
          await createPRInteractive(tmpDir, localMemoryDir, differences, {
            interactive,
            autoConfirm
          });
        } else {
          logger.info('💡 Tip: Add --pr flag to create a pull request with these changes');
        }

        logger.blank();

        // Cleanup unless --no-cleanup is specified
        if (options.cleanup !== false) {
          await cleanupTmpDir(tmpDir);
          logger.info('🧹 Cleaned up temporary directory');
        } else {
          logger.info(`📁 Temporary directory: ${tmpDir}`);
        }

        logger.blank();
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return program;
}
