/**
 * Init Command Runner Module
 *
 * Handles execution of initialization commands declared by plugins.
 * This includes MCP server registration, setup scripts, and any other
 * commands that need to run during initialization.
 *
 * @module core/init-command-runner
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  Plugin,
  PluginConfig,
  InitCommand,
  MCPServerConfig,
  Logger,
} from '../plugin/types.js';

const execAsync = promisify(exec);

/**
 * Default timeout for init commands (30 seconds)
 */
const DEFAULT_COMMAND_TIMEOUT = 30000;

/**
 * Result of an initialization command execution
 */
export interface InitCommandResult {
  /** Command name that was executed */
  name: string;

  /** The full command that was executed */
  command: string;

  /** Whether the execution was successful */
  success: boolean;

  /** Category of the command (for grouping in output) */
  category?: string;

  /** Error message if execution failed */
  error?: string;

  /** Standard output from the command */
  stdout?: string;

  /** Standard error output from the command */
  stderr?: string;
}

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use InitCommandResult instead
 */
export type MCPWriteResult = InitCommandResult & {
  /** Scope of registration (for legacy MCP servers) */
  scope?: 'project' | 'user';
};

/**
 * Helper to create an MCP registration command
 *
 * Use this to create InitCommand entries for MCP server registration.
 * This is the recommended way to register MCP servers in the new system.
 *
 * @param serverName - Name of the MCP server
 * @param serverCommand - Command to run the MCP server
 * @param options - Additional options
 * @returns An InitCommand configured for MCP registration
 *
 * @example
 * initCommands: [
 *   createMCPCommand('serena', 'uvx --from git+... serena start-mcp-server --project "$(pwd)"'),
 *   createMCPCommand('claude-flow', 'npx claude-flow mcp-server', { scope: 'user' }),
 * ]
 */
export function createMCPCommand(
  serverName: string,
  serverCommand: string,
  options?: {
    scope?: 'project' | 'user';
    description?: string;
    condition?: (config: PluginConfig) => boolean;
    args?: string[];
  }
): InitCommand {
  const scope = options?.scope || 'project';
  let command = `claude mcp add --scope ${scope} ${serverName} -- ${serverCommand}`;

  // Append additional args if provided
  if (options?.args && options.args.length > 0) {
    command += ' ' + options.args.join(' ');
  }

  return {
    name: `mcp-${serverName}`,
    command,
    description: options?.description || `Register ${serverName} MCP server`,
    category: 'mcp',
    condition: options?.condition,
  };
}

/**
 * Init Command Runner
 *
 * Responsible for executing initialization commands declared by plugins.
 * This is a generalization of the old MCPWriter - it can run any command,
 * not just MCP registration.
 */
export class InitCommandRunner {
  private logger: Logger;
  private projectRoot: string;
  private projectName: string;

  /**
   * Create a new InitCommandRunner
   *
   * @param logger Logger instance for output
   * @param projectRoot Absolute path to the project root
   * @param projectName Name of the project (for template expansion)
   */
  constructor(logger: Logger, projectRoot: string, projectName: string) {
    this.logger = logger;
    this.projectRoot = projectRoot;
    this.projectName = projectName;
  }

  /**
   * Expand template placeholders in a command string
   *
   * Replaces:
   * - ${PROJECT_ROOT}: With the actual project root path
   * - ${PROJECT_NAME}: With the project name
   * - $(pwd): Preserved for shell expansion at runtime
   *
   * @param command Command string with placeholders
   * @returns Command string with placeholders replaced
   */
  expandTemplates(command: string): string {
    return command
      .replace(/\$\{PROJECT_ROOT\}/g, this.projectRoot)
      .replace(/\$\{PROJECT_NAME\}/g, this.projectName);
    // Note: $(pwd) is preserved for shell expansion
  }

