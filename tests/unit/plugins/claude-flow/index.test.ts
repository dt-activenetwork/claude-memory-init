/**
 * Claude Flow Plugin Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claudeFlowPlugin } from '../../../../src/plugins/claude-flow/index.js';
import type {
  ConfigurationContext,
  PluginContext,
  PluginConfig,
  SharedConfig,
} from '../../../../src/plugin/types.js';

// Mock UI components
const createMockUI = () => ({
  radioList: vi.fn(),
  confirm: vi.fn(),
  checkboxList: vi.fn(),
  input: vi.fn(),
});

// Mock logger
const createMockLogger = () => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  step: vi.fn(),
  blank: vi.fn(),
});

// Mock configuration context
const createMockConfigContext = (): ConfigurationContext => ({
  projectName: 'test-project',
  projectRoot: '/test/project',
  otherPlugins: new Map(),
  ui: createMockUI(),
  logger: createMockLogger(),
});

// Mock plugin context
const createMockPluginContext = (
  pluginConfigs: Map<string, PluginConfig> = new Map()
): PluginContext => {
  const sharedConfig: SharedConfig = {
    core: {
      project: { name: 'test-project', root: '/test/project' },
      output: { base_dir: '.agent' },
      plugins: {},
    },
    plugins: pluginConfigs,
  };

  return {
    projectRoot: '/test/project',
    targetDir: '/test/project/.agent',
    config: sharedConfig,
    shared: new Map(),
    logger: createMockLogger(),
    fs: {
      ensureDir: vi.fn(),
      copyFile: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      fileExists: vi.fn(),
      dirExists: vi.fn(),
      readJsonFile: vi.fn(),
      writeJsonFile: vi.fn(),
    },
    template: {
      loadTemplate: vi.fn(),
      renderTemplate: vi.fn(),
      loadAndRenderTemplate: vi.fn(),
    },
    ui: createMockUI(),
    i18n: {
      t: vi.fn((key: string) => key),
      language: 'en',
    },
  };
};

describe('claudeFlowPlugin', () => {
  describe('meta', () => {
    it('should have correct metadata', () => {
      expect(claudeFlowPlugin.meta.name).toBe('claude-flow');
      expect(claudeFlowPlugin.meta.commandName).toBe('flow');
      expect(claudeFlowPlugin.meta.version).toBe('1.0.0');
      expect(claudeFlowPlugin.meta.heavyweight).toBe(true);
      expect(claudeFlowPlugin.meta.conflicts).toContain('task-system');
    });

    it('should not be recommended by default', () => {
      expect(claudeFlowPlugin.meta.recommended).toBe(false);
    });
  });

  describe('configuration', () => {
    let mockContext: ConfigurationContext;

    beforeEach(() => {
      mockContext = createMockConfigContext();
    });

    it('should configure with standard mode', async () => {
      const ui = mockContext.ui;
      vi.mocked(ui.radioList).mockResolvedValue('standard');
      vi.mocked(ui.confirm).mockResolvedValue(true);
      vi.mocked(ui.checkboxList).mockResolvedValue(['claude-flow']);

      const config = await claudeFlowPlugin.configuration!.configure(mockContext);

      expect(config.enabled).toBe(true);
      expect(config.options.mode).toBe('standard');
      expect(config.options.enableSwarm).toBe(true);
      expect(config.options.enableHiveMind).toBe(true);
    });

    it('should return disabled config when skip mode is selected', async () => {
      const ui = mockContext.ui;
      vi.mocked(ui.radioList).mockResolvedValue('skip');

      const config = await claudeFlowPlugin.configuration!.configure(mockContext);

      expect(config.enabled).toBe(false);
      expect(config.options.mode).toBe('skip');
    });

    it('should configure with SPARC mode', async () => {
      const ui = mockContext.ui;
      vi.mocked(ui.radioList).mockResolvedValue('sparc');
      vi.mocked(ui.confirm).mockResolvedValue(true);
      vi.mocked(ui.checkboxList).mockResolvedValue(['claude-flow', 'ruv-swarm']);

      const config = await claudeFlowPlugin.configuration!.configure(mockContext);

      expect(config.enabled).toBe(true);
      expect(config.options.mode).toBe('sparc');
      expect(config.options.mcpServers).toContain('ruv-swarm');
    });

    it('should generate correct summary for enabled config', () => {
      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          enableSwarm: true,
          enableHiveMind: true,
          mcpServers: ['claude-flow', 'ruv-swarm'],
        },
      };

      const summary = claudeFlowPlugin.configuration!.getSummary(config);

      expect(summary).toContain('Mode: standard');
      expect(summary).toContain('Swarm Mode: enabled');
      expect(summary).toContain('Hive Mind: enabled');
      expect(summary.some((line) => line.includes('claude-flow'))).toBe(true);
    });

    it('should generate correct summary for skipped config', () => {
      const config: PluginConfig = {
        enabled: false,
        options: { mode: 'skip' },
      };

      const summary = claudeFlowPlugin.configuration!.getSummary(config);

      expect(summary).toContain('Claude Flow: Skipped');
    });
  });

  describe('getHeavyweightConfig', () => {
    it('should return null command when plugin is disabled', async () => {
      const pluginConfigs = new Map<string, PluginConfig>();
      pluginConfigs.set('claude-flow', {
        enabled: false,
        options: { mode: 'skip' },
      });

      const context = createMockPluginContext(pluginConfigs);
      const config = await claudeFlowPlugin.getHeavyweightConfig!(context);

      expect(config.initCommand).toBeNull();
      expect(config.protectedFiles).toHaveLength(0);
    });

    it('should return correct init command for standard mode', async () => {
      const pluginConfigs = new Map<string, PluginConfig>();
      pluginConfigs.set('claude-flow', {
        enabled: true,
        options: {
          mode: 'standard',
          enableSwarm: true,
          enableHiveMind: true,
          mcpServers: ['claude-flow'],
          autoConfirm: true,
        },
      });

      const context = createMockPluginContext(pluginConfigs);
      const config = await claudeFlowPlugin.getHeavyweightConfig!(context);

      expect(config.initCommand).toBe('pnpm dlx claude-flow@alpha init --yes');
      expect(config.timeout).toBe(180000);
    });

    it('should include mode flag for non-standard modes', async () => {
      const pluginConfigs = new Map<string, PluginConfig>();
      pluginConfigs.set('claude-flow', {
        enabled: true,
        options: {
          mode: 'sparc',
          enableSwarm: true,
          enableHiveMind: true,
          mcpServers: ['claude-flow'],
          autoConfirm: true,
        },
      });

      const context = createMockPluginContext(pluginConfigs);
      const config = await claudeFlowPlugin.getHeavyweightConfig!(context);

      expect(config.initCommand).toBe('pnpm dlx claude-flow@alpha init --mode=sparc --yes');
    });

    it('should define protected files with correct merge strategies', async () => {
      const pluginConfigs = new Map<string, PluginConfig>();
      pluginConfigs.set('claude-flow', {
        enabled: true,
        options: {
          mode: 'standard',
          enableSwarm: true,
          enableHiveMind: true,
          mcpServers: ['claude-flow'],
          autoConfirm: true,
        },
      });

      const context = createMockPluginContext(pluginConfigs);
      const config = await claudeFlowPlugin.getHeavyweightConfig!(context);

      expect(config.protectedFiles).toContainEqual({
        path: 'CLAUDE.md',
        mergeStrategy: 'custom',
      });
      expect(config.protectedFiles).toContainEqual({
        path: '.gitignore',
        mergeStrategy: 'append',
      });
      expect(config.protectedFiles).toContainEqual({
        path: '.claude/settings.json',
        mergeStrategy: 'custom',
      });
    });
  });

  describe('mergeFile', () => {
    let context: PluginContext;

    beforeEach(() => {
      context = createMockPluginContext();
    });

    describe('CLAUDE.md merging', () => {
      it('should return their content when our content is null', async () => {
        const theirContent = '# Claude Flow Config\nSome content';

        const result = await claudeFlowPlugin.mergeFile!(
          'CLAUDE.md',
          null,
          theirContent,
          context
        );

        expect(result).toBe(theirContent);
      });

      it('should merge our content with theirs using separator', async () => {
        const ourContent = '# Project Instructions\nOur content';
        const theirContent = '# Claude Code Configuration\nTheir content';

        const result = await claudeFlowPlugin.mergeFile!(
          'CLAUDE.md',
          ourContent,
          theirContent,
          context
        );

        expect(result).toContain('# Project Instructions');
        expect(result).toContain('Our content');
        expect(result).toContain('# Claude Flow Configuration');
        expect(result).toContain('Claude Flow - SPARC Development Environment');
      });

      it('should avoid duplication when their content contains our content', async () => {
        const ourContent = '# Project';
        const theirContent = '# Project\nMore content';

        const result = await claudeFlowPlugin.mergeFile!(
          'CLAUDE.md',
          ourContent,
          theirContent,
          context
        );

        expect(result).toBe(theirContent);
      });
    });

    describe('.claude/settings.json merging', () => {
      it('should return their content when our content is null', async () => {
        const theirContent = JSON.stringify({ hooks: {} }, null, 2);

        const result = await claudeFlowPlugin.mergeFile!(
          '.claude/settings.json',
          null,
          theirContent,
          context
        );

        expect(result).toBe(theirContent);
      });

      it('should deep merge JSON objects', async () => {
        const ourContent = JSON.stringify({
          env: { MY_VAR: 'value' },
          permissions: { allow: ['Bash(npm:*)'] },
        });
        const theirContent = JSON.stringify({
          env: { CLAUDE_FLOW_ENABLED: 'true' },
          permissions: { allow: ['Bash(git:*)'] },
          hooks: { PreToolUse: [] },
        });

        const result = await claudeFlowPlugin.mergeFile!(
          '.claude/settings.json',
          ourContent,
          theirContent,
          context
        );

        const parsed = JSON.parse(result);

        // Both env vars should be present
        expect(parsed.env.MY_VAR).toBe('value');
        expect(parsed.env.CLAUDE_FLOW_ENABLED).toBe('true');

        // Arrays should be merged (union)
        expect(parsed.permissions.allow).toContain('Bash(npm:*)');
        expect(parsed.permissions.allow).toContain('Bash(git:*)');

        // New properties should be added
        expect(parsed.hooks).toBeDefined();
      });

      it('should handle invalid JSON gracefully', async () => {
        const ourContent = 'not valid json';
        const theirContent = JSON.stringify({ valid: true });

        const result = await claudeFlowPlugin.mergeFile!(
          '.claude/settings.json',
          ourContent,
          theirContent,
          context
        );

        // Result should be equivalent JSON (may be formatted differently)
        expect(JSON.parse(result)).toEqual({ valid: true });
      });
    });

    describe('.gitignore merging', () => {
      it('should return their content when our content is null', async () => {
        const theirContent = '.claude-flow/\nmemory/';

        const result = await claudeFlowPlugin.mergeFile!(
          '.gitignore',
          null,
          theirContent,
          context
        );

        expect(result).toBe(theirContent);
      });

      it('should append new entries with header', async () => {
        const ourContent = 'node_modules/\n.env';
        const theirContent = '.claude-flow/\nmemory/\nnode_modules/';

        const result = await claudeFlowPlugin.mergeFile!(
          '.gitignore',
          ourContent,
          theirContent,
          context
        );

        expect(result).toContain('node_modules/');
        expect(result).toContain('.env');
        expect(result).toContain('# Claude Flow generated files');
        expect(result).toContain('.claude-flow/');
        expect(result).toContain('memory/');
      });

      it('should not add header when no new entries', async () => {
        const ourContent = '.claude-flow/\nmemory/';
        const theirContent = '.claude-flow/\nmemory/';

        const result = await claudeFlowPlugin.mergeFile!(
          '.gitignore',
          ourContent,
          theirContent,
          context
        );

        expect(result).toBe(ourContent);
        expect(result).not.toContain('# Claude Flow generated files');
      });
    });
  });

  describe('prompt', () => {
    it('should return empty string when plugin is disabled', () => {
      const config: PluginConfig = { enabled: false, options: {} };
      const context = createMockPluginContext();

      const result = claudeFlowPlugin.prompt!.generate(config, context);

      expect(result).toBe('');
    });

    it('should return empty string when mode is skip', () => {
      const config: PluginConfig = { enabled: true, options: { mode: 'skip' } };
      const context = createMockPluginContext();

      const result = claudeFlowPlugin.prompt!.generate(config, context);

      expect(result).toBe('');
    });

    it('should generate content for enabled plugin', () => {
      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          enableSwarm: true,
          enableHiveMind: true,
        },
      };
      const context = createMockPluginContext();

      const result = claudeFlowPlugin.prompt!.generate(config, context);

      expect(result).toContain('## Claude Flow Integration');
      expect(result).toContain('Mode**: standard');
      expect(result).toContain('Swarm Mode**: Enabled');
      expect(result).toContain('Hive Mind**: Enabled');
    });
  });

  describe('gitignore', () => {
    it('should return patterns for enabled plugin', () => {
      const config: PluginConfig = { enabled: true, options: {} };

      const patterns = claudeFlowPlugin.gitignore!.getPatterns(config);

      expect(patterns).toContain('.hive-mind/');
      expect(patterns).toContain('.claude-flow/');
      expect(patterns).toContain('memory/');
      expect(patterns).toContain('*.db');
    });

    it('should return empty array for disabled plugin', () => {
      const config: PluginConfig = { enabled: false, options: {} };

      const patterns = claudeFlowPlugin.gitignore!.getPatterns(config);

      expect(patterns).toHaveLength(0);
    });
  });

  describe('commands', () => {
    it('should have status command', () => {
      expect(claudeFlowPlugin.commands).toHaveLength(1);
      expect(claudeFlowPlugin.commands![0].name).toBe('status');
    });
  });
});
