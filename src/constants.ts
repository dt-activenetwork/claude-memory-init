/**
 * Global Constants
 *
 * Centralized constants for the application.
 */

import * as os from 'os';
import * as path from 'path';

/**
 * Memory Scope - defines where data is stored
 *
 * - project: Project-specific data (stored in project/.agent/)
 * - user: User-level data (stored in ~/.claude/)
 */
export type MemoryScope = 'project' | 'user';

/**
 * Default directory for AI agent files (Project Memory)
 *
 * Changed from 'claude' to '.agent' for v2.0
 */
export const DEFAULT_AGENT_DIR = '.agent';

/**
 * User Memory directory (in home directory)
 *
 * Stores user-level configuration that spans across projects:
 * - System environment info (OS, Python, Node.js)
 * - User preferences
 * - Cross-project settings
 */
export const USER_MEMORY_DIR = path.join(os.homedir(), '.claude');

/**
 * User Memory subdirectories
 */
export const USER_MEMORY_SUBDIRS = {
  /** System preferences (OS, preferred package managers) */
  SYSTEM: 'system',
  /** User preferences and settings */
  PREFERENCES: 'preferences',
  /** Cache for expensive operations */
  CACHE: 'cache',
} as const;

/**
 * User Memory file names
 */
export const USER_MEMORY_FILES = {
  /** System preferences file */
  SYSTEM_PREFERENCES: 'preferences.toon',
} as const;

/**
 * Project Memory file names (within .agent/)
 */
export const PROJECT_MEMORY_FILES = {
  /** Project system configuration */
  SYSTEM_CONFIG: 'system/config.toon',
} as const;

/**
 * Legacy directory name (for v1.x compatibility)
 */
export const LEGACY_AGENT_DIR = 'claude';

/**
 * Entry point file name
 */
export const AGENT_MD_FILENAME = 'AGENT.md';

/**
 * Legacy entry point file name
 */
export const LEGACY_AGENT_MD_FILENAME = 'CLAUDE.md';

/**
 * Marker file name (hidden file in agent directory)
 */
export const MARKER_FILENAME = '.claude-memory-init';

/**
 * Template file name
 */
export const AGENT_MD_TEMPLATE = 'AGENT.md.template';

/**
 * Subdirectories within .agent/
 */
export const AGENT_SUBDIRS = {
  SYSTEM: 'system',
  GIT: 'git',
  MEMORY: 'memory',
  TASKS: 'tasks',
  PRESETS: 'presets',
  SCRIPTS: 'scripts',
  SKILLS: 'skills',
} as const;

/**
 * Memory subdirectories (knowledge management)
 */
export const MEMORY_SUBDIRS = {
  KNOWLEDGE: 'knowledge',  // Renamed from semantic
  HISTORY: 'history',      // Renamed from episodic
  INDEX: 'index',
} as const;

/**
 * Task subdirectories (task management)
 */
export const TASK_SUBDIRS = {
  WORKFLOWS: 'workflows',  // From procedural
  OUTPUT: 'output',        // Task outputs
  TMP: 'tmp',              // Task temporary files (not temp!)
} as const;

/**
 * Default gitignore patterns for .agent/ directory
 */
export const DEFAULT_GITIGNORE_PATTERNS = [
  `${DEFAULT_AGENT_DIR}/${AGENT_SUBDIRS.TASKS}/${TASK_SUBDIRS.TMP}/`,
  `${DEFAULT_AGENT_DIR}/${AGENT_SUBDIRS.SCRIPTS}/*.log`,
] as const;

/**
 * Claude standard directory (for commands, skills, settings)
 */
export const CLAUDE_DIR = '.claude';

/**
 * Claude subdirectories
 */
export const CLAUDE_SUBDIRS = {
  /** Slash commands directory */
  COMMANDS: 'commands',
  /** Skills directory */
  SKILLS: 'skills',
  /** Rules directory (Claude Code native) */
  RULES: 'rules',
} as const;

/**
 * Rules priority constants (init.d style)
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
 */
export const RULES_PRIORITY = {
  /** 00-09: Project basics */
  PROJECT: 0,

  /** 10-19: System/environment */
  SYSTEM_DETECTOR: 10,

  /** 20-29: Global settings */
  LANGUAGE_SETTINGS: 20,

  /** 30-39: Version control */
  GIT: 30,

  /** 40-49: Core systems */
  MEMORY_SYSTEM: 40,

  /** 50-59: Task management */
  TASK_SYSTEM: 50,

  /** 60-69: Extensions */
  PROMPT_PRESETS: 60,

  /** 70-79: Workflows */
  PMA_GH: 70,

  /** 80-89: Heavyweight plugins (base) */
  HEAVYWEIGHT_BASE: 80,
  CLAUDE_FLOW: 80,

  /** 90-99: User custom */
  CUSTOM: 90,
} as const;

/**
 * Default output routes for resource registration
 */
export const DEFAULT_OUTPUT_ROUTES = {
  /** Where slash commands are written */
  slashCommands: `${CLAUDE_DIR}/${CLAUDE_SUBDIRS.COMMANDS}`,
  /** Where skills are written */
  skills: `${CLAUDE_DIR}/${CLAUDE_SUBDIRS.SKILLS}`,
  /** Where rules are written */
  rules: `${CLAUDE_DIR}/${CLAUDE_SUBDIRS.RULES}`,
  /** Where project data is written */
  projectData: DEFAULT_AGENT_DIR,
  /** Where user data is written */
  userData: USER_MEMORY_DIR,
} as const;

/**
 * Application version
 */
export const APP_VERSION = '2.2.0-alpha';
