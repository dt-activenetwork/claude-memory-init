/**
 * Plugin Dependency Checker
 *
 * Checks and manages CLI tool dependencies for plugins.
 * Provides functionality to:
 * - Check if tools are available on the system
 * - Determine if missing tools can be installed
 * - Install missing tools with user consent
 * - Generate dependency status for all plugins
 *
 * @module core/dependency-checker
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import {
  commandExists,
  getCommandVersion,
  getOS,
  type OSInfo,
} from './system-detector.js';
import type {
  Plugin,
  ToolDependency,
  ToolCheckResult,
  PluginDependencyStatus,
} from '../plugin/types.js';

const execAsync = promisify(exec);

/**
 * Result of a tool installation attempt
 */
export interface InstallResult {
  /** Whether the installation was successful */
  success: boolean;
  /** Error message if installation failed */
  error?: string;
  /** Command output (stdout + stderr) */
  output?: string;
}

/**
 * Dependency Checker
 *
 * Manages CLI tool dependency checking and installation for plugins.
 * Caches OS information for efficient repeated checks.
 *
 * @example
 * ```typescript
 * const checker = new DependencyChecker();
 * const status = await checker.checkPlugin(myPlugin);
 *
 * if (!status.available) {
 *   console.log(`Plugin unavailable: ${status.disabledReason}`);
 * } else if (status.toInstall.length > 0) {
 *   console.log(`Will install: ${status.toInstall.map(d => d.name).join(', ')}`);
 * }
 * ```
 */
export class DependencyChecker {
  private osInfo: OSInfo | null = null;

  /**
   * Create a new DependencyChecker instance
   */
  constructor() {
    // OS info will be lazily loaded on first check
  }

  /**
   * Get cached OS information, fetching if needed
   */
  private async getOSInfo(): Promise<OSInfo> {
    if (!this.osInfo) {
      this.osInfo = await getOS();
    }
    return this.osInfo;
  }

  /**
   * Get the platform key for install commands
   */
  private getPlatformKey(osInfo: OSInfo): 'darwin' | 'linux' | 'win32' {
    if (osInfo.platform === 'darwin') return 'darwin';
    if (osInfo.platform === 'win32') return 'win32';
    return 'linux';
  }

