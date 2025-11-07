/**
 * File exclusion system for template copying
 */
import * as path from 'path';
import { fileExists, readFile } from '../utils/file-ops.js';
import * as logger from '../utils/logger.js';

/**
 * Exclusion configuration
 */
export interface ExclusionConfig {
  // Files to exclude during copy (never copied at all)
  exclude_on_copy: {
    patterns: string[];
    files: string[];
    directories: string[];
  };

  // Files to delete after initialization (copied but then removed)
  delete_after_init: {
    patterns: string[];
    files: string[];
    directories: string[];
  };

  comments?: string[];
}

/**
 * Default exclusion patterns for memory system initialization
 */
export const DEFAULT_EXCLUSIONS: ExclusionConfig = {
  exclude_on_copy: {
    patterns: [
      '*.git',
      '.git*',
      '*.gitignore',
      '*.gitmodules'
    ],
    files: [
      // Framework documentation files (about the memory system itself)
      'README.md',              // Framework overview
      'FRAMEWORK_OVERVIEW.md',  // Complete architecture docs
      'FILE_MANIFEST.md',       // File listing
      'CHECKLIST.md',           // Deployment checklist
      'MEMORY_DRIVEN_CONTEXT_OPTIMIZATION.md', // Theory/implementation details

      // Internal design docs
      'DESIGN.md',

      // Setup guides (replaced by this CLI tool)
      'QUICKSTART.md',

      // Framework workflow docs
      'memory-first-workflow.md',
      'memory-system-operations.md'
    ],
    directories: [
      '.git',
      'docs'  // Framework documentation directory
    ]
  },
  delete_after_init: {
    patterns: [
      '*.template'  // Template source files (only rendered output is needed)
    ],
    files: [],
    directories: []
  },
  comments: [
    'exclude_on_copy: Files that are never copied to user projects',
    'delete_after_init: Files that are copied, used, then deleted (e.g., templates)'
  ]
};

/**
 * Load exclusion config from file
 */
export async function loadExclusionConfig(configPath: string): Promise<ExclusionConfig> {
  if (!(await fileExists(configPath))) {
    return DEFAULT_EXCLUSIONS;
  }

  try {
    const content = await readFile(configPath);
    const lines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    });

    const config: ExclusionConfig = {
      exclude_on_copy: {
        patterns: [],
        files: [],
        directories: []
      },
      delete_after_init: {
        patterns: [],
        files: [],
        directories: []
      }
    };

    let currentMode: 'exclude_on_copy' | 'delete_after_init' | null = null;
    let currentSection: 'patterns' | 'files' | 'directories' | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Mode sections
      if (trimmed === '[exclude_on_copy]') {
        currentMode = 'exclude_on_copy';
        currentSection = null;
      } else if (trimmed === '[delete_after_init]') {
        currentMode = 'delete_after_init';
        currentSection = null;
      }
      // Subsections
      else if (trimmed === '[patterns]') {
        currentSection = 'patterns';
      } else if (trimmed === '[files]') {
        currentSection = 'files';
      } else if (trimmed === '[directories]') {
        currentSection = 'directories';
      }
      // Data lines
      else if (currentMode && currentSection && trimmed) {
        config[currentMode][currentSection].push(trimmed);
      }
    }

    return config;
  } catch (error) {
    logger.warning(`Failed to load exclusion config: ${error}`);
    return DEFAULT_EXCLUSIONS;
  }
}

/**
 * Check if a file path should be excluded during copy
 */
export function shouldExcludeOnCopy(
  filePath: string,
  baseDir: string,
  config: ExclusionConfig
): boolean {
  return shouldExcludeInternal(filePath, baseDir, config.exclude_on_copy);
}

/**
 * Check if a file path should be deleted after init
 */
export function shouldDeleteAfterInit(
  filePath: string,
  baseDir: string,
  config: ExclusionConfig
): boolean {
  return shouldExcludeInternal(filePath, baseDir, config.delete_after_init);
}

/**
 * Internal function to check exclusion rules
 */
