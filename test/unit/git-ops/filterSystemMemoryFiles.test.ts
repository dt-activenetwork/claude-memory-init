/**
 * Unit tests for filterSystemMemoryFiles function
 */
import { describe, test, expect, jest } from '@jest/globals';

// Mock ESM dependencies to avoid import issues
jest.mock('inquirer', () => ({}), { virtual: true });
jest.mock('chalk', () => ({
  default: {
    blue: (str: string) => str,
    green: (str: string) => str,
    yellow: (str: string) => str,
    red: (str: string) => str,
    cyan: (str: string) => str,
  }
}), { virtual: true });
jest.mock('ora', () => ({
  default: () => ({
    start: () => ({ succeed: () => {}, fail: () => {} }),
    succeed: () => {},
    fail: () => {}
  })
}), { virtual: true });

import { filterSystemMemoryFiles } from '../../../src/utils/git-ops.js';

describe('filterSystemMemoryFiles', () => {
  describe('should include system memory files', () => {
    test('includes memory/system/tools/ files', () => {
      const files = [
        'memory/system/tools/code-reference-format.md',
        'memory/system/tools/markdown-best-practices.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual(files);
      expect(result).toHaveLength(2);
    });

    test('includes memory/system/index/ files', () => {
      const files = [
        'memory/system/index/system-tags.json',
        'memory/system/index/system-topics.json',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual(files);
      expect(result).toHaveLength(2);
    });

    test('includes memory/system/ root files', () => {
      const files = [
        'memory/system/README.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual(files);
      expect(result).toHaveLength(1);
    });

    test('includes deeply nested memory/system/ files', () => {
      const files = [
        'memory/system/tools/advanced/special-tool.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual(files);
      expect(result).toHaveLength(1);
    });
  });

  describe('should exclude non-system memory files', () => {
    test('excludes memory/semantic/ files', () => {
      const files = [
        'memory/semantic/sem-001-auth.md',
        'memory/semantic/sem-002-api.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('excludes memory/episodic/ files', () => {
      const files = [
        'memory/episodic/ep-001-login-feature.md',
        'memory/episodic/ep-002-refactoring.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('excludes memory/procedural/ files', () => {
      const files = [
        'memory/procedural/memory-first-workflow.md',
        'memory/procedural/context-overflow.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('excludes prompt/ files (old location)', () => {
      const files = [
        'prompt/1.objectives.md',
        'prompt/2.assumptions.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('excludes config files', () => {
      const files = [
        'config.yaml',
        'CLAUDE.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('excludes memory/index/ files', () => {
      const files = [
        'memory/index/tags.json',
        'memory/index/topics.json',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('should handle mixed files', () => {
    test('filters correctly with mixed system and non-system files', () => {
      const files = [
        'memory/system/tools/code-reference-format.md',  // ✓
        'memory/semantic/sem-001-auth.md',               // ✗
        'memory/system/index/system-tags.json',          // ✓
        'memory/episodic/ep-001-task.md',                // ✗
        'prompt/1.objectives.md',                        // ✗
        'memory/system/README.md',                       // ✓
        'config.yaml',                                   // ✗
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([
        'memory/system/tools/code-reference-format.md',
        'memory/system/index/system-tags.json',
        'memory/system/README.md',
      ]);
      expect(result).toHaveLength(3);
    });

    test('returns empty array when no system files', () => {
      const files = [
        'memory/semantic/sem-001.md',
        'memory/episodic/ep-001.md',
        'prompt/1.objectives.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('should handle edge cases', () => {
    test('handles empty array', () => {
      const files: string[] = [];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('handles Windows-style paths', () => {
      const files = [
        'memory\\system\\tools\\code-reference-format.md',
        'memory\\semantic\\sem-001.md',
      ];

      const result = filterSystemMemoryFiles(files);

      // Should normalize backslashes to forward slashes
      expect(result).toEqual([
        'memory\\system\\tools\\code-reference-format.md',
      ]);
      expect(result).toHaveLength(1);
    });

    test('handles paths with similar prefixes', () => {
      const files = [
        'memory/system/tools/tool.md',           // ✓ exact match
        'memory/system-backup/tools/tool.md',    // ✗ different directory
        'data/memory/system/tools/tool.md',      // ✗ not at root
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([
        'memory/system/tools/tool.md',
      ]);
      expect(result).toHaveLength(1);
    });

    test('case-sensitive matching', () => {
      const files = [
        'memory/system/tool.md',           // ✓
        'memory/System/tool.md',           // ✗ (different case)
        'Memory/system/tool.md',           // ✗ (different case)
        'MEMORY/SYSTEM/tool.md',           // ✗ (different case)
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual([
        'memory/system/tool.md',
      ]);
      expect(result).toHaveLength(1);
    });

    test('handles files with special characters', () => {
      const files = [
        'memory/system/tools/code-reference (new).md',
        'memory/system/tools/markdown#best-practices.md',
        'memory/system/tools/tool@v2.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toEqual(files);
      expect(result).toHaveLength(3);
    });

    test('does not modify original array', () => {
      const files = [
        'memory/system/tools/tool.md',
        'memory/semantic/sem-001.md',
      ];
      const original = [...files];

      filterSystemMemoryFiles(files);

      expect(files).toEqual(original);
    });
  });

  describe('real-world scenarios', () => {
    test('scenario: user modified system tools only', () => {
      const files = [
        'memory/system/tools/code-reference-format.md',
        'memory/system/tools/markdown-best-practices.md',
        'memory/system/tools/mermaid-diagrams.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toHaveLength(3);
      expect(result).toEqual(files);
    });

    test('scenario: user modified semantic and system', () => {
      const files = [
        'memory/system/tools/code-reference-format.md',
        'memory/semantic/sem-001-authentication.md',
        'memory/semantic/sem-002-api-design.md',
        'memory/system/index/system-tags.json',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        'memory/system/tools/code-reference-format.md',
        'memory/system/index/system-tags.json',
      ]);
    });

    test('scenario: user modified everything except system', () => {
      const files = [
        'memory/semantic/sem-001.md',
        'memory/episodic/ep-001.md',
        'memory/procedural/workflow.md',
        'prompt/1.objectives.md',
        'config.yaml',
        'CLAUDE.md',
      ];

      const result = filterSystemMemoryFiles(files);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });
});
