/**
 * Unit tests for getTmpMemoryDir function
 */
import { describe, test, expect, jest } from '@jest/globals';
import * as os from 'os';
import * as path from 'path';

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

import { getTmpMemoryDir } from '../../../src/utils/git-ops.js';

describe('getTmpMemoryDir', () => {
  test('returns a path in OS temp directory', () => {
    const result = getTmpMemoryDir();
    const tmpBase = os.tmpdir();

    expect(result).toContain(tmpBase);
  });

  test('returns path with claude-memory prefix', () => {
    const result = getTmpMemoryDir();

    expect(result).toContain('claude-memory-');
  });

  test('generates unique paths on multiple calls', () => {
    const result1 = getTmpMemoryDir();
    const result2 = getTmpMemoryDir();
    const result3 = getTmpMemoryDir();

    expect(result1).not.toBe(result2);
    expect(result2).not.toBe(result3);
    expect(result1).not.toBe(result3);
  });

  test('path has correct format: tmpdir/claude-memory-{hex}', () => {
    const result = getTmpMemoryDir();
    const basename = path.basename(result);

    // Should match pattern: claude-memory-{16 hex chars}
    expect(basename).toMatch(/^claude-memory-[0-9a-f]{16}$/);
  });

  test('returns absolute path', () => {
    const result = getTmpMemoryDir();

    expect(path.isAbsolute(result)).toBe(true);
  });

  test('directory name contains 16 hex characters after prefix', () => {
    const result = getTmpMemoryDir();
    const basename = path.basename(result);
    const hexPart = basename.replace('claude-memory-', '');

    expect(hexPart).toHaveLength(16);
    expect(hexPart).toMatch(/^[0-9a-f]+$/);
  });

  test('multiple calls in quick succession generate different IDs', () => {
    const results = new Set<string>();

    // Generate 100 IDs quickly
    for (let i = 0; i < 100; i++) {
      results.add(getTmpMemoryDir());
    }

    // All should be unique
    expect(results.size).toBe(100);
  });
});
