/**
 * Type definitions for the Plugin System
 *
 * This module defines the core interfaces and types for the plugin architecture,
 * allowing modular and extensible functionality in claude-init v2.0.
 */

import type { MemoryScope } from '../constants.js';

/**
 * Re-export MemoryScope for convenience
 */
export type { MemoryScope };

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
export interface PluginConfig<TOptions = Record<string, PluginOptionValue>> {
  enabled: boolean;
  options: TOptions;

  /**
   * Selected memory scope for this plugin instance
   * - 'project': Data stored in project/.agent/
   * - 'user': Data stored in ~/.claude/
   */
  scope?: MemoryScope;
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
export interface PluginConfigurationFlow<TOptions = Record<string, PluginOptionValue>> {
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
  configure: (context: ConfigurationContext) => Promise<PluginConfig<TOptions>> | PluginConfig<TOptions>;

  /**
   * Generate a summary of the plugin's configuration
   * Used in the final confirmation step
   *
   * @param config Plugin configuration
   * @returns Array of summary lines to display
   */
  getSummary: (config: PluginConfig<TOptions>) => string[];
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

  /**
   * Default memory scope for this plugin
   * - 'project': Plugin data is project-specific (default)
   * - 'user': Plugin data is user-level (cross-project)
   *
   * Note: Some plugins (like system-detector) may offer user choice.
   */
  defaultScope?: MemoryScope;

  /**
   * Whether the user can choose the memory scope during configuration
   * If true, plugin will prompt user to select scope during setup.
   */
  scopeSelectable?: boolean;

  /**
   * Whether this is a heavyweight plugin
   *
   * Heavyweight plugins have their own initialization commands that generate
   * files which may conflict with our generated files. They require special
   * handling for file protection and merging.
   *
   * @example claude-flow, which runs `pnpm dlx claude-flow@alpha init`
   */
  heavyweight?: boolean;

  /**
   * Names of plugins that conflict with this plugin
   *
   * When a conflicting plugin is selected, this plugin will be disabled
   * in the plugin selection UI.
   *
   * @example ['task-system'] - conflicts with task-system
   */
  conflicts?: string[];

  /**
   * Rules priority (init.d style, 0-99)
   *
   * Determines the numeric prefix for files in .claude/rules/
   * Lower numbers load first.
   *
   * Ranges:
   * - 00-09: Project basics
   * - 10-19: System/environment
   * - 20-29: Global settings
   * - 30-39: Version control
   * - 40-49: Core systems
   * - 50-59: Task management
   * - 60-69: Extensions
   * - 70-79: Workflows
   * - 80-89: Heavyweight plugins
   * - 90-99: User custom
   *
   * @see RULES_PRIORITY constants
   */
  rulesPriority?: number;
}

/**
 * File output from plugin
 */
export interface FileOutput {
  /**
   * Path relative to base directory
   * - For 'project' scope: relative to .agent/
   * - For 'user' scope: relative to ~/.claude/
   */
  path: string;

  /** File content */
  content: string;

  /** File format (for documentation and tooling) */
  format?: 'markdown' | 'toon' | 'json' | 'yaml';

  /**
   * Memory scope for this output
   * - 'project': Written to project/.agent/ (default)
   * - 'user': Written to ~/.claude/
   */
  scope?: MemoryScope;
}

/**
 * Plugin prompt contribution to AGENT.md
 *
 * @deprecated Use PluginRulesContribution instead. This interface will be removed in v3.0.
 * The new rules-based architecture writes to .claude/rules/*.md instead of a single AGENT.md.
 */
export interface PluginPromptContribution<TOptions = Record<string, PluginOptionValue>> {
  /**
   * Placeholder name in AGENT.md.template
   *
   * The placeholder {{PLACEHOLDER_NAME}} will be replaced with generated content.
   * If plugin is disabled or returns empty string, placeholder is replaced with empty string.
   *
   * @example "GIT_SECTION", "MEMORY_SECTION", "SYSTEM_INFO_SECTION"
   * @deprecated Use PluginRulesContribution.baseName instead
   */
  placeholder: string;

  /**
   * Generate content to replace placeholder
   *
   * Generated content should include the section title (##) if applicable.
   * Return empty string to completely remove the section.
   *
   * @param config Plugin configuration
   * @param context Plugin context
   * @returns Markdown content including section title, or empty string
   * @deprecated Use PluginRulesContribution.generate instead
   */
  generate: (config: PluginConfig<TOptions>, context: PluginContext) => Promise<string> | string;
}

/**
 * Plugin rules contribution to .claude/rules/
 *
 * Generates rules files that are natively supported by Claude Code.
 * Each plugin generates its own {priority}-{baseName}.md file.
 */
export interface PluginRulesContribution<TOptions = Record<string, PluginOptionValue>> {
  /**
   * Base name for the rules file (without priority prefix and .md extension)
   *
   * Final filename: {priority}-{baseName}.md
   * Priority is taken from meta.rulesPriority.
   *
   * @example 'git' results in '30-git.md' (if priority is 30)
   * @example 'memory' results in '40-memory.md' (if priority is 40)
   */
  baseName: string;

