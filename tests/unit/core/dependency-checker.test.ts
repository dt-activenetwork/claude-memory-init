/**
 * Tests for Dependency Checker
 *
 * Tests the plugin dependency checking and installation functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Plugin, ToolDependency } from '../../../src/plugin/types.js';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
}));

// Mock the system-detector module
vi.mock('../../../src/core/system-detector.js', () => ({
  commandExists: vi.fn(),
  getCommandVersion: vi.fn(),
  getOS: vi.fn(),
  getInstallCommand: vi.fn(),
}));

import {
  DependencyChecker,
  createDependencyChecker,
  type InstallResult,
} from '../../../src/core/dependency-checker.js';
import {
  commandExists,
  getCommandVersion,
  getOS,
} from '../../../src/core/system-detector.js';
import { exec, spawn } from 'child_process';

describe('DependencyChecker', () => {
  let checker: DependencyChecker;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default OS mock
    vi.mocked(getOS).mockResolvedValue({
      platform: 'linux',
      name: 'Ubuntu 22.04',
      version: '22.04',
      packageManager: 'apt',
    });

    checker = new DependencyChecker();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkToolDependency', () => {
    it('should return available=true when tool exists', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: 'tool version 1.0.0' });
        return {} as any;
      });

      const dep: ToolDependency = { name: 'git' };
      const result = await checker.checkToolDependency(dep);

      expect(result.name).toBe('git');
      expect(result.available).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should return available=false when tool does not exist', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const dep: ToolDependency = { name: 'nonexistent' };
      const result = await checker.checkToolDependency(dep);

      expect(result.available).toBe(false);
    });

    it('should use custom checkCommand', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback) => {
        expect(cmd).toBe('pip --version || pip3 --version');
        (callback as Function)(null, { stdout: 'pip 23.0.1' });
        return {} as any;
      });

      const dep: ToolDependency = {
        name: 'pip',
        checkCommand: 'pip --version || pip3 --version',
      };
      await checker.checkToolDependency(dep);
    });

    it('should return canInstall=true when install command is available', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const dep: ToolDependency = {
        name: 'ast-grep',
        installCommands: {
          linux: 'cargo install ast-grep',
        },
      };
      const result = await checker.checkToolDependency(dep);

      expect(result.available).toBe(false);
      expect(result.canInstall).toBe(true);
      expect(result.installCommand).toBe('cargo install ast-grep');
    });

    it('should return canInstall=false when no install command for platform', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const dep: ToolDependency = {
        name: 'tool',
        installCommands: {
          darwin: 'brew install tool',
          // No linux install command
        },
      };
      const result = await checker.checkToolDependency(dep);

      expect(result.canInstall).toBe(false);
      expect(result.installCommand).toBeUndefined();
    });
  });

  describe('checkPlugin', () => {
    it('should return available=true for plugin with no dependencies', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
      };

      const status = await checker.checkPlugin(plugin);

      expect(status.pluginName).toBe('test-plugin');
      expect(status.available).toBe(true);
      expect(status.missingRequired).toHaveLength(0);
      expect(status.toInstall).toHaveLength(0);
    });

    it('should return available=true when all required deps are satisfied', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: 'version 1.0.0' });
        return {} as any;
      });

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          toolDependencies: [
            { name: 'git' },
            { name: 'node' },
          ],
        },
      };

      const status = await checker.checkPlugin(plugin);

      expect(status.available).toBe(true);
      expect(status.toInstall).toHaveLength(0);
    });

    it('should return available=false when required dep cannot be satisfied', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          toolDependencies: [
            { name: 'unavailable-tool' },
          ],
        },
      };

      const status = await checker.checkPlugin(plugin);

      expect(status.available).toBe(false);
      expect(status.missingRequired).toContain('unavailable-tool');
      expect(status.disabledReason).toContain('unavailable-tool');
    });

    it('should add installable deps to toInstall list', async () => {
      let callCount = 0;
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        callCount++;
        // First call (git check): success
        // Second call (ast-grep check): fail
        if (callCount <= 1) {
          (callback as Function)(null, { stdout: 'version 1.0.0' });
        } else {
          (callback as Function)(new Error('Command not found'));
        }
        return {} as any;
      });

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          toolDependencies: [
            { name: 'git' },
            {
              name: 'ast-grep',
              installCommands: {
                linux: 'cargo install ast-grep',
              },
            },
          ],
        },
      };

      const status = await checker.checkPlugin(plugin);

      expect(status.available).toBe(true);
      expect(status.toInstall).toHaveLength(1);
      expect(status.toInstall[0].name).toBe('ast-grep');
    });

    it('should handle optional dependencies', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          toolDependencies: [
            { name: 'optional-tool', optional: true },
          ],
        },
      };

      const status = await checker.checkPlugin(plugin);

      // Should be available because dep is optional
      expect(status.available).toBe(true);
      expect(status.missingRequired).toHaveLength(0);
    });
  });

  describe('checkAllPlugins', () => {
    it('should check all plugins and return map', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: 'version 1.0.0' });
        return {} as any;
      });

      const plugins: Plugin[] = [
        {
          meta: {
            name: 'plugin-a',
            commandName: 'a',
            version: '1.0.0',
            description: 'Plugin A',
          },
        },
        {
          meta: {
            name: 'plugin-b',
            commandName: 'b',
            version: '1.0.0',
            description: 'Plugin B',
            toolDependencies: [{ name: 'git' }],
          },
        },
      ];

      const statuses = await checker.checkAllPlugins(plugins);

      expect(statuses.size).toBe(2);
      expect(statuses.has('plugin-a')).toBe(true);
      expect(statuses.has('plugin-b')).toBe(true);
      expect(statuses.get('plugin-a')?.available).toBe(true);
      expect(statuses.get('plugin-b')?.available).toBe(true);
    });

    it('should handle empty plugin array', async () => {
      const statuses = await checker.checkAllPlugins([]);
      expect(statuses.size).toBe(0);
    });
  });

  describe('installTool', () => {
    it('should return success=true if tool is already installed', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: 'version 1.0.0' });
        return {} as any;
      });

      const dep: ToolDependency = { name: 'git' };
      const result = await checker.installTool(dep);

      expect(result.success).toBe(true);
      expect(result.output).toContain('already installed');
    });

    it('should return error when no install command for platform', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const dep: ToolDependency = {
        name: 'tool',
        installCommands: {
          darwin: 'brew install tool',
          // No linux command
        },
      };
      const result = await checker.installTool(dep);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No install command');
    });

    it('should execute install command and verify installation', async () => {
      let installCalled = false;
      let checkCallCount = 0;

      // Mock spawn for install command
      vi.mocked(spawn).mockImplementation(() => {
        installCalled = true;
        const mockProcess = {
          stdout: { on: vi.fn((event, cb) => { if (event === 'data') cb('Installing...'); }) },
          stderr: { on: vi.fn() },
          on: vi.fn((event, cb) => { if (event === 'close') setTimeout(() => cb(0), 10); }),
          kill: vi.fn(),
        };
        return mockProcess as any;
      });

      // Mock exec for tool checks
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        checkCallCount++;
        // First check: not installed
        // After install: installed
        if (checkCallCount <= 1) {
          (callback as Function)(new Error('Command not found'));
        } else {
          (callback as Function)(null, { stdout: 'version 1.0.0' });
        }
        return {} as any;
      });

      const dep: ToolDependency = {
        name: 'tool',
        installCommands: {
          linux: 'apt install tool',
        },
      };
      const result = await checker.installTool(dep);

      expect(installCalled).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should return error when installation command fails', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn((event, cb) => { if (event === 'data') cb('Error occurred'); }) },
          on: vi.fn((event, cb) => {
            if (event === 'close') setTimeout(() => cb(1), 10);
          }),
          kill: vi.fn(),
        };
        return mockProcess as any;
      });

      const dep: ToolDependency = {
        name: 'tool',
        installCommands: {
          linux: 'apt install tool',
        },
      };
      const result = await checker.installTool(dep);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getToolsToInstall', () => {
    it('should return deduplicated list of tools to install', async () => {
      const plugins: Plugin[] = [
        {
          meta: {
            name: 'plugin-a',
            commandName: 'a',
            version: '1.0.0',
            description: 'A',
            toolDependencies: [
              { name: 'tool-a', installCommands: { linux: 'install a' } },
              { name: 'shared-tool', installCommands: { linux: 'install shared' } },
            ],
          },
        },
        {
          meta: {
            name: 'plugin-b',
            commandName: 'b',
            version: '1.0.0',
            description: 'B',
            toolDependencies: [
              { name: 'shared-tool', installCommands: { linux: 'install shared' } },
              { name: 'tool-b', installCommands: { linux: 'install b' } },
            ],
          },
        },
      ];

      const statuses = new Map([
        ['plugin-a', {
          pluginName: 'plugin-a',
          available: true,
          missingRequired: [],
          toInstall: [
            { name: 'tool-a', installCommands: { linux: 'install a' } },
            { name: 'shared-tool', installCommands: { linux: 'install shared' } },
          ],
        }],
        ['plugin-b', {
          pluginName: 'plugin-b',
          available: true,
          missingRequired: [],
          toInstall: [
            { name: 'shared-tool', installCommands: { linux: 'install shared' } },
            { name: 'tool-b', installCommands: { linux: 'install b' } },
          ],
        }],
      ]);

      const tools = checker.getToolsToInstall(plugins, statuses);

      // Should have 3 unique tools (shared-tool deduplicated)
      expect(tools).toHaveLength(3);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('tool-a');
      expect(toolNames).toContain('shared-tool');
      expect(toolNames).toContain('tool-b');
    });

    it('should handle plugins not in status map', async () => {
      const plugins: Plugin[] = [
        {
          meta: {
            name: 'unknown-plugin',
            commandName: 'unknown',
            version: '1.0.0',
            description: 'Unknown',
          },
        },
      ];

      const statuses = new Map();
      const tools = checker.getToolsToInstall(plugins, statuses);

      expect(tools).toHaveLength(0);
    });
  });

  describe('installTools', () => {
    it('should install multiple tools sequentially', async () => {
      const installOrder: string[] = [];

      vi.mocked(exec).mockImplementation((cmd, callback) => {
        (callback as Function)(null, { stdout: 'version 1.0.0' });
        return {} as any;
      });

      // Override installTool to track order
      const originalInstallTool = checker.installTool.bind(checker);
      checker.installTool = vi.fn(async (dep) => {
        installOrder.push(dep.name);
        return { success: true };
      });

      const tools: ToolDependency[] = [
        { name: 'tool-a' },
        { name: 'tool-b' },
        { name: 'tool-c' },
      ];

      const progressCalls: Array<{ tool: string; status: string }> = [];
      const results = await checker.installTools(tools, (tool, status) => {
        progressCalls.push({ tool, status });
      });

      expect(results.size).toBe(3);
      expect(installOrder).toEqual(['tool-a', 'tool-b', 'tool-c']);
      expect(progressCalls.filter(p => p.status === 'installing')).toHaveLength(3);
      expect(progressCalls.filter(p => p.status === 'success')).toHaveLength(3);
    });
  });

  describe('createDependencyChecker', () => {
    it('should create a new DependencyChecker instance', () => {
      const instance = createDependencyChecker();
      expect(instance).toBeInstanceOf(DependencyChecker);
    });
  });
});
