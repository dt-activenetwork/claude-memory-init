/**
 * Plugin Context Creation
 *
 * Creates the runtime context that plugins can access during execution
 */

import type {
  PluginContext,
  SharedConfig,
  Logger,
  FileOperations,
  TemplateEngine,
  UIComponents,
  I18nAPI
} from './types.js';

import * as logger from '../utils/logger.js';
import * as fileOps from '../utils/file-ops.js';
import * as templateEngine from '../core/template-engine.js';

/**
 * Create a plugin context
 *
 * Provides plugins with access to tools and shared state
 *
 * @param projectRoot Project root directory
 * @param targetDir Target directory for initialization
 * @param config Shared configuration
 * @returns Plugin context
 */
export const createPluginContext = (
  projectRoot: string,
  targetDir: string,
  config: SharedConfig,
  ui?: UIComponents,
  i18n?: I18nAPI
): PluginContext => {
  // Create logger wrapper
  const loggerWrapper: Logger = {
    info: logger.info,
    success: logger.success,
    error: logger.error,
    warning: logger.warning,
    step: logger.step,
    blank: logger.blank
  };

  // Create file operations wrapper
  const fsWrapper: FileOperations = {
    ensureDir: fileOps.ensureDir,
    copyFile: fileOps.copyFile,
    readFile: fileOps.readFile,
    writeFile: fileOps.writeFile,
    fileExists: fileOps.fileExists,
    dirExists: fileOps.dirExists,
    readJsonFile: fileOps.readJsonFile,
    writeJsonFile: fileOps.writeJsonFile
  };

  // Create template engine wrapper
  // Note: Current template engine uses FullConfig from v1.x
  // We wrap it to match the unknown type signature for forward compatibility
  const templateWrapper: TemplateEngine = {
    loadTemplate: templateEngine.loadTemplate,
    renderTemplate: (template: string, config: unknown) => {
      return templateEngine.renderTemplate(template, config as import('../types/config.js').FullConfig);
    },
    loadAndRenderTemplate: async (templatePath: string, config: unknown) => {
      return templateEngine.loadAndRenderTemplate(templatePath, config as import('../types/config.js').FullConfig);
    }
  };

  // UI components (will be integrated in Phase 2)
  const uiWrapper: UIComponents = ui || {
    checkboxList: async () => [],
    radioList: async () => '',
    confirm: async () => false,
    input: async () => ''
  };

  // i18n API (will be integrated in Phase 7)
  const i18nWrapper: I18nAPI = i18n || {
    t: (key: string) => key,
    language: 'en'
  };

  return {
    projectRoot,
    targetDir,
    config,
    shared: new Map(),
    logger: loggerWrapper,
    fs: fsWrapper,
    template: templateWrapper,
    ui: uiWrapper,
    i18n: i18nWrapper
  };
};

/**
 * Create a minimal plugin context for testing
 *
 * @param overrides Partial context to override defaults
 * @returns Plugin context
 */
export const createMockPluginContext = (
  overrides: Partial<PluginContext> = {}
): PluginContext => {
  const defaultContext = createPluginContext(
    '/test/project',
    '/test/project',
    {
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
    }
  );

  return {
    ...defaultContext,
    ...overrides
  };
};
