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
 * Application version
 */
export const APP_VERSION = '2.0.0';
