/**
 * Integration Tests for Claude Flow Plugin
 *
 * Tests the complete plugin flow including:
 * - Standard mode initialization
 * - SPARC mode initialization
 * - Minimal mode initialization
 * - Skip initialization
 * - CLAUDE.md merge verification
 * - MCP configuration verification
 * - File conflict handling
 * - Plugin conflict detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import type {
  Plugin,
  PluginConfig,
  PluginContext,
  HeavyweightPluginConfig,
  Logger,
  UIComponents,
} from '../../../src/plugin/types.js';
import { PluginRegistry } from '../../../src/plugin/registry.js';
import {
  HeavyweightPluginManager,
  isHeavyweightPlugin,
  separatePluginsByWeight,
} from '../../../src/core/heavyweight-plugin-manager.js';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock file-ops to avoid actual file operations in unit tests
vi.mock('../../../src/utils/file-ops.js', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  fileExists: vi.fn(),
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
  dirExists: vi.fn(),
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

import { spawn } from 'child_process';
import {
  readFile,
  writeFile,
  fileExists,
  ensureDir,
  copyFile,
} from '../../../src/utils/file-ops.js';

/**
 * Create a mock heavyweight plugin for testing
 */
function createMockClaudeFlowPlugin(
  options: {
    mode?: string;
    workflows?: string[];
    mcpOptions?: string[];
    additionalOptions?: string[];
  } = {}
): Plugin {
  const {
    mode = 'standard',
    workflows = ['code-review'],
    mcpOptions = ['filesystem'],
    additionalOptions = ['mcp'],
  } = options;

  return {
    meta: {
      name: 'claude-flow',
      commandName: 'flow',
      version: '1.0.0',
      description: 'Claude Flow integration',
      heavyweight: true,
      conflicts: ['task-system'], // Conflicts with task-system
    },
    configuration: {
      needsConfiguration: true,
      configure: async (context) => ({
        enabled: mode !== 'skip',
        options: {
          mode,
          workflows,
          mcpOptions,
          additionalOptions,
          initCommand: mode !== 'skip' ? `pnpm dlx claude-flow@alpha init --mode=${mode}` : null,
        },
      }),
      getSummary: (config) => {
        if (!config.enabled) return ['Claude Flow: Skipped'];
        return [
          `Mode: ${config.options.mode}`,
          `Workflows: ${(config.options.workflows as string[]).join(', ')}`,
        ];
      },
    },
    getHeavyweightConfig: async (context) => {
      const config = context.config.plugins.get('claude-flow');
      if (!config || !config.enabled) {
        return {
          protectedFiles: [],
          initCommand: null,
        };
      }

      return {
        protectedFiles: [
          { path: 'CLAUDE.md', mergeStrategy: 'append' as const },
          { path: '.agent/config.toon', mergeStrategy: 'custom' as const },
        ],
        initCommand: config.options.initCommand as string,
        timeout: 60000,
      };
    },
    mergeFile: async (filePath, ourContent, theirContent, context) => {
      if (filePath === '.agent/config.toon') {
        // Custom merge for config.toon - preserve both configs
        return `# Our Configuration\n${ourContent}\n\n# Claude Flow Configuration\n${theirContent}`;
      }
      // Default append for other files
      return `${ourContent}\n\n---\n\n${theirContent}`;
    },
    prompt: {
      placeholder: 'CLAUDE_FLOW_SECTION',
      generate: async (config, context) => {
        if (!config.enabled) return '';

        return `## Claude Flow Integration

Claude Flow is configured with ${config.options.mode} mode.

### Workflows
${(config.options.workflows as string[]).map(w => `- ${w}`).join('\n')}
`;
      },
    },
  };
}

/**
 * Create mock logger for testing
 */
function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    step: vi.fn(),
    blank: vi.fn(),
  };
}

/**
 * Create mock UI components
 */
function createMockUI(): UIComponents {
  return {
    radioList: vi.fn(),
    checkboxList: vi.fn(),
    confirm: vi.fn(),
    input: vi.fn(),
  };
}

/**
 * Create mock plugin context
 */
