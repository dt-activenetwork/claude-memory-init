/**
 * Tests for PostInitCollector
 *
 * Tests the post-initialization data collection functionality including:
 * - Skill and slash command collection
 * - Post-init contribution aggregation
 * - Manual step generation for skills
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  Plugin,
  PluginConfig,
  PluginContext,
  Logger,
  PostInitContribution,
} from '../../../src/plugin/types.js';
import { PostInitCollector, AggregatedPostInitData } from '../../../src/core/post-init-collector.js';

describe('PostInitCollector', () => {
  let collector: PostInitCollector;
  let mockLogger: Logger;
  let mockContext: PluginContext;

  beforeEach(() => {
    collector = new PostInitCollector();

    mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      step: vi.fn(),
      blank: vi.fn(),
    };

    mockContext = {
      projectRoot: '/test/project',
      targetDir: '/test/project',
      config: {
        core: {
          project: { name: 'test-project', root: '/test/project' },
          output: { base_dir: '.agent' },
          plugins: {},
        },
        plugins: new Map(),
      },
      shared: new Map(),
      logger: mockLogger,
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
      ui: {
        checkboxList: vi.fn().mockResolvedValue([]),
        radioList: vi.fn().mockResolvedValue(''),
        confirm: vi.fn().mockResolvedValue(true),
        input: vi.fn().mockResolvedValue(''),
      },
      i18n: {
        t: (key: string) => key,
        language: 'en',
      },
    };
  });

  describe('collectAll', () => {
    it('should return empty data for empty plugin array', async () => {
      const result = await collector.collectAll([], new Map(), mockContext);

      expect(result.manualSteps).toEqual([]);
      expect(result.messages).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.mcpServers).toEqual([]);
      expect(result.skills).toEqual([]);
      expect(result.slashCommands).toEqual([]);
      expect(result.installedDependencies).toEqual([]);
    });

    it('should collect skills from enabled plugins', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
        skills: [
          {
            name: 'skill-1',
            description: 'First skill',
            version: '1.0.0',
            templatePath: 'skills/skill-1.md',
          },
          {
            name: 'skill-2',
            description: 'Second skill',
            version: '1.0.0',
            templatePath: 'skills/skill-2.md',
          },
        ],
      };

      const configs = new Map<string, PluginConfig>([
        ['test-plugin', { enabled: true, options: {} }],
      ]);

      const result = await collector.collectAll([plugin], configs, mockContext);

      expect(result.skills).toHaveLength(2);
      expect(result.skills[0]).toEqual({ name: 'skill-1', description: 'First skill' });
      expect(result.skills[1]).toEqual({ name: 'skill-2', description: 'Second skill' });
    });

    it('should not collect skills from disabled plugins', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
        skills: [
          {
            name: 'skill-1',
            description: 'First skill',
            version: '1.0.0',
            templatePath: 'skills/skill-1.md',
          },
        ],
      };

      const configs = new Map<string, PluginConfig>([
        ['test-plugin', { enabled: false, options: {} }],
      ]);

      const result = await collector.collectAll([plugin], configs, mockContext);

      expect(result.skills).toHaveLength(0);
    });

    it('should collect slash commands from enabled plugins', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
        slashCommands: [
          {
            name: 'cmd-1',
            description: 'First command',
            argumentHint: '<arg>',
            templatePath: 'commands/cmd-1.md',
          },
          {
            name: 'cmd-2',
            description: 'Second command',
            templatePath: 'commands/cmd-2.md',
          },
        ],
      };

      const configs = new Map<string, PluginConfig>([
        ['test-plugin', { enabled: true, options: {} }],
      ]);

      const result = await collector.collectAll([plugin], configs, mockContext);

      expect(result.slashCommands).toHaveLength(2);
      expect(result.slashCommands[0]).toEqual({
        name: 'cmd-1',
        description: 'First command',
        argumentHint: '<arg>',
      });
      expect(result.slashCommands[1]).toEqual({
        name: 'cmd-2',
        description: 'Second command',
        argumentHint: undefined,
      });
    });

    it('should generate skill install steps when skills exist', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
        skills: [
          {
            name: 'my-skill',
            description: 'A useful skill',
            version: '1.0.0',
            templatePath: 'skills/my-skill.md',
          },
        ],
      };

      const configs = new Map<string, PluginConfig>([
        ['test-plugin', { enabled: true, options: {} }],
      ]);

      const result = await collector.collectAll([plugin], configs, mockContext);

      // Should have one optional manual step about skills
      const skillSteps = result.manualSteps.filter(s => s.category === 'skill-install');
      expect(skillSteps).toHaveLength(1);
      expect(skillSteps[0].optional).toBe(true);
      expect(skillSteps[0].description).toContain('my-skill');
      expect(skillSteps[0].command).toContain('.claude/skills/');
    });

    it('should not generate skill steps when no skills exist', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
        slashCommands: [
          {
            name: 'cmd-1',
            description: 'Command only',
            templatePath: 'commands/cmd-1.md',
          },
        ],
      };

      const configs = new Map<string, PluginConfig>([
        ['test-plugin', { enabled: true, options: {} }],
      ]);

      const result = await collector.collectAll([plugin], configs, mockContext);

      const skillSteps = result.manualSteps.filter(s => s.category === 'skill-install');
      expect(skillSteps).toHaveLength(0);
    });

    it('should collect post-init contributions from plugins', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
        getPostInitContribution: vi.fn().mockReturnValue({
          pluginName: 'test-plugin',
          manualSteps: [
            {
              description: 'Run this command',
              command: 'npm run setup',
              optional: false,
            },
          ],
          messages: ['Plugin initialized successfully'],
          warnings: ['Configuration may need adjustment'],
        }),
      };

      const configs = new Map<string, PluginConfig>([
        ['test-plugin', { enabled: true, options: {} }],
      ]);

      const result = await collector.collectAll([plugin], configs, mockContext);

      // Check manual steps
      const pluginSteps = result.manualSteps.filter(s => s.category !== 'skill-install');
      expect(pluginSteps).toHaveLength(1);
      expect(pluginSteps[0].description).toBe('Run this command');
      expect(pluginSteps[0].command).toBe('npm run setup');

      // Check messages
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual({
        pluginName: 'test-plugin',
        message: 'Plugin initialized successfully',
      });

      // Check warnings
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toEqual({
        pluginName: 'test-plugin',
        warning: 'Configuration may need adjustment',
      });
    });

    it('should not call getPostInitContribution for disabled plugins', async () => {
      const getContribution = vi.fn();
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
        getPostInitContribution: getContribution,
      };

      const configs = new Map<string, PluginConfig>([
        ['test-plugin', { enabled: false, options: {} }],
      ]);

      await collector.collectAll([plugin], configs, mockContext);

      expect(getContribution).not.toHaveBeenCalled();
    });

    it('should handle getPostInitContribution returning undefined', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
        getPostInitContribution: vi.fn().mockReturnValue(undefined),
      };

      const configs = new Map<string, PluginConfig>([
        ['test-plugin', { enabled: true, options: {} }],
      ]);

      const result = await collector.collectAll([plugin], configs, mockContext);

      expect(result.manualSteps.filter(s => s.category !== 'skill-install')).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle getPostInitContribution throwing error', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
        },
        getPostInitContribution: vi.fn().mockImplementation(() => {
          throw new Error('Plugin error');
        }),
      };

      const configs = new Map<string, PluginConfig>([
        ['test-plugin', { enabled: true, options: {} }],
      ]);

      // Should not throw
      const result = await collector.collectAll([plugin], configs, mockContext);

      // Should log warning
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get post-init contribution from test-plugin')
      );

      // Should still return valid data
      expect(result).toBeDefined();
    });

    it('should aggregate data from multiple plugins', async () => {
      const plugin1: Plugin = {
        meta: {
          name: 'plugin-1',
          commandName: 'p1',
          version: '1.0.0',
          description: 'Plugin 1',
        },
        skills: [
          {
            name: 'skill-1',
            description: 'Skill from plugin 1',
            version: '1.0.0',
            templatePath: 'skills/skill-1.md',
          },
        ],
        getPostInitContribution: vi.fn().mockReturnValue({
          pluginName: 'plugin-1',
          messages: ['Message from plugin 1'],
        }),
      };

      const plugin2: Plugin = {
        meta: {
          name: 'plugin-2',
          commandName: 'p2',
          version: '1.0.0',
          description: 'Plugin 2',
        },
        slashCommands: [
          {
            name: 'cmd-1',
            description: 'Command from plugin 2',
            templatePath: 'commands/cmd-1.md',
          },
        ],
        getPostInitContribution: vi.fn().mockReturnValue({
          pluginName: 'plugin-2',
          warnings: ['Warning from plugin 2'],
          manualSteps: [
            {
              description: 'Manual step from plugin 2',
              command: 'echo hello',
            },
          ],
        }),
      };

      const configs = new Map<string, PluginConfig>([
        ['plugin-1', { enabled: true, options: {} }],
        ['plugin-2', { enabled: true, options: {} }],
      ]);

      const result = await collector.collectAll([plugin1, plugin2], configs, mockContext);

      // Skills from plugin 1
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].name).toBe('skill-1');

      // Commands from plugin 2
      expect(result.slashCommands).toHaveLength(1);
      expect(result.slashCommands[0].name).toBe('cmd-1');

      // Messages from plugin 1
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].pluginName).toBe('plugin-1');

      // Warnings from plugin 2
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].pluginName).toBe('plugin-2');

      // Manual steps: 1 from skill-install + 1 from plugin 2
      expect(result.manualSteps).toHaveLength(2);
    });

    it('should retrieve MCP servers from shared context', async () => {
      mockContext.shared.set('mcp_results', [
        { name: 'server-1', scope: 'project', success: true },
        { name: 'server-2', scope: 'user', success: false },
      ]);

      const result = await collector.collectAll([], new Map(), mockContext);

      expect(result.mcpServers).toHaveLength(2);
      expect(result.mcpServers[0]).toEqual({ name: 'server-1', scope: 'project', success: true });
      expect(result.mcpServers[1]).toEqual({ name: 'server-2', scope: 'user', success: false });
    });

    it('should retrieve installed dependencies from shared context', async () => {
      mockContext.shared.set('installed_dependencies', ['ast-grep', 'uvx']);

      const result = await collector.collectAll([], new Map(), mockContext);

      expect(result.installedDependencies).toHaveLength(2);
      expect(result.installedDependencies).toContain('ast-grep');
      expect(result.installedDependencies).toContain('uvx');
    });

    it('should handle plugins without configs in map', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'unconfigured-plugin',
          commandName: 'unc',
          version: '1.0.0',
          description: 'Unconfigured plugin',
        },
        skills: [
          {
            name: 'skill-1',
            description: 'Should not be collected',
            version: '1.0.0',
            templatePath: 'skills/skill-1.md',
          },
        ],
      };

      // Empty config map - plugin has no config
      const configs = new Map<string, PluginConfig>();

      const result = await collector.collectAll([plugin], configs, mockContext);

      // Should not collect anything since plugin has no config
      expect(result.skills).toHaveLength(0);
    });
  });
});
