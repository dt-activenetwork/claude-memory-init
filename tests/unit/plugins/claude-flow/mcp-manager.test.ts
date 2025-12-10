/**
 * Tests for Claude Flow MCP Manager
 *
 * Tests MCP (Model Context Protocol) configuration management including:
 * - Reading existing settings.json
 * - Adding MCP server configurations
 * - Merging multiple MCP servers
 * - Creating new settings.json when it doesn't exist
 * - Writing configuration files
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import type { FileOperations, JsonObject } from '../../../../src/plugin/types.js';

// Mock file operations
function createMockFileOps(): FileOperations {
  return {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    copyFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    fileExists: vi.fn().mockResolvedValue(false),
    dirExists: vi.fn().mockResolvedValue(false),
    readJsonFile: vi.fn().mockResolvedValue({}),
    writeJsonFile: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * MCP Server Configuration
 */
interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

/**
 * Claude Settings JSON structure
 */
interface ClaudeSettings {
  mcpServers?: Record<string, MCPServerConfig>;
  [key: string]: unknown;
}

/**
 * Mock Claude Flow MCP Manager
 *
 * Manages MCP server configurations in Claude's settings.json file.
 * The actual plugin implementation should follow this pattern.
 */
class ClaudeFlowMCPManager {
  private fs: FileOperations;
  private settingsPath: string;

  /**
   * Available MCP server presets
   */
  static readonly SERVER_PRESETS: Record<string, MCPServerConfig> = {
    filesystem: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-filesystem', '/path/to/allowed/dirs'],
    },
    memory: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-memory'],
    },
    github: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-github'],
      env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
    },
    database: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-sqlite', '--db', 'local.db'],
    },
    'claude-flow': {
      command: 'node',
      args: ['./node_modules/claude-flow/dist/mcp-server.js'],
    },
  };

  constructor(fs: FileOperations, projectRoot?: string) {
    this.fs = fs;
    // Default to Claude Desktop settings path
    this.settingsPath = projectRoot
      ? path.join(projectRoot, '.claude', 'settings.json')
      : this.getDefaultSettingsPath();
  }

  /**
   * Get default settings path based on OS
   */
  private getDefaultSettingsPath(): string {
    const platform = os.platform();
    const homeDir = os.homedir();

    switch (platform) {
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'settings.json');
      case 'win32':
        return path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'settings.json');
      default:
        return path.join(homeDir, '.config', 'claude', 'settings.json');
    }
  }

  /**
   * Set custom settings path
   */
  setSettingsPath(settingsPath: string): void {
    this.settingsPath = settingsPath;
  }

  /**
   * Read existing settings or return default
   */
  async readSettings(): Promise<ClaudeSettings> {
    const exists = await this.fs.fileExists(this.settingsPath);

    if (!exists) {
      return { mcpServers: {} };
    }

    try {
      return await this.fs.readJsonFile<ClaudeSettings>(this.settingsPath);
    } catch {
      // If file is corrupted, return default
      return { mcpServers: {} };
    }
  }

  /**
   * Write settings to file
   */
  async writeSettings(settings: ClaudeSettings): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.settingsPath);
    await this.fs.ensureDir(dir);

    await this.fs.writeJsonFile(this.settingsPath, settings as JsonObject);
  }

  /**
   * Add a single MCP server
   */
  async addServer(name: string, config: MCPServerConfig): Promise<void> {
    const settings = await this.readSettings();

    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    settings.mcpServers[name] = config;

    await this.writeSettings(settings);
  }

  /**
   * Add MCP server from preset
   */
  async addServerFromPreset(presetName: string, customName?: string): Promise<void> {
    const preset = ClaudeFlowMCPManager.SERVER_PRESETS[presetName];

    if (!preset) {
      throw new Error(`Unknown MCP server preset: ${presetName}`);
    }

    const serverName = customName || presetName;
    await this.addServer(serverName, { ...preset });
  }

  /**
   * Add multiple MCP servers from presets
   */
  async addServersFromPresets(presets: string[]): Promise<void> {
    const settings = await this.readSettings();

    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    for (const presetName of presets) {
      const preset = ClaudeFlowMCPManager.SERVER_PRESETS[presetName];

      if (preset) {
        settings.mcpServers[presetName] = { ...preset };
      }
    }

    await this.writeSettings(settings);
  }

  /**
   * Remove an MCP server
   */
  async removeServer(name: string): Promise<boolean> {
    const settings = await this.readSettings();

    if (!settings.mcpServers || !settings.mcpServers[name]) {
      return false;
    }

    delete settings.mcpServers[name];
    await this.writeSettings(settings);
    return true;
  }

  /**
   * Check if server exists
   */
  async hasServer(name: string): Promise<boolean> {
    const settings = await this.readSettings();
    return !!settings.mcpServers?.[name];
  }

  /**
   * Get server configuration
   */
  async getServer(name: string): Promise<MCPServerConfig | undefined> {
    const settings = await this.readSettings();
    return settings.mcpServers?.[name];
  }

  /**
   * List all configured servers
   */
  async listServers(): Promise<string[]> {
    const settings = await this.readSettings();
    return Object.keys(settings.mcpServers || {});
  }

  /**
   * Merge servers from another settings object
   */
  async mergeServers(
    otherServers: Record<string, MCPServerConfig>,
    overwrite: boolean = false
  ): Promise<void> {
    const settings = await this.readSettings();

    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    for (const [name, config] of Object.entries(otherServers)) {
      if (overwrite || !settings.mcpServers[name]) {
        settings.mcpServers[name] = config;
      }
    }

    await this.writeSettings(settings);
  }

  /**
   * Enable or disable a server
   */
  async setServerEnabled(name: string, enabled: boolean): Promise<boolean> {
    const settings = await this.readSettings();

    if (!settings.mcpServers?.[name]) {
      return false;
    }

    settings.mcpServers[name].disabled = !enabled;
    await this.writeSettings(settings);
    return true;
  }
}