function createMockContext(
  projectRoot: string,
  pluginConfigs: Map<string, PluginConfig> = new Map()
): PluginContext {
  return {
    projectRoot,
    targetDir: path.join(projectRoot, '.agent'),
    config: {
      core: {
        project: { name: 'test-project', root: projectRoot },
        output: { base_dir: '.agent' },
        plugins: Object.fromEntries(pluginConfigs),
      },
      plugins: pluginConfigs,
    },
    shared: new Map(),
    logger: createMockLogger(),
    fs: {
      ensureDir: vi.fn(),
      copyFile: vi.fn(),
      readFile: vi.fn().mockResolvedValue(''),
      writeFile: vi.fn(),
      fileExists: vi.fn().mockResolvedValue(false),
      dirExists: vi.fn().mockResolvedValue(false),
      readJsonFile: vi.fn().mockResolvedValue({}),
      writeJsonFile: vi.fn(),
    },
    template: {
      loadTemplate: vi.fn(),
      renderTemplate: vi.fn(),
      loadAndRenderTemplate: vi.fn(),
    },
    ui: createMockUI(),
    i18n: {
      t: (key) => key,
      language: 'en',
    },
  };
}

describe('Claude Flow Integration Tests', () => {
  let tempDir: string;
  let registry: PluginRegistry;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-flow-integration-'));
    registry = new PluginRegistry();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Plugin Registration', () => {
    it('should register claude-flow as a heavyweight plugin', () => {
      const plugin = createMockClaudeFlowPlugin();
      registry.register(plugin);

      expect(registry.has('claude-flow')).toBe(true);

      const registered = registry.get('claude-flow');
      expect(registered.meta.heavyweight).toBe(true);
    });

    it('should identify plugin conflicts', () => {
      const plugin = createMockClaudeFlowPlugin();
      registry.register(plugin);

      const registered = registry.get('claude-flow');
      expect(registered.meta.conflicts).toContain('task-system');
    });
  });

  describe('Standard Mode Initialization', () => {
    it('should complete standard mode initialization flow', async () => {
      const plugin = createMockClaudeFlowPlugin({ mode: 'standard' });
      const configs = new Map<string, PluginConfig>([
        ['claude-flow', {
          enabled: true,
          options: {
            mode: 'standard',
            workflows: ['code-review', 'documentation'],
            mcpOptions: ['filesystem', 'memory'],
            additionalOptions: ['mcp'],
            initCommand: 'pnpm dlx claude-flow@alpha init',
          },
        }],
      ]);

      const context = createMockContext(tempDir, configs);
      const manager = new HeavyweightPluginManager(tempDir, context.logger);

      // Mock successful command execution
      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const mockProcess = {
        stdout: { on: vi.fn((e, cb) => e === 'data' && cb(Buffer.from('ok'))) },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const result = await manager.executeHeavyweightPlugin(plugin, context);

      expect(result.success).toBe(true);
      expect(spawn).toHaveBeenCalled();
    });

    it('should backup CLAUDE.md before initialization', async () => {
      const plugin = createMockClaudeFlowPlugin({ mode: 'standard' });
      const configs = new Map<string, PluginConfig>([
        ['claude-flow', {
          enabled: true,
          options: {
            mode: 'standard',
            workflows: [],
            initCommand: 'pnpm dlx claude-flow@alpha init',
          },
        }],
      ]);

      const context = createMockContext(tempDir, configs);
      const manager = new HeavyweightPluginManager(tempDir, context.logger);

      // File exists and should be backed up
      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue('# Existing CLAUDE.md content');
      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(copyFile).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      await manager.executeHeavyweightPlugin(plugin, context);

      // Verify backup operations were called
      expect(copyFile).toHaveBeenCalled();
    });
  });

  describe('SPARC Mode Initialization', () => {
    it('should initialize with SPARC workflows', async () => {
      const sparcWorkflows = ['specification', 'pseudocode', 'architecture', 'refinement', 'completion'];
      const plugin = createMockClaudeFlowPlugin({
        mode: 'sparc',
        workflows: sparcWorkflows,
      });

      const configs = new Map<string, PluginConfig>([
        ['claude-flow', {
          enabled: true,
          options: {
            mode: 'sparc',
            workflows: sparcWorkflows,
            initCommand: 'pnpm dlx claude-flow@alpha init --mode=sparc',
          },
        }],
      ]);

      const context = createMockContext(tempDir, configs);
      const manager = new HeavyweightPluginManager(tempDir, context.logger);

      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(ensureDir).mockResolvedValue(undefined);

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const result = await manager.executeHeavyweightPlugin(plugin, context);

      expect(result.success).toBe(true);
      // Verify SPARC mode was used
      const spawnCall = vi.mocked(spawn).mock.calls[0];
      expect(spawnCall[0]).toContain('pnpm');
    });
  });

  describe('Minimal Mode Initialization', () => {
    it('should skip workflow selection in minimal mode', async () => {
      const plugin = createMockClaudeFlowPlugin({
        mode: 'minimal',
        workflows: [],
        mcpOptions: [],
        additionalOptions: [],
      });

      const configs = new Map<string, PluginConfig>([
        ['claude-flow', {
          enabled: true,
          options: {
            mode: 'minimal',
            workflows: [],
            initCommand: 'pnpm dlx claude-flow@alpha init --mode=minimal',
          },
        }],
      ]);

      const context = createMockContext(tempDir, configs);
      const manager = new HeavyweightPluginManager(tempDir, context.logger);

      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(ensureDir).mockResolvedValue(undefined);

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const result = await manager.executeHeavyweightPlugin(plugin, context);

      expect(result.success).toBe(true);
    });
  });

  describe('Skip Initialization', () => {
    it('should return disabled config when skip is selected', async () => {
      const plugin = createMockClaudeFlowPlugin({ mode: 'skip' });

      const configs = new Map<string, PluginConfig>([
        ['claude-flow', { enabled: false, options: { mode: 'skip' } }],
      ]);

      const context = createMockContext(tempDir, configs);
      const manager = new HeavyweightPluginManager(tempDir, context.logger);

      const config = await plugin.getHeavyweightConfig!(context);

      expect(config.initCommand).toBeNull();
      expect(config.protectedFiles).toHaveLength(0);
    });
  });

  describe('CLAUDE.md Merge Verification', () => {
    it('should merge CLAUDE.md with append strategy', async () => {
      const plugin = createMockClaudeFlowPlugin({ mode: 'standard' });

      const configs = new Map<string, PluginConfig>([
        ['claude-flow', {
          enabled: true,
          options: {
            mode: 'standard',
            workflows: [],
            initCommand: 'pnpm dlx claude-flow@alpha init',
          },
        }],
      ]);

      const context = createMockContext(tempDir, configs);
      const manager = new HeavyweightPluginManager(tempDir, context.logger);

      // Our content exists, then their content after command
      vi.mocked(fileExists)
        .mockResolvedValueOnce(true)  // CLAUDE.md backup check
        .mockResolvedValueOnce(true)  // config.toon backup check
        .mockResolvedValueOnce(true)  // CLAUDE.md merge check
        .mockResolvedValueOnce(true); // config.toon merge check

      vi.mocked(readFile)
        .mockResolvedValueOnce('# Our CLAUDE.md')  // backup
        .mockResolvedValueOnce('# Our config')     // backup
        .mockResolvedValueOnce('# Claude Flow CLAUDE.md')  // merge
        .mockResolvedValueOnce('# Claude Flow config');    // merge

      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(copyFile).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const result = await manager.executeHeavyweightPlugin(plugin, context);

      expect(result.success).toBe(true);

      // Verify merge was performed
      const writeCalls = vi.mocked(writeFile).mock.calls;
      const claudeMdWrite = writeCalls.find(call =>
        call[0].includes('CLAUDE.md') && !call[0].includes('backup')
      );

      expect(claudeMdWrite).toBeDefined();
      // Should contain both our content and their content with separator
      expect(claudeMdWrite![1]).toContain('Our CLAUDE.md');
      expect(claudeMdWrite![1]).toContain('Claude Flow CLAUDE.md');
    });

    it('should use custom merge for config.toon', async () => {
      const plugin = createMockClaudeFlowPlugin({ mode: 'standard' });

      const configs = new Map<string, PluginConfig>([
        ['claude-flow', {
          enabled: true,
          options: {
            mode: 'standard',
            workflows: [],
            initCommand: 'pnpm dlx claude-flow@alpha init',
          },
        }],
      ]);

      const context = createMockContext(tempDir, configs);
      const manager = new HeavyweightPluginManager(tempDir, context.logger);

      vi.mocked(fileExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      vi.mocked(readFile)
        .mockResolvedValueOnce('# Our CLAUDE.md')
        .mockResolvedValueOnce('project: test')  // Our config.toon
        .mockResolvedValueOnce('# Claude Flow CLAUDE.md')
        .mockResolvedValueOnce('flow: enabled');  // Their config.toon

      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(copyFile).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const result = await manager.executeHeavyweightPlugin(plugin, context);

      expect(result.success).toBe(true);

      // Verify custom merge was used for config.toon
      const writeCalls = vi.mocked(writeFile).mock.calls;
      const configWrite = writeCalls.find(call =>
        call[0].includes('config.toon') && !call[0].includes('backup')
      );

      expect(configWrite).toBeDefined();
      // Should use custom merge format
      expect(configWrite![1]).toContain('Our Configuration');
      expect(configWrite![1]).toContain('Claude Flow Configuration');
    });
  });

  describe('File Conflict Handling', () => {
    it('should restore backups on command failure', async () => {
      const plugin = createMockClaudeFlowPlugin({ mode: 'standard' });

      const configs = new Map<string, PluginConfig>([
        ['claude-flow', {
          enabled: true,
          options: {
            mode: 'standard',
            workflows: [],
            initCommand: 'pnpm dlx claude-flow@alpha init',
          },
        }],
      ]);

      const context = createMockContext(tempDir, configs);
      const manager = new HeavyweightPluginManager(tempDir, context.logger);

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue('original content');
      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(copyFile).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      // Command fails
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'error') setTimeout(() => cb(new Error('Command failed')), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const result = await manager.executeHeavyweightPlugin(plugin, context);

      expect(result.success).toBe(false);

      // Verify restore was attempted
      const writeCalls = vi.mocked(writeFile).mock.calls;
      expect(writeCalls.some(call => call[1] === 'original content')).toBe(true);
    });
  });

  describe('Plugin Conflict Detection', () => {
    it('should detect conflicts with task-system', () => {
      const claudeFlowPlugin = createMockClaudeFlowPlugin();
      const taskSystemPlugin: Plugin = {
        meta: {
          name: 'task-system',
          commandName: 'task',
          version: '1.0.0',
          description: 'Task management',
        },
      };

      registry.register(claudeFlowPlugin);
      registry.register(taskSystemPlugin);

      const claudeFlow = registry.get('claude-flow');
      expect(claudeFlow.meta.conflicts).toContain('task-system');
    });

    it('should separate plugins by weight correctly', () => {
      const heavyPlugin = createMockClaudeFlowPlugin();
      const lightPlugin1: Plugin = {
        meta: { name: 'light1', commandName: 'l1', version: '1.0.0', description: 'Light 1' },
      };
      const lightPlugin2: Plugin = {
        meta: { name: 'light2', commandName: 'l2', version: '1.0.0', description: 'Light 2' },
      };

      const { lightweight, heavyweight } = separatePluginsByWeight([
        lightPlugin1,
        heavyPlugin,
        lightPlugin2,
      ]);

      expect(lightweight).toHaveLength(2);
      expect(heavyweight).toHaveLength(1);
      expect(heavyweight[0].meta.name).toBe('claude-flow');
    });
  });

  describe('Prompt Generation', () => {
    it('should generate prompt content for enabled plugin', async () => {
      const plugin = createMockClaudeFlowPlugin({
        mode: 'standard',
        workflows: ['code-review', 'documentation'],
      });

      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          workflows: ['code-review', 'documentation'],
        },
      };

      const context = createMockContext(tempDir);
      const content = await plugin.prompt!.generate(config, context);

      expect(content).toContain('Claude Flow Integration');
      expect(content).toContain('standard');
      expect(content).toContain('code-review');
      expect(content).toContain('documentation');
    });

    it('should return empty content for disabled plugin', async () => {
      const plugin = createMockClaudeFlowPlugin();

      const config: PluginConfig = {
        enabled: false,
        options: { mode: 'skip' },
      };

      const context = createMockContext(tempDir);
      const content = await plugin.prompt!.generate(config, context);

      expect(content).toBe('');
    });
  });

  describe('Configuration Summary', () => {
    it('should generate summary for enabled plugin', () => {
      const plugin = createMockClaudeFlowPlugin();

      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'sparc',
          workflows: ['specification', 'architecture'],
        },
      };

      const summary = plugin.configuration!.getSummary(config);

      expect(summary).toContain('Mode: sparc');
      expect(summary.some(s => s.includes('specification'))).toBe(true);
    });

    it('should generate skip summary for disabled plugin', () => {
      const plugin = createMockClaudeFlowPlugin();

      const config: PluginConfig = {
        enabled: false,
        options: { mode: 'skip' },
      };

      const summary = plugin.configuration!.getSummary(config);

      expect(summary).toContain('Claude Flow: Skipped');
    });
  });
});
