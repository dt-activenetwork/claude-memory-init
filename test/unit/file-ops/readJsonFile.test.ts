/**
 * Unit tests for readJsonFile and writeJsonFile functions
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { readJsonFile, writeJsonFile, writeFile } from '../../../src/utils/file-ops.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('readJsonFile', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-jsonFile-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('reads and parses valid JSON object', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    const data = { name: 'test', value: 42 };
    await writeFile(filePath, JSON.stringify(data));

    const result = await readJsonFile(filePath);

    expect(result).toEqual(data);
  });

  test('reads and parses valid JSON array', async () => {
    const filePath = path.join(tmpDir, 'array.json');
    const data = [1, 2, 3, 'four', { five: 5 }];
    await writeFile(filePath, JSON.stringify(data));

    const result = await readJsonFile(filePath);

    expect(result).toEqual(data);
  });

  test('handles nested JSON structures', async () => {
    const filePath = path.join(tmpDir, 'nested.json');
    const data = {
      level1: {
        level2: {
          level3: {
            value: 'deep'
          }
        }
      }
    };
    await writeFile(filePath, JSON.stringify(data));

    const result = await readJsonFile(filePath);

    expect(result).toEqual(data);
  });

  test('handles JSON with special characters', async () => {
    const filePath = path.join(tmpDir, 'special.json');
    const data = {
      text: 'Hello "World"\nNew Line\tTab',
      unicode: '你好 🌍'
    };
    await writeFile(filePath, JSON.stringify(data));

    const result = await readJsonFile(filePath);

    expect(result).toEqual(data);
  });

  test('handles JSON with null values', async () => {
    const filePath = path.join(tmpDir, 'null.json');
    const data = { value: null, nested: { also: null } };
    await writeFile(filePath, JSON.stringify(data));

    const result = await readJsonFile(filePath);

    expect(result).toEqual(data);
  });

  test('throws error for invalid JSON', async () => {
    const filePath = path.join(tmpDir, 'invalid.json');
    await writeFile(filePath, 'not valid json {]');

    await expect(readJsonFile(filePath)).rejects.toThrow();
  });

  test('throws error for non-existent file', async () => {
    const filePath = path.join(tmpDir, 'nonexistent.json');

    await expect(readJsonFile(filePath)).rejects.toThrow();
  });

  test('handles empty JSON object', async () => {
    const filePath = path.join(tmpDir, 'empty.json');
    await writeFile(filePath, '{}');

    const result = await readJsonFile(filePath);

    expect(result).toEqual({});
  });

  test('handles empty JSON array', async () => {
    const filePath = path.join(tmpDir, 'empty-array.json');
    await writeFile(filePath, '[]');

    const result = await readJsonFile(filePath);

    expect(result).toEqual([]);
  });
});

describe('writeJsonFile', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-writeJsonFile-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('writes JSON object correctly', async () => {
    const filePath = path.join(tmpDir, 'output.json');
    const data = { name: 'test', value: 42 };

    await writeJsonFile(filePath, data);

    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(data);
  });

  test('writes JSON with pretty formatting (2 spaces)', async () => {
    const filePath = path.join(tmpDir, 'pretty.json');
    const data = { name: 'test', nested: { value: 42 } };

    await writeJsonFile(filePath, data);

    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('  ');
    expect(content).toContain('\n');
  });

  test('writes and reads back complex data', async () => {
    const filePath = path.join(tmpDir, 'complex.json');
    const data = {
      string: 'text',
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      nested: {
        deep: {
          value: 'here'
        }
      }
    };

    await writeJsonFile(filePath, data);
    const result = await readJsonFile(filePath);

    expect(result).toEqual(data);
  });

  test('overwrites existing file', async () => {
    const filePath = path.join(tmpDir, 'overwrite.json');
    await writeJsonFile(filePath, { old: 'data' });
    await writeJsonFile(filePath, { new: 'data' });

    const result = await readJsonFile(filePath);

    expect(result).toEqual({ new: 'data' });
  });

  test('handles special characters', async () => {
    const filePath = path.join(tmpDir, 'special.json');
    const data = {
      text: 'Quote: " Newline: \n Tab: \t',
      unicode: '你好 🌍'
    };

    await writeJsonFile(filePath, data);
    const result = await readJsonFile(filePath);

    expect(result).toEqual(data);
  });

  test('handles empty object', async () => {
    const filePath = path.join(tmpDir, 'empty.json');

    await writeJsonFile(filePath, {});

    const result = await readJsonFile(filePath);
    expect(result).toEqual({});
  });

  test('handles empty array', async () => {
    const filePath = path.join(tmpDir, 'empty-array.json');

    await writeJsonFile(filePath, []);

    const result = await readJsonFile(filePath);
    expect(result).toEqual([]);
  });
});