  /**
   * Execute a single initialization command
   *
   * Executes the command with template expansion. Failures are logged
   * but do not throw exceptions to allow initialization to continue.
   *
   * @param cmd Init command configuration
   * @returns Execution result
   */
  async runCommand(cmd: InitCommand): Promise<InitCommandResult> {
    let command = this.expandTemplates(cmd.command);

    // Append additional args if provided
    if (cmd.args && cmd.args.length > 0) {
      command += ' ' + cmd.args.join(' ');
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        timeout: DEFAULT_COMMAND_TIMEOUT,
      });

      const displayName = cmd.description || cmd.name;
      this.logger.success(`  ${displayName}`);

      return {
        name: cmd.name,
        command,
        success: true,
        category: cmd.category,
        stdout,
        stderr,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const displayName = cmd.description || cmd.name;

      if (cmd.optional) {
        this.logger.warning(`  ${displayName} (skipped): ${errorMsg}`);
      } else {
        this.logger.warning(`  Failed: ${displayName} - ${errorMsg}`);
      }

      return {
        name: cmd.name,
        command,
        success: false,
        category: cmd.category,
        error: errorMsg,
      };
    }
  }

  /**
   * Convert legacy MCPServerConfig to InitCommand
   *
   * @param mcp Legacy MCP server configuration
   * @returns InitCommand equivalent
   */
  private convertLegacyMCPConfig(mcp: MCPServerConfig): InitCommand {
    const scope = mcp.scope || 'project';
    let command = `claude mcp add --scope ${scope} ${mcp.name} -- ${mcp.command}`;

    // Append additional args if provided
    if (mcp.args && mcp.args.length > 0) {
      command += ' ' + mcp.args.join(' ');
    }

    return {
      name: `mcp-${mcp.name}`,
      command,
      description: mcp.description || `Register ${mcp.name} MCP server`,
      category: 'mcp',
      condition: mcp.condition,
    };
  }

  /**
   * Collect initialization commands from all plugins
   *
   * Iterates through plugins and their configurations to collect
   * all init commands that should be executed. Evaluates condition
   * functions to filter commands. Also handles legacy mcpServers.
   *
   * @param plugins Array of plugins
   * @param configs Plugin configurations map
   * @returns Array of init commands to execute
   */
  collectCommands(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): InitCommand[] {
    const commands: InitCommand[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);

      // Skip disabled plugins
      if (!config?.enabled) {
        continue;
      }

      // Collect new initCommands
      if (plugin.initCommands && plugin.initCommands.length > 0) {
        for (const cmd of plugin.initCommands) {
          // Check condition function if provided
          if (cmd.condition && !cmd.condition(config)) {
            continue;
          }
          commands.push(cmd);
        }
      }

      // Collect legacy mcpServers (convert to InitCommand)
      if (plugin.mcpServers && plugin.mcpServers.length > 0) {
        for (const mcp of plugin.mcpServers) {
          // Check condition function if provided
          if (mcp.condition && !mcp.condition(config)) {
            continue;
          }
          commands.push(this.convertLegacyMCPConfig(mcp));
        }
      }
    }

    return commands;
  }

  /**
   * Execute all initialization commands from plugins
   *
   * Main entry point for init command execution. Collects commands
   * from all enabled plugins and executes them.
   *
   * @param plugins Array of plugins
   * @param configs Plugin configurations map
   * @returns Array of execution results
   */
  async runAllCommands(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Promise<InitCommandResult[]> {
    const commands = this.collectCommands(plugins, configs);
    const results: InitCommandResult[] = [];

    if (commands.length === 0) {
      return results;
    }

    this.logger.info('Running initialization commands...');

    for (const cmd of commands) {
      const result = await this.runCommand(cmd);
      results.push(result);
    }

    // Log summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success && !this.isOptionalCommand(r.name, commands)).length;
    const skippedCount = results.filter(r => !r.success && this.isOptionalCommand(r.name, commands)).length;

    if (failCount > 0) {
      this.logger.warning(
        `Init commands: ${successCount} succeeded, ${failCount} failed${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`
      );
    } else if (successCount > 0) {
      const skippedMsg = skippedCount > 0 ? ` (${skippedCount} optional skipped)` : '';
      this.logger.success(`Completed ${successCount} initialization command(s)${skippedMsg}`);
    }

    return results;
  }

  /**
   * Check if a command is optional
   */
  private isOptionalCommand(name: string, commands: InitCommand[]): boolean {
    const cmd = commands.find(c => c.name === name);
    return cmd?.optional === true;
  }

  // ============================================================================
  // Legacy API (Deprecated)
  // ============================================================================

  /**
   * Build the `claude mcp add` command
   *
   * @deprecated Use createMCPCommand() helper function instead
   * @param server MCP server configuration
   * @returns Full command string
   */
  buildAddCommand(server: MCPServerConfig): string {
    const scope = server.scope || 'project';
    const expandedCommand = this.expandTemplates(server.command);

    // Build the base command
    const parts = ['claude', 'mcp', 'add', '--scope', scope, server.name, '--'];

    // Add the main command
    parts.push(expandedCommand);

    // Add any additional args
    if (server.args && server.args.length > 0) {
      parts.push(...server.args);
    }

    return parts.join(' ');
  }

  /**
   * Register a single MCP server
   *
   * @deprecated Use runCommand() with an InitCommand instead
   * @param server MCP server configuration
   * @returns Registration result
   */
  async addServer(server: MCPServerConfig): Promise<MCPWriteResult> {
    const scope = server.scope || 'project';
    const command = this.buildAddCommand(server);

    try {
      await execAsync(command, {
        cwd: this.projectRoot,
        timeout: DEFAULT_COMMAND_TIMEOUT,
      });

      this.logger.success(`  Registered MCP server: ${server.name} (${scope})`);

      return {
        name: server.name,
        scope,
        success: true,
        command,
        category: 'mcp',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warning(`  Failed to register MCP server ${server.name}: ${errorMsg}`);

      return {
        name: server.name,
        scope,
        success: false,
        command,
        category: 'mcp',
        error: errorMsg,
      };
    }
  }

  /**
   * Collect MCP servers from all plugins (legacy method)
   *
   * @deprecated Use collectCommands() instead
   * @param plugins Array of plugins
   * @param configs Plugin configurations map
   * @returns Array of MCP server configurations
   */
  collectServers(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): MCPServerConfig[] {
    const servers: MCPServerConfig[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);

      // Skip disabled plugins or plugins without MCP servers
      if (!config?.enabled || !plugin.mcpServers?.length) {
        continue;
      }

      for (const server of plugin.mcpServers) {
        // Check condition function if provided
        if (server.condition && !server.condition(config)) {
          continue;
        }

        servers.push(server);
      }
    }

    return servers;
  }

  /**
   * Register all MCP servers from plugins (legacy method)
   *
   * @deprecated Use runAllCommands() instead
   * @param plugins Array of plugins
   * @param configs Plugin configurations map
   * @returns Array of registration results
   */
  async writeAllServers(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Promise<MCPWriteResult[]> {
    const servers = this.collectServers(plugins, configs);
    const results: MCPWriteResult[] = [];

    if (servers.length === 0) {
      return results;
    }

    this.logger.info('Registering MCP servers...');

    for (const server of servers) {
      const result = await this.addServer(server);
      results.push(result);
    }

    // Log summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    if (failCount > 0) {
      this.logger.warning(
        `MCP registration: ${successCount} succeeded, ${failCount} failed`
      );
    } else if (successCount > 0) {
      this.logger.success(`Registered ${successCount} MCP server(s)`);
    }

    return results;
  }
}

// ============================================================================
// Legacy Exports (Deprecated)
// ============================================================================

/**
 * @deprecated Use InitCommandRunner instead
 */
export { InitCommandRunner as MCPWriter };