  /**
   * Check if a single tool dependency is satisfied
   *
   * @param dep - Tool dependency to check
   * @returns Promise resolving to check result
   *
   * @example
   * ```typescript
   * const result = await checker.checkToolDependency({
   *   name: 'git',
   *   checkCommand: 'git --version',
   * });
   * console.log(result.available ? 'Git is installed' : 'Git is missing');
   * ```
   */
  async checkToolDependency(dep: ToolDependency): Promise<ToolCheckResult> {
    const osInfo = await this.getOSInfo();
    const platformKey = this.getPlatformKey(osInfo);

    // Determine the check command
    const checkCommand = dep.checkCommand || `${dep.name} --version`;

    // Check if the tool exists
    let available = false;
    let version: string | undefined;

    try {
      // Try executing the check command
      const { stdout, stderr } = await execAsync(checkCommand);
      available = true;

      // Try to extract version from output
      const output = stdout || stderr;
      const versionMatch = output.match(/v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    } catch {
      // Command failed, tool is not available
      available = false;
    }

    // Determine if we can install this tool
    const installCommand = dep.installCommands?.[platformKey];
    const canInstall = !available && !!installCommand;

    return {
      name: dep.name,
      available,
      canInstall,
      installCommand,
      version,
    };
  }

  /**
   * Check all dependencies for a plugin
   *
   * @param plugin - Plugin to check dependencies for
   * @returns Promise resolving to plugin dependency status
   *
   * @example
   * ```typescript
   * const status = await checker.checkPlugin(myPlugin);
   * if (status.available) {
   *   console.log('Plugin can be enabled');
   * }
   * ```
   */
  async checkPlugin(plugin: Plugin): Promise<PluginDependencyStatus> {
    const pluginName = plugin.meta.name;
    const dependencies = plugin.meta.toolDependencies || [];

    // If no dependencies, plugin is always available
    if (dependencies.length === 0) {
      return {
        pluginName,
        available: true,
        missingRequired: [],
        toInstall: [],
      };
    }

    const missingRequired: string[] = [];
    const toInstall: ToolDependency[] = [];
    const checkResults: ToolCheckResult[] = [];

    // Check each dependency
    for (const dep of dependencies) {
      const result = await this.checkToolDependency(dep);
      checkResults.push(result);

      if (!result.available) {
        if (result.canInstall) {
          // Can be installed
          toInstall.push(dep);
        } else if (!dep.optional) {
          // Required but cannot be installed
          missingRequired.push(dep.name);
        }
        // Optional dependencies that can't be installed are just skipped
      }
    }

    // Determine if plugin is available
    const available = missingRequired.length === 0;

    // Generate disabled reason if not available
    let disabledReason: string | undefined;
    if (!available) {
      const osInfo = await this.getOSInfo();
      disabledReason = `Missing: ${missingRequired.join(', ')} (not available on ${osInfo.name})`;
    }

    return {
      pluginName,
      available,
      missingRequired,
      toInstall,
      disabledReason,
    };
  }

  /**
   * Check dependencies for all plugins
   *
   * @param plugins - Array of plugins to check
   * @returns Promise resolving to map of plugin name to dependency status
   *
   * @example
   * ```typescript
   * const statuses = await checker.checkAllPlugins(allPlugins);
   * for (const [name, status] of statuses) {
   *   console.log(`${name}: ${status.available ? 'OK' : status.disabledReason}`);
   * }
   * ```
   */
  async checkAllPlugins(
    plugins: Plugin[]
  ): Promise<Map<string, PluginDependencyStatus>> {
    const results = new Map<string, PluginDependencyStatus>();

    // Check all plugins in parallel for better performance
    const checks = plugins.map(async (plugin) => {
      const status = await this.checkPlugin(plugin);
      return { name: plugin.meta.name, status };
    });

    const statuses = await Promise.all(checks);

    for (const { name, status } of statuses) {
      results.set(name, status);
    }

    return results;
  }

  /**
   * Install a tool dependency
   *
   * Executes the platform-specific install command for the tool.
   * Returns immediately if the tool is already installed.
   *
   * @param dep - Tool dependency to install
   * @returns Promise resolving to install result
   *
   * @example
   * ```typescript
   * const result = await checker.installTool({
   *   name: 'pnpm',
   *   installCommands: {
   *     darwin: 'brew install pnpm',
   *     linux: 'npm install -g pnpm',
   *   },
   * });
   * if (result.success) {
   *   console.log('pnpm installed successfully');
   * }
   * ```
   */
  async installTool(dep: ToolDependency): Promise<InstallResult> {
    const osInfo = await this.getOSInfo();
    const platformKey = this.getPlatformKey(osInfo);

    // Check if already installed
    const checkResult = await this.checkToolDependency(dep);
    if (checkResult.available) {
      return {
        success: true,
        output: `${dep.name} is already installed (version ${checkResult.version || 'unknown'})`,
      };
    }

    // Get install command for current platform
    const installCommand = dep.installCommands?.[platformKey];
    if (!installCommand) {
      return {
        success: false,
        error: `No install command available for ${dep.name} on ${osInfo.name}`,
      };
    }

    // Execute installation
    try {
      const result = await this.executeInstallCommand(installCommand);

      // Verify installation succeeded
      const verifyResult = await this.checkToolDependency(dep);
      if (verifyResult.available) {
        return {
          success: true,
          output: result.output,
        };
      } else {
        return {
          success: false,
          error: `Installation command completed but ${dep.name} is still not available`,
          output: result.output,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute an install command
   *
   * Handles shell execution with proper output capture.
   *
   * @param command - Command to execute
   * @returns Promise resolving to command output
   */
  private async executeInstallCommand(
    command: string
  ): Promise<{ output: string }> {
    return new Promise((resolve, reject) => {
      // Use shell to execute the command
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
      const shellFlag = process.platform === 'win32' ? '/c' : '-c';

      const child = spawn(shell, [shellFlag, command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Disable interactive prompts where possible
          DEBIAN_FRONTEND: 'noninteractive',
          HOMEBREW_NO_AUTO_UPDATE: '1',
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const output = stdout + stderr;
        if (code === 0) {
          resolve({ output });
        } else {
          reject(new Error(`Command failed with code ${code}: ${output}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        child.kill();
        reject(new Error('Installation timed out after 5 minutes'));
      }, 300000);
    });
  }

  /**
   * Get a list of all tools that need to be installed for selected plugins
   *
   * @param plugins - Array of selected plugins
   * @param statuses - Map of dependency statuses (from checkAllPlugins)
   * @returns Array of tools to install (deduplicated)
   */
  getToolsToInstall(
    plugins: Plugin[],
    statuses: Map<string, PluginDependencyStatus>
  ): ToolDependency[] {
    const toolsMap = new Map<string, ToolDependency>();

    for (const plugin of plugins) {
      const status = statuses.get(plugin.meta.name);
      if (status?.toInstall) {
        for (const tool of status.toInstall) {
          // Deduplicate by tool name
          if (!toolsMap.has(tool.name)) {
            toolsMap.set(tool.name, tool);
          }
        }
      }
    }

    return Array.from(toolsMap.values());
  }

  /**
   * Install multiple tools
   *
   * @param tools - Array of tools to install
   * @param onProgress - Optional callback for progress updates
   * @returns Promise resolving to map of tool name to install result
   */
  async installTools(
    tools: ToolDependency[],
    onProgress?: (tool: string, status: 'installing' | 'success' | 'failed') => void
  ): Promise<Map<string, InstallResult>> {
    const results = new Map<string, InstallResult>();

    // Install sequentially to avoid conflicts
    for (const tool of tools) {
      onProgress?.(tool.name, 'installing');

      const result = await this.installTool(tool);
      results.set(tool.name, result);

      onProgress?.(tool.name, result.success ? 'success' : 'failed');
    }

    return results;
  }
}

/**
 * Create a dependency checker instance
 *
 * Convenience function for creating a new DependencyChecker.
 *
 * @returns New DependencyChecker instance
 */
export function createDependencyChecker(): DependencyChecker {
  return new DependencyChecker();
}