describe('ClaudeFlowMCPManager', () => {
  let mockFs: FileOperations;
  let manager: ClaudeFlowMCPManager;

  beforeEach(() => {
    mockFs = createMockFileOps();
    manager = new ClaudeFlowMCPManager(mockFs, '/test/project');
  });

  describe('SERVER_PRESETS', () => {
    it('should have filesystem preset', () => {
      const preset = ClaudeFlowMCPManager.SERVER_PRESETS['filesystem'];

      expect(preset).toBeDefined();
      expect(preset.command).toBe('npx');
      expect(preset.args).toContain('@anthropic-ai/mcp-filesystem');
    });

    it('should have memory preset', () => {
      const preset = ClaudeFlowMCPManager.SERVER_PRESETS['memory'];

      expect(preset).toBeDefined();
      expect(preset.args).toContain('@anthropic-ai/mcp-memory');
    });

    it('should have github preset with env', () => {
      const preset = ClaudeFlowMCPManager.SERVER_PRESETS['github'];

      expect(preset).toBeDefined();
      expect(preset.env).toBeDefined();
      expect(preset.env!.GITHUB_TOKEN).toBe('${GITHUB_TOKEN}');
    });

    it('should have claude-flow preset', () => {
      const preset = ClaudeFlowMCPManager.SERVER_PRESETS['claude-flow'];

      expect(preset).toBeDefined();
      expect(preset.command).toBe('node');
      expect(preset.args).toContain('./node_modules/claude-flow/dist/mcp-server.js');
    });
  });

  describe('readSettings', () => {
    it('should return default settings when file does not exist', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      const settings = await manager.readSettings();

      expect(settings).toEqual({ mcpServers: {} });
    });

    it('should read existing settings file', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          filesystem: { command: 'npx', args: ['@anthropic-ai/mcp-filesystem'] },
        },
        otherSetting: 'value',
      });

      const settings = await manager.readSettings();

      expect(settings.mcpServers).toBeDefined();
      expect(settings.mcpServers!['filesystem']).toBeDefined();
      expect(settings.otherSetting).toBe('value');
    });

    it('should return default settings when file is corrupted', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockRejectedValue(new Error('Invalid JSON'));

      const settings = await manager.readSettings();

      expect(settings).toEqual({ mcpServers: {} });
    });
  });

  describe('writeSettings', () => {
    it('should ensure directory exists before writing', async () => {
      await manager.writeSettings({ mcpServers: {} });

      expect(mockFs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('.claude')
      );
    });

    it('should write settings to file', async () => {
      const settings: ClaudeSettings = {
        mcpServers: { test: { command: 'test' } },
      };

      await manager.writeSettings(settings);

      expect(mockFs.writeJsonFile).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        settings
      );
    });
  });

  describe('addServer', () => {
    it('should add server to empty settings', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      await manager.addServer('test', { command: 'test-cmd' });

      expect(mockFs.writeJsonFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          mcpServers: {
            test: { command: 'test-cmd' },
          },
        })
      );
    });

    it('should add server to existing settings', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          existing: { command: 'existing-cmd' },
        },
      });

      await manager.addServer('new', { command: 'new-cmd' });

      expect(mockFs.writeJsonFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          mcpServers: {
            existing: { command: 'existing-cmd' },
            new: { command: 'new-cmd' },
          },
        })
      );
    });
  });

  describe('addServerFromPreset', () => {
    it('should add server from known preset', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      await manager.addServerFromPreset('filesystem');

      expect(mockFs.writeJsonFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          mcpServers: {
            filesystem: expect.objectContaining({
              command: 'npx',
            }),
          },
        })
      );
    });

    it('should use custom name when provided', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      await manager.addServerFromPreset('filesystem', 'my-filesystem');

      const writeCall = vi.mocked(mockFs.writeJsonFile).mock.calls[0];
      const settings = writeCall[1] as ClaudeSettings;

      expect(settings.mcpServers!['my-filesystem']).toBeDefined();
      expect(settings.mcpServers!['filesystem']).toBeUndefined();
    });

    it('should throw error for unknown preset', async () => {
      await expect(manager.addServerFromPreset('unknown')).rejects.toThrow(
        'Unknown MCP server preset: unknown'
      );
    });
  });

  describe('addServersFromPresets', () => {
    it('should add multiple servers from presets', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      await manager.addServersFromPresets(['filesystem', 'memory', 'github']);

      const writeCall = vi.mocked(mockFs.writeJsonFile).mock.calls[0];
      const settings = writeCall[1] as ClaudeSettings;

      expect(Object.keys(settings.mcpServers!)).toHaveLength(3);
      expect(settings.mcpServers!['filesystem']).toBeDefined();
      expect(settings.mcpServers!['memory']).toBeDefined();
      expect(settings.mcpServers!['github']).toBeDefined();
    });

    it('should skip unknown presets', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      await manager.addServersFromPresets(['filesystem', 'unknown', 'memory']);

      const writeCall = vi.mocked(mockFs.writeJsonFile).mock.calls[0];
      const settings = writeCall[1] as ClaudeSettings;

      expect(Object.keys(settings.mcpServers!)).toHaveLength(2);
      expect(settings.mcpServers!['unknown']).toBeUndefined();
    });
  });

  describe('removeServer', () => {
    it('should remove existing server', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          server1: { command: 'cmd1' },
          server2: { command: 'cmd2' },
        },
      });

      const result = await manager.removeServer('server1');

      expect(result).toBe(true);

      const writeCall = vi.mocked(mockFs.writeJsonFile).mock.calls[0];
      const settings = writeCall[1] as ClaudeSettings;

      expect(settings.mcpServers!['server1']).toBeUndefined();
      expect(settings.mcpServers!['server2']).toBeDefined();
    });

    it('should return false for non-existent server', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          server1: { command: 'cmd1' },
        },
      });

      const result = await manager.removeServer('nonexistent');

      expect(result).toBe(false);
      expect(mockFs.writeJsonFile).not.toHaveBeenCalled();
    });

    it('should return false when no servers exist', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      const result = await manager.removeServer('server');

      expect(result).toBe(false);
    });
  });

  describe('hasServer', () => {
    it('should return true for existing server', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: { test: { command: 'test' } },
      });

      const result = await manager.hasServer('test');

      expect(result).toBe(true);
    });

    it('should return false for non-existing server', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: { other: { command: 'other' } },
      });

      const result = await manager.hasServer('test');

      expect(result).toBe(false);
    });
  });

  describe('getServer', () => {
    it('should return server config when exists', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          test: { command: 'test', args: ['arg1'] },
        },
      });

      const config = await manager.getServer('test');

      expect(config).toEqual({ command: 'test', args: ['arg1'] });
    });

    it('should return undefined when server does not exist', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      const config = await manager.getServer('test');

      expect(config).toBeUndefined();
    });
  });

  describe('listServers', () => {
    it('should list all configured servers', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          server1: { command: 'cmd1' },
          server2: { command: 'cmd2' },
          server3: { command: 'cmd3' },
        },
      });

      const servers = await manager.listServers();

      expect(servers).toHaveLength(3);
      expect(servers).toContain('server1');
      expect(servers).toContain('server2');
      expect(servers).toContain('server3');
    });

    it('should return empty array when no servers', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      const servers = await manager.listServers();

      expect(servers).toEqual([]);
    });
  });

  describe('mergeServers', () => {
    it('should merge servers without overwriting existing', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          existing: { command: 'existing-cmd' },
        },
      });

      await manager.mergeServers({
        existing: { command: 'new-cmd' },
        new: { command: 'new-server' },
      });

      const writeCall = vi.mocked(mockFs.writeJsonFile).mock.calls[0];
      const settings = writeCall[1] as ClaudeSettings;

      expect(settings.mcpServers!['existing'].command).toBe('existing-cmd'); // Not overwritten
      expect(settings.mcpServers!['new'].command).toBe('new-server');
    });

    it('should overwrite when flag is true', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          existing: { command: 'existing-cmd' },
        },
      });

      await manager.mergeServers(
        {
          existing: { command: 'new-cmd' },
        },
        true
      );

      const writeCall = vi.mocked(mockFs.writeJsonFile).mock.calls[0];
      const settings = writeCall[1] as ClaudeSettings;

      expect(settings.mcpServers!['existing'].command).toBe('new-cmd');
    });
  });

  describe('setServerEnabled', () => {
    it('should disable server', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          test: { command: 'test' },
        },
      });

      const result = await manager.setServerEnabled('test', false);

      expect(result).toBe(true);

      const writeCall = vi.mocked(mockFs.writeJsonFile).mock.calls[0];
      const settings = writeCall[1] as ClaudeSettings;

      expect(settings.mcpServers!['test'].disabled).toBe(true);
    });

    it('should enable server', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(true);
      vi.mocked(mockFs.readJsonFile).mockResolvedValue({
        mcpServers: {
          test: { command: 'test', disabled: true },
        },
      });

      const result = await manager.setServerEnabled('test', true);

      expect(result).toBe(true);

      const writeCall = vi.mocked(mockFs.writeJsonFile).mock.calls[0];
      const settings = writeCall[1] as ClaudeSettings;

      expect(settings.mcpServers!['test'].disabled).toBe(false);
    });

    it('should return false for non-existent server', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      const result = await manager.setServerEnabled('test', false);

      expect(result).toBe(false);
    });
  });

  describe('setSettingsPath', () => {
    it('should use custom settings path', async () => {
      manager.setSettingsPath('/custom/path/settings.json');
      vi.mocked(mockFs.fileExists).mockResolvedValue(false);

      await manager.addServer('test', { command: 'test' });

      expect(mockFs.writeJsonFile).toHaveBeenCalledWith(
        '/custom/path/settings.json',
        expect.any(Object)
      );
    });
  });
});
