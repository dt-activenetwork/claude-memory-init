/**
 * Heavyweight Plugin Manager
 *
 * Manages the execution of heavyweight plugins that have their own initialization
 * commands and may generate files that conflict with our generated files.
 *
 * Key responsibilities:
 * 1. Backup protected files before plugin initialization
 * 2. Execute the plugin's initialization command
 * 3. Merge protected files according to merge strategies
 * 4. Restore backups on failure
 */

import * as path from 'path';
import { spawn } from 'child_process';
import type {
  Plugin,
  PluginContext,
  HeavyweightPluginConfig,
  HeavyweightExecutionResult,
  FileMergeResult,
  ProtectedFile,
  MergeStrategy,
  Logger,
} from '../plugin/types.js';
import {
  readFile,
  writeFile,
  fileExists,
  ensureDir,
  copyFile,
} from '../utils/file-ops.js';
import fse from 'fs-extra';
import { t } from '../i18n/index.js';
import { RulesWriter } from './rules-writer.js';
import { RULES_PRIORITY } from '../constants.js';

/**
 * CLAUDE.md file names that heavyweight plugins may generate
 */
const CLAUDE_MD_FILES = ['CLAUDE.md', 'claude.md'];

/**
 * Default timeout for init commands (2 minutes)
 */
const DEFAULT_COMMAND_TIMEOUT = 120000;

/**
 * Default separator for append/prepend merge strategies
 */
const DEFAULT_MERGE_SEPARATOR = '\n\n---\n\n';

/**
 * Backup file entry
 */
interface BackupEntry {
  /** Original file path (absolute) */
  originalPath: string;

  /** Backup file path (absolute) */
  backupPath: string;

  /** Whether the original file existed */
  existed: boolean;

  /** Original content (if file existed) */
  content?: string;
}

/**
 * CLAUDE.md state snapshot
 */
interface ClaudeMdState {
  /** Which file was found (or null if none) */
  filePath: string | null;

  /** Whether the file existed */
  existed: boolean;

  /** Content hash (for change detection) */
  contentHash: string | null;

  /** Original content */
  content: string | null;
}

/**
 * Heavyweight Plugin Manager
 *
 * Handles the complex initialization flow for heavyweight plugins:
 * 1. Get heavyweight config from plugin
 * 2. Backup protected files
 * 3. Execute init command
 * 4. Merge protected files
 * 5. Cleanup or restore on failure
 */
export class HeavyweightPluginManager {
  private projectRoot: string;
  private logger: Logger;
  private backups: Map<string, BackupEntry> = new Map();
  private backupDir: string;

  /**
   * Create a new HeavyweightPluginManager
   *
   * @param projectRoot Absolute path to the project root
   * @param logger Logger instance for output
   */
  constructor(projectRoot: string, logger: Logger) {
    this.projectRoot = projectRoot;
    this.logger = logger;
    this.backupDir = path.join(projectRoot, '.agent', 'tmp', 'heavyweight-backup');
  }

