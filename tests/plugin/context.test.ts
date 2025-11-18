/**
 * Tests for Plugin Context
 */

import { describe, it, expect, jest } from '@jest/globals';

// Mock dependencies that have ESM import issues
jest.mock('../../src/utils/logger.js', () => ({
  info: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  step: jest.fn(),
  blank: jest.fn()
}));

jest.mock('../../src/utils/file-ops.js', () => ({
  ensureDir: jest.fn(),
  copyFile: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  fileExists: jest.fn(),
  dirExists: jest.fn(),
  readJsonFile: jest.fn(),
  writeJsonFile: jest.fn()
}));

jest.mock('../../src/core/template-engine.js', () => ({
  loadTemplate: jest.fn(),
  renderTemplate: jest.fn(),
  loadAndRenderTemplate: jest.fn()
}));

import { createPluginContext, createMockPluginContext } from '../../src/plugin/context.js';
import type { SharedConfig } from '../../src/plugin/types.js';

describe('createPluginContext', () => {
  const createTestConfig = (): SharedConfig => ({
    core: {
      project: {
        name: 'test-project',
        root: '/test/project'
      },
      output: {
        base_dir: 'claude'
      },
      plugins: {}
    },
    plugins: new Map()
  });

  it('should create a context with all required fields', () => {
    const config = createTestConfig();
    const context = createPluginContext(
      '/test/project',
      '/test/target',
      config
    );

    expect(context.projectRoot).toBe('/test/project');
    expect(context.targetDir).toBe('/test/target');
    expect(context.config).toBe(config);
    expect(context.shared).toBeInstanceOf(Map);
    expect(context.logger).toBeDefined();
    expect(context.fs).toBeDefined();
    expect(context.template).toBeDefined();
    expect(context.ui).toBeDefined();
    expect(context.i18n).toBeDefined();
  });

  it('should create a shared Map', () => {
    const config = createTestConfig();
    const context = createPluginContext(
      '/test/project',
      '/test/target',
      config
    );

    expect(context.shared).toBeInstanceOf(Map);
    expect(context.shared.size).toBe(0);

    // Test that shared data works
    context.shared.set('testKey', 'testValue');
    expect(context.shared.get('testKey')).toBe('testValue');
  });

  it('should have logger with all methods', () => {
    const config = createTestConfig();
    const context = createPluginContext(
      '/test/project',
      '/test/target',
      config
    );

    expect(typeof context.logger.info).toBe('function');
    expect(typeof context.logger.success).toBe('function');
    expect(typeof context.logger.error).toBe('function');
    expect(typeof context.logger.warning).toBe('function');
    expect(typeof context.logger.step).toBe('function');
    expect(typeof context.logger.blank).toBe('function');
  });

  it('should have fs with all methods', () => {
    const config = createTestConfig();
    const context = createPluginContext(
      '/test/project',
      '/test/target',
      config
    );

    expect(typeof context.fs.ensureDir).toBe('function');
    expect(typeof context.fs.copyFile).toBe('function');
    expect(typeof context.fs.readFile).toBe('function');
    expect(typeof context.fs.writeFile).toBe('function');
    expect(typeof context.fs.fileExists).toBe('function');
    expect(typeof context.fs.dirExists).toBe('function');
    expect(typeof context.fs.readJsonFile).toBe('function');
    expect(typeof context.fs.writeJsonFile).toBe('function');
  });

  it('should have template engine with all methods', () => {
    const config = createTestConfig();
    const context = createPluginContext(
      '/test/project',
      '/test/target',
      config
    );

    expect(typeof context.template.loadTemplate).toBe('function');
    expect(typeof context.template.renderTemplate).toBe('function');
    expect(typeof context.template.loadAndRenderTemplate).toBe('function');
  });

  it('should have UI components with all methods', () => {
    const config = createTestConfig();
    const context = createPluginContext(
      '/test/project',
      '/test/target',
      config
    );

    expect(typeof context.ui.checkboxList).toBe('function');
    expect(typeof context.ui.radioList).toBe('function');
    expect(typeof context.ui.confirm).toBe('function');
    expect(typeof context.ui.input).toBe('function');
  });

  it('should have i18n API', () => {
    const config = createTestConfig();
    const context = createPluginContext(
      '/test/project',
      '/test/target',
      config
    );

    expect(typeof context.i18n.t).toBe('function');
    expect(typeof context.i18n.language).toBe('string');
    expect(context.i18n.language).toBe('en');
  });

  it('should accept custom UI components', () => {
    const config = createTestConfig();
    const customUI = {
      checkboxList: async () => ['test'],
      radioList: async () => 'test',
      confirm: async () => true,
      input: async () => 'test'
    };

    const context = createPluginContext(
      '/test/project',
      '/test/target',
      config,
      customUI
    );

    expect(context.ui).toBe(customUI);
  });

  it('should accept custom i18n API', () => {
    const config = createTestConfig();
    const customI18n = {
      t: (key: string) => `translated_${key}`,
      language: 'zh'
    };

    const context = createPluginContext(
      '/test/project',
      '/test/target',
      config,
      undefined,
      customI18n
    );

    expect(context.i18n).toBe(customI18n);
    expect(context.i18n.language).toBe('zh');
  });
});

describe('createMockPluginContext', () => {
  it('should create a mock context with default values', () => {
    const context = createMockPluginContext();

    expect(context.projectRoot).toBe('/test/project');
    expect(context.targetDir).toBe('/test/project');
    expect(context.config.core.project.name).toBe('test-project');
    expect(context.config.core.output.base_dir).toBe('claude');
    expect(context.shared).toBeInstanceOf(Map);
  });

  it('should allow overriding default values', () => {
    const context = createMockPluginContext({
      projectRoot: '/custom/path',
      targetDir: '/custom/target'
    });

    expect(context.projectRoot).toBe('/custom/path');
    expect(context.targetDir).toBe('/custom/target');
  });

  it('should allow overriding config', () => {
    const customConfig: SharedConfig = {
      core: {
        project: {
          name: 'custom-project',
          root: '/custom'
        },
        output: {
          base_dir: 'custom-dir'
        },
        plugins: {}
      },
      plugins: new Map([['test', { enabled: true, options: {} }]])
    };

    const context = createMockPluginContext({
      config: customConfig
    });

    expect(context.config.core.project.name).toBe('custom-project');
    expect(context.config.core.output.base_dir).toBe('custom-dir');
  });

  it('should allow overriding shared data', () => {
    const customShared = new Map<string, any>([
      ['key1', 'value1'],
      ['key2', 'value2']
    ]);

    const context = createMockPluginContext({
      shared: customShared
    });

    expect(context.shared.get('key1')).toBe('value1');
    expect(context.shared.get('key2')).toBe('value2');
  });

  it('should have all required tools', () => {
    const context = createMockPluginContext();

    expect(context.logger).toBeDefined();
    expect(context.fs).toBeDefined();
    expect(context.template).toBeDefined();
    expect(context.ui).toBeDefined();
    expect(context.i18n).toBeDefined();
  });
});
