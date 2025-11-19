/**
 * Global Constants
 *
 * Centralized constants for the application.
 */

/**
 * Default directory for AI agent files
 *
 * Changed from 'claude' to '.agent' for v2.0
 */
export const DEFAULT_AGENT_DIR = '.agent';

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
  PRESETS: 'presets',
  TEMP: 'temp',
  CACHE: '.cache',
} as const;

/**
 * Memory subdirectories
 */
export const MEMORY_SUBDIRS = {
  SEMANTIC: 'semantic',
  EPISODIC: 'episodic',
  PROCEDURAL: 'procedural',
  SYSTEM: 'system',
  INDEX: 'index',
} as const;

/**
 * Default gitignore patterns for .agent/ directory
 */
export const DEFAULT_GITIGNORE_PATTERNS = [
  `${DEFAULT_AGENT_DIR}/${AGENT_SUBDIRS.TEMP}/`,
  `${DEFAULT_AGENT_DIR}/${AGENT_SUBDIRS.CACHE}/`,
] as const;

/**
 * Application version
 */
export const APP_VERSION = '2.0.0';
