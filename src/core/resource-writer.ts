/**
 * Unified resource writer for plugin-declared resources
 *
 * This module implements the "declare and generate" pattern where plugins
 * declare resources (slash commands, skills) and the CLI automatically
 * reads templates and writes files to the appropriate locations.
 */

import * as path from 'path';
import type {
  Plugin,
  PluginConfig,
  PluginContext,
  FileOutput,
  Logger,
} from '../plugin/types.js';
import { OutputRouter } from './output-router.js';
import { ensureDir, writeFile, readFile } from '../utils/file-ops.js';

/**
 * Slash command declaration
 *
 * Plugins declare slash commands, and the CLI automatically:
 * 1. Reads the template from templatePath
 * 2. Writes to the path configured in OutputRouter
 */
export interface SlashCommand {
  /** Command name (e.g., "memory-search", "task-status") */
  name: string;

  /** Short description of what the command does */
  description: string;

  /** Argument hint for help text (e.g., "[tag-name]", "[task-id]") */
  argumentHint?: string;

  /**
   * Template path relative to project templates/ directory
   *
   * @example 'commands/memory/search.md'
   * @example 'commands/pma/issue.md'
   */
  templatePath: string;
}

/**
 * Skill declaration
 *
 * Plugins declare skills, and the CLI automatically:
 * 1. Reads the template from templatePath
 * 2. Writes to .claude/skills/<name>/SKILL.md
 */
export interface Skill {
  /** Skill name, used as directory name (e.g., "gh-issue") */
  name: string;

  /** Skill description */
  description: string;

  /** Skill version (e.g., "1.0.0") */
  version: string;

  /**
   * Template path relative to project templates/ directory
   *
   * @example 'skills/gh-issue.md'
   * @example 'skills/memory-indexer.md'
   */
  templatePath: string;
}

/**
 * Template loader interface
 */
export interface TemplateLoader {
  load(templatePath: string): Promise<string>;
}

/**
 * Default template loader
 * Loads template files from templates/ directory
 */
export class DefaultTemplateLoader implements TemplateLoader {
  constructor(private templatesDir: string) {}

  async load(templatePath: string): Promise<string> {
    const fullPath = path.join(this.templatesDir, templatePath);
    return readFile(fullPath);
  }
}

/**
 * Resource write result
 */
export interface WriteResult {
  type: 'slash-command' | 'skill' | 'data-file';
  name: string;
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Unified resource writer
 *
 * Responsible for writing plugin-declared resources to the file system
 */
export class ResourceWriter {
  constructor(
    private router: OutputRouter,
    private templateLoader: TemplateLoader,
    private logger: Logger
  ) {}

  /**
   * Write all plugin resources
   */
  async writeAllResources(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>,
    context: PluginContext
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    // 1. Write slash commands
    const cmdResults = await this.writeSlashCommands(plugins, configs);
    results.push(...cmdResults);

    // 2. Write skills
    const skillResults = await this.writeSkills(plugins, configs);
    results.push(...skillResults);

    // 3. Write data files
    const dataResults = await this.writeDataFiles(plugins, configs, context);
    results.push(...dataResults);

    return results;
  }

  /**
   * Write slash commands
   */
  async writeSlashCommands(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.slashCommands?.length) continue;

      for (const cmd of plugin.slashCommands) {
        const result = await this.writeSlashCommand(cmd);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Write single slash command
   */
  private async writeSlashCommand(cmd: SlashCommand): Promise<WriteResult> {
    const targetPath = this.router.getSlashCommandPath(cmd.name);

    try {
      const content = await this.templateLoader.load(cmd.templatePath);
      await ensureDir(path.dirname(targetPath));
      await writeFile(targetPath, content);

      const displayPath = this.router.getDisplayPath(targetPath);
      this.logger.info(`Created: ${displayPath}`);

      return {
        type: 'slash-command',
        name: cmd.name,
        path: targetPath,
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warning(`Failed to create slash command ${cmd.name}: ${errorMsg}`);

      return {
        type: 'slash-command',
        name: cmd.name,
        path: targetPath,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Write skills
   */
  async writeSkills(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.skills?.length) continue;

      for (const skill of plugin.skills) {
        const result = await this.writeSkill(skill);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Write single skill
   */
  private async writeSkill(skill: Skill): Promise<WriteResult> {
    const targetPath = this.router.getSkillPath(skill.name);

    try {
      const content = await this.templateLoader.load(skill.templatePath);
      await ensureDir(path.dirname(targetPath));
      await writeFile(targetPath, content);

      const displayPath = this.router.getDisplayPath(targetPath);
      this.logger.info(`Created: ${displayPath}`);

      return {
        type: 'skill',
        name: skill.name,
        path: targetPath,
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warning(`Failed to create skill ${skill.name}: ${errorMsg}`);

      return {
        type: 'skill',
        name: skill.name,
        path: targetPath,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Write data files (original outputs.generate logic)
   */
  async writeDataFiles(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>,
    context: PluginContext
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.outputs) continue;

      try {
        const outputs = await plugin.outputs.generate(config, context);

        for (const output of outputs) {
          const result = await this.writeDataFile(output);
          results.push(result);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warning(`Failed to generate outputs for ${plugin.meta.name}: ${errorMsg}`);
      }
    }

    return results;
  }

  /**
   * Write single data file
   */
  private async writeDataFile(output: FileOutput): Promise<WriteResult> {
    const isUserScope = output.scope === 'user';
    const targetPath = isUserScope
      ? this.router.getUserDataPath(output.path)
      : this.router.getProjectDataPath(output.path);

    try {
      await ensureDir(path.dirname(targetPath));
      await writeFile(targetPath, output.content);

      const displayPath = this.router.getDisplayPath(targetPath);
      this.logger.info(`Created: ${displayPath}`);

      return {
        type: 'data-file',
        name: output.path,
        path: targetPath,
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warning(`Failed to create ${output.path}: ${errorMsg}`);

      return {
        type: 'data-file',
        name: output.path,
        path: targetPath,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Collect all slash commands metadata (for help information)
   */
  collectSlashCommands(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): SlashCommand[] {
    const commands: SlashCommand[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.slashCommands?.length) continue;

      commands.push(...plugin.slashCommands);
    }

    return commands;
  }

  /**
   * Collect all skills metadata (for help information)
   */
  collectSkills(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Skill[] {
    const skills: Skill[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.skills?.length) continue;

      skills.push(...plugin.skills);
    }

    return skills;
  }
}
