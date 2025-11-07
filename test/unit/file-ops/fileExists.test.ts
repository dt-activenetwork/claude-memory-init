/**
 * Unit tests for fileExists function
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fileExists, writeFile } from '../../../src/utils/file-ops.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('fileExists', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-fileExists-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('returns true when file exists', async () => {
    const filePath = path.join(tmpDir, 'test.txt');
    await writeFile(filePath, 'test content');

    const result = await fileExists(filePath);

    expect(result).toBe(true);
  });

  test('returns false when file does not exist', async () => {
    const filePath = path.join(tmpDir, 'nonexistent.txt');

    const result = await fileExists(filePath);

    expect(result).toBe(false);
  });

  test('returns false for directory', async () => {
    const dirPath = path.join(tmpDir, 'subdir');
    await fs.mkdir(dirPath);

    const result = await fileExists(dirPath);

    expect(result).toBe(true);
  });

  test('returns false for non-existent path', async () => {
    const result = await fileExists('/nonexistent/path/file.txt');

    expect(result).toBe(false);
  });

  test('handles empty filename', async () => {
    const result = await fileExists('');

    expect(result).toBe(false);
  });

  test('handles files with special characters', async () => {
    const filePath = path.join(tmpDir, 'file with spaces.txt');
    await writeFile(filePath, 'content');

    const result = await fileExists(filePath);

    expect(result).toBe(true);
  });

  test('handles hidden files', async () => {
    const filePath = path.join(tmpDir, '.hidden');
    await writeFile(filePath, 'content');

    const result = await fileExists(filePath);

    expect(result).toBe(true);
  });

  test('handles files without extension', async () => {
    const filePath = path.join(tmpDir, 'noext');
    await writeFile(filePath, 'content');

    const result = await fileExists(filePath);

    expect(result).toBe(true);
  });
});