  /**
   * Execute a heavyweight plugin
   *
   * Main entry point for heavyweight plugin initialization.
   * Handles the full lifecycle: backup -> execute -> merge -> cleanup/restore.
   *
   * @param plugin Plugin to execute
   * @param context Plugin context
   * @returns Execution result
   */
  async executeHeavyweightPlugin(
    plugin: Plugin,
    context: PluginContext
  ): Promise<HeavyweightExecutionResult> {
    const pluginName = plugin.meta.name;
    const L = t();

    this.logger.info(L.utils.heavyweight.initializing({ name: pluginName }));

    // Step 1: Get heavyweight config
    if (!plugin.getHeavyweightConfig) {
      return {
        success: false,
        mergeResults: [],
        error: L.errors.heavyweight.noConfig({ name: pluginName }),
      };
    }

    let config: HeavyweightPluginConfig;
    try {
      config = await plugin.getHeavyweightConfig(context);
    } catch (error) {
      return {
        success: false,
        mergeResults: [],
        error: L.errors.heavyweight.configFailed({ name: pluginName, error: error instanceof Error ? error.message : String(error) }),
      };
    }

    // Step 2: Backup protected files
    this.logger.info(L.utils.heavyweight.backingUp({ count: config.protectedFiles.length }));
    try {
      await this.backupProtectedFiles(config.protectedFiles);
    } catch (error) {
      return {
        success: false,
        mergeResults: [],
        error: L.errors.heavyweight.backupFailed({ error: error instanceof Error ? error.message : String(error) }),
      };
    }

    // Step 2.5: Capture CLAUDE.md state before init command (for migration)
    const migrateToRules = config.migrateClaudeMdToRules !== false; // default true
    let claudeMdStateBefore: ClaudeMdState | null = null;

    if (migrateToRules) {
      claudeMdStateBefore = await this.captureClaudeMdState();
    }

    // Step 3: Execute init command (if specified)
    let commandOutput: string | undefined;
    let exitCode: number | undefined;

    if (config.initCommand) {
      this.logger.info(L.utils.heavyweight.executing({ command: config.initCommand }));

      try {
        const result = await this.executeCommand(config);
        commandOutput = result.output;
        exitCode = result.exitCode;

        if (exitCode !== 0) {
          this.logger.warning('  ' + L.errors.heavyweight.commandExitCode({ code: exitCode }));
          // Don't fail immediately - try to merge what we can
        }
      } catch (error) {
        this.logger.error('  ' + L.errors.heavyweight.commandFailed({ error: error instanceof Error ? error.message : String(error) }));
        // Restore backups and return error
        await this.restoreBackups();
        return {
          success: false,
          commandOutput: error instanceof Error ? error.message : String(error),
          exitCode: -1,
          mergeResults: [],
          error: L.errors.heavyweight.commandFailed({ error: error instanceof Error ? error.message : String(error) }),
        };
      }
    }

    // Step 3.5: Migrate CLAUDE.md to rules (if changed)
    if (migrateToRules && claudeMdStateBefore) {
      await this.migrateClaudeMdToRules(
        plugin,
        claudeMdStateBefore,
        config.rulesFileName,
        context
      );
    }

    // Step 4: Merge protected files
    this.logger.info(L.utils.heavyweight.merging());
    const mergeResults: FileMergeResult[] = [];
    let mergeSuccess = true;

    for (const protectedFile of config.protectedFiles) {
      try {
        const result = await this.mergeProtectedFile(plugin, protectedFile, context);
        mergeResults.push(result);

        if (result.success) {
          this.logger.success(L.utils.heavyweight.merged({ path: protectedFile.path }));
        } else {
          this.logger.warning('    ' + L.errors.heavyweight.mergeFailed({ path: protectedFile.path, error: result.error || '' }));
          mergeSuccess = false;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        mergeResults.push({
          path: protectedFile.path,
          success: false,
          error: errorMsg,
        });
        this.logger.warning('    ' + L.errors.heavyweight.mergeFailed({ path: protectedFile.path, error: errorMsg }));
        mergeSuccess = false;
      }
    }

    // Step 5: Cleanup or restore
    if (mergeSuccess) {
      // Success - cleanup backup files
      await this.cleanupBackups();
      this.logger.success(L.utils.heavyweight.initSuccess({ name: pluginName }));
    } else {
      // Partial failure - restore backups
      this.logger.warning(L.utils.heavyweight.mergeFailed());
      await this.restoreBackups();
    }

    return {
      success: mergeSuccess,
      commandOutput,
      exitCode,
      mergeResults,
    };
  }

  /**
   * Backup protected files before running init command
   *
   * @param files Files to backup
   */
  private async backupProtectedFiles(files: ProtectedFile[]): Promise<void> {
    // Clear previous backups
    this.backups.clear();

    // Ensure backup directory exists
    await ensureDir(this.backupDir);

    for (const file of files) {
      const originalPath = path.join(this.projectRoot, file.path);
      const backupPath = path.join(this.backupDir, file.path);

      const exists = await fileExists(originalPath);

      const entry: BackupEntry = {
        originalPath,
        backupPath,
        existed: exists,
      };

      if (exists) {
        // Read and store content
        entry.content = await readFile(originalPath);

        // Copy to backup location
        await ensureDir(path.dirname(backupPath));
        await copyFile(originalPath, backupPath);
      }

      this.backups.set(file.path, entry);
    }
  }

  /**
   * Execute the init command
   *
   * @param config Heavyweight plugin config
   * @returns Command output and exit code
   */
  private async executeCommand(
    config: HeavyweightPluginConfig
  ): Promise<{ output: string; exitCode: number }> {
    if (!config.initCommand) {
      return { output: '', exitCode: 0 };
    }

    const timeout = config.timeout ?? DEFAULT_COMMAND_TIMEOUT;
    const cwd = config.workingDirectory
      ? path.resolve(this.projectRoot, config.workingDirectory)
      : this.projectRoot;

    return new Promise((resolve, reject) => {
      // Parse command into executable and args
      const parts = config.initCommand!.split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      const proc = spawn(cmd, args, {
        cwd,
        env: { ...process.env, ...config.env },
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : '');
        resolve({
          output,
          exitCode: code ?? 0,
        });
      });
    });
  }

