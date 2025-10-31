import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { initialize } from '../../src/core/initializer.js';
import type { FullConfig } from '../../src/types/config.js';

describe('initialization integration tests', () => {
  const testDir = '/tmp/claude-init-test-' + Date.now();

  const testConfig: FullConfig = {
    project: {
      name: 'Integration Test Project',
      type: 'Test Type',
      description: 'Test Description'
    },
    language: {
      user_language: 'English',
      think_language: 'English'
    },
    paths: {
      base_dir: 'claude',
      codebase: testDir
    },
    objectives: [
      {
        objective: 'Test objective',
        memory_check: 'Test check',
        memory_update: 'Test update'
      }
    ],
    assumptions: ['Test assumption'],
    domain: {
      terms: ['Test term'],
      evidence: ['Test evidence'],
      external_sources: []
    },
    tasks: {
      use_task_specific_indexes: true,
      use_incremental_work: true,
      max_context_per_step: 2000,
      max_task_context: 10000,
      hygiene_cycle_frequency: 5
    },
    output: {
      format: 'markdown',
      include_diagrams: true,
      diagram_types: ['flowchart'],
      code_reference_format: 'file:line'
    },
    git: {
      ai_git_operations: false,
      ignore_patterns: ['claude/temp/']
    },
    advanced: {
      max_tags: 100,
      max_topics: 50,
      max_cross_refs: 10,
      target_context_reduction: 0.80,
      target_index_lookup_time: 1.0
    }
  };

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should create complete directory structure', async () => {
    await initialize(testConfig, testDir);

    const claudeDir = path.join(testDir, 'claude');
    const memoryDir = path.join(claudeDir, 'memory');
    const indexDir = path.join(memoryDir, 'index');

    // Check directories exist
    expect(await fs.stat(claudeDir)).toBeTruthy();
    expect(await fs.stat(memoryDir)).toBeTruthy();
    expect(await fs.stat(indexDir)).toBeTruthy();
  });

  it('should generate CLAUDE.md in both locations', async () => {
    await initialize(testConfig, testDir);

    const rootClaude = path.join(testDir, 'CLAUDE.md');
    const claudeClaude = path.join(testDir, 'claude', 'CLAUDE.md');

    const rootContent = await fs.readFile(rootClaude, 'utf-8');
    const claudeContent = await fs.readFile(claudeClaude, 'utf-8');

    expect(rootContent).toBeTruthy();
    expect(claudeContent).toBeTruthy();
    expect(rootContent).toBe(claudeContent);
  });

  it('should replace all template variables', async () => {
    await initialize(testConfig, testDir);

    const claudeFile = path.join(testDir, 'CLAUDE.md');
    const content = await fs.readFile(claudeFile, 'utf-8');

    // Should not contain any unreplaced variables
    expect(content).not.toMatch(/\{\{[A-Z_]+\}\}/);

    // Should contain replaced values
    expect(content).toContain('Integration Test Project');
    expect(content).toContain('Test Description');
  });

  it('should create index files with current date', async () => {
    await initialize(testConfig, testDir);

    const tagsFile = path.join(testDir, 'claude', 'memory', 'index', 'tags.json');
    const topicsFile = path.join(testDir, 'claude', 'memory', 'index', 'topics.json');

    const tagsContent = JSON.parse(await fs.readFile(tagsFile, 'utf-8'));
    const topicsContent = JSON.parse(await fs.readFile(topicsFile, 'utf-8'));

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    expect(tagsContent.updated).toMatch(datePattern);
    expect(topicsContent.updated).toMatch(datePattern);
  });

  it('should update .gitignore', async () => {
    await initialize(testConfig, testDir);

    const gitignoreFile = path.join(testDir, '.gitignore');
    const content = await fs.readFile(gitignoreFile, 'utf-8');

    expect(content).toContain('claude/temp/');
  });

  it('should not overwrite existing .gitignore content', async () => {
    // Create existing .gitignore
    const gitignoreFile = path.join(testDir, '.gitignore');
    await fs.writeFile(gitignoreFile, 'node_modules/\n.env\n');

    await initialize(testConfig, testDir);

    const content = await fs.readFile(gitignoreFile, 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('.env');
    expect(content).toContain('claude/temp/');
  });
});
