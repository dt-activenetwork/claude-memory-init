/**
 * Tests for MCPWriter
 *
 * Tests the MCP server registration functionality including:
 * - Template expansion
 * - Command building
 * - Server collection from plugins
 * - Registration execution
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type {
  Plugin,
  PluginConfig,
  MCPServerConfig,
  Logger,
} from '../../../src/plugin/types.js';

// Mock child_process exec
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';
import { MCPWriter, type MCPWriteResult } from '../../../src/core/mcp-writer.js';

describe('MCPWriter', () => {
  let writer: MCPWriter;
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

    writer = new MCPWriter(mockLogger, projectRoot, projectName);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('expandTemplates', () => {
    it('should replace ${PROJECT_ROOT} with actual project root', () => {
      const command = 'npx server --root ${PROJECT_ROOT}';
      const result = writer.expandTemplates(command);
      expect(result).toBe(`npx server --root ${projectRoot}`);
    });

    it('should replace ${PROJECT_NAME} with actual project name', () => {
      const command = 'npx server --name ${PROJECT_NAME}';
      const result = writer.expandTemplates(command);
      expect(result).toBe(`npx server --name ${projectName}`);
    });

    it('should replace multiple placeholders', () => {
      const command = 'npx server --root ${PROJECT_ROOT} --name ${PROJECT_NAME}';
      const result = writer.expandTemplates(command);
      expect(result).toBe(`npx server --root ${projectRoot} --name ${projectName}`);
    });

    it('should preserve $(pwd) for shell expansion', () => {
      const command = 'uvx server --project "$(pwd)"';
      const result = writer.expandTemplates(command);
      expect(result).toBe('uvx server --project "$(pwd)"');
    });

    it('should handle commands with no placeholders', () => {
      const command = 'npx simple-server';
      const result = writer.expandTemplates(command);
      expect(result).toBe('npx simple-server');
    });

    it('should handle multiple occurrences of the same placeholder', () => {
      const command = '${PROJECT_ROOT}/bin/server --config ${PROJECT_ROOT}/config.json';
      const result = writer.expandTemplates(command);
      expect(result).toBe(`${projectRoot}/bin/server --config ${projectRoot}/config.json`);
    });
  });

  describe('buildAddCommand', () => {
    it('should build basic command with default scope', () => {
      const server: MCPServerConfig = {
        name: 'test-server',
        command: 'npx test-mcp-server',
      };
      const result = writer.buildAddCommand(server);
      expect(result).toBe('claude mcp add --scope project test-server -- npx test-mcp-server');
    });

    it('should build command with user scope', () => {
      const server: MCPServerConfig = {
        name: 'global-server',
        command: 'npx global-mcp-server',
        scope: 'user',
      };
      const result = writer.buildAddCommand(server);
      expect(result).toBe('claude mcp add --scope user global-server -- npx global-mcp-server');
    });

    it('should expand templates in command', () => {
      const server: MCPServerConfig = {
        name: 'project-server',
        command: 'npx server --root ${PROJECT_ROOT}',
      };
      const result = writer.buildAddCommand(server);
      expect(result).toBe(`claude mcp add --scope project project-server -- npx server --root ${projectRoot}`);
    });

    it('should include additional args', () => {
      const server: MCPServerConfig = {
        name: 'server-with-args',
        command: 'npx mcp-server',
        args: ['--verbose', '--debug'],
      };
      const result = writer.buildAddCommand(server);
      expect(result).toBe('claude mcp add --scope project server-with-args -- npx mcp-server --verbose --debug');
    });

    it('should handle empty args array', () => {
      const server: MCPServerConfig = {
        name: 'server-empty-args',
        command: 'npx mcp-server',
        args: [],
      };
      const result = writer.buildAddCommand(server);
      expect(result).toBe('claude mcp add --scope project server-empty-args -- npx mcp-server');
    });

    it('should preserve shell syntax in command', () => {
      const server: MCPServerConfig = {
        name: 'serena',
        command: 'uvx --from git+https://github.com/oraios/serena serena start-mcp-server --project "$(pwd)"',
      };
      const result = writer.buildAddCommand(server);
      expect(result).toContain('"$(pwd)"');
    });
  });

  describe('addServer', () => {
    it('should successfully register a server', async () => {
      // Mock successful exec
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

      const result = await writer.addServer(server);

      expect(result.success).toBe(true);
      expect(result.name).toBe('test-server');
      expect(result.scope).toBe('project');
      expect(result.command).toContain('claude mcp add');
      expect(result.error).toBeUndefined();
      expect(mockLogger.success).toHaveBeenCalled();
    });

    it('should handle registration failure gracefully', async () => {
      // Mock failed exec
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

      const result = await writer.addServer(server);

      expect(result.success).toBe(false);
      expect(result.name).toBe('failing-server');
      expect(result.error).toContain('Command not found');
      expect(mockLogger.warning).toHaveBeenCalled();
    });

    it('should use correct scope from server config', async () => {
      vi.mocked(exec).mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'success', '');
        }
        return {} as ReturnType<typeof exec>;
      });

      const server: MCPServerConfig = {
        name: 'user-server',
        command: 'npx user-server',
        scope: 'user',
      };

      const result = await writer.addServer(server);

      expect(result.scope).toBe('user');
      expect(result.command).toContain('--scope user');
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
        {
          meta: { name: 'plugin-b', commandName: 'b', version: '1.0.0', description: 'Plugin B' },
          mcpServers: [
            { name: 'server-b', command: 'npx server-b' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['plugin-a', { enabled: true, options: {} }],
        ['plugin-b', { enabled: true, options: {} }],
      ]);

      const servers = writer.collectServers(plugins, configs);

      expect(servers).toHaveLength(2);
      expect(servers.map(s => s.name)).toContain('server-a');
      expect(servers.map(s => s.name)).toContain('server-b');
    });

    it('should skip disabled plugins', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'enabled-plugin', commandName: 'e', version: '1.0.0', description: 'Enabled' },
          mcpServers: [{ name: 'enabled-server', command: 'npx enabled' }],
        },
        {
          meta: { name: 'disabled-plugin', commandName: 'd', version: '1.0.0', description: 'Disabled' },
          mcpServers: [{ name: 'disabled-server', command: 'npx disabled' }],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['enabled-plugin', { enabled: true, options: {} }],
        ['disabled-plugin', { enabled: false, options: {} }],
      ]);

      const servers = writer.collectServers(plugins, configs);

      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('enabled-server');
    });

    it('should skip plugins without MCP servers', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'no-mcp', commandName: 'n', version: '1.0.0', description: 'No MCP' },
          // No mcpServers property
        },
        {
          meta: { name: 'empty-mcp', commandName: 'e', version: '1.0.0', description: 'Empty MCP' },
          mcpServers: [],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['no-mcp', { enabled: true, options: {} }],
        ['empty-mcp', { enabled: true, options: {} }],
      ]);

      const servers = writer.collectServers(plugins, configs);

      expect(servers).toHaveLength(0);
    });

    it('should evaluate condition functions', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'conditional', commandName: 'c', version: '1.0.0', description: 'Conditional' },
          mcpServers: [
            {
              name: 'enabled-by-condition',
              command: 'npx enabled',
              condition: (config) => config.options.enableMcp === true,
            },
            {
              name: 'disabled-by-condition',
              command: 'npx disabled',
              condition: (config) => config.options.enableMcp === false,
            },
            {
              name: 'no-condition',
              command: 'npx no-condition',
              // No condition - always included
            },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['conditional', { enabled: true, options: { enableMcp: true } }],
      ]);

      const servers = writer.collectServers(plugins, configs);

      expect(servers).toHaveLength(2);
      expect(servers.map(s => s.name)).toContain('enabled-by-condition');
      expect(servers.map(s => s.name)).toContain('no-condition');
      expect(servers.map(s => s.name)).not.toContain('disabled-by-condition');
    });

    it('should handle plugins without config', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'no-config', commandName: 'n', version: '1.0.0', description: 'No Config' },
          mcpServers: [{ name: 'orphan-server', command: 'npx orphan' }],
        },
      ];

      const configs = new Map<string, PluginConfig>();

      const servers = writer.collectServers(plugins, configs);

      expect(servers).toHaveLength(0);
    });

    it('should collect multiple servers from same plugin', () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'multi-server', commandName: 'm', version: '1.0.0', description: 'Multi Server' },
          mcpServers: [
            { name: 'server-1', command: 'npx server-1' },
            { name: 'server-2', command: 'npx server-2' },
            { name: 'server-3', command: 'npx server-3' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['multi-server', { enabled: true, options: {} }],
      ]);

      const servers = writer.collectServers(plugins, configs);

      expect(servers).toHaveLength(3);
    });
  });

  describe('writeAllServers', () => {
    it('should return empty array when no servers to register', async () => {
      const plugins: Plugin[] = [
        {
          meta: { name: 'no-servers', commandName: 'n', version: '1.0.0', description: 'No Servers' },
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['no-servers', { enabled: true, options: {} }],
      ]);

      const results = await writer.writeAllServers(plugins, configs);

      expect(results).toHaveLength(0);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should register all collected servers', async () => {
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

      const results = await writer.writeAllServers(plugins, configs);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Registering MCP servers...');
      expect(mockLogger.success).toHaveBeenCalledTimes(3); // 2 individual + 1 summary
    });

    it('should log warning when some registrations fail', async () => {
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
          mcpServers: [
            { name: 'success-server', command: 'npx success' },
            { name: 'fail-server', command: 'npx fail' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['mixed', { enabled: true, options: {} }],
      ]);

      const results = await writer.writeAllServers(plugins, configs);

      expect(results).toHaveLength(2);
      expect(results.filter(r => r.success)).toHaveLength(1);
      expect(results.filter(r => !r.success)).toHaveLength(1);
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('1 succeeded, 1 failed')
      );
    });

    it('should continue registering after a failure', async () => {
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
          mcpServers: [
            { name: 'server-1', command: 'npx server-1' },
            { name: 'server-2', command: 'npx server-2' },
            { name: 'server-3', command: 'npx server-3' },
          ],
        },
      ];

      const configs = new Map<string, PluginConfig>([
        ['resilient', { enabled: true, options: {} }],
      ]);

      const results = await writer.writeAllServers(plugins, configs);

      expect(results).toHaveLength(3);
      expect(results.filter(r => r.success)).toHaveLength(2);
      expect(results.filter(r => !r.success)).toHaveLength(1);
    });
  });
});
