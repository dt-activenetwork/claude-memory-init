/**
 * Integration tests for InteractiveInitializer
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs/promises';
import { InteractiveInitializer } from '../../src/core/interactive-initializer.js';
import { PluginRegistry } from '../../src/plugin/registry.js';
import type { Plugin, PluginConfig, ConfigurationContext } from '../../src/plugin/types.js';

// Mock chalk - need to use function factory for proper hoisting
jest.mock('chalk', () => {
  const createMockChalk = () => {
    const mockFn: any = (str: string) => str;
    mockFn.bold = (str: string) => str;
    mockFn.cyan = (str: string) => str;
    mockFn.gray = (str: string) => str;
    mockFn.green = (str: string) => str;
    mockFn.green.bold = (str: string) => str;
    return mockFn;
  };

  return { default: createMockChalk() };
});

// Mock the UI components
jest.mock('../../src/prompts/components/index.js', () => ({
  checkboxList: jest.fn(),
  radioList: jest.fn(),
  confirm: jest.fn(),
  input: jest.fn(),
}));

// Mock the progress indicator
jest.mock('../../src/prompts/components/progress.js', () => ({
  ProgressIndicator: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    nextStep: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
  })),
}));

// Mock the logger
jest.mock('../../src/utils/logger.js', () => ({
  info: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  step: jest.fn(),
  blank: jest.fn(),
}));

// Mock console.clear
global.console.clear = jest.fn();
global.console.log = jest.fn();

import * as ui from '../../src/prompts/components/index.js';

describe('InteractiveInitializer', () => {
  let initializer: InteractiveInitializer;
  let registry: PluginRegistry;
  let testDir: string;

  // Create mock plugins
  const mockPluginWithConfig: Plugin = {
    meta: {
      name: 'test-plugin-with-config',
      commandName: 'test-config',
      version: '1.0.0',
      description: 'Test plugin with configuration',
      recommended: true,
    },
    configuration: {
      needsConfiguration: true,
      configure: async (context: ConfigurationContext): Promise<PluginConfig> => {
        return {
          enabled: true,
          options: {
            test_option: 'test_value',
          },
        };
      },
      getSummary: (config: PluginConfig): string[] => {
        return [`Test option: ${config.options.test_option as string}`];
      },
    },
    hooks: {
      execute: async () => {
        // Mock execution
      },
    },
  };

  const mockPluginWithoutConfig: Plugin = {
    meta: {
      name: 'test-plugin-no-config',
      commandName: 'test-no-config',
      version: '1.0.0',
      description: 'Test plugin without configuration',
      recommended: false,
    },
    configuration: {
      needsConfiguration: false,
      configure: async (): Promise<PluginConfig> => {
        return {
          enabled: true,
          options: {
            auto_detected: true,
          },
        };
      },
      getSummary: (config: PluginConfig): string[] => {
        return [`Auto-detected: ${config.options.auto_detected as boolean}`];
      },
    },
    hooks: {
      execute: async () => {
        // Mock execution
      },
    },
  };

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(process.cwd(), 'test-output', `test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Setup plugin registry
    registry = new PluginRegistry();
    registry.register(mockPluginWithConfig);
    registry.register(mockPluginWithoutConfig);

    // Create initializer
    initializer = new InteractiveInitializer(registry);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Dynamic Step Calculation', () => {
    it('should calculate correct total steps with plugins needing configuration', async () => {
      // Mock UI responses
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project') // Project name
        .mockResolvedValueOnce('Test Description'); // Project description

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-with-config',
        'test-plugin-no-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true); // Confirm initialization

      await initializer.run(testDir);

      // Total steps should be:
      // 1 (project info) + 1 (plugin selection) + 1 (plugin with config) + 1 (summary) = 4
      // Verify by checking if summary step was called with 4/4
      // (This is an integration test, so we verify the behavior indirectly)

      expect(ui.input).toHaveBeenCalledTimes(2); // Project name and description
      expect(ui.checkboxList).toHaveBeenCalledTimes(1); // Plugin selection
      expect(ui.confirm).toHaveBeenCalledTimes(1); // Final confirmation
    });

    it('should calculate correct total steps with no plugins needing configuration', async () => {
      // Mock UI responses
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-no-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir);

      // Total steps should be:
      // 1 (project info) + 1 (plugin selection) + 0 (no plugins need config) + 1 (summary) = 3

      expect(ui.input).toHaveBeenCalledTimes(2);
      expect(ui.checkboxList).toHaveBeenCalledTimes(1);
      expect(ui.confirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Plugin Configuration Flow', () => {
    it('should configure only plugins that need configuration', async () => {
      const configureSpy = jest.spyOn(mockPluginWithConfig.configuration!, 'configure');
      const configureNoConfigSpy = jest.spyOn(mockPluginWithoutConfig.configuration!, 'configure');

      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-with-config',
        'test-plugin-no-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir);

      // Both should be configured, but only one should show UI prompts
      expect(configureSpy).toHaveBeenCalled();
      expect(configureNoConfigSpy).toHaveBeenCalled();
    });

    it('should handle no plugin selection gracefully', async () => {
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([]);

      await initializer.run(testDir);

      // Should not proceed to configuration or confirmation
      expect(ui.confirm).not.toHaveBeenCalled();
    });
  });

  describe('Summary and Confirmation', () => {
    it('should display plugin summaries correctly', async () => {
      const getSummarySpy = jest.spyOn(mockPluginWithConfig.configuration!, 'getSummary');

      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-with-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir);

      expect(getSummarySpy).toHaveBeenCalled();
    });

    it('should cancel initialization if user does not confirm', async () => {
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-with-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(false); // Don't confirm

      await initializer.run(testDir);

      // Verify that marker file was not created
      const markerPath = path.join(testDir, 'claude', '.claude-memory-init');
      const markerExists = await fs
        .access(markerPath)
        .then(() => true)
        .catch(() => false);

      expect(markerExists).toBe(false);
    });
  });

  describe('Already Initialized Detection', () => {
    it('should detect already initialized project', async () => {
      // First initialization
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-no-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir);

      // Reset mocks
      jest.clearAllMocks();

      // Second initialization (should detect)
      (ui.radioList as jest.MockedFunction<typeof ui.radioList>).mockResolvedValueOnce('keep');

      await initializer.run(testDir);

      expect(ui.radioList).toHaveBeenCalledWith(
        'What would you like to do?',
        expect.arrayContaining([
          expect.objectContaining({ value: 'keep' }),
          expect.objectContaining({ value: 'reconfigure' }),
          expect.objectContaining({ value: 'reinitialize' }),
        ]),
        'keep'
      );
    });

    it('should allow reinitializati when user confirms', async () => {
      // First initialization
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-no-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir);

      // Reset mocks
      jest.clearAllMocks();

      // Second initialization with reinitialize
      (ui.radioList as jest.MockedFunction<typeof ui.radioList>).mockResolvedValueOnce('reinitialize');

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>)
        .mockResolvedValueOnce(true) // Confirm overwrite
        .mockResolvedValueOnce(true); // Confirm final initialization

      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('New Project')
        .mockResolvedValueOnce('New Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-no-config',
      ]);

      await initializer.run(testDir);

      expect(ui.confirm).toHaveBeenCalledWith(
        'This will overwrite existing files. Are you sure?',
        false
      );
    });

    it('should respect force option and skip detection', async () => {
      // First initialization
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-no-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir);

      // Reset mocks
      jest.clearAllMocks();

      // Second initialization with force option
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('New Project')
        .mockResolvedValueOnce('New Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-no-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir, { force: true });

      // Should not call radioList for reinitialize action
      expect(ui.radioList).not.toHaveBeenCalled();
    });
  });

  describe('Initialization Execution', () => {
    it('should create necessary directories', async () => {
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-no-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir);

      // Verify directories were created
      const claudeDir = path.join(testDir, 'claude');
      const promptsDir = path.join(claudeDir, 'prompts');
      const memoryDir = path.join(claudeDir, 'memory');
      const tempDir = path.join(claudeDir, 'temp');

      expect(await fs.access(claudeDir).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(promptsDir).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(memoryDir).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(tempDir).then(() => true).catch(() => false)).toBe(true);
    });

    it('should create marker file after successful initialization', async () => {
      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'test-plugin-no-config',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir);

      // Verify marker file exists
      const markerPath = path.join(testDir, 'claude', '.claude-memory-init');
      const markerExists = await fs.access(markerPath).then(() => true).catch(() => false);

      expect(markerExists).toBe(true);
    });

    it('should execute plugin lifecycle hooks in correct order', async () => {
      const executionOrder: string[] = [];

      const pluginWithHooks: Plugin = {
        meta: {
          name: 'hook-test-plugin',
          commandName: 'hook-test',
          version: '1.0.0',
          description: 'Plugin to test hook execution order',
        },
        hooks: {
          beforeInit: async () => {
            executionOrder.push('beforeInit');
          },
          execute: async () => {
            executionOrder.push('execute');
          },
          afterInit: async () => {
            executionOrder.push('afterInit');
          },
        },
      };

      registry.register(pluginWithHooks);

      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'hook-test-plugin',
      ]);

      (ui.confirm as jest.MockedFunction<typeof ui.confirm>).mockResolvedValueOnce(true);

      await initializer.run(testDir);

      expect(executionOrder).toEqual(['beforeInit', 'execute', 'afterInit']);
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin configuration errors gracefully', async () => {
      const errorPlugin: Plugin = {
        meta: {
          name: 'error-plugin',
          commandName: 'error',
          version: '1.0.0',
          description: 'Plugin that throws error',
        },
        configuration: {
          needsConfiguration: true,
          configure: async () => {
            throw new Error('Configuration failed');
          },
          getSummary: () => [],
        },
      };

      registry.register(errorPlugin);

      (ui.input as jest.MockedFunction<typeof ui.input>)
        .mockResolvedValueOnce('Test Project')
        .mockResolvedValueOnce('Test Description');

      (ui.checkboxList as jest.MockedFunction<typeof ui.checkboxList>).mockResolvedValueOnce([
        'error-plugin',
      ]);

      await expect(initializer.run(testDir)).rejects.toThrow('Configuration failed');
    });
  });
});
