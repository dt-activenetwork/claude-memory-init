/**
 * Rules Writer
 *
 * Writes plugin rules to .claude/rules/ directory.
 * Uses init.d style naming: {priority}-{baseName}.md
 */

import * as path from 'path';
import type {
  Plugin,
  PluginConfig,
  PluginContext,
  Logger,
} from '../plugin/types.js';
import { ensureDir, writeFile } from '../utils/file-ops.js';
import { CLAUDE_DIR, CLAUDE_SUBDIRS, RULES_PRIORITY } from '../constants.js';

/**
 * Result of writing a rules file
 */
export interface RulesWriteResult {
  /** Plugin name */
  pluginName: string;

  /** Path to the rules file */
  path: string;

  /** Whether the write was successful */
  success: boolean;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Format priority number to 2-digit string
 * @param priority Priority number (0-99)
 * @returns 2-digit string (e.g., '00', '10', '80')
 */
export function formatPriority(priority: number): string {
  return priority.toString().padStart(2, '0');
}

/**
 * Generate rules filename from priority and base name
 * @param priority Priority number (0-99)
 * @param baseName Base name (e.g., 'git', 'memory')
 * @returns Filename (e.g., '30-git.md')
 */
export function generateRulesFilename(priority: number, baseName: string): string {
  return `${formatPriority(priority)}-${baseName}.md`;
}

/**
 * Add YAML frontmatter with paths if specified
 * @param content Original content
 * @param paths Optional paths filter
 * @returns Content with frontmatter (if paths specified)
 */
export function addPathsFrontmatter(content: string, paths?: string): string {
  if (!paths) {
    return content;
  }

  const frontmatter = `---
paths: ${paths}
---

`;
  return frontmatter + content;
}

/**
 * RulesWriter - Writes plugin rules to .claude/rules/
 */
export class RulesWriter {
  private projectRoot: string;
  private rulesDir: string;
  private logger: Logger;

  constructor(projectRoot: string, logger: Logger) {
    this.projectRoot = projectRoot;
    this.rulesDir = path.join(projectRoot, CLAUDE_DIR, CLAUDE_SUBDIRS.RULES);
    this.logger = logger;
  }

  /**
   * Get the rules directory path
   */
  getRulesDir(): string {
    return this.rulesDir;
  }

  /**
   * Ensure the rules directory exists
   */
  async ensureRulesDir(): Promise<void> {
    await ensureDir(this.rulesDir);
  }

  /**
   * Write a single plugin's rules file
   */
  async writePluginRules(
    plugin: Plugin,
    config: PluginConfig,
    context: PluginContext
  ): Promise<RulesWriteResult> {
    const pluginName = plugin.meta.name;

    // Skip if plugin has no rules contribution
    if (!plugin.rules) {
      return {
        pluginName,
        path: '',
        success: true, // Not an error, just nothing to write
      };
    }

    // Skip if plugin is disabled
    if (!config.enabled) {
      return {
        pluginName,
        path: '',
        success: true,
      };
    }

    try {
      // Generate rules content
      let content = await plugin.rules.generate(config, context);

      // Skip if content is empty
      if (!content || content.trim() === '') {
        return {
          pluginName,
          path: '',
          success: true,
        };
      }

      // Add paths frontmatter if specified
      content = addPathsFrontmatter(content, plugin.rules.paths);

      // Determine priority and filename
      const priority = plugin.meta.rulesPriority ?? RULES_PRIORITY.CUSTOM;
      const filename = generateRulesFilename(priority, plugin.rules.baseName);
      const filePath = path.join(this.rulesDir, filename);

      // Write the file
      await writeFile(filePath, content);

      this.logger.success(`Generated: ${CLAUDE_DIR}/${CLAUDE_SUBDIRS.RULES}/${filename}`);

      return {
        pluginName,
        path: filePath,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to write rules for ${pluginName}: ${errorMessage}`);

      return {
        pluginName,
        path: '',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Write all plugins' rules files
   */
  async writeAllPluginRules(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>,
    context: PluginContext
  ): Promise<RulesWriteResult[]> {
    // Ensure directory exists
    await this.ensureRulesDir();

    const results: RulesWriteResult[] = [];

    // Sort plugins by priority for consistent output order
    const sortedPlugins = [...plugins].sort((a, b) => {
      const priorityA = a.meta.rulesPriority ?? RULES_PRIORITY.CUSTOM;
      const priorityB = b.meta.rulesPriority ?? RULES_PRIORITY.CUSTOM;
      return priorityA - priorityB;
    });

    for (const plugin of sortedPlugins) {
      const config = configs.get(plugin.meta.name);
      if (config) {
        const result = await this.writePluginRules(plugin, config, context);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Write project info rules file (00-project.md)
   */
  async writeProjectRules(projectName: string, version: string): Promise<RulesWriteResult> {
    const filename = generateRulesFilename(RULES_PRIORITY.PROJECT, 'project');
    const filePath = path.join(this.rulesDir, filename);

    const content = `# ${projectName}

**Version**: ${version}
**Last Updated**: ${new Date().toISOString().split('T')[0]}

This project uses claude-init for structured AI agent configuration.

## Project Structure

- \`.claude/rules/\` - Rules for Claude behavior (this directory)
- \`.claude/commands/\` - Slash commands
- \`.claude/skills/\` - Skills definitions
- \`.agent/\` - Project data and configuration (TOON format)

## Configuration

See \`.agent/config.toon\` for complete configuration.
`;

    try {
      await ensureDir(this.rulesDir);
      await writeFile(filePath, content);
      this.logger.success(`Generated: ${CLAUDE_DIR}/${CLAUDE_SUBDIRS.RULES}/${filename}`);

      return {
        pluginName: 'project',
        path: filePath,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        pluginName: 'project',
        path: '',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Write heavyweight plugin's migrated CLAUDE.md content
   */
  async writeMigratedClaudeMd(
    pluginName: string,
    content: string,
    priority: number
  ): Promise<RulesWriteResult> {
    const filename = generateRulesFilename(priority, pluginName);
    const filePath = path.join(this.rulesDir, filename);

    try {
      await ensureDir(this.rulesDir);
      await writeFile(filePath, content);
      this.logger.success(`Migrated CLAUDE.md to: ${CLAUDE_DIR}/${CLAUDE_SUBDIRS.RULES}/${filename}`);

      return {
        pluginName,
        path: filePath,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to migrate CLAUDE.md for ${pluginName}: ${errorMessage}`);

      return {
        pluginName,
        path: '',
        success: false,
        error: errorMessage,
      };
    }
  }
}
