/**
 * Merge Utilities Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  safeParseJson,
  deepMerge,
  mergeMarkdown,
  mergeJson,
  mergeGitignore,
  createMarkdownMerger,
  createJsonMerger,
  createGitignoreMerger,
} from '../../../src/utils/merge-utils.js';

describe('safeParseJson', () => {
  it('should parse valid JSON', () => {
    const result = safeParseJson('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('should return null for invalid JSON', () => {
    const result = safeParseJson('not valid json');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = safeParseJson('');
    expect(result).toBeNull();
  });

  it('should parse arrays', () => {
    const result = safeParseJson('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });
});

describe('deepMerge', () => {
  it('should merge flat objects', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should recursively merge nested objects', () => {
    const target = { nested: { a: 1, b: 2 } };
    const source = { nested: { b: 3, c: 4 } };
    const result = deepMerge(target, source);
    expect(result).toEqual({ nested: { a: 1, b: 3, c: 4 } });
  });

  it('should merge arrays with deduplication', () => {
    const target = { arr: [1, 2, 3] };
    const source = { arr: [2, 3, 4] };
    const result = deepMerge(target, source);
    expect(result).toEqual({ arr: [1, 2, 3, 4] });
  });

  it('should handle source overwriting primitives', () => {
    const target = { value: 'old' };
    const source = { value: 'new' };
    const result = deepMerge(target, source);
    expect(result).toEqual({ value: 'new' });
  });

  it('should not modify original objects', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    deepMerge(target, source);
    expect(target).toEqual({ a: 1 });
    expect(source).toEqual({ b: 2 });
  });

  it('should handle null values', () => {
    const target = { a: { nested: 1 } };
    const source = { a: null };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: null });
  });
});

describe('mergeMarkdown', () => {
  it('should return their content when our content is null', () => {
    const result = mergeMarkdown(null, '# Their Content');
    expect(result).toBe('# Their Content');
  });

  it('should merge with default separator', () => {
    const result = mergeMarkdown('# Our Content', '# Their Content');
    expect(result).toContain('# Our Content');
    expect(result).toContain('---');
    expect(result).toContain('# Their Content');
  });

  it('should use custom separator', () => {
    const result = mergeMarkdown('Our', 'Their', { separator: '\n===\n' });
    expect(result).toBe('Our\n===\nTheir');
  });

  it('should add header before their content', () => {
    const result = mergeMarkdown('Our', 'Their', { theirHeader: '# Section' });
    expect(result).toContain('# Section');
    expect(result).toContain('Their');
  });

  it('should apply header replacement', () => {
    const result = mergeMarkdown('Our', '# Old Header\nContent', {
      headerReplacement: {
        pattern: '# Old Header',
        replacement: '# New Header',
      },
    });
    expect(result).toContain('# New Header');
    expect(result).not.toContain('# Old Header');
  });

  it('should avoid duplication when their content contains ours', () => {
    const our = '# Title';
    const their = '# Title\nMore content';
    const result = mergeMarkdown(our, their);
    expect(result).toBe(their);
  });
});

describe('mergeJson', () => {
  it('should return their content when our content is null', () => {
    const result = mergeJson(null, '{"key": "value"}');
    expect(JSON.parse(result)).toEqual({ key: 'value' });
  });

  it('should deep merge JSON objects', () => {
    const our = JSON.stringify({ a: 1, nested: { x: 1 } });
    const their = JSON.stringify({ b: 2, nested: { y: 2 } });
    const result = mergeJson(our, their);
    expect(JSON.parse(result)).toEqual({
      a: 1,
      b: 2,
      nested: { x: 1, y: 2 },
    });
  });

  it('should return their content when ours is invalid JSON', () => {
    const result = mergeJson('invalid', '{"valid": true}');
    expect(JSON.parse(result)).toEqual({ valid: true });
  });

  it('should return their content as-is when their JSON is invalid', () => {
    const result = mergeJson('{"valid": true}', 'not json');
    expect(result).toBe('not json');
  });

  it('should use specified indentation', () => {
    const result = mergeJson(null, '{"a":1}', 4);
    expect(result).toBe('{\n    "a": 1\n}');
  });

  it('should merge arrays', () => {
    const our = JSON.stringify({ arr: [1, 2] });
    const their = JSON.stringify({ arr: [2, 3] });
    const result = mergeJson(our, their);
    expect(JSON.parse(result).arr).toEqual([1, 2, 3]);
  });
});

describe('mergeGitignore', () => {
  it('should return their content when our content is null', () => {
    const result = mergeGitignore(null, 'node_modules/');
    expect(result).toBe('node_modules/');
  });

  it('should append new entries', () => {
    const our = 'node_modules/';
    const their = 'dist/\nnode_modules/';
    const result = mergeGitignore(our, their);
    expect(result).toContain('node_modules/');
    expect(result).toContain('dist/');
  });

  it('should not duplicate existing entries', () => {
    const our = 'node_modules/\ndist/';
    const their = 'node_modules/\ndist/';
    const result = mergeGitignore(our, their);
    expect(result).toBe(our);
  });

  it('should add header when specified', () => {
    const our = 'node_modules/';
    const their = 'dist/';
    const result = mergeGitignore(our, their, { header: '# New section' });
    expect(result).toContain('# New section');
    expect(result).toContain('dist/');
  });

  it('should ignore comments when comparing', () => {
    const our = '# comment\nnode_modules/';
    const their = '# different comment\nnode_modules/';
    const result = mergeGitignore(our, their);
    expect(result).toBe(our); // No new entries
  });
});

describe('createMarkdownMerger', () => {
  it('should create configured merge function', () => {
    const merger = createMarkdownMerger({
      separator: '\n---\n',
      theirHeader: '# Added',
    });

    const result = merger('Original', 'New content');
    expect(result).toContain('Original');
    expect(result).toContain('---');
    expect(result).toContain('# Added');
    expect(result).toContain('New content');
  });
});

describe('createJsonMerger', () => {
  it('should create configured merge function with indentation', () => {
    const merger = createJsonMerger(4);
    const result = merger(null, '{"a": 1}');
    expect(result).toBe('{\n    "a": 1\n}');
  });
});

describe('createGitignoreMerger', () => {
  it('should create configured merge function with header', () => {
    const merger = createGitignoreMerger('# Generated');
    const result = merger('existing/', 'new/');
    expect(result).toContain('# Generated');
    expect(result).toContain('new/');
  });
});