  /**
   * Generate rules content
   *
   * The generated content is written directly to .claude/rules/{priority}-{baseName}.md
   * If plugin is disabled or returns empty string, no file is created.
   *
   * @param config Plugin configuration
   * @param context Plugin context
   * @returns Markdown content for the rules file, or empty string to skip
   */
  generate: (config: PluginConfig<TOptions>, context: PluginContext) => Promise<string> | string;

  /**
   * Optional path filter (glob pattern)
   *
   * If specified, a YAML frontmatter with paths will be automatically prepended.
   * This makes the rules apply only to files matching the pattern.
   */
  paths?: string;
}

/**
 * Plugin file outputs
 */
export interface PluginOutputs<TOptions = Record<string, PluginOptionValue>> {
  /**
   * Generate files to be written to .agent/ directory
   *
   * @param config Plugin configuration
   * @param context Plugin context
   * @returns Array of file outputs
   */
  generate: (config: PluginConfig<TOptions>, context: PluginContext) => Promise<FileOutput[]> | FileOutput[];
}

/**
 * Plugin gitignore contribution
 */
export interface PluginGitignoreContribution<TOptions = Record<string, PluginOptionValue>> {
  /**
   * Comment to add above the patterns (optional)
   * Will be formatted as: # {comment}
   */
  comment?: string;

  /**
   * Get patterns to add to .gitignore
   *
   * @param config Plugin configuration
   * @returns Array of gitignore patterns
   */
  getPatterns: (config: PluginConfig<TOptions>) => string[];
}

/**
 * Slash command definition
 *
 * Slash commands are prompt templates that can be invoked by users or AI.
 * When declared in a plugin, the CLI automatically:
 * 1. Reads the template from templatePath
 * 2. Writes it to the configured output directory (e.g., .claude/commands/)
 */
export interface SlashCommand {
  /** Command name (e.g., "memory-search", "task-status") */
  name: string;

  /** Short description of what the command does */
  description: string;

  /** Argument hint for help text (e.g., "[tag-name]", "<url>") */
  argumentHint?: string;

  /**
   * Template file path relative to templates/ directory
   *
   * @example 'commands/memory/search.md'
   * @example 'commands/pma/issue.md'
   */
  templatePath: string;
}

/**
 * Skill definition
 *
 * Skills are specialized capabilities that Claude can use.
 * When declared in a plugin, the CLI automatically:
 * 1. Reads the template from templatePath
 * 2. Writes it to .claude/skills/<name>/SKILL.md
 */
export interface Skill {
  /** Skill name, used as directory name (e.g., "gh-issue") */
  name: string;

  /** Skill description */
  description: string;

  /** Skill version (e.g., "1.0.0") */
  version: string;

  /**
   * Template file path relative to templates/ directory
   *
   * @example 'skills/gh-issue.md'
   * @example 'skills/memory-indexer.md'
   */
  templatePath: string;
}

// ============================================================================
// Heavyweight Plugin Types
// ============================================================================

/**
 * Merge strategy for protected files
 *
 * - 'append': Our content + separator + their content
 * - 'prepend': Their content + separator + our content
 * - 'custom': Use the plugin's mergeFile() function
 */
export type MergeStrategy = 'append' | 'prepend' | 'custom';

/**
 * Protected file configuration
 *
 * Defines a file that should be protected during heavyweight plugin initialization.
 * The file will be backed up before the plugin's init command runs, and then
 * merged according to the specified strategy.
 */
export interface ProtectedFile {
  /** Path relative to project root (e.g., 'CLAUDE.md', '.agent/config.toon') */
  path: string;

  /** Strategy for merging our content with the plugin's generated content */
  mergeStrategy: MergeStrategy;
}

/**
 * Heavyweight plugin configuration
 *
 * Returned by getHeavyweightConfig() to specify how the plugin should be
 * initialized and how file conflicts should be resolved.
 */
export interface HeavyweightPluginConfig {
  /**
   * Files to protect during initialization
   *
   * These files will be backed up before the init command runs,
   * and merged according to their merge strategy afterward.
   *
   * Note: CLAUDE.md should NOT be included here anymore.
   * Use migrateClaudeMdToRules instead for automatic migration.
   */
  protectedFiles: ProtectedFile[];

  /**
   * Initialization command to execute
   *
   * If null, the plugin doesn't need an external init command.
   * Example: 'pnpm dlx claude-flow@alpha init'
   */
  initCommand: string | null;