  /**
   * Merge a single protected file
   *
   * @param plugin Plugin that defines the merge behavior
   * @param file Protected file configuration
   * @param context Plugin context
   * @returns Merge result
   */
  private async mergeProtectedFile(
    plugin: Plugin,
    file: ProtectedFile,
    context: PluginContext
  ): Promise<FileMergeResult> {
    const filePath = path.join(this.projectRoot, file.path);
    const backup = this.backups.get(file.path);

    // Get our original content (from backup)
    const ourContent = backup?.content ?? null;

    // Get their content (generated by init command)
    let theirContent: string | null = null;
    if (await fileExists(filePath)) {
      theirContent = await readFile(filePath);
    }

    // If neither exists, nothing to merge
    if (!ourContent && !theirContent) {
      return {
        path: file.path,
        success: true,
        content: '',
      };
    }

    // If only one exists, use that
    if (!ourContent && theirContent) {
      // Plugin created a new file, keep it
      return {
        path: file.path,
        success: true,
        content: theirContent,
      };
    }

    if (ourContent && !theirContent) {
      // Plugin didn't create the file, restore ours
      await writeFile(filePath, ourContent);
      return {
        path: file.path,
        success: true,
        content: ourContent,
      };
    }

    // Both exist - merge according to strategy
    const mergedContent = await this.mergeContent(
      plugin,
      file.path,
      file.mergeStrategy,
      ourContent!,
      theirContent!,
      context
    );

    // Write merged content
    await writeFile(filePath, mergedContent);

    return {
      path: file.path,
      success: true,
      content: mergedContent,
    };
  }

  /**
   * Merge content according to strategy
   *
   * @param plugin Plugin that may define custom merge
   * @param filePath File path (relative)
   * @param strategy Merge strategy
   * @param ourContent Our original content
   * @param theirContent Content from plugin's init command
   * @param context Plugin context
   * @returns Merged content
   */
  private async mergeContent(
    plugin: Plugin,
    filePath: string,
    strategy: MergeStrategy,
    ourContent: string,
    theirContent: string,
    context: PluginContext
  ): Promise<string> {
    const L = t();
    switch (strategy) {
      case 'append':
        // Our content first, then theirs
        return this.appendMerge(ourContent, theirContent);

      case 'prepend':
        // Their content first, then ours
        return this.prependMerge(ourContent, theirContent);

      case 'custom':
        // Use plugin's custom merge function
        if (!plugin.mergeFile) {
          throw new Error(
            `Plugin '${plugin.meta.name}' specifies 'custom' merge strategy for '${filePath}' but doesn't implement mergeFile()`
          );
        }
        return await plugin.mergeFile(filePath, ourContent, theirContent, context);

      default:
        throw new Error(L.errors.heavyweight.unknownStrategy({ strategy }));
    }
  }

  /**
   * Append merge: our content + separator + their content
   */
  private appendMerge(ourContent: string, theirContent: string): string {
    const ours = ourContent.trimEnd();
    const theirs = theirContent.trimStart();
    return `${ours}${DEFAULT_MERGE_SEPARATOR}${theirs}`;
  }

  /**
   * Prepend merge: their content + separator + our content
   */
  private prependMerge(ourContent: string, theirContent: string): string {
    const ours = ourContent.trimStart();
    const theirs = theirContent.trimEnd();
    return `${theirs}${DEFAULT_MERGE_SEPARATOR}${ours}`;
  }

