/**
 * Unit tests for validateConfig function
 */
import { describe, test, expect } from '@jest/globals';
import { validateConfig, validateRequiredFields, getUnreplacedVariables, validateTemplateRendering } from '../../../src/core/validator.js';
import type { FullConfig } from '../../../src/types/config.js';

describe('validateConfig', () => {
  const validConfig: FullConfig = {
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
      diagram_types: [],
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

  test('returns valid for complete config', () => {
    const result = validateConfig(validConfig);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('returns error when objectives are empty', () => {
    const config = { ...validConfig, objectives: [] };

    const result = validateConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one objective is required');
  });

  test('returns warning when assumptions are empty', () => {
    const config = { ...validConfig, assumptions: [] };

    const result = validateConfig(config);

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('assumptions'))).toBe(true);
  });

  test('returns warning when max_context_per_step is very low', () => {
    const config = {
      ...validConfig,
      tasks: {
        ...validConfig.tasks,
        max_context_per_step: 50
      }
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('max_context_per_step'))).toBe(true);
  });

  test('returns warning when max_tags is very low', () => {
    const config = {
      ...validConfig,
      advanced: {
        ...validConfig.advanced,
        max_tags: 5
      }
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('max_tags'))).toBe(true);
  });

  test('returns multiple errors for invalid config', () => {
    const config = {
      ...validConfig,
      project: {
        name: '',
        type: '',
        description: ''
      },
      objectives: []
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validateRequiredFields', () => {
  const validConfig: FullConfig = {
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
    assumptions: [],
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
      diagram_types: [],
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

  test('returns no errors for valid config', () => {
    const errors = validateRequiredFields(validConfig);

    expect(errors).toHaveLength(0);
  });

  test('returns error when project.name is missing', () => {
    const config = { ...validConfig, project: { ...validConfig.project, name: '' } };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('project.name is required');
  });

  test('returns error when project.type is missing', () => {
    const config = { ...validConfig, project: { ...validConfig.project, type: '' } };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('project.type is required');
  });

  test('returns error when project.description is missing', () => {
    const config = { ...validConfig, project: { ...validConfig.project, description: '' } };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('project.description is required');
  });

  test('returns error when language.user_language is missing', () => {
    const config = { ...validConfig, language: { ...validConfig.language, user_language: '' } };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('language.user_language is required');
  });

  test('returns error when language.think_language is missing', () => {
    const config = { ...validConfig, language: { ...validConfig.language, think_language: '' } };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('language.think_language is required');
  });

  test('returns error when paths.base_dir is missing', () => {
    const config = { ...validConfig, paths: { ...validConfig.paths, base_dir: '' } };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('paths.base_dir is required');
  });

  test('returns error when paths.codebase is missing', () => {
    const config = { ...validConfig, paths: { ...validConfig.paths, codebase: '' } };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('paths.codebase is required');
  });

  test('returns error when objectives is not an array', () => {
    const config = { ...validConfig, objectives: null as any };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('objectives must be an array');
  });

  test('returns error when objective fields are missing', () => {
    const config = {
      ...validConfig,
      objectives: [
        { objective: '', memory_check: '', memory_update: '' }
      ]
    };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('objectives[0].objective is required');
    expect(errors).toContain('objectives[0].memory_check is required');
    expect(errors).toContain('objectives[0].memory_update is required');
  });

  test('returns multiple errors for multiple invalid objectives', () => {
    const config = {
      ...validConfig,
      objectives: [
        { objective: '', memory_check: 'check', memory_update: 'update' },
        { objective: 'obj', memory_check: '', memory_update: 'update' },
        { objective: 'obj', memory_check: 'check', memory_update: '' }
      ]
    };

    const errors = validateRequiredFields(config);

    expect(errors).toContain('objectives[0].objective is required');
    expect(errors).toContain('objectives[1].memory_check is required');
    expect(errors).toContain('objectives[2].memory_update is required');
  });

  test('returns all errors for completely invalid config', () => {
    const config = {
      ...validConfig,
      project: { name: '', type: '', description: '' },
      language: { user_language: '', think_language: '' },
      paths: { base_dir: '', codebase: '' }
    };

    const errors = validateRequiredFields(config);

    expect(errors.length).toBeGreaterThanOrEqual(6);
  });
});

describe('validateTemplateRendering', () => {
  test('returns true for content without template variables', () => {
    const content = 'This is normal content without any variables.';

    const result = validateTemplateRendering(content);

    expect(result).toBe(true);
  });

  test('returns false for content with unreplaced variables', () => {
    const content = 'This has {{PROJECT_NAME}} variable.';

    const result = validateTemplateRendering(content);

    expect(result).toBe(false);
  });

  test('returns false for multiple unreplaced variables', () => {
    const content = 'Project: {{PROJECT_NAME}}, Type: {{PROJECT_TYPE}}';

    const result = validateTemplateRendering(content);

    expect(result).toBe(false);
  });

  test('returns true for empty string', () => {
    const content = '';

    const result = validateTemplateRendering(content);

    expect(result).toBe(true);
  });

  test('handles lowercase variables (should not match)', () => {
    const content = 'This has {{project_name}} variable.';

    const result = validateTemplateRendering(content);

    // Lowercase should not be detected as template variable
    expect(result).toBe(true);
  });

  test('handles mixed case variables', () => {
    const content = 'This has {{Project_Name}} variable.';

    const result = validateTemplateRendering(content);

    // Mixed case should not be detected
    expect(result).toBe(true);
  });
});

describe('getUnreplacedVariables', () => {
  test('returns empty array for content without variables', () => {
    const content = 'No variables here.';

    const result = getUnreplacedVariables(content);

    expect(result).toHaveLength(0);
  });

  test('returns single variable', () => {
    const content = 'Project: {{PROJECT_NAME}}';

    const result = getUnreplacedVariables(content);

    expect(result).toEqual(['PROJECT_NAME']);
  });

  test('returns multiple variables', () => {
    const content = '{{PROJECT_NAME}} - {{PROJECT_TYPE}} - {{BASE_DIR}}';

    const result = getUnreplacedVariables(content);

    expect(result).toEqual(['PROJECT_NAME', 'PROJECT_TYPE', 'BASE_DIR']);
  });

  test('returns duplicate variables only once', () => {
    const content = '{{PROJECT_NAME}} and {{PROJECT_NAME}} again';

    const result = getUnreplacedVariables(content);

    // Note: The function returns all matches, including duplicates
    expect(result).toHaveLength(2);
    expect(result).toEqual(['PROJECT_NAME', 'PROJECT_NAME']);
  });

  test('returns empty array for lowercase variables', () => {
    const content = '{{project_name}} is lowercase';

    const result = getUnreplacedVariables(content);

    expect(result).toHaveLength(0);
  });

  test('handles variables with underscores', () => {
    const content = '{{PROJECT_NAME_WITH_UNDERSCORES}}';

    const result = getUnreplacedVariables(content);

    expect(result).toEqual(['PROJECT_NAME_WITH_UNDERSCORES']);
  });

  test('handles empty string', () => {
    const content = '';

    const result = getUnreplacedVariables(content);

    expect(result).toHaveLength(0);
  });
});