  /**
   * Working directory for the init command (optional)
   *
   * If not specified, uses the project root.
   */
  workingDirectory?: string;

  /**
   * Timeout for the init command in milliseconds (optional)
   *
   * Default: 120000 (2 minutes)
   */
  timeout?: number;

  /**
   * Environment variables to pass to the init command (optional)
   */
  env?: Record<string, string>;

  /**
   * Whether to automatically migrate generated CLAUDE.md to .claude/rules/
   *
   * When true (default), if the init command creates or modifies CLAUDE.md:
   * 1. The content is extracted
   * 2. Written to .claude/rules/{priority}-{plugin}.md
   * 3. The generated CLAUDE.md is removed (or restored to original state)
   *
   * This allows multiple heavyweight plugins to coexist without overwriting
   * each other's CLAUDE.md content.
   *
   * @default true
   */
  migrateClaudeMdToRules?: boolean;

  /**
   * Custom rules file name for migrated CLAUDE.md content
   *
   * If not specified, uses the plugin name from meta.name.
   * The priority prefix comes from meta.rulesPriority.
   *
   * @example 'claude-flow' results in '80-claude-flow.md'
   */
  rulesFileName?: string;
}

/**
 * Result of a file merge operation
 */
export interface FileMergeResult {
  /** Path to the file */
  path: string;

  /** Whether the merge was successful */
  success: boolean;

  /** Merged content (if successful) */
  content?: string;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Result of heavyweight plugin execution
 */
export interface HeavyweightExecutionResult {
  /** Whether the overall execution was successful */
  success: boolean;

  /** Command output (if command was run) */
  commandOutput?: string;

  /** Command exit code (if command was run) */
  exitCode?: number;

  /** File merge results */
  mergeResults: FileMergeResult[];

  /** Error message (if failed) */
  error?: string;
}

/**
 * Plugin definition
 *
 * Complete interface for defining a plugin
 */
export interface Plugin<TOptions = Record<string, PluginOptionValue>> {
  /** Plugin metadata */
  meta: PluginMeta;

  /** Configuration flow (optional - plugins without config don't need this) */
  configuration?: PluginConfigurationFlow<TOptions>;

  /** Lifecycle hooks (optional - plugins can implement any subset) */
  hooks?: PluginHooks;

  /** CLI commands exposed by the plugin (optional) */
  commands?: PluginCommand[];

  /**
   * Slash commands provided by this plugin (optional)
   *
   * CLI automatically reads templates and writes to configured commands directory
   * Plugins should NOT write commands in outputs.generate - use this instead
   */
  slashCommands?: SlashCommand[];

  /**
   * Skills provided by this plugin (optional)
   *
   * CLI automatically reads templates and writes to .claude/skills/<name>/SKILL.md
   */
  skills?: Skill[];

  /**
   * Prompt contribution to AGENT.md (optional)
   *
   * @deprecated Use `rules` instead. This will be removed in v3.0.
   */
  prompt?: PluginPromptContribution<TOptions>;

  /**
   * Rules contribution to .claude/rules/ (optional)
   *
   * Generates a rules file that is natively supported by Claude Code.
   * The file is named {priority}-{baseName}.md where priority comes from meta.rulesPriority.
   *
   * This replaces the deprecated `prompt` property.
   */
  rules?: PluginRulesContribution<TOptions>;

  /**
   * File outputs to .agent/ directory (optional)
   *
   * Note: Do NOT include slash commands or skills here.
   * Use slashCommands and skills properties instead.
   */
  outputs?: PluginOutputs<TOptions>;

  /** Gitignore patterns contribution (optional) */
  gitignore?: PluginGitignoreContribution<TOptions>;

  // ============================================================================
  // Heavyweight Plugin Methods
  // ============================================================================

  /**
   * Get heavyweight plugin configuration
   *
   * Only called if meta.heavyweight is true. Returns configuration for
   * file protection, merge strategies, and the initialization command.
   *
   * @param context Plugin context
   * @returns Heavyweight plugin configuration
   */
  getHeavyweightConfig?: (context: PluginContext) => HeavyweightPluginConfig | Promise<HeavyweightPluginConfig>;

  /**
   * Custom file merge function
   *
   * Called when a protected file has mergeStrategy: 'custom'.
   * Allows the plugin to implement complex merge logic.
   *
   * @param filePath Path to the file (relative to project root)
   * @param ourContent Our content (null if file didn't exist)
   * @param theirContent Content generated by the plugin's init command
   * @param context Plugin context
   * @returns Merged content
   */
  mergeFile?: (
    filePath: string,
    ourContent: string | null,
    theirContent: string,
    context: PluginContext
  ) => string | Promise<string>;
}
