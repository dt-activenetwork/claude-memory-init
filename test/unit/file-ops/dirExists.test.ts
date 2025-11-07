/**
 * Unit tests for dirExists function
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { dirExists, ensureDir, writeFile } from '../../../src/utils/file-ops.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('dirExists', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-dirExists-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('returns true when directory exists', async () => {
    const dirPath = path.join(tmpDir, 'subdir');
    await fs.mkdir(dirPath);

    const result = await dirExists(dirPath);

    expect(result).toBe(true);
  });

  test('returns false when directory does not exist', async () => {
    const dirPath = path.join(tmpDir, 'nonexistent');

    const result = await dirExists(dirPath);

    expect(result).toBe(false);
  });

  test('returns false for file (not directory)', async () => {
    const filePath = path.join(tmpDir, 'file.txt');
    await writeFile(filePath, 'content');

    const result = await dirExists(filePath);

    expect(result).toBe(false);
  });

  test('returns true for nested directories', async () => {
    const dirPath = path.join(tmpDir, 'a', 'b', 'c');
    await fs.mkdir(dirPath, { recursive: true });

    const result = await dirExists(dirPath);

    expect(result).toBe(true);
  });

  test('returns false for non-existent nested path', async () => {
    const dirPath = path.join(tmpDir, 'a', 'b', 'c');

    const result = await dirExists(dirPath);

    expect(result).toBe(false);
  });

  test('returns true for empty directory', async () => {
    const dirPath = path.join(tmpDir, 'empty');
    await fs.mkdir(dirPath);

    const result = await dirExists(dirPath);

    expect(result).toBe(true);
  });

  test('returns true for directory with contents', async () => {
    const dirPath = path.join(tmpDir, 'withfiles');
    await fs.mkdir(dirPath);
    await writeFile(path.join(dirPath, 'file.txt'), 'content');

    const result = await dirExists(dirPath);

    expect(result).toBe(true);
  });

  test('returns false for empty string', async () => {
    const result = await dirExists('');

    expect(result).toBe(false);
  });

  test('handles directory with special characters', async () => {
    const dirPath = path.join(tmpDir, 'dir with spaces');
    await fs.mkdir(dirPath);

    const result = await dirExists(dirPath);

    expect(result).toBe(true);
  });

  test('handles hidden directories', async () => {
    const dirPath = path.join(tmpDir, '.hidden');
    await fs.mkdir(dirPath);

    const result = await dirExists(dirPath);

    expect(result).toBe(true);
  });

  test('returns true for root temp directory', async () => {
    const result = await dirExists(tmpDir);

    expect(result).toBe(true);
  });
});
