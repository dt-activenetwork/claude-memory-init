/**
 * Test helpers for Plugin System unit tests
 */

import { vi } from 'vitest';
import type { Plugin, PluginContext, CoreConfig, SharedConfig, PluginConfig } from '../../../src/plugin/types.js';

/**
 * Creates a mock plugin for testing
 */
export function createMockPlugin(
  name: string,
  options: {
    commandName?: string;
    version?: string;
    description?: string;
    dependencies?: string[];
    hasHooks?: boolean;
    hasConfiguration?: boolean;
  } = {}
): Plugin {
  const {
    commandName = name,
    version = '1.0.0',
    description = `Test plugin ${name}`,
    dependencies,
    hasHooks = false,
    hasConfiguration = false,
  } = options;

  return {
    meta: {
      name,
      commandName,
      version,
      description,
      dependencies: dependencies?.length ? dependencies : undefined,
    },
    configuration: hasConfiguration
      ? {
          needsConfiguration: true,
          configure: vi.fn().mockResolvedValue({ enabled: true, options: {} }),
          getSummary: vi.fn().mockReturnValue([]),
        }
      : undefined,
    hooks: hasHooks
      ? {
          beforeInit: vi.fn(),
          execute: vi.fn(),
          afterInit: vi.fn(),
          cleanup: vi.fn(),
        }
      : undefined,
  };
}

/**
 * Creates a mock CoreConfig for testing
 */
export function createMockCoreConfig(
  enabledPlugins: string[] = [],
  disabledPlugins: string[] = []
): CoreConfig {
  const plugins: Record<string, PluginConfig> = {};

  for (const name of enabledPlugins) {
    plugins[name] = { enabled: true, options: {} };
  }
  for (const name of disabledPlugins) {
    plugins[name] = { enabled: false, options: {} };
  }

  return {
    project: { name: 'test-project', root: '/test/project' },
    output: { base_dir: '.agent' },
    plugins,
  };
}

/**
 * Creates a mock SharedConfig for testing
 */
export function createMockSharedConfig(): SharedConfig {
  return {
    core: {
      project: { name: 'test-project', root: '/test/project' },
      output: { base_dir: '.agent' },
      plugins: {},
    },
    plugins: new Map(),
  };
}

/**
 * Creates a mock Logger for testing
 */
export function createMockLogger() {
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
 * Creates a mock FileOperations for testing
 */
export function createMockFileOps() {
  return {
    ensureDir: vi.fn(),
    copyFile: vi.fn(),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn(),
    fileExists: vi.fn().mockResolvedValue(false),
    dirExists: vi.fn().mockResolvedValue(false),
    readJsonFile: vi.fn().mockResolvedValue({}),
    writeJsonFile: vi.fn(),
  };
}

/**
 * Creates a mock UIComponents for testing
 */
export function createMockUI() {
  return {
    checkboxList: vi.fn().mockResolvedValue([]),
    radioList: vi.fn().mockResolvedValue(''),
    confirm: vi.fn().mockResolvedValue(true),
    input: vi.fn().mockResolvedValue(''),
  };
}
