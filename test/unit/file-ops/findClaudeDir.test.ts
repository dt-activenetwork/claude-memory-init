/**
 * Unit tests for findClaudeDir function
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { findClaudeDir, ensureDir } from '../../../src/utils/file-ops.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('findClaudeDir', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-findClaudeDir-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('finds claude directory in current directory', async () => {
    const claudePath = path.join(tmpDir, 'claude');
    await fs.mkdir(claudePath);

    const result = await findClaudeDir(tmpDir);

    expect(result).toBe(claudePath);
  });

  test('finds claude directory in parent directory', async () => {
    const claudePath = path.join(tmpDir, 'claude');
    const subdir = path.join(tmpDir, 'subdir');
    await fs.mkdir(claudePath);
    await fs.mkdir(subdir);

    const result = await findClaudeDir(subdir);

    expect(result).toBe(claudePath);
  });

  test('finds claude directory in grandparent directory', async () => {
    const claudePath = path.join(tmpDir, 'claude');
    const subdir = path.join(tmpDir, 'a', 'b');
    await fs.mkdir(claudePath);
    await fs.mkdir(subdir, { recursive: true });

    const result = await findClaudeDir(subdir);

    expect(result).toBe(claudePath);
  });

  test('returns null when claude directory not found', async () => {
    const subdir = path.join(tmpDir, 'subdir');
    await fs.mkdir(subdir);

    const result = await findClaudeDir(subdir);

    expect(result).toBeNull();
  });

  test('returns null when reaching filesystem root', async () => {
    const result = await findClaudeDir('/tmp/nonexistent/deep/path');

    expect(result).toBeNull();
  });

  test('finds custom base directory name', async () => {
    const customPath = path.join(tmpDir, 'my-claude');
    await fs.mkdir(customPath);

    const result = await findClaudeDir(tmpDir, 'my-claude');

    expect(result).toBe(customPath);
  });

  test('prefers closest claude directory', async () => {
    // Create two levels of claude directories
    const claudeParent = path.join(tmpDir, 'claude');
    const subdir = path.join(tmpDir, 'subdir');
    const claudeChild = path.join(subdir, 'claude');
    await fs.mkdir(claudeParent);
    await fs.mkdir(subdir);
    await fs.mkdir(claudeChild);

    const result = await findClaudeDir(subdir);

    // Should find the closest one (in subdir)
    expect(result).toBe(claudeChild);
  });

  test('handles directory with trailing slash', async () => {
    const claudePath = path.join(tmpDir, 'claude');
    await fs.mkdir(claudePath);

    const result = await findClaudeDir(tmpDir + path.sep);

    expect(result).toBe(claudePath);
  });

  test('handles relative paths', async () => {
    const claudePath = path.join(tmpDir, 'claude');
    await fs.mkdir(claudePath);

    // Change to tmpDir and use relative path
    const originalCwd = process.cwd();
    try {
      process.chdir(tmpDir);
      const result = await findClaudeDir('.');

      expect(result).toBe(claudePath);
    } finally {
      process.chdir(originalCwd);
    }
  });

  test('returns null for empty directory tree', async () => {
    const emptyDir = path.join(tmpDir, 'empty');
    await fs.mkdir(emptyDir);

    const result = await findClaudeDir(emptyDir);

    expect(result).toBeNull();
  });

  test('handles case-sensitive directory names', async () => {
    // Create 'Claude' instead of 'claude'
    const claudePath = path.join(tmpDir, 'Claude');
    await fs.mkdir(claudePath);

    const result = await findClaudeDir(tmpDir);

    // Should NOT find 'Claude' when looking for 'claude'
    expect(result).toBeNull();
  });

  test('finds exact case match for custom directory', async () => {
    const customPath = path.join(tmpDir, 'MyCustomDir');
    await fs.mkdir(customPath);

    const result = await findClaudeDir(tmpDir, 'MyCustomDir');

    expect(result).toBe(customPath);
  });
});
