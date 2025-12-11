/**
 * MCP Writer Module
 *
 * Handles registration of MCP servers via `claude mcp add` command.
 * Plugins can declare MCP servers that will be automatically registered
 * during initialization.
 *
 * @module core/mcp-writer
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  Plugin,
  PluginConfig,
  MCPServerConfig,
  Logger,
} from '../plugin/types.js';

const execAsync = promisify(exec);

/**
 * Default timeout for MCP add commands (30 seconds)
 */
const DEFAULT_MCP_TIMEOUT = 30000;

/**
 * Result of an MCP server registration operation
 */
export interface MCPWriteResult {
  /** Server name that was registered */
  name: string;

  /** Scope of registration (project or user) */
  scope: 'project' | 'user';

  /** Whether the registration was successful */
  success: boolean;

  /** The full command that was executed */
  command: string;

  /** Error message if registration failed */
  error?: string;
}

/**
 * MCP Writer
 *
 * Responsible for registering MCP servers declared by plugins.
 * Uses `claude mcp add` command for registration.
 */
export class MCPWriter {
  private logger: Logger;
  private projectRoot: string;
  private projectName: string;

  /**
   * Create a new MCPWriter
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
   * Build the `claude mcp add` command
   *
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
   * Executes `claude mcp add` command. Failures are logged as warnings
   * but do not throw exceptions to allow initialization to continue.
   *
   * @param server MCP server configuration
   * @returns Registration result
   */
  async addServer(server: MCPServerConfig): Promise<MCPWriteResult> {
    const scope = server.scope || 'project';
    const command = this.buildAddCommand(server);

    try {
      await execAsync(command, {
        cwd: this.projectRoot,
        timeout: DEFAULT_MCP_TIMEOUT,
      });

      this.logger.success(`  Registered MCP server: ${server.name} (${scope})`);

      return {
        name: server.name,
        scope,
        success: true,
        command,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warning(`  Failed to register MCP server ${server.name}: ${errorMsg}`);

      return {
        name: server.name,
        scope,
        success: false,
        command,
        error: errorMsg,
      };
    }
  }

  /**
   * Collect MCP servers from all plugins
   *
   * Iterates through plugins and their configurations to collect
   * all MCP servers that should be registered. Evaluates condition
   * functions to filter servers.
   *
   * @param plugins Array of plugins
   * @param configs Plugin configurations map
   * @returns Array of MCP server configurations to register
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
   * Register all MCP servers from plugins
   *
   * Main entry point for MCP server registration. Collects servers
   * from all enabled plugins and registers them via `claude mcp add`.
   *
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
