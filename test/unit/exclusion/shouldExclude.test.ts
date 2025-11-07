/**
 * Unit tests for exclusion system
 */
import { describe, test, expect, jest } from '@jest/globals';
import * as path from 'path';

// Mock chalk to avoid ESM import issues
jest.mock('chalk', () => ({
  default: {
    blue: (str: string) => str,
    green: (str: string) => str,
    yellow: (str: string) => str,
    red: (str: string) => str,
    cyan: (str: string) => str,
  }
}), { virtual: true });

import {
  shouldExcludeOnCopy,
  shouldDeleteAfterInit,
  DEFAULT_EXCLUSIONS,
  mergeExclusionConfigs,
  type ExclusionConfig
} from '../../../src/core/exclusion.js';

describe('shouldExcludeOnCopy', () => {
  const baseDir = '/test/project';

  test('excludes files matching exact file names', () => {
    const filePath = path.join(baseDir, 'README.md');

    const result = shouldExcludeOnCopy(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(true);
  });

  test('excludes files in excluded directories', () => {
    const filePath = path.join(baseDir, '.git', 'config');

    const result = shouldExcludeOnCopy(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(true);
  });

  test('excludes files matching patterns', () => {
    const filePath = path.join(baseDir, '.gitignore');

    const result = shouldExcludeOnCopy(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(true);
  });

  test('does not exclude normal files', () => {
    const filePath = path.join(baseDir, 'normal-file.md');

    const result = shouldExcludeOnCopy(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(false);
  });

  test('excludes nested files in excluded directories', () => {
    const filePath = path.join(baseDir, 'docs', 'subfolder', 'file.md');

    const result = shouldExcludeOnCopy(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(true);
  });

  test('excludes .gitmodules', () => {
    const filePath = path.join(baseDir, '.gitmodules');

    const result = shouldExcludeOnCopy(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(true);
  });

  test('excludes FRAMEWORK_OVERVIEW.md', () => {
    const filePath = path.join(baseDir, 'FRAMEWORK_OVERVIEW.md');

    const result = shouldExcludeOnCopy(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(true);
  });

  test('does not exclude similar but different file names', () => {
    const filePath = path.join(baseDir, 'MY-README.md');

    const result = shouldExcludeOnCopy(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(false);
  });
});

describe('shouldDeleteAfterInit', () => {
  const baseDir = '/test/project';

  test('marks .template files for deletion', () => {
    const filePath = path.join(baseDir, 'config.yaml.template');

    const result = shouldDeleteAfterInit(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(true);
  });

  test('does not mark regular files for deletion', () => {
    const filePath = path.join(baseDir, 'config.yaml');

    const result = shouldDeleteAfterInit(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(false);
  });

  test('marks nested .template files for deletion', () => {
    const filePath = path.join(baseDir, 'nested', 'folder', 'file.md.template');

    const result = shouldDeleteAfterInit(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(true);
  });

  test('does not mark files that contain "template" in name but not extension', () => {
    const filePath = path.join(baseDir, 'template-file.md');

    const result = shouldDeleteAfterInit(filePath, baseDir, DEFAULT_EXCLUSIONS);

    expect(result).toBe(false);
  });
});

describe('pattern matching', () => {
  const baseDir = '/test/project';

  const config: ExclusionConfig = {
    exclude_on_copy: {
      patterns: ['*.log', 'test-*', '*.tmp'],
      files: [],
      directories: []
    },
    delete_after_init: {
      patterns: [],
      files: [],
      directories: []
    }
  };

  test('matches wildcard at end', () => {
    const filePath = path.join(baseDir, 'debug.log');

    const result = shouldExcludeOnCopy(filePath, baseDir, config);

    expect(result).toBe(true);
  });

  test('matches wildcard at beginning', () => {
    const filePath = path.join(baseDir, 'test-file.md');

    const result = shouldExcludeOnCopy(filePath, baseDir, config);

    expect(result).toBe(true);
  });

  test('does not match partial patterns', () => {
    const filePath = path.join(baseDir, 'my-log.txt');

    const result = shouldExcludeOnCopy(filePath, baseDir, config);

    expect(result).toBe(false);
  });

  test('matches multiple extensions', () => {
    const files = [
      path.join(baseDir, 'file1.tmp'),
      path.join(baseDir, 'file2.tmp'),
      path.join(baseDir, 'data.tmp')
    ];

    files.forEach(file => {
      expect(shouldExcludeOnCopy(file, baseDir, config)).toBe(true);
    });
  });
});

describe('mergeExclusionConfigs', () => {
  test('merges two configs without duplicates', () => {
    const custom: ExclusionConfig = {
      exclude_on_copy: {
        patterns: ['*.custom'],
        files: ['custom.md'],
        directories: ['custom-dir']
      },
      delete_after_init: {
        patterns: [],
        files: [],
        directories: []
      }
    };

    const defaults: ExclusionConfig = {
      exclude_on_copy: {
        patterns: ['*.git'],
        files: ['README.md'],
        directories: ['.git']
      },
      delete_after_init: {
        patterns: ['*.template'],
        files: [],
        directories: []
      }
    };

    const merged = mergeExclusionConfigs(custom, defaults);

    expect(merged.exclude_on_copy.patterns).toContain('*.git');
    expect(merged.exclude_on_copy.patterns).toContain('*.custom');
    expect(merged.exclude_on_copy.files).toContain('README.md');
    expect(merged.exclude_on_copy.files).toContain('custom.md');
    expect(merged.delete_after_init.patterns).toContain('*.template');
  });

  test('removes duplicates when merging', () => {
    const custom: ExclusionConfig = {
      exclude_on_copy: {
        patterns: ['*.git', '*.log'],
        files: ['README.md'],
        directories: ['.git']
      },
      delete_after_init: {
        patterns: [],
        files: [],
        directories: []
      }
    };

    const defaults: ExclusionConfig = {
      exclude_on_copy: {
        patterns: ['*.git', '*.tmp'],
        files: ['README.md', 'LICENSE'],
        directories: ['.git', 'node_modules']
      },
      delete_after_init: {
        patterns: [],
        files: [],
        directories: []
      }
    };

    const merged = mergeExclusionConfigs(custom, defaults);

    // Should have unique items only
    const gitPatternCount = merged.exclude_on_copy.patterns.filter(p => p === '*.git').length;
    expect(gitPatternCount).toBe(1);

    const readmeCount = merged.exclude_on_copy.files.filter(f => f === 'README.md').length;
    expect(readmeCount).toBe(1);

    const gitDirCount = merged.exclude_on_copy.directories.filter(d => d === '.git').length;
    expect(gitDirCount).toBe(1);
  });

  test('preserves comments from custom config', () => {
    const custom: ExclusionConfig = {
      exclude_on_copy: { patterns: [], files: [], directories: [] },
      delete_after_init: { patterns: [], files: [], directories: [] },
      comments: ['Custom comment']
    };

    const defaults: ExclusionConfig = {
      exclude_on_copy: { patterns: [], files: [], directories: [] },
      delete_after_init: { patterns: [], files: [], directories: [] },
      comments: ['Default comment']
    };

    const merged = mergeExclusionConfigs(custom, defaults);

    expect(merged.comments).toEqual(['Custom comment']);
  });

  test('uses default comments when custom has none', () => {
    const custom: ExclusionConfig = {
      exclude_on_copy: { patterns: [], files: [], directories: [] },
      delete_after_init: { patterns: [], files: [], directories: [] }
    };

    const defaults: ExclusionConfig = {
      exclude_on_copy: { patterns: [], files: [], directories: [] },
      delete_after_init: { patterns: [], files: [], directories: [] },
      comments: ['Default comment']
    };

    const merged = mergeExclusionConfigs(custom, defaults);

    expect(merged.comments).toEqual(['Default comment']);
  });
});

describe('DEFAULT_EXCLUSIONS', () => {
  test('includes framework documentation files', () => {
    expect(DEFAULT_EXCLUSIONS.exclude_on_copy.files).toContain('README.md');
    expect(DEFAULT_EXCLUSIONS.exclude_on_copy.files).toContain('FRAMEWORK_OVERVIEW.md');
    expect(DEFAULT_EXCLUSIONS.exclude_on_copy.files).toContain('QUICKSTART.md');
  });

  test('includes git-related patterns', () => {
    expect(DEFAULT_EXCLUSIONS.exclude_on_copy.patterns).toContain('*.git');
    expect(DEFAULT_EXCLUSIONS.exclude_on_copy.patterns).toContain('.git*');
  });

  test('includes .git directory', () => {
    expect(DEFAULT_EXCLUSIONS.exclude_on_copy.directories).toContain('.git');
  });

  test('includes docs directory', () => {
    expect(DEFAULT_EXCLUSIONS.exclude_on_copy.directories).toContain('docs');
  });

  test('includes template pattern in delete_after_init', () => {
    expect(DEFAULT_EXCLUSIONS.delete_after_init.patterns).toContain('*.template');
  });

  test('has comments explaining usage', () => {
    expect(DEFAULT_EXCLUSIONS.comments).toBeDefined();
    expect(DEFAULT_EXCLUSIONS.comments!.length).toBeGreaterThan(0);
  });
});
