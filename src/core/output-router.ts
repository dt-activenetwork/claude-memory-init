import * as path from 'path';
import * as os from 'os';

/**
 * Output routes configuration
 *
 * Centrally defines output locations for all resources, making it easy to manage and modify
 */
export interface OutputRoutes {
  /** Slash commands output directory, relative to project root */
  slashCommands: string;

  /** Skills output directory, relative to project root */
  skills: string;

  /** Project data directory, relative to project root */
  projectData: string;

  /** User data directory, absolute path or starting with ~ */
  userData: string;
}

/**
 * Default route configuration
 */
export const DEFAULT_OUTPUT_ROUTES: OutputRoutes = {
  slashCommands: '.claude/commands',
  skills: '.claude/skills',
  projectData: '.agent',
  userData: '~/.claude',
};

/**
 * Output Router
 *
 * Maps resource types to actual file system paths
 */
export class OutputRouter {
  constructor(
    private projectRoot: string,
    private routes: OutputRoutes = DEFAULT_OUTPUT_ROUTES
  ) {}

  /**
   * Get route configuration
   *
   * @returns A copy of the current routes configuration
   */
  getRoutes(): OutputRoutes {
    return { ...this.routes };
  }

  /**
   * Get slash command file path
   *
   * @param name - Command name (without extension)
   * @returns Absolute path to the command file (.md)
   * @example
   * getSlashCommandPath('memory-search')
   * // => '/path/to/project/.claude/commands/memory-search.md'
   */
  getSlashCommandPath(name: string): string {
    return path.join(this.projectRoot, this.routes.slashCommands, `${name}.md`);
  }

  /**
   * Get slash commands directory
   *
   * @returns Absolute path to the commands directory
   * @example
   * getSlashCommandsDir()
   * // => '/path/to/project/.claude/commands'
   */
  getSlashCommandsDir(): string {
    return path.join(this.projectRoot, this.routes.slashCommands);
  }

  /**
   * Get skill file path (SKILL.md)
   *
   * @param name - Skill name (used as directory name)
   * @returns Absolute path to the skill file
   * @example
   * getSkillPath('gh-issue')
   * // => '/path/to/project/.claude/skills/gh-issue/SKILL.md'
   */
  getSkillPath(name: string): string {
    return path.join(this.projectRoot, this.routes.skills, name, 'SKILL.md');
  }

  /**
   * Get skill directory
   *
   * @param name - Skill name
   * @returns Absolute path to the skill directory
   * @example
   * getSkillDir('gh-issue')
   * // => '/path/to/project/.claude/skills/gh-issue'
   */
  getSkillDir(name: string): string {
    return path.join(this.projectRoot, this.routes.skills, name);
  }

  /**
   * Get skills root directory
   *
   * @returns Absolute path to the skills root directory
   * @example
   * getSkillsDir()
   * // => '/path/to/project/.claude/skills'
   */
  getSkillsDir(): string {
    return path.join(this.projectRoot, this.routes.skills);
  }

  /**
   * Get project data file path
   *
   * @param relativePath - Path relative to project data directory
   * @returns Absolute path to the file
   * @example
   * getProjectDataPath('memory/index/tags.toon')
   * // => '/path/to/project/.agent/memory/index/tags.toon'
   */
  getProjectDataPath(relativePath: string): string {
    return path.join(this.projectRoot, this.routes.projectData, relativePath);
  }

  /**
   * Get project data directory
   *
   * @returns Absolute path to the project data directory
   * @example
   * getProjectDataDir()
   * // => '/path/to/project/.agent'
   */
  getProjectDataDir(): string {
    return path.join(this.projectRoot, this.routes.projectData);
  }

  /**
   * Get user data file path
   *
   * Handles ~ expansion for user home directory
   *
   * @param relativePath - Path relative to user data directory
   * @returns Absolute path to the file
   * @example
   * getUserDataPath('system/preferences.toon')
   * // => '/home/user/.claude/system/preferences.toon'
   */
  getUserDataPath(relativePath: string): string {
    const baseDir = this.routes.userData.startsWith('~')
      ? path.join(os.homedir(), this.routes.userData.slice(1))
      : this.routes.userData;
    return path.join(baseDir, relativePath);
  }

  /**
   * Get user data directory
   *
   * Handles ~ expansion for user home directory
   *
   * @returns Absolute path to the user data directory
   * @example
   * getUserDataDir()
   * // => '/home/user/.claude'
   */
  getUserDataDir(): string {
    return this.routes.userData.startsWith('~')
      ? path.join(os.homedir(), this.routes.userData.slice(1))
      : this.routes.userData;
  }

  /**
   * Get display path relative to project root
   *
   * Converts absolute paths to relative display paths for better readability.
   * Converts paths in user home directory to use ~ prefix.
   *
   * @param absolutePath - Absolute file path
   * @returns Display path (relative or with ~ prefix)
   * @example
   * getDisplayPath('/path/to/project/.agent/memory/index.toon')
   * // => '.agent/memory/index.toon'
   *
   * getDisplayPath('/home/user/.claude/preferences.toon')
   * // => '~/.claude/preferences.toon'
   */
  getDisplayPath(absolutePath: string): string {
    if (absolutePath.startsWith(this.projectRoot)) {
      return path.relative(this.projectRoot, absolutePath);
    }
    if (absolutePath.startsWith(os.homedir())) {
      return '~' + absolutePath.slice(os.homedir().length);
    }
    return absolutePath;
  }
}
