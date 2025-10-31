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
import { ensureDir, fileExists } from './utils/file-ops.js';
import * as logger from './utils/logger.js';
import type { FullConfig } from './types/config.js';

const program = new Command();

/**
 * Initialize from config file
 */
async function initFromConfig(configPath: string, targetDir: string): Promise<void> {
  logger.info('🚀 Claude Memory System Initializer');
  logger.blank();

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
async function initInteractive(targetDir: string): Promise<void> {
  logger.info('🚀 Claude Memory System Initializer (Interactive Mode)');
  logger.blank();

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
 * Quick mode initialization with defaults
 */
async function initQuick(targetDir: string): Promise<void> {
  logger.info('🚀 Claude Memory System Initializer (Quick Mode)');
  logger.blank();

  const projectName = path.basename(targetDir);

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

  const spinner = ora('Initializing memory system...').start();
  try {
    await initialize(config, targetDir);
    spinner.succeed('Memory system initialized');

    logger.blank();
    logger.success('✅ Quick initialization complete!');
    logger.info('You can customize claude/config.yaml and re-run init if needed.');
    logger.blank();
  } catch (error) {
    spinner.fail('Initialization failed');
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
    .option('-i, --interactive', 'Interactive mode')
    .option('-q, --quick', 'Quick mode with defaults')
    .option('-t, --target <path>', 'Target directory', process.cwd())
    .action(async (options) => {
      const targetDir = path.resolve(options.target);

      if (options.config) {
        const configPath = path.resolve(options.config);
        if (!(await fileExists(configPath))) {
          logger.error(`Config file not found: ${configPath}`);
          process.exit(1);
        }
        await initFromConfig(configPath, targetDir);
      } else if (options.interactive) {
        await initInteractive(targetDir);
      } else if (options.quick) {
        await initQuick(targetDir);
      } else {
        // Default: look for config.yaml in target/claude/
        const defaultConfigPath = path.join(targetDir, 'claude', 'config.yaml');
        if (await fileExists(defaultConfigPath)) {
          await initFromConfig(defaultConfigPath, targetDir);
        } else {
          logger.error('No config file specified. Use one of:');
          logger.info('  --config <path>   Use specific config file');
          logger.info('  --interactive     Interactive mode');
          logger.info('  --quick           Quick mode with defaults');
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

  return program;
}
