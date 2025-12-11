/**
 * Tests for Plugin Configuration Module
 *
 * Tests loading CLI configuration and plugin visibility filtering.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import {
  loadCLIConfig,
  isPluginVisible,
  filterVisiblePlugins,
  PROTECTED_PLUGINS,
  PROJECT_CONFIG_PATHS,
  USER_CLI_CONFIG_DIR,
  USER_CLI_CONFIG_FILE,
  type CLIConfig,
} from '../../../src/core/plugin-config.js';
import * as fileOps from '../../../src/utils/file-ops.js';

// Mock the file operations module
vi.mock('../../../src/utils/file-ops.js', () => ({
  fileExists: vi.fn(),
  readJsonFile: vi.fn(),
}));

describe('plugin-config', () => {
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loadCLIConfig', () => {
    it('should return empty config when no config files exist', async () => {
      vi.mocked(fileOps.fileExists).mockResolvedValue(false);

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual({});
    });

    it('should load project-level .claude-init.json', async () => {
      const mockConfig: CLIConfig = {
        plugins: {
          disabled: ['claude-flow'],
        },
      };

      vi.mocked(fileOps.fileExists).mockImplementation(async (filePath: string) => {
        return filePath === path.join(mockProjectRoot, '.claude-init.json');
      });
      vi.mocked(fileOps.readJsonFile).mockResolvedValue(mockConfig);

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual(mockConfig);
      expect(fileOps.readJsonFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.claude-init.json')
      );
    });

    it('should load project-level .claude-init/config.json if .claude-init.json not found', async () => {
      const mockConfig: CLIConfig = {
        plugins: {
          disabled: ['pma-gh'],
        },
      };

      vi.mocked(fileOps.fileExists).mockImplementation(async (filePath: string) => {
        return filePath === path.join(mockProjectRoot, '.claude-init/config.json');
      });
      vi.mocked(fileOps.readJsonFile).mockResolvedValue(mockConfig);

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual(mockConfig);
      expect(fileOps.readJsonFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.claude-init/config.json')
      );
    });

    it('should load user-level config if no project-level config exists', async () => {
      const mockConfig: CLIConfig = {
        plugins: {
          disabled: ['task-system'],
        },
      };

      const userConfigPath = path.join(
        os.homedir(),
        USER_CLI_CONFIG_DIR,
        USER_CLI_CONFIG_FILE
      );

      vi.mocked(fileOps.fileExists).mockImplementation(async (filePath: string) => {
        return filePath === userConfigPath;
      });
      vi.mocked(fileOps.readJsonFile).mockResolvedValue(mockConfig);

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual(mockConfig);
      expect(fileOps.readJsonFile).toHaveBeenCalledWith(userConfigPath);
    });

    it('should prefer project-level config over user-level config', async () => {
      const projectConfig: CLIConfig = {
        plugins: {
          disabled: ['claude-flow'],
        },
      };
      const userConfig: CLIConfig = {
        plugins: {
          disabled: ['pma-gh'],
        },
      };

      const projectConfigPath = path.join(mockProjectRoot, '.claude-init.json');
      const userConfigPath = path.join(
        os.homedir(),
        USER_CLI_CONFIG_DIR,
        USER_CLI_CONFIG_FILE
      );

      vi.mocked(fileOps.fileExists).mockImplementation(async (filePath: string) => {
        return filePath === projectConfigPath || filePath === userConfigPath;
      });
      vi.mocked(fileOps.readJsonFile).mockImplementation(async (filePath: string) => {
        if (filePath === projectConfigPath) return projectConfig;
        if (filePath === userConfigPath) return userConfig;
        return {};
      });

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual(projectConfig);
      expect(fileOps.readJsonFile).toHaveBeenCalledWith(projectConfigPath);
      // Should not load user config since project config was found
      expect(fileOps.readJsonFile).not.toHaveBeenCalledWith(userConfigPath);
    });

    it('should return empty config for invalid JSON', async () => {
      vi.mocked(fileOps.fileExists).mockResolvedValue(true);
      vi.mocked(fileOps.readJsonFile).mockRejectedValue(new Error('Invalid JSON'));

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual({});
    });

    it('should return empty config for invalid config structure', async () => {
      vi.mocked(fileOps.fileExists).mockResolvedValue(true);
      vi.mocked(fileOps.readJsonFile).mockResolvedValue({
        plugins: {
          disabled: 'not-an-array', // Invalid: should be array
        },
      });

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual({});
    });

    it('should validate enabled array contains only strings', async () => {
      vi.mocked(fileOps.fileExists).mockResolvedValue(true);
      vi.mocked(fileOps.readJsonFile).mockResolvedValue({
        plugins: {
          enabled: [1, 2, 3], // Invalid: should be strings
        },
      });

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual({});
    });

    it('should accept valid empty config', async () => {
      vi.mocked(fileOps.fileExists).mockImplementation(async (filePath: string) => {
        return filePath === path.join(mockProjectRoot, '.claude-init.json');
      });
      vi.mocked(fileOps.readJsonFile).mockResolvedValue({});

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual({});
    });

    it('should accept config with only plugins field', async () => {
      const mockConfig: CLIConfig = {
        plugins: {},
      };

      vi.mocked(fileOps.fileExists).mockImplementation(async (filePath: string) => {
        return filePath === path.join(mockProjectRoot, '.claude-init.json');
      });
      vi.mocked(fileOps.readJsonFile).mockResolvedValue(mockConfig);

      const config = await loadCLIConfig(mockProjectRoot);

      expect(config).toEqual(mockConfig);
    });
  });

  describe('isPluginVisible', () => {
    describe('with empty config', () => {
      it('should return true for any plugin', () => {
        const config: CLIConfig = {};

        expect(isPluginVisible('any-plugin', config)).toBe(true);
        expect(isPluginVisible('claude-flow', config)).toBe(true);
        expect(isPluginVisible('core', config)).toBe(true);
      });
    });

    describe('with disabled list (blacklist mode)', () => {
      it('should hide plugins in the disabled list', () => {
        const config: CLIConfig = {
          plugins: {
            disabled: ['claude-flow', 'pma-gh'],
          },
        };

        expect(isPluginVisible('claude-flow', config)).toBe(false);
        expect(isPluginVisible('pma-gh', config)).toBe(false);
      });

      it('should show plugins not in the disabled list', () => {
        const config: CLIConfig = {
          plugins: {
            disabled: ['claude-flow'],
          },
        };

        expect(isPluginVisible('git', config)).toBe(true);
        expect(isPluginVisible('memory-system', config)).toBe(true);
        expect(isPluginVisible('task-system', config)).toBe(true);
      });

      it('should always show protected plugins even if in disabled list', () => {
        const config: CLIConfig = {
          plugins: {
            disabled: ['core', 'claude-flow'],
          },
        };

        // core is protected and should always be visible
        expect(isPluginVisible('core', config)).toBe(true);
        // claude-flow is not protected and should be hidden
        expect(isPluginVisible('claude-flow', config)).toBe(false);
      });
    });

    describe('with enabled list (whitelist mode)', () => {
      it('should only show plugins in the enabled list', () => {
        const config: CLIConfig = {
          plugins: {
            enabled: ['git', 'memory-system'],
          },
        };

        expect(isPluginVisible('git', config)).toBe(true);
        expect(isPluginVisible('memory-system', config)).toBe(true);
        expect(isPluginVisible('claude-flow', config)).toBe(false);
        expect(isPluginVisible('task-system', config)).toBe(false);
      });

      it('should always show protected plugins even if not in enabled list', () => {
        const config: CLIConfig = {
          plugins: {
            enabled: ['git', 'memory-system'],
          },
        };

        // core is protected and should always be visible
        expect(isPluginVisible('core', config)).toBe(true);
      });
    });

    describe('with both enabled and disabled lists', () => {
      it('should prefer enabled list (whitelist takes precedence)', () => {
        const config: CLIConfig = {
          plugins: {
            enabled: ['git', 'memory-system'],
            disabled: ['git'], // Should be ignored since enabled is specified
          },
        };

        // git is in enabled list, so it should be visible
        expect(isPluginVisible('git', config)).toBe(true);
        // memory-system is in enabled list
        expect(isPluginVisible('memory-system', config)).toBe(true);
        // claude-flow is not in enabled list
        expect(isPluginVisible('claude-flow', config)).toBe(false);
      });
    });

    describe('with empty arrays', () => {
      it('should show all plugins when disabled array is empty', () => {
        const config: CLIConfig = {
          plugins: {
            disabled: [],
          },
        };

        expect(isPluginVisible('any-plugin', config)).toBe(true);
      });

      it('should show all plugins when enabled array is empty (not whitelist mode)', () => {
        const config: CLIConfig = {
          plugins: {
            enabled: [],
          },
        };

        expect(isPluginVisible('any-plugin', config)).toBe(true);
      });
    });
  });

  describe('filterVisiblePlugins', () => {
    it('should filter plugins based on disabled list', () => {
      const config: CLIConfig = {
        plugins: {
          disabled: ['claude-flow', 'pma-gh'],
        },
      };

      const plugins = ['git', 'claude-flow', 'memory-system', 'pma-gh', 'task-system'];
      const visible = filterVisiblePlugins(plugins, config);

      expect(visible).toEqual(['git', 'memory-system', 'task-system']);
    });

    it('should filter plugins based on enabled list', () => {
      const config: CLIConfig = {
        plugins: {
          enabled: ['git', 'memory-system'],
        },
      };

      const plugins = ['git', 'claude-flow', 'memory-system', 'pma-gh'];
      const visible = filterVisiblePlugins(plugins, config);

      expect(visible).toEqual(['git', 'memory-system']);
    });

    it('should always include protected plugins', () => {
      const config: CLIConfig = {
        plugins: {
          enabled: ['git'],
        },
      };

      const plugins = ['core', 'git', 'claude-flow'];
      const visible = filterVisiblePlugins(plugins, config);

      expect(visible).toEqual(['core', 'git']);
    });

    it('should return all plugins with empty config', () => {
      const config: CLIConfig = {};

      const plugins = ['git', 'claude-flow', 'memory-system'];
      const visible = filterVisiblePlugins(plugins, config);

      expect(visible).toEqual(plugins);
    });

    it('should return empty array when all plugins are disabled', () => {
      const config: CLIConfig = {
        plugins: {
          disabled: ['git', 'claude-flow', 'memory-system'],
        },
      };

      const plugins = ['git', 'claude-flow', 'memory-system'];
      const visible = filterVisiblePlugins(plugins, config);

      expect(visible).toEqual([]);
    });
  });

  describe('PROTECTED_PLUGINS', () => {
    it('should include core plugin', () => {
      expect(PROTECTED_PLUGINS).toContain('core');
    });
  });

  describe('constants', () => {
    it('should have correct project config paths', () => {
      expect(PROJECT_CONFIG_PATHS).toContain('.claude-init.json');
      expect(PROJECT_CONFIG_PATHS).toContain('.claude-init/config.json');
    });

    it('should have correct user config directory and file', () => {
      expect(USER_CLI_CONFIG_DIR).toBe('.claude-init');
      expect(USER_CLI_CONFIG_FILE).toBe('config.json');
    });
  });
});
