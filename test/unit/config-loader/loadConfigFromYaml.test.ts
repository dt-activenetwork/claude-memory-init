/**
 * Unit tests for loadConfigFromYaml and saveConfigToYaml functions
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { loadConfigFromYaml, saveConfigToYaml } from '../../../src/core/config-loader.js';
import type { FullConfig } from '../../../src/types/config.js';
import { writeFile } from '../../../src/utils/file-ops.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('loadConfigFromYaml', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-config-loader-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('loads valid minimal config', async () => {
    const configPath = path.join(tmpDir, 'config.yaml');
    const yamlContent = `
project:
  name: "Test Project"
  type: "Node.js"
  description: "Test description"

language:
  user_language: "English"
  think_language: "English"

paths:
  base_dir: "claude"
  codebase: "/path/to/project"

objectives:
  - objective: "Test objective"
    memory_check: "Check memory"
    memory_update: "Update memory"

assumptions:
  - "Test assumption"

domain:
  terms: []
  evidence: []
  external_sources: []

tasks:
  use_task_specific_indexes: true
  use_incremental_work: true
  max_context_per_step: 50000
  max_task_context: 200000
  hygiene_cycle_frequency: 10

output:
  format: "markdown"
  include_diagrams: true
  diagram_types: ["flowchart", "sequence"]
  code_reference_format: "file_path:line_number"

git:
  ai_git_operations: false
  ignore_patterns: []

advanced:
  max_tags: 20
  max_topics: 10
  max_cross_refs: 100
  target_context_reduction: 0.5
  target_index_lookup_time: 100
`;
    await writeFile(configPath, yamlContent);

    const config = await loadConfigFromYaml(configPath);

    expect(config.project.name).toBe('Test Project');
    expect(config.project.type).toBe('Node.js');
    expect(config.language.user_language).toBe('English');
    expect(config.objectives).toHaveLength(1);
    expect(config.objectives[0].objective).toBe('Test objective');
  });

  test('loads config with multiple objectives', async () => {
    const configPath = path.join(tmpDir, 'config.yaml');
    const yamlContent = `
project:
  name: "Test"
  type: "Test"
  description: "Test"
language:
  user_language: "English"
  think_language: "English"
paths:
  base_dir: "claude"
  codebase: "/test"
objectives:
  - objective: "First objective"
    memory_check: "Check 1"
    memory_update: "Update 1"
  - objective: "Second objective"
    memory_check: "Check 2"
    memory_update: "Update 2"
  - objective: "Third objective"
    memory_check: "Check 3"
    memory_update: "Update 3"
assumptions: []
domain:
  terms: []
  evidence: []
  external_sources: []
tasks:
  use_task_specific_indexes: true
  use_incremental_work: true
  max_context_per_step: 50000
  max_task_context: 200000
  hygiene_cycle_frequency: 10
output:
  format: "markdown"
  include_diagrams: true
  diagram_types: []
  code_reference_format: "file_path:line_number"
git:
  ai_git_operations: false
  ignore_patterns: []
advanced:
  max_tags: 20
  max_topics: 10
  max_cross_refs: 100
  target_context_reduction: 0.5
  target_index_lookup_time: 100
`;
    await writeFile(configPath, yamlContent);

    const config = await loadConfigFromYaml(configPath);

    expect(config.objectives).toHaveLength(3);
    expect(config.objectives[0].objective).toBe('First objective');
    expect(config.objectives[1].objective).toBe('Second objective');
    expect(config.objectives[2].objective).toBe('Third objective');
  });

  test('loads config with custom fields', async () => {
    const configPath = path.join(tmpDir, 'config.yaml');
    const yamlContent = `
project:
  name: "Test"
  type: "Test"
  description: "Test"
language:
  user_language: "English"
  think_language: "English"
paths:
  base_dir: "claude"
  codebase: "/test"
objectives: []
assumptions: []
domain:
  terms: []
  evidence: []
  external_sources: []
tasks:
  use_task_specific_indexes: true
  use_incremental_work: true
  max_context_per_step: 50000
  max_task_context: 200000
  hygiene_cycle_frequency: 10
output:
  format: "markdown"
  include_diagrams: true
  diagram_types: []
  code_reference_format: "file_path:line_number"
git:
  ai_git_operations: false
  ignore_patterns: []
advanced:
  max_tags: 20
  max_topics: 10
  max_cross_refs: 100
  target_context_reduction: 0.5
  target_index_lookup_time: 100
custom:
  my_field: "my_value"
  my_number: 42
  my_bool: true
`;
    await writeFile(configPath, yamlContent);

    const config = await loadConfigFromYaml(configPath);

    expect(config.custom).toBeDefined();
    expect(config.custom?.my_field).toBe('my_value');
    expect(config.custom?.my_number).toBe(42);
    expect(config.custom?.my_bool).toBe(true);
  });

  test('throws error for non-existent file', async () => {
    const configPath = path.join(tmpDir, 'nonexistent.yaml');

    await expect(loadConfigFromYaml(configPath)).rejects.toThrow();
  });

  test('throws error for invalid YAML', async () => {
    const configPath = path.join(tmpDir, 'invalid.yaml');
    await writeFile(configPath, 'invalid: yaml: syntax: [[[');

    await expect(loadConfigFromYaml(configPath)).rejects.toThrow();
  });

  test('throws error when file does not exist', async () => {
    const configPath = path.join(tmpDir, 'nonexistent.yaml');

    await expect(loadConfigFromYaml(configPath)).rejects.toThrow();
  });

  test('handles empty YAML file', async () => {
    const configPath = path.join(tmpDir, 'empty.yaml');
    await writeFile(configPath, '');

    const config = await loadConfigFromYaml(configPath);

    expect(config).toBeNull();
  });

  test('loads config with optional path fields', async () => {
    const configPath = path.join(tmpDir, 'config.yaml');
    const yamlContent = `
project:
  name: "Test"
  type: "Test"
  description: "Test"
language:
  user_language: "English"
  think_language: "English"
paths:
  base_dir: "claude"
  codebase: "/test"
  memory: "custom/memory"
  prompt: "custom/prompt"
  result: "custom/result"
  temp: "custom/temp"
objectives: []
assumptions: []
domain:
  terms: []
  evidence: []
  external_sources: []
tasks:
  use_task_specific_indexes: true
  use_incremental_work: true
  max_context_per_step: 50000
  max_task_context: 200000
  hygiene_cycle_frequency: 10
output:
  format: "markdown"
  include_diagrams: true
  diagram_types: []
  code_reference_format: "file_path:line_number"
git:
  ai_git_operations: false
  ignore_patterns: []
advanced:
  max_tags: 20
  max_topics: 10
  max_cross_refs: 100
  target_context_reduction: 0.5
  target_index_lookup_time: 100
`;
    await writeFile(configPath, yamlContent);

    const config = await loadConfigFromYaml(configPath);

    expect(config.paths.memory).toBe('custom/memory');
    expect(config.paths.prompt).toBe('custom/prompt');
    expect(config.paths.result).toBe('custom/result');
    expect(config.paths.temp).toBe('custom/temp');
  });
});

describe('saveConfigToYaml', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-save-config-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('saves config to YAML file', async () => {
    const configPath = path.join(tmpDir, 'output.yaml');
    const config: FullConfig = {
      project: {
        name: 'Test Project',
        type: 'Node.js',
        description: 'Test description'
      },
      language: {
        user_language: 'English',
        think_language: 'English'
      },
      paths: {
        base_dir: 'claude',
        codebase: '/test'
      },
      objectives: [
        {
          objective: 'Test objective',
          memory_check: 'Check',
          memory_update: 'Update'
        }
      ],
      assumptions: ['Test assumption'],
      domain: {
        terms: [],
        evidence: [],
        external_sources: []
      },
      tasks: {
        use_task_specific_indexes: true,
        use_incremental_work: true,
        max_context_per_step: 50000,
        max_task_context: 200000,
        hygiene_cycle_frequency: 10
      },
      output: {
        format: 'markdown',
        include_diagrams: true,
        diagram_types: ['flowchart'],
        code_reference_format: 'file_path:line_number'
      },
      git: {
        ai_git_operations: false,
        ignore_patterns: []
      },
      advanced: {
        max_tags: 20,
        max_topics: 10,
        max_cross_refs: 100,
        target_context_reduction: 0.5,
        target_index_lookup_time: 100
      }
    };

    await saveConfigToYaml(configPath, config);

    const content = await fs.readFile(configPath, 'utf-8');
    expect(content).toContain('project:');
    expect(content).toContain('name: Test Project');
  });

  test('saves and loads config round-trip', async () => {
    const configPath = path.join(tmpDir, 'roundtrip.yaml');
    const originalConfig: FullConfig = {
      project: {
        name: 'Round Trip Test',
        type: 'TypeScript',
        description: 'Testing round-trip'
      },
      language: {
        user_language: 'English',
        think_language: 'English'
      },
      paths: {
        base_dir: 'claude',
        codebase: '/project'
      },
      objectives: [
        {
          objective: 'Objective 1',
          memory_check: 'Check 1',
          memory_update: 'Update 1'
        },
        {
          objective: 'Objective 2',
          memory_check: 'Check 2',
          memory_update: 'Update 2'
        }
      ],
      assumptions: ['Assumption 1', 'Assumption 2'],
      domain: {
        terms: ['term1', 'term2'],
        evidence: ['evidence1'],
        external_sources: ['source1']
      },
      tasks: {
        use_task_specific_indexes: false,
        use_incremental_work: true,
        max_context_per_step: 100000,
        max_task_context: 400000,
        hygiene_cycle_frequency: 5
      },
      output: {
        format: 'json',
        include_diagrams: false,
        diagram_types: [],
        code_reference_format: 'custom_format'
      },
      git: {
        ai_git_operations: true,
        ignore_patterns: ['*.log', 'node_modules']
      },
      advanced: {
        max_tags: 30,
        max_topics: 15,
        max_cross_refs: 200,
        target_context_reduction: 0.7,
        target_index_lookup_time: 50
      }
    };

    await saveConfigToYaml(configPath, originalConfig);
    const loadedConfig = await loadConfigFromYaml(configPath);

    expect(loadedConfig).toEqual(originalConfig);
  });

  test('throws error for invalid path', async () => {
    const configPath = '/nonexistent/directory/config.yaml';
    const config = {} as FullConfig;

    await expect(saveConfigToYaml(configPath, config)).rejects.toThrow();
  });

  test('saves config with custom fields', async () => {
    const configPath = path.join(tmpDir, 'custom.yaml');
    const config: FullConfig = {
      project: { name: 'Test', type: 'Test', description: 'Test' },
      language: { user_language: 'English', think_language: 'English' },
      paths: { base_dir: 'claude', codebase: '/test' },
      objectives: [],
      assumptions: [],
      domain: { terms: [], evidence: [], external_sources: [] },
      tasks: {
        use_task_specific_indexes: true,
        use_incremental_work: true,
        max_context_per_step: 50000,
        max_task_context: 200000,
        hygiene_cycle_frequency: 10
      },
      output: {
        format: 'markdown',
        include_diagrams: true,
        diagram_types: [],
        code_reference_format: 'file_path:line_number'
      },
      git: { ai_git_operations: false, ignore_patterns: [] },
      advanced: {
        max_tags: 20,
        max_topics: 10,
        max_cross_refs: 100,
        target_context_reduction: 0.5,
        target_index_lookup_time: 100
      },
      custom: {
        my_field: 'value',
        nested: { field: 42 }
      }
    };

    await saveConfigToYaml(configPath, config);
    const loaded = await loadConfigFromYaml(configPath);

    expect(loaded.custom).toEqual(config.custom);
  });
});