function shouldExcludeInternal(
  filePath: string,
  baseDir: string,
  rules: { patterns: string[]; files: string[]; directories: string[] }
): boolean {
  const relativePath = path.relative(baseDir, filePath);
  const fileName = path.basename(filePath);

  // Check exact file matches
  if (rules.files.includes(fileName)) {
    return true;
  }

  // Check if file is in excluded directory
  const pathParts = relativePath.split(path.sep);
  for (const excludedDir of rules.directories) {
    if (pathParts.includes(excludedDir)) {
      return true;
    }
  }

  // Check pattern matches
  for (const pattern of rules.patterns) {
    if (matchPattern(fileName, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Simple glob pattern matching
 * Supports * and ? wildcards
 */
function matchPattern(fileName: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(fileName);
}

/**
 * Save default exclusion config to file
 */
export async function saveDefaultExclusionConfig(targetPath: string): Promise<void> {
  const content = generateExclusionConfigContent(DEFAULT_EXCLUSIONS);
  const { writeFile } = await import('../utils/file-ops.js');
  await writeFile(targetPath, content);
}

/**
 * Generate exclusion config file content
 */
function generateExclusionConfigContent(config: ExclusionConfig): string {
  const lines: string[] = [
    '# Claude Memory System - Exclusion Configuration',
    '# This file defines which files from the mem/ template should be handled during initialization',
    '#',
    '# Two modes:',
    '#   [exclude_on_copy] - Files that are NEVER copied (skipped entirely)',
    '#   [delete_after_init] - Files that are copied, used, then deleted',
    '#',
    '# Each mode supports:',
    '#   [patterns] - Glob patterns (supports * and ?)',
    '#   [files] - Exact file names',
    '#   [directories] - Directory names',
    '#',
    '# Lines starting with # are comments',
    '',
  ];

  if (config.comments && config.comments.length > 0) {
    for (const comment of config.comments) {
      lines.push(`# ${comment}`);
    }
    lines.push('');
  }

  // Exclude on copy section
  lines.push('[exclude_on_copy]');
  lines.push('# Files that are never copied to user projects');
  lines.push('');

  if (config.exclude_on_copy.patterns.length > 0) {
    lines.push('[patterns]');
    for (const pattern of config.exclude_on_copy.patterns) {
      lines.push(pattern);
    }
    lines.push('');
  }

  if (config.exclude_on_copy.files.length > 0) {
    lines.push('[files]');
    for (const file of config.exclude_on_copy.files) {
      lines.push(file);
    }
    lines.push('');
  }

  if (config.exclude_on_copy.directories.length > 0) {
    lines.push('[directories]');
    for (const dir of config.exclude_on_copy.directories) {
      lines.push(dir);
    }
    lines.push('');
  }

  // Delete after init section
  lines.push('[delete_after_init]');
  lines.push('# Files that are copied temporarily, then deleted after use');
  lines.push('');

  if (config.delete_after_init.patterns.length > 0) {
    lines.push('[patterns]');
    for (const pattern of config.delete_after_init.patterns) {
      lines.push(pattern);
    }
    lines.push('');
  }

  if (config.delete_after_init.files.length > 0) {
    lines.push('[files]');
    for (const file of config.delete_after_init.files) {
      lines.push(file);
    }
    lines.push('');
  }

  if (config.delete_after_init.directories.length > 0) {
    lines.push('[directories]');
    for (const dir of config.delete_after_init.directories) {
      lines.push(dir);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Merge exclusion configs (custom + default)
 */
export function mergeExclusionConfigs(
  custom: ExclusionConfig,
  defaults: ExclusionConfig
): ExclusionConfig {
  return {
    exclude_on_copy: {
      patterns: [...new Set([...defaults.exclude_on_copy.patterns, ...custom.exclude_on_copy.patterns])],
      files: [...new Set([...defaults.exclude_on_copy.files, ...custom.exclude_on_copy.files])],
      directories: [...new Set([...defaults.exclude_on_copy.directories, ...custom.exclude_on_copy.directories])]
    },
    delete_after_init: {
      patterns: [...new Set([...defaults.delete_after_init.patterns, ...custom.delete_after_init.patterns])],
      files: [...new Set([...defaults.delete_after_init.files, ...custom.delete_after_init.files])],
      directories: [...new Set([...defaults.delete_after_init.directories, ...custom.delete_after_init.directories])]
    },
    comments: custom.comments || defaults.comments
  };
}
