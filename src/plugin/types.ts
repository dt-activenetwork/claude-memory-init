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

  /**
   * External CLI tool dependencies required by this plugin
   *
   * The dependency checker will verify these tools are available before
   * allowing the plugin to be selected. If a tool is missing but can be
   * installed, the user will be prompted to install it.
   *
   * @example
   * toolDependencies: [
   *   {
   *     name: 'ast-grep',
   *     checkCommand: 'ast-grep --version',
   *     installCommands: {
   *       darwin: 'brew install ast-grep',
   *       linux: 'cargo install ast-grep --locked',
   *     },
   *   },
   * ]
   */
  toolDependencies?: ToolDependency[];
}

// ============================================================================
// Tool Dependency Types
// ============================================================================

/**
 * External CLI tool dependency
 *
 * Defines a CLI tool that a plugin requires to function properly.
 * The dependency checker uses this to verify availability and
 * offer installation if possible.
 */
export interface ToolDependency {
  /**
   * Tool name (e.g., 'ast-grep', 'git', 'uv')
   *
   * Used for display and as the default command to check.
   */
  name: string;

  /**
   * Command to check if the tool exists (optional)
   *
   * If not specified, defaults to `{name} --version`.
   * Should be a command that exits with 0 if the tool is installed.
   *
   * @example 'ast-grep --version'
   * @example 'pip --version || pip3 --version'
   */
  checkCommand?: string;

  /**
   * Platform-specific install commands
   *
   * Provides install instructions for different operating systems.
   * If not specified for a platform, the tool is considered
   * not automatically installable on that platform.
   */
  installCommands?: {
    /** macOS install command (e.g., 'brew install tool') */
    darwin?: string;
    /** Linux install command (e.g., 'apt install tool') */
    linux?: string;
    /** Windows install command (e.g., 'winget install tool') */
    win32?: string;
  };

  /**
   * Whether this dependency is optional
   *
   * If true, a missing tool will show a warning but won't prevent
   * the plugin from being selected. If false (default), the plugin
   * will be disabled if the tool is unavailable.
   *
   * @default false
   */
  optional?: boolean;
}

/**
 * Result of checking a single tool dependency
 */
export interface ToolCheckResult {
  /** Tool name */
  name: string;

  /** Whether the tool is available in the system */
  available: boolean;

  /** Whether the tool can be automatically installed */
  canInstall: boolean;

  /** Install command for the current platform (if installable) */
  installCommand?: string;

  /** Tool version (if available and detected) */
  version?: string;
}

/**
 * Overall dependency status for a plugin
 */
export interface PluginDependencyStatus {
  /** Plugin name */
  pluginName: string;

  /**
   * Whether the plugin can be selected
   *
   * True if all required dependencies are either available or installable.
   */
  available: boolean;

  /**
   * Names of required dependencies that cannot be satisfied
   *
   * These are dependencies that are missing and cannot be automatically
   * installed on the current platform.
   */
  missingRequired: string[];

  /**
   * Dependencies that will need to be installed
   *
   * These are missing dependencies that CAN be installed on the
   * current platform. The user will be prompted to install them.
   */
  toInstall: ToolDependency[];

  /**
   * Human-readable reason why the plugin is disabled
   *
   * Only set when `available` is false. Used for UI display.
   *
   * @example 'Missing: ast-grep (not available on this platform)'
   */
  disabledReason?: string;
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
// Init Command Types
// ============================================================================

/**
 * Command to execute during initialization
 *
 * Plugins can declare commands to run during the init phase.
 * Commands are executed after directory creation but before completion.
 *
 * This is a generalization of the old MCPServerConfig - MCP registration
 * is just one use case. Other uses include running setup scripts,
 * initializing databases, etc.
 */
export interface InitCommand {
  /**
   * Unique identifier for this command
   *
   * @example 'mcp-serena', 'setup-db', 'install-deps'
   */
  name: string;

  /**
   * Command to execute (supports placeholders)
   *
   * Placeholders:
   * - $(pwd): Shell-expanded at runtime (preserved for shell)
   * - ${PROJECT_ROOT}: Replaced by CLI with actual project path
   * - ${PROJECT_NAME}: Replaced by CLI with project name
   *
   * @example 'claude mcp add --scope project serena -- uvx serena start-mcp-server --project "$(pwd)"'
   * @example 'npm run setup'
   */
  command: string;

  /**
   * Additional arguments (optional)
   *
   * These are appended to the command.
   */
  args?: string[];