  /**
   * Restore all backed up files
   *
   * Called when initialization fails to restore the original state.
   */
  async restoreBackups(): Promise<void> {
    const L = t();
    for (const [relativePath, backup] of this.backups) {
      try {
        if (backup.existed && backup.content) {
          // Restore original content
          await ensureDir(path.dirname(backup.originalPath));
          await writeFile(backup.originalPath, backup.content);
          this.logger.info(L.utils.heavyweight.restored({ path: relativePath }));
        } else if (!backup.existed) {
          // Remove file that was created by init command
          if (await fileExists(backup.originalPath)) {
            await fse.remove(backup.originalPath);
            this.logger.info(L.utils.heavyweight.removed({ path: relativePath }));
          }
        }
      } catch (error) {
        this.logger.error(
          `    Failed to restore ${relativePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Cleanup backup directory
    await this.cleanupBackups();
  }

  /**
   * Cleanup backup files and directory
   */
  private async cleanupBackups(): Promise<void> {
    try {
      await fse.remove(this.backupDir);
    } catch {
      // Ignore cleanup errors
    }
    this.backups.clear();
  }

  /**
   * Capture the current state of CLAUDE.md (for migration detection)
   */
  private async captureClaudeMdState(): Promise<ClaudeMdState> {
    for (const filename of CLAUDE_MD_FILES) {
      const filePath = path.join(this.projectRoot, filename);
      if (await fileExists(filePath)) {
        const content = await readFile(filePath);
        return {
          filePath,
          existed: true,
          contentHash: this.hashContent(content),
          content,
        };
      }
    }

    return {
      filePath: null,
      existed: false,
      contentHash: null,
      content: null,
    };
  }

  /**
   * Simple content hash for change detection
   */
  private hashContent(content: string | null): string {
    if (!content) {
      return 'null';
    }
    // Simple hash - just use length and first/last chars
    // Not cryptographically secure, but sufficient for change detection
    return `${content.length}-${content.slice(0, 50)}-${content.slice(-50)}`;
  }

  /**
   * Migrate CLAUDE.md content to .claude/rules/
   *
   * Called after heavyweight plugin init command executes.
   * Detects if CLAUDE.md was created/modified and moves content to rules.
   */
  private async migrateClaudeMdToRules(
    plugin: Plugin,
    stateBefore: ClaudeMdState,
    customFileName: string | undefined,
    context: PluginContext
  ): Promise<void> {
    // Capture current state
    const stateAfter = await this.captureClaudeMdState();

    // Check if anything changed
    if (!stateAfter.existed) {
      // No CLAUDE.md exists after init - nothing to migrate
      return;
    }

    const wasCreated = !stateBefore.existed && stateAfter.existed;
    const wasModified = stateBefore.existed &&
      stateAfter.existed &&
      stateBefore.contentHash !== stateAfter.contentHash;

    if (!wasCreated && !wasModified) {
      // No changes - nothing to migrate
      return;
    }

    // Determine content to migrate
    let contentToMigrate: string;

    if (wasCreated) {
      // New file created by plugin - migrate entire content
      contentToMigrate = stateAfter.content!;
      this.logger.info(`  CLAUDE.md was created by plugin, migrating to rules...`);
    } else {
      // File was modified - extract the new content (diff)
      // For simplicity, we'll migrate the difference or the entire new content
      // A more sophisticated approach would do a proper diff
      contentToMigrate = stateAfter.content!;
      this.logger.info(`  CLAUDE.md was modified by plugin, migrating changes to rules...`);
    }

    // Write to rules
    const rulesWriter = new RulesWriter(this.projectRoot, this.logger);
    const priority = plugin.meta.rulesPriority ?? RULES_PRIORITY.HEAVYWEIGHT_BASE;
    const fileName = customFileName || plugin.meta.name;

    await rulesWriter.writeMigratedClaudeMd(fileName, contentToMigrate, priority);

    // Restore or remove CLAUDE.md
    if (stateBefore.existed && stateBefore.content) {
      // Restore original content
      await writeFile(stateAfter.filePath!, stateBefore.content);
      this.logger.info(`  Restored original CLAUDE.md`);
    } else {
      // Remove the newly created file
      await fse.remove(stateAfter.filePath!);
      this.logger.info(`  Removed generated CLAUDE.md (migrated to rules)`);
    }
  }
}

/**
 * Check if a plugin is a heavyweight plugin
 *
 * @param plugin Plugin to check
 * @returns true if the plugin is heavyweight
 */
export function isHeavyweightPlugin(plugin: Plugin): boolean {
  return plugin.meta.heavyweight === true;
}

/**
 * Separate plugins into lightweight and heavyweight groups
 *
 * @param plugins Array of plugins
 * @returns Object with lightweight and heavyweight arrays
 */
export function separatePluginsByWeight(plugins: Plugin[]): {
  lightweight: Plugin[];
  heavyweight: Plugin[];
} {
  const lightweight: Plugin[] = [];
  const heavyweight: Plugin[] = [];

  for (const plugin of plugins) {
    if (isHeavyweightPlugin(plugin)) {
      heavyweight.push(plugin);
    } else {
      lightweight.push(plugin);
    }
  }

  return { lightweight, heavyweight };
}
