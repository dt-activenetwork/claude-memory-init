/**
 * Type definitions for the Plugin System
 *
 * This module defines the core interfaces and types for the plugin architecture,
 * allowing modular and extensible functionality in claude-init v2.0.
 */

/**
 * Logger interface providing various log levels
 */
export interface Logger {
  info: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  step: (stepNumber: number, message: string) => void;
  blank: () => void;
}

/**
 * JSON data type for file operations
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export type JsonArray = JsonValue[];

/**
 * File operation interface for reading, writing, and managing files
 */
export interface FileOperations {
  ensureDir: (dirPath: string) => Promise<void>;
  copyFile: (src: string, dest: string) => Promise<void>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  fileExists: (filePath: string) => Promise<boolean>;
  dirExists: (dirPath: string) => Promise<boolean>;
  readJsonFile: <T = JsonValue>(filePath: string) => Promise<T>;
  writeJsonFile: (filePath: string, data: JsonValue) => Promise<void>;
}

/**
 * Template engine interface for rendering templates with variables
 *
 * Note: The actual template engine uses FullConfig from v1.x for now.
 * This will be refactored when plugins implement their own prompt generators.
 */
export interface TemplateEngine {
  loadTemplate: (templatePath: string) => Promise<string>;
  renderTemplate: (template: string, config: unknown) => string;
  loadAndRenderTemplate: (templatePath: string, config: unknown) => Promise<string>;
}

/**
 * UI components for interactive command-line interfaces
 */
export interface UIComponents {
  checkboxList: (message: string, options: CheckboxOption[]) => Promise<string[]>;
  radioList: (message: string, options: RadioOption[], defaultValue?: string) => Promise<string>;
  confirm: (message: string, defaultValue?: boolean) => Promise<boolean>;
  input: (message: string, defaultValue?: string, validate?: (input: string) => boolean | string) => Promise<string>;
}

/**
 * Option for checkbox list component
 */
export interface CheckboxOption {
  name: string;
  value: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
}

/**
 * Option for radio list component
 */
export interface RadioOption {
  name: string;
  value: string;
  description?: string;
}

/**
 * i18n translation options
 */
export type TranslationOptions = Record<string, string | number | boolean>;

/**
 * Internationalization (i18n) API for multi-language support
 */
export interface I18nAPI {
  t: (key: string, options?: TranslationOptions) => string;
  language: string;
}

/**
 * Shared configuration accessible by all plugins
 */
export interface SharedConfig {
  core: CoreConfig;
  plugins: Map<string, PluginConfig>;
}

/**
 * Core configuration (minimal, non-plugin-specific)
 */
export interface CoreConfig {
  project: {
    name: string;
    root: string;
  };
  output: {
    base_dir: string;
  };
  plugins: PluginRegistry;
}

/**
 * Plugin registry - maps plugin names to their configurations
 */
export interface PluginRegistry {
  [pluginName: string]: PluginConfig;
}

/**
 * Plugin options value type
 */
export type PluginOptionValue = string | number | boolean | string[] | Record<string, unknown>;

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean;
  options: Record<string, PluginOptionValue>;
}

/**
 * Shared data value type (for plugin inter-communication)
 */
export type SharedDataValue = string | number | boolean | object | unknown[];

/**
 * Plugin context - the environment and tools available to plugins at runtime
 */
export interface PluginContext {
  /** Project root directory */
  projectRoot: string;

  /** Target directory for initialization */
  targetDir: string;

  /** Shared configuration */
  config: SharedConfig;

  /** Shared data between plugins */
  shared: Map<string, SharedDataValue>;

  /** Logger for console output */
  logger: Logger;

  /** File operation utilities */
  fs: FileOperations;

  /** Template rendering engine */
  template: TemplateEngine;

  /** UI components for interactive prompts */
  ui: UIComponents;

  /** Internationalization API */
  i18n: I18nAPI;
}

/**
 * Plugin lifecycle hooks
 *
 * Hooks are executed in the following order:
 * 1. beforeInit - Before initialization starts
 * 2. configure - Configuration phase (if needsConfiguration is true)
 * 3. execute - Main execution phase
 * 4. afterInit - After all plugins have executed
 * 5. cleanup - Cleanup phase
 */