  /**
   * Human-readable description for UI display
   *
   * Shown during initialization summary and post-init messages.
   */
  description?: string;

  /**
   * Category for grouping in completion message
   *
   * Commands with the same category are grouped together in the output.
   *
   * @example 'mcp', 'setup', 'config'
   */
  category?: string;

  /**
   * If true, failure doesn't show as error
   *
   * Optional commands that fail will show a warning instead of an error,
   * and won't cause the initialization to be considered failed.
   *
   * @default false
   */
  optional?: boolean;

  /**
   * Condition function to determine if this command should run
   *
   * Called with the plugin's configuration. If returns false, the command
   * is skipped during execution.
   *
   * @example (config) => config.options.enableFeature === true
   */
  condition?: (config: PluginConfig) => boolean;
}

// ============================================================================
// MCP Server Types (Legacy - Deprecated)
// ============================================================================

/**
 * MCP Server configuration
 *
 * @deprecated Use InitCommand instead. This type alias will be removed in v3.0.
 *
 * For backward compatibility, MCPServerConfig is now an alias for InitCommand.
 * The 'scope' field is no longer directly supported - use createMCPCommand()
 * helper function to create MCP registration commands.
 */
export type MCPServerConfig = InitCommand & {
  /**
   * Scope for MCP server registration (legacy field)
   *
   * - 'project': Registered for current project only (default)
   * - 'user': Registered globally for the user
   *
   * @deprecated Build the full `claude mcp add` command in the command field instead.
   * @default 'project'
   */
  scope?: 'project' | 'user';
};

// ============================================================================
// Post-Init Contribution Types
// ============================================================================

/**
 * Manual step that requires user action
 *
 * Used to communicate steps that cannot be automated and require
 * the user to perform them manually after initialization.
 */
export interface ManualStep {
  /** Human-readable description of what the user needs to do */
  description: string;

  /** Command to run (for copy-paste) */
  command: string;

  /** Whether this step is optional (default: false) */
  optional?: boolean;

  /** Category for grouping (e.g., 'skill-install', 'mcp-config') */
  category?: string;
}

/**
 * Post-initialization contribution from a plugin
 *
 * Plugins can provide information to be displayed after initialization
 * completes, including manual steps, messages, and warnings.
 */
export interface PostInitContribution {
  /** Plugin name for attribution */
  pluginName: string;

  /** Manual steps that require user action */
  manualSteps?: ManualStep[];

  /** Informational messages to display */
  messages?: string[];

  /** Warning messages to display */
  warnings?: string[];
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

  /**
   * Commands to execute during initialization (optional)
   *
   * These commands run after directory structure is created.
   * Failures are logged but don't block initialization (unless optional: false).
   *
   * This is the preferred way to register MCP servers and run setup commands.
   *
   * @example
   * initCommands: [
   *   {
   *     name: 'mcp-serena',
   *     command: 'claude mcp add --scope project serena -- uvx serena start-mcp-server --project "$(pwd)"',
   *     description: 'Register Serena MCP server',
   *     category: 'mcp',
   *   },
   *   {
   *     name: 'setup-db',
   *     command: 'npm run db:init',
   *     description: 'Initialize database',
   *     category: 'setup',
   *     optional: true,
   *   },
   * ]
   */
  initCommands?: InitCommand[];

  /**
   * MCP servers provided by this plugin (optional)
   *
   * @deprecated Use initCommands instead. This will be removed in v3.0.
   *
   * MCP servers are registered via `claude mcp add` during initialization.
   * Each server configuration specifies the name, command, and scope.
   *
   * For new code, use initCommands with the full `claude mcp add` command,
   * or use the createMCPCommand() helper function.
   *
   * @example
   * mcpServers: [
   *   {
   *     name: 'serena',
   *     command: 'uvx --from git+https://github.com/oraios/serena serena start-mcp-server --project "$(pwd)"',
   *     scope: 'project',
   *     description: 'Semantic code analysis',
   *   },
   * ]
   */
  mcpServers?: MCPServerConfig[];

  // ============================================================================
  // Post-Init Contribution Methods
  // ============================================================================

  /**
   * Get post-initialization contribution
   *
   * Called after initialization completes to collect information for the
   * completion message, including manual steps, messages, and warnings.
   *
   * @param context Plugin context
   * @param config Plugin configuration
   * @returns Post-init contribution or undefined if none
   */
  getPostInitContribution?: (
    context: PluginContext,
    config: PluginConfig<TOptions>
  ) => PostInitContribution | undefined;

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
