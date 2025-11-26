/**
 * CLI - v2.0 Plugin-based Architecture
 *
 * Simplified CLI with plugin-based initialization and dynamic command registration.
 */

import { Command } from 'commander';
import * as path from 'path';
import { InteractiveInitializer } from './core/interactive-initializer.js';
import { PluginRegistry } from './plugin/registry.js';
import { builtinPlugins } from './plugins/index.js';
import * as logger from './utils/logger.js';
import type { Plugin, PluginCommand } from './plugin/types.js';
import { createPluginContext } from './plugin/context.js';

const program = new Command();

program
  .name('claude-init')
  .description('Initialize Claude Agent system in your project')
  .version('2.0.0');

/**
 * Main command: init
 *
 * Interactive initialization with all plugins.
 */
program
  .command('init')
  .description('Initialize Claude Agent system (interactive)')
  .option('-f, --force', 'Force re-initialization (overwrite existing files)')
  .option('-t, --target <path>', 'Target directory (default: current directory)', process.cwd())
  .action(async (options) => {
    const targetDir = path.resolve(options.target);
    const force = options.force || false;

    try {
      // Create plugin registry
      const registry = new PluginRegistry();

      // Register all built-in plugins
      for (const plugin of builtinPlugins) {
        registry.register(plugin);
      }

      // Create and run initializer
      const initializer = new InteractiveInitializer(registry);
      await initializer.run(targetDir, { force });

    } catch (error) {
      logger.blank();
      logger.error('❌ Initialization failed:');
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Default action: Run init when no command specified
 */
program.action(async () => {
  // When user runs just "claude-init", execute init
  await program.parseAsync(['node', 'claude-init', 'init']);
});

/**
 * Register plugin commands dynamically
 *
 * Plugins can expose commands via their `commands` array.
 * Commands are registered as: claude-init <plugin-command-name> <command>
 */
function registerPluginCommands(registry: PluginRegistry): void {
  const plugins = registry.getAll();

  for (const plugin of plugins) {
    if (!plugin.commands || plugin.commands.length === 0) {
      continue;
    }

    // Create command group for this plugin
    const pluginCommandName = plugin.meta.commandName;
    const pluginCmd = program.command(pluginCommandName);
    pluginCmd.description(plugin.meta.description);

    // Register each command from the plugin
    for (const command of plugin.commands) {
      const subCmd = pluginCmd.command(command.name);
      subCmd.description(command.description);

      // Add command options
      if (command.options) {
        for (const opt of command.options) {
          // Commander only accepts string/boolean/string[] for defaultValue
          const defaultValue = typeof opt.defaultValue === 'string' ||
                              typeof opt.defaultValue === 'boolean' ||
                              Array.isArray(opt.defaultValue)
            ? opt.defaultValue
            : undefined;
          subCmd.option(opt.flags, opt.description, defaultValue);
        }
      }

      // Register action handler
      subCmd.action(async (cmdOptions) => {
        try {
          // Create plugin context with minimal config
          const projectRoot = process.cwd();
          const sharedConfig = {
            core: {
              project: {
                name: path.basename(projectRoot),
                root: projectRoot,
              },
              output: { base_dir: '.agent' },
              plugins: {},
            },
            plugins: new Map(),
          };

          const context = createPluginContext(
            projectRoot,
            projectRoot,
            sharedConfig
          );

          // Execute plugin command
          await command.action(cmdOptions, context);

        } catch (error) {
          logger.blank();
          logger.error(`❌ Command failed:`);
          logger.error(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      });
    }
  }
}

/**
 * Initialize CLI
 *
 * Register all commands and parse arguments.
 */
async function initializeCLI(): Promise<void> {
  // Create plugin registry
  const registry = new PluginRegistry();

  // Register all built-in plugins
  for (const plugin of builtinPlugins) {
    registry.register(plugin);
  }

  // Register plugin commands dynamically
  registerPluginCommands(registry);

  // Parse command line arguments
  await program.parseAsync(process.argv);
}

// Run CLI
initializeCLI().catch((error) => {
  logger.error('Fatal error:');
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
