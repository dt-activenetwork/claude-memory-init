/**
 * Tests for HeavyweightPluginManager
 *
 * Tests the core functionality for heavyweight plugin execution including:
 * - Plugin execution flow
 * - Backup and restore mechanisms
 * - File merging strategies
 * - Error handling
 * - Helper functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import type {
  Plugin,
  PluginContext,
  HeavyweightPluginConfig,
  Logger,
} from '../../../src/plugin/types.js';

// Mock child_process spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock file-ops
vi.mock('../../../src/utils/file-ops.js', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  fileExists: vi.fn(),
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
}));

import {
  HeavyweightPluginManager,
  isHeavyweightPlugin,
  separatePluginsByWeight,
} from '../../../src/core/heavyweight-plugin-manager.js';
import { spawn } from 'child_process';
import fse from 'fs-extra';
import {
  readFile,
  writeFile,
  fileExists,
  ensureDir,
  copyFile,
} from '../../../src/utils/file-ops.js';

describe('HeavyweightPluginManager', () => {
  let manager: HeavyweightPluginManager;
  let mockLogger: Logger;
  let mockContext: PluginContext;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'heavyweight-test-'));

    mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      step: vi.fn(),
      blank: vi.fn(),
    };

    mockContext = {
      projectRoot: tempDir,
      targetDir: tempDir,
      config: {
        core: {
          project: { name: 'test-project', root: tempDir },
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

    manager = new HeavyweightPluginManager(tempDir, mockLogger);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('executeHeavyweightPlugin', () => {
    it('should fail if plugin does not implement getHeavyweightConfig', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        // No getHeavyweightConfig
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("doesn't implement getHeavyweightConfig");
    });

    it('should handle getHeavyweightConfig errors gracefully', async () => {
      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockRejectedValue(new Error('Config error')),
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Config error');
    });

    it('should backup protected files before init command', async () => {
      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue('original content');
      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(copyFile).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      // Mock spawn to simulate successful command
      const mockProcess = {
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('output'));
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'CLAUDE.md', mergeStrategy: 'append' },
          ],
          initCommand: 'echo test',
        } as HeavyweightPluginConfig),
      };

      await manager.executeHeavyweightPlugin(plugin, mockContext);

      // Verify backup was created
      expect(ensureDir).toHaveBeenCalled();
      expect(copyFile).toHaveBeenCalled();
    });

    it('should execute init command successfully', async () => {
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      // Mock spawn to simulate successful command
      const mockProcess = {
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('command output'));
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [],
          initCommand: 'echo test',
        } as HeavyweightPluginConfig),
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(true);
      expect(spawn).toHaveBeenCalled();
    });

    it('should handle command failure and restore backups', async () => {
      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue('original content');
      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(copyFile).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      // Mock spawn to simulate command error
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'error') setTimeout(() => cb(new Error('Command failed')), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'CLAUDE.md', mergeStrategy: 'append' },
          ],
          initCommand: 'failing-command',
        } as HeavyweightPluginConfig),
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed');
      // Verify restore was attempted
      expect(writeFile).toHaveBeenCalled();
    });

    it('should skip init command when null', async () => {
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(ensureDir).mockResolvedValue(undefined);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [],
          initCommand: null,
        } as HeavyweightPluginConfig),
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(true);
      expect(spawn).not.toHaveBeenCalled();
    });

    it('should handle command timeout', async () => {
      vi.useFakeTimers();
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      // Mock spawn to never complete
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [],
          initCommand: 'long-running-command',
          timeout: 1000, // 1 second timeout
        } as HeavyweightPluginConfig),
      };

      const resultPromise = manager.executeHeavyweightPlugin(plugin, mockContext);

      // Advance timers past timeout
      await vi.advanceTimersByTimeAsync(1500);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      expect(mockProcess.kill).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('file merging', () => {
    beforeEach(() => {
      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(copyFile).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);
    });

    it('should merge files with append strategy', async () => {
      // First call for backup check, second for merge check
      vi.mocked(fileExists)
        .mockResolvedValueOnce(true) // backup: file exists
        .mockResolvedValueOnce(true); // merge: file exists
      vi.mocked(readFile)
        .mockResolvedValueOnce('our content') // backup read
        .mockResolvedValueOnce('their content'); // merge read

      // Mock spawn for no-op command
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'CLAUDE.md', mergeStrategy: 'append' },
          ],
          initCommand: 'echo test',
        } as HeavyweightPluginConfig),
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(true);
      // Verify merged content was written
      const writeCall = vi.mocked(writeFile).mock.calls.find(
        call => call[0].includes('CLAUDE.md') && !call[0].includes('backup')
      );
      expect(writeCall).toBeDefined();
      // Append: our content + separator + their content
      expect(writeCall![1]).toContain('our content');
      expect(writeCall![1]).toContain('their content');
    });

    it('should merge files with prepend strategy', async () => {
      vi.mocked(fileExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce('our content')
        .mockResolvedValueOnce('their content');

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'CLAUDE.md', mergeStrategy: 'prepend' },
          ],
          initCommand: 'echo test',
        } as HeavyweightPluginConfig),
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(true);
      const writeCall = vi.mocked(writeFile).mock.calls.find(
        call => call[0].includes('CLAUDE.md') && !call[0].includes('backup')
      );
      expect(writeCall).toBeDefined();
      // Prepend: their content + separator + our content
      const content = writeCall![1];
      const theirIndex = content.indexOf('their content');
      const ourIndex = content.indexOf('our content');
      expect(theirIndex).toBeLessThan(ourIndex);
    });

    it('should use custom merge function when strategy is custom', async () => {
      vi.mocked(fileExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce('our content')
        .mockResolvedValueOnce('their content');

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const customMerge = vi.fn().mockReturnValue('custom merged content');

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'CLAUDE.md', mergeStrategy: 'custom' },
          ],
          initCommand: 'echo test',
        } as HeavyweightPluginConfig),
        mergeFile: customMerge,
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(true);
      expect(customMerge).toHaveBeenCalledWith(
        'CLAUDE.md',
        'our content',
        'their content',
        mockContext
      );
    });

    it('should throw error if custom strategy but no mergeFile function', async () => {
      vi.mocked(fileExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      vi.mocked(readFile)
        .mockResolvedValueOnce('our content')
        .mockResolvedValueOnce('their content');

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'CLAUDE.md', mergeStrategy: 'custom' },
          ],
          initCommand: 'echo test',
        } as HeavyweightPluginConfig),
        // No mergeFile function
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(false);
      expect(result.mergeResults[0].error).toContain("doesn't implement mergeFile");
    });

    it('should handle case when only plugin creates file (no our content)', async () => {
      vi.mocked(fileExists)
        .mockResolvedValueOnce(false) // backup: file doesn't exist
        .mockResolvedValueOnce(true); // merge: file exists after command
      vi.mocked(readFile).mockResolvedValueOnce('their new content');

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'NEW_FILE.md', mergeStrategy: 'append' },
          ],
          initCommand: 'echo test',
        } as HeavyweightPluginConfig),
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(true);
      // Should keep their content as is since we had nothing
      expect(result.mergeResults[0].content).toBe('their new content');
    });

    it('should handle case when plugin removes file (no their content)', async () => {
      vi.mocked(fileExists)
        .mockResolvedValueOnce(true) // backup: file exists
        .mockResolvedValueOnce(false); // merge: file doesn't exist after command
      vi.mocked(readFile).mockResolvedValueOnce('our original content');

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'EXISTING.md', mergeStrategy: 'append' },
          ],
          initCommand: 'echo test',
        } as HeavyweightPluginConfig),
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(true);
      // Should restore our content since plugin didn't create anything
      const writeCall = vi.mocked(writeFile).mock.calls.find(
        call => call[0].includes('EXISTING.md')
      );
      expect(writeCall![1]).toBe('our original content');
    });

    it('should handle case when neither file exists', async () => {
      vi.mocked(fileExists).mockResolvedValue(false);

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') setTimeout(() => cb(0), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'NONEXISTENT.md', mergeStrategy: 'append' },
          ],
          initCommand: 'echo test',
        } as HeavyweightPluginConfig),
      };

      const result = await manager.executeHeavyweightPlugin(plugin, mockContext);

      expect(result.success).toBe(true);
      expect(result.mergeResults[0].content).toBe('');
    });
  });

  describe('restoreBackups', () => {
    it('should restore original content when file existed', async () => {
      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readFile).mockResolvedValue('original content');
      vi.mocked(ensureDir).mockResolvedValue(undefined);
      vi.mocked(copyFile).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      // Create a plugin that will fail to trigger restore
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'error') setTimeout(() => cb(new Error('fail')), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'CLAUDE.md', mergeStrategy: 'append' },
          ],
          initCommand: 'failing-command',
        } as HeavyweightPluginConfig),
      };

      await manager.executeHeavyweightPlugin(plugin, mockContext);

      // Verify restore was called with original content
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('CLAUDE.md'),
        'original content'
      );
    });

    it('should remove file when original did not exist', async () => {
      vi.mocked(fileExists)
        .mockResolvedValueOnce(false) // backup: file doesn't exist
        .mockResolvedValueOnce(true); // restore check: file now exists
      vi.mocked(ensureDir).mockResolvedValue(undefined);

      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'error') setTimeout(() => cb(new Error('fail')), 10);
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const plugin: Plugin = {
        meta: {
          name: 'test-plugin',
          commandName: 'test',
          version: '1.0.0',
          description: 'Test plugin',
          heavyweight: true,
        },
        getHeavyweightConfig: vi.fn().mockResolvedValue({
          protectedFiles: [
            { path: 'NEW_FILE.md', mergeStrategy: 'append' },
          ],
          initCommand: 'failing-command',
        } as HeavyweightPluginConfig),
      };

      await manager.executeHeavyweightPlugin(plugin, mockContext);

      // Verify fse.remove was called
      expect(fse.remove).toHaveBeenCalled();
    });
  });
});

describe('isHeavyweightPlugin', () => {
  it('should return true for heavyweight plugins', () => {
    const plugin: Plugin = {
      meta: {
        name: 'test',
        commandName: 'test',
        version: '1.0.0',
        description: 'Test',
        heavyweight: true,
      },
    };

    expect(isHeavyweightPlugin(plugin)).toBe(true);
  });

  it('should return false for non-heavyweight plugins', () => {
    const plugin: Plugin = {
      meta: {
        name: 'test',
        commandName: 'test',
        version: '1.0.0',
        description: 'Test',
        heavyweight: false,
      },
    };

    expect(isHeavyweightPlugin(plugin)).toBe(false);
  });

  it('should return false when heavyweight is undefined', () => {
    const plugin: Plugin = {
      meta: {
        name: 'test',
        commandName: 'test',
        version: '1.0.0',
        description: 'Test',
      },
    };

    expect(isHeavyweightPlugin(plugin)).toBe(false);
  });
});

describe('separatePluginsByWeight', () => {
  it('should separate plugins into lightweight and heavyweight groups', () => {
    const lightweight1: Plugin = {
      meta: { name: 'light1', commandName: 'l1', version: '1.0.0', description: 'Light 1' },
    };
    const lightweight2: Plugin = {
      meta: { name: 'light2', commandName: 'l2', version: '1.0.0', description: 'Light 2' },
    };
    const heavyweight1: Plugin = {
      meta: { name: 'heavy1', commandName: 'h1', version: '1.0.0', description: 'Heavy 1', heavyweight: true },
    };
    const heavyweight2: Plugin = {
      meta: { name: 'heavy2', commandName: 'h2', version: '1.0.0', description: 'Heavy 2', heavyweight: true },
    };

    const result = separatePluginsByWeight([lightweight1, heavyweight1, lightweight2, heavyweight2]);

    expect(result.lightweight).toHaveLength(2);
    expect(result.heavyweight).toHaveLength(2);
    expect(result.lightweight.map(p => p.meta.name)).toContain('light1');
    expect(result.lightweight.map(p => p.meta.name)).toContain('light2');
    expect(result.heavyweight.map(p => p.meta.name)).toContain('heavy1');
    expect(result.heavyweight.map(p => p.meta.name)).toContain('heavy2');
  });

  it('should handle empty array', () => {
    const result = separatePluginsByWeight([]);

    expect(result.lightweight).toHaveLength(0);
    expect(result.heavyweight).toHaveLength(0);
  });

  it('should handle all lightweight plugins', () => {
    const plugins: Plugin[] = [
      { meta: { name: 'l1', commandName: 'l1', version: '1.0.0', description: 'L1' } },
      { meta: { name: 'l2', commandName: 'l2', version: '1.0.0', description: 'L2' } },
    ];

    const result = separatePluginsByWeight(plugins);

    expect(result.lightweight).toHaveLength(2);
    expect(result.heavyweight).toHaveLength(0);
  });

  it('should handle all heavyweight plugins', () => {
    const plugins: Plugin[] = [
      { meta: { name: 'h1', commandName: 'h1', version: '1.0.0', description: 'H1', heavyweight: true } },
      { meta: { name: 'h2', commandName: 'h2', version: '1.0.0', description: 'H2', heavyweight: true } },
    ];

    const result = separatePluginsByWeight(plugins);

    expect(result.lightweight).toHaveLength(0);
    expect(result.heavyweight).toHaveLength(2);
  });
});
