/**
 * Tests for InitCommandRunner
 *
 * Tests the initialization command execution functionality including:
 * - Template expansion
 * - Command building
 * - Command collection from plugins
 * - Execution handling
 * - Error handling
 * - Legacy MCP compatibility
 * - createMCPCommand helper
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type {
  Plugin,
  PluginConfig,
  InitCommand,
  MCPServerConfig,
  Logger,
} from '../../../src/plugin/types.js';

// Mock child_process exec
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';
import {
  InitCommandRunner,
  createMCPCommand,
  type InitCommandResult,
  // Legacy exports
  MCPWriter,
  type MCPWriteResult,
} from '../../../src/core/init-command-runner.js';

describe('InitCommandRunner', () => {
  let runner: InitCommandRunner;
  let mockLogger: Logger;
  const projectRoot = '/home/user/my-project';
  const projectName = 'my-project';

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      step: vi.fn(),
      blank: vi.fn(),
    };

    runner = new InitCommandRunner(mockLogger, projectRoot, projectName);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('expandTemplates', () => {
    it('should replace ${PROJECT_ROOT} with actual project root', () => {
      const command = 'npx server --root ${PROJECT_ROOT}';
      const result = runner.expandTemplates(command);
      expect(result).toBe(`npx server --root ${projectRoot}`);
    });

    it('should replace ${PROJECT_NAME} with actual project name', () => {
      const command = 'npx server --name ${PROJECT_NAME}';
      const result = runner.expandTemplates(command);
      expect(result).toBe(`npx server --name ${projectName}`);
    });

    it('should replace multiple placeholders', () => {
      const command = 'npx server --root ${PROJECT_ROOT} --name ${PROJECT_NAME}';
      const result = runner.expandTemplates(command);
      expect(result).toBe(`npx server --root ${projectRoot} --name ${projectName}`);
    });

    it('should preserve $(pwd) for shell expansion', () => {
      const command = 'uvx server --project "$(pwd)"';
      const result = runner.expandTemplates(command);
      expect(result).toBe('uvx server --project "$(pwd)"');
    });

    it('should handle commands with no placeholders', () => {
      const command = 'npx simple-server';
      const result = runner.expandTemplates(command);
      expect(result).toBe('npx simple-server');
    });

    it('should handle multiple occurrences of the same placeholder', () => {
      const command = '${PROJECT_ROOT}/bin/server --config ${PROJECT_ROOT}/config.json';
      const result = runner.expandTemplates(command);
      expect(result).toBe(`${projectRoot}/bin/server --config ${projectRoot}/config.json`);
    });
  });

  describe('createMCPCommand helper', () => {
    it('should create an InitCommand for MCP registration', () => {
      const cmd = createMCPCommand('serena', 'uvx serena start-mcp-server');

      expect(cmd.name).toBe('mcp-serena');
      expect(cmd.command).toBe('claude mcp add --scope project serena -- uvx serena start-mcp-server');
      expect(cmd.category).toBe('mcp');
      expect(cmd.description).toBe('Register serena MCP server');
    });

    it('should support user scope', () => {
      const cmd = createMCPCommand('global-server', 'npx global-server', { scope: 'user' });

      expect(cmd.command).toContain('--scope user');
    });

    it('should support custom description', () => {
      const cmd = createMCPCommand('serena', 'uvx serena', {
        description: 'Semantic code analysis server',
      });

      expect(cmd.description).toBe('Semantic code analysis server');
    });

    it('should support condition function', () => {
      const condition = (config: PluginConfig) => config.options.enableMcp === true;
      const cmd = createMCPCommand('serena', 'uvx serena', { condition });

      expect(cmd.condition).toBe(condition);
    });

    it('should support additional args', () => {
      const cmd = createMCPCommand('serena', 'uvx serena', {
        args: ['--verbose', '--debug'],
      });

      expect(cmd.command).toContain('--verbose --debug');
    });
  });

  describe('runCommand', () => {
    it('should successfully execute a command', async () => {
      vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'success output', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const cmd: InitCommand = {
        name: 'test-cmd',
        command: 'npm run test',
        description: 'Run tests',
      };

      const result = await runner.runCommand(cmd);

      expect(result.success).toBe(true);
      expect(result.name).toBe('test-cmd');
      expect(result.error).toBeUndefined();
      expect(mockLogger.success).toHaveBeenCalled();
    });

    it('should handle command failure gracefully', async () => {
      vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Command not found'), '', 'error');
        }
        return {} as ReturnType<typeof exec>;
      });

      const cmd: InitCommand = {
        name: 'failing-cmd',
        command: 'nonexistent-command',
      };

      const result = await runner.runCommand(cmd);

      expect(result.success).toBe(false);
      expect(result.name).toBe('failing-cmd');
      expect(result.error).toContain('Command not found');
      expect(mockLogger.warning).toHaveBeenCalled();
    });

    it('should handle optional commands differently', async () => {
      vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Failed'), '', 'error');
        }
        return {} as ReturnType<typeof exec>;
      });

      const cmd: InitCommand = {
        name: 'optional-cmd',
        command: 'optional-script',
        optional: true,
      };

      const result = await runner.runCommand(cmd);

      expect(result.success).toBe(false);
      // Should show skipped message for optional commands
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('skipped')
      );
    });

    it('should expand templates in command', async () => {
      let executedCommand = '';
      vi.mocked(exec).mockImplementation((cmd, _opts, callback) => {
        executedCommand = cmd as string;
        if (typeof callback === 'function') {
          callback(null, '', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const cmd: InitCommand = {
        name: 'templated-cmd',
        command: 'npx server --root ${PROJECT_ROOT}',
      };

      await runner.runCommand(cmd);

      expect(executedCommand).toContain(projectRoot);
    });

    it('should append additional args to command', async () => {
      let executedCommand = '';
      vi.mocked(exec).mockImplementation((cmd, _opts, callback) => {
        executedCommand = cmd as string;
        if (typeof callback === 'function') {
          callback(null, '', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const cmd: InitCommand = {
        name: 'cmd-with-args',
        command: 'npx server',
        args: ['--verbose', '--debug'],
      };

      await runner.runCommand(cmd);

      expect(executedCommand).toBe('npx server --verbose --debug');
    });

    it('should include category in result', async () => {
      vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, '', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const cmd: InitCommand = {
        name: 'categorized-cmd',
        command: 'npm run setup',
        category: 'setup',
      };

      const result = await runner.runCommand(cmd);

      expect(result.category).toBe('setup');
    });
  });

  describe('collectCommands', () => {
    it('should collect initCommands from enabled plugins', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'plugin-a', commandName: 'a', version: '1.0.0', description: 'Plugin A' },
          initCommands: [
            { name: 'cmd-a', command: 'npm run a' },
          ],
        },
        {
          meta: { name: 'plugin-b', commandName: 'b', version: '1.0.0', description: 'Plugin B' },
          initCommands: [
            { name: 'cmd-b', command: 'npm run b' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['plugin-a', { enabled: true, options: {} }],
        ['plugin-b', { enabled: true, options: {} }],
      ]);

      const commands = runner.collectCommands(plugins, configs);

      expect(commands).toHaveLength(2);
      expect(commands.map(c => c.name)).toContain('cmd-a');
      expect(commands.map(c => c.name)).toContain('cmd-b');
    });

    it('should skip disabled plugins', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'enabled-plugin', commandName: 'e', version: '1.0.0', description: 'Enabled' },
          initCommands: [{ name: 'enabled-cmd', command: 'npm run enabled' }],
        },
        {
          meta: { name: 'disabled-plugin', commandName: 'd', version: '1.0.0', description: 'Disabled' },
          initCommands: [{ name: 'disabled-cmd', command: 'npm run disabled' }],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['enabled-plugin', { enabled: true, options: {} }],
        ['disabled-plugin', { enabled: false, options: {} }],
      ]);

      const commands = runner.collectCommands(plugins, configs);

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('enabled-cmd');
    });

    it('should evaluate condition functions', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'conditional', commandName: 'c', version: '1.0.0', description: 'Conditional' },
          initCommands: [
            {
              name: 'enabled-by-condition',
              command: 'npm run enabled',
              condition: (config) => config.options.enableFeature === true,
            },
            {
              name: 'disabled-by-condition',
              command: 'npm run disabled',
              condition: (config) => config.options.enableFeature === false,
            },
            {
              name: 'no-condition',
              command: 'npm run always',
              // No condition - always included
            },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['conditional', { enabled: true, options: { enableFeature: true } }],
      ]);

      const commands = runner.collectCommands(plugins, configs);

      expect(commands).toHaveLength(2);
      expect(commands.map(c => c.name)).toContain('enabled-by-condition');
      expect(commands.map(c => c.name)).toContain('no-condition');
      expect(commands.map(c => c.name)).not.toContain('disabled-by-condition');
    });

    it('should collect legacy mcpServers and convert them', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'legacy-plugin', commandName: 'l', version: '1.0.0', description: 'Legacy' },
          mcpServers: [
            { name: 'legacy-mcp', command: 'npx legacy-server', scope: 'project' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['legacy-plugin', { enabled: true, options: {} }],
      ]);

      const commands = runner.collectCommands(plugins, configs);

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('mcp-legacy-mcp');
      expect(commands[0].command).toContain('claude mcp add');
      expect(commands[0].category).toBe('mcp');
    });

    it('should collect both initCommands and legacy mcpServers', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'mixed-plugin', commandName: 'm', version: '1.0.0', description: 'Mixed' },
          initCommands: [
            { name: 'new-cmd', command: 'npm run new' },
          ],
          mcpServers: [
            { name: 'legacy-mcp', command: 'npx legacy-server' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['mixed-plugin', { enabled: true, options: {} }],
      ]);

      const commands = runner.collectCommands(plugins, configs);

      expect(commands).toHaveLength(2);
      expect(commands.map(c => c.name)).toContain('new-cmd');
      expect(commands.map(c => c.name)).toContain('mcp-legacy-mcp');
    });
  });

  describe('runAllCommands', () => {
    it('should return empty array when no commands to run', async () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'no-commands', commandName: 'n', version: '1.0.0', description: 'No Commands' },
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['no-commands', { enabled: true, options: {} }],
      ]);

      const results = await runner.runAllCommands(plugins, configs);

      expect(results).toHaveLength(0);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should run all collected commands', async () => {
      vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'success', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const plugins: Plugin[] = [
        {
          meta: { name: 'plugin', commandName: 'p', version: '1.0.0', description: 'Plugin' },
          initCommands: [
            { name: 'cmd-1', command: 'npm run 1' },
            { name: 'cmd-2', command: 'npm run 2' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['plugin', { enabled: true, options: {} }],
      ]);

      const results = await runner.runAllCommands(plugins, configs);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Running initialization commands...');
    });

    it('should continue running after a failure', async () => {
      let callCount = 0;
      vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
        callCount++;
        if (typeof callback === 'function') {
          if (callCount === 2) {
            callback(new Error('Middle failure'), '', 'error');
          } else {
            callback(null, 'success', '');
          }
        }
        return {} as ReturnType<typeof exec>;
      });

      const plugins: Plugin[] = [
        {
          meta: { name: 'resilient', commandName: 'r', version: '1.0.0', description: 'Resilient' },
          initCommands: [
            { name: 'cmd-1', command: 'npm run 1' },
            { name: 'cmd-2', command: 'npm run 2' },
            { name: 'cmd-3', command: 'npm run 3' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['resilient', { enabled: true, options: {} }],
      ]);

      const results = await runner.runAllCommands(plugins, configs);

      expect(results).toHaveLength(3);
      expect(results.filter(r => r.success)).toHaveLength(2);
      expect(results.filter(r => !r.success)).toHaveLength(1);
    });

    it('should log warning when some commands fail', async () => {
      let callCount = 0;
      vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
        callCount++;
        if (typeof callback === 'function') {
          if (callCount === 1) {
            callback(null, 'success', '');
          } else {
            callback(new Error('Failed'), '', 'error');
          }
        }
        return {} as ReturnType<typeof exec>;
      });

      const plugins: Plugin[] = [
        {
          meta: { name: 'mixed', commandName: 'm', version: '1.0.0', description: 'Mixed' },
          initCommands: [
            { name: 'success-cmd', command: 'npm run success' },
            { name: 'fail-cmd', command: 'npm run fail' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['mixed', { enabled: true, options: {} }],
      ]);

      const results = await runner.runAllCommands(plugins, configs);

      expect(results).toHaveLength(2);
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('1 succeeded, 1 failed')
      );
    });
  });

  // ============================================================================
  // Legacy API Tests (for backward compatibility)
  // ============================================================================

  describe('Legacy MCPWriter API', () => {
    it('should export MCPWriter as alias', () => {
      expect(MCPWriter).toBe(InitCommandRunner);
    });

    describe('buildAddCommand', () => {
      it('should build basic command with default scope', () => {
        const server: MCPServerConfig = {
          name: 'test-server',
          command: 'npx test-mcp-server',
        };
        const result = runner.buildAddCommand(server);
        expect(result).toBe('claude mcp add --scope project test-server -- npx test-mcp-server');
      });

      it('should build command with user scope', () => {
        const server: MCPServerConfig = {
          name: 'global-server',
          command: 'npx global-mcp-server',
          scope: 'user',
        };
        const result = runner.buildAddCommand(server);
        expect(result).toBe('claude mcp add --scope user global-server -- npx global-mcp-server');
      });

      it('should include additional args', () => {
        const server: MCPServerConfig = {
          name: 'server-with-args',
          command: 'npx mcp-server',
          args: ['--verbose', '--debug'],
        };
        const result = runner.buildAddCommand(server);
        expect(result).toBe('claude mcp add --scope project server-with-args -- npx mcp-server --verbose --debug');
      });
    });

    describe('addServer', () => {
      it('should successfully register a server', async () => {
        vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
          if (typeof callback === 'function') {
            callback(null, 'success', '');
          }
          return {} as ReturnType<typeof exec>;
        });

        const server: MCPServerConfig = {
          name: 'test-server',
          command: 'npx test-mcp-server',
        };

        const result = await runner.addServer(server);

        expect(result.success).toBe(true);
        expect(result.name).toBe('test-server');
        expect(result.scope).toBe('project');
        expect(result.command).toContain('claude mcp add');
        expect(mockLogger.success).toHaveBeenCalled();
      });

      it('should handle registration failure gracefully', async () => {
        vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
          if (typeof callback === 'function') {
            callback(new Error('Command not found'), '', 'error');
          }
          return {} as ReturnType<typeof exec>;
        });

        const server: MCPServerConfig = {
          name: 'failing-server',
          command: 'npx failing-server',
        };

        const result = await runner.addServer(server);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Command not found');
        expect(mockLogger.warning).toHaveBeenCalled();
      });
    });

    describe('collectServers', () => {
      it('should collect servers from enabled plugins', () => {
        const plugins: Plugin[] = [
          {
            meta: { name: 'plugin-a', commandName: 'a', version: '1.0.0', description: 'Plugin A' },
            mcpServers: [
              { name: 'server-a', command: 'npx server-a' },
            ],
          },
        ];

        const configs = new Map<string, PluginConfig>([
          ['plugin-a', { enabled: true, options: {} }],
        ]);

        const servers = runner.collectServers(plugins, configs);

        expect(servers).toHaveLength(1);
        expect(servers[0].name).toBe('server-a');
      });

      it('should skip disabled plugins', () => {
        const plugins: Plugin[] = [
          {
            meta: { name: 'disabled', commandName: 'd', version: '1.0.0', description: 'Disabled' },
            mcpServers: [{ name: 'disabled-server', command: 'npx disabled' }],
          },
        ];

        const configs = new Map<string, PluginConfig>([
          ['disabled', { enabled: false, options: {} }],
        ]);

        const servers = runner.collectServers(plugins, configs);

        expect(servers).toHaveLength(0);
      });
    });

    describe('writeAllServers', () => {
      it('should return empty array when no servers', async () => {
        const plugins: Plugin[] = [
          {
            meta: { name: 'no-servers', commandName: 'n', version: '1.0.0', description: 'No Servers' },
          },
        ];

        const configs = new Map<string, PluginConfig>([
          ['no-servers', { enabled: true, options: {} }],
        ]);

        const results = await runner.writeAllServers(plugins, configs);

        expect(results).toHaveLength(0);
      });

      it('should register all servers', async () => {
        vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
          if (typeof callback === 'function') {
            callback(null, 'success', '');
          }
          return {} as ReturnType<typeof exec>;
        });

        const plugins: Plugin[] = [
          {
            meta: { name: 'plugin', commandName: 'p', version: '1.0.0', description: 'Plugin' },
            mcpServers: [
              { name: 'server-1', command: 'npx server-1' },
              { name: 'server-2', command: 'npx server-2' },
            ],
          },
        ];

        const configs = new Map<string, PluginConfig>([
          ['plugin', { enabled: true, options: {} }],
        ]);

        const results = await runner.writeAllServers(plugins, configs);

        expect(results).toHaveLength(2);
        expect(results.every(r => r.success)).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith('Registering MCP servers...');
      });
    });
  });
});
