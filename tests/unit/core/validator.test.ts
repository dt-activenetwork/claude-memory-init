import { describe, it, expect } from 'vitest';
import { validateConfig, validateRequiredFields, validateTemplateRendering, getUnreplacedVariables } from '../../../src/core/validator.js';
import type { FullConfig } from '../../../src/types/config.js';

describe('validator', () => {
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
      codebase: '/tmp/test'
    },
    objectives: [
      {
        objective: 'Test objective',
        memory_check: 'Check memory',
        memory_update: 'Update memory'
      }
    ],
    assumptions: ['Assumption 1'],
    domain: {
      terms: [],
      evidence: [],
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

  describe('validateConfig', () => {
    it('should validate a valid config', () => {
      const result = validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when project.name is missing', () => {
      const invalid = { ...validConfig, project: { ...validConfig.project, name: '' } };
      const result = validateConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('project.name is required');
    });

    it('should fail when objectives is empty', () => {
      const invalid = { ...validConfig, objectives: [] };
      const result = validateConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one objective is required');
    });

    it('should warn when assumptions is empty', () => {
      const invalid = { ...validConfig, assumptions: [] };
      const result = validateConfig(invalid);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateRequiredFields', () => {
    it('should return no errors for valid config', () => {
      const errors = validateRequiredFields(validConfig);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing project fields', () => {
      const invalid = { ...validConfig, project: {} as any };
      const errors = validateRequiredFields(invalid);
      expect(errors).toContain('project.name is required');
      expect(errors).toContain('project.type is required');
      expect(errors).toContain('project.description is required');
    });

    it('should detect missing objective fields', () => {
      const invalid = {
        ...validConfig,
        objectives: [{ objective: 'test' } as any]
      };
      const errors = validateRequiredFields(invalid);
      expect(errors).toContain('objectives[0].memory_check is required');
      expect(errors).toContain('objectives[0].memory_update is required');
    });
  });

  describe('validateTemplateRendering', () => {
    it('should return true for fully rendered template', () => {
      const rendered = 'This is a fully rendered template';
      expect(validateTemplateRendering(rendered)).toBe(true);
    });

    it('should return false for template with unreplaced variables', () => {
      const unrendered = 'This has {{VARIABLE}} in it';
      expect(validateTemplateRendering(unrendered)).toBe(false);
    });
  });

  describe('getUnreplacedVariables', () => {
    it('should return empty array for fully rendered template', () => {
      const rendered = 'This is fully rendered';
      expect(getUnreplacedVariables(rendered)).toHaveLength(0);
    });

    it('should find unreplaced variables', () => {
      const template = 'Hello {{NAME}}, your {{ROLE}} is ready';
      const variables = getUnreplacedVariables(template);
      expect(variables).toContain('NAME');
      expect(variables).toContain('ROLE');
    });
  });
});