export interface PluginHooks {
  /**
   * Executed before initialization starts
   * Use for pre-initialization checks or setup
   */
  beforeInit?: (context: PluginContext) => Promise<void> | void;

  /**
   * Main execution phase
   * Use for the plugin's primary functionality
   */
  execute?: (context: PluginContext) => Promise<void> | void;

  /**
   * Executed after all plugins have finished
   * Use for post-initialization tasks
   */
  afterInit?: (context: PluginContext) => Promise<void> | void;

  /**
   * Cleanup phase
   * Use for cleanup tasks like removing temporary files
   */
  cleanup?: (context: PluginContext) => Promise<void> | void;
}

/**
 * Configuration context passed to plugin configuration functions
 */
export interface ConfigurationContext {
  /** Project name */
  projectName: string;

  /** Project root directory */
  projectRoot: string;

  /** Configurations from other plugins (may be used to inform this plugin's config) */
  otherPlugins: Map<string, PluginConfig>;

  /** UI components for interactive configuration */
  ui: UIComponents;

  /** Logger for console output */
  logger: Logger;
}

/**
 * Plugin configuration flow
 *
 * Defines how a plugin collects configuration from the user
 */
export interface PluginConfigurationFlow {
  /**
   * Whether the plugin needs interactive configuration
   * If false, the plugin will be configured silently
   */
  needsConfiguration: boolean;

  /**
   * Interactive configuration function
   * Collects configuration from the user via prompts
   *
   * @param context Configuration context with UI and logger
   * @returns Plugin configuration
   */
  configure: (context: ConfigurationContext) => Promise<PluginConfig> | PluginConfig;

  /**
   * Generate a summary of the plugin's configuration
   * Used in the final confirmation step
   *
   * @param config Plugin configuration
   * @returns Array of summary lines to display
   */
  getSummary: (config: PluginConfig) => string[];
}

/**
 * Command option value type
 */
export type CommandOptionValue = string | number | boolean | string[];

/**
 * Command option definition
 */
export interface CommandOption {
  /** Option flags (e.g., '-f, --force') */
  flags: string;

  /** Option description */
  description: string;

  /** Default value (optional) */
  defaultValue?: CommandOptionValue;
}

/**
 * Runtime command options (parsed from command line)
 */
export interface CommandOptions {
  [key: string]: CommandOptionValue | undefined;
}

/**
 * Plugin command definition
 *
 * Plugins can expose CLI commands that extend the tool's functionality
 */
export interface PluginCommand {
  /**
   * Command name (without plugin prefix)
   * Example: 'system-add' (full command: claude-init memory system-add)
   */
  name: string;

  /** Command description */
  description: string;

  /** Command options (optional) */
  options?: CommandOption[];

  /**
   * Command action handler
   *
   * @param options Parsed command-line options
   * @param context Plugin context
   */
  action: (options: CommandOptions, context: PluginContext) => Promise<void>;
}

/**
 * Plugin metadata
 */
export interface PluginMeta {
  /** Unique plugin name (e.g., 'memory-system') */
  name: string;

  /** CLI command name (e.g., 'memory' for claude-init memory ...) */
  commandName: string;

  /** Plugin version */
  version: string;

  /** Plugin description */
  description: string;

  /** Plugin author (optional) */
  author?: string;

  /** Whether the plugin is recommended (checked by default in init) */
  recommended?: boolean;

  /** Names of plugins this plugin depends on (optional) */
  dependencies?: string[];
}

/**
 * Plugin definition
 *
 * Complete interface for defining a plugin
 */
export interface Plugin {
  /** Plugin metadata */
  meta: PluginMeta;

  /** Configuration flow (optional - plugins without config don't need this) */
  configuration?: PluginConfigurationFlow;

  /** Lifecycle hooks (optional - plugins can implement any subset) */
  hooks?: PluginHooks;

  /** CLI commands exposed by the plugin (optional) */
  commands?: PluginCommand[];
}
