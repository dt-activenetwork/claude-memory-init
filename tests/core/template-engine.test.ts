import { describe, it, expect } from 'vitest';
import { renderTemplate, renderObjectives, renderList } from '../../src/core/template-engine.js';
import type { FullConfig, Objective } from '../../src/types/config.js';

describe('template-engine', () => {
  const mockConfig: FullConfig = {
    project: {
      name: 'Test Project',
      type: 'Node.js Backend',
      description: 'A test project'
    },
    language: {
      user_language: 'English',
      think_language: 'English'
    },
    paths: {
      base_dir: 'claude',
      codebase: '/test/path'
    },
    objectives: [
      {
        objective: 'Test objective 1',
        memory_check: 'Check memory for test',
        memory_update: 'Update memory with test'
      }
    ],
    assumptions: ['Assumption 1', 'Assumption 2'],
    domain: {
      terms: ['Term 1', 'Term 2'],
      evidence: ['Evidence 1'],
      external_sources: ['Source 1']
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
      diagram_types: ['flowchart', 'sequence'],
      code_reference_format: 'file:line'
    },
    git: {
      ai_git_operations: false,
      ignore_patterns: ['temp/']
    },
    advanced: {
      max_tags: 100,
      max_topics: 50,
      max_cross_refs: 10,
      target_context_reduction: 0.80,
      target_index_lookup_time: 1.0
    }
  };

  describe('renderTemplate', () => {
    it('should replace simple variables', () => {
      const template = 'Project: {{PROJECT_NAME}}, Type: {{PROJECT_TYPE}}';
      const rendered = renderTemplate(template, mockConfig);
      expect(rendered).toBe('Project: Test Project, Type: Node.js Backend');
    });

    it('should replace all project variables', () => {
      const template = '{{PROJECT_NAME}} - {{PROJECT_TYPE}} - {{PROJECT_DESCRIPTION}}';
      const rendered = renderTemplate(template, mockConfig);
      expect(rendered).toContain('Test Project');
      expect(rendered).toContain('Node.js Backend');
      expect(rendered).toContain('A test project');
    });

    it('should replace language variables', () => {
      const template = 'User: {{USER_LANGUAGE}}, Think: {{THINK_LANGUAGE}}';
      const rendered = renderTemplate(template, mockConfig);
      expect(rendered).toBe('User: English, Think: English');
    });

    it('should replace path variables', () => {
      const template = 'Base: {{BASE_DIR}}, Code: {{CODEBASE}}';
      const rendered = renderTemplate(template, mockConfig);
      expect(rendered).toBe('Base: claude, Code: /test/path');
    });

    it('should add current date for LAST_UPDATED', () => {
      const template = 'Updated: {{LAST_UPDATED}}';
      const rendered = renderTemplate(template, mockConfig);
      expect(rendered).toMatch(/^Updated: \d{4}-\d{2}-\d{2}$/);
    });

    it('should render objectives', () => {
      const template = 'Objectives:\n{{OBJECTIVES}}';
      const rendered = renderTemplate(template, mockConfig);
      expect(rendered).toContain('Test objective 1');
      expect(rendered).toContain('Check memory for test');
      expect(rendered).toContain('Update memory with test');
    });

    it('should render assumptions', () => {
      const template = 'Assumptions:\n{{ASSUMPTIONS}}';
      const rendered = renderTemplate(template, mockConfig);
      expect(rendered).toContain('- Assumption 1');
      expect(rendered).toContain('- Assumption 2');
    });

    it('should handle PROJECT_ASSUMPTIONS alias', () => {
      const template = '{{PROJECT_ASSUMPTIONS}}';
      const rendered = renderTemplate(template, mockConfig);
      expect(rendered).toContain('- Assumption 1');
    });

    it('should render domain terms', () => {
      const template = '{{DOMAIN_TERMS}}';
      const rendered = renderTemplate(template, mockConfig);
      expect(rendered).toContain('- Term 1');
      expect(rendered).toContain('- Term 2');
    });
  });

  describe('renderObjectives', () => {
    it('should format objectives as numbered list', () => {
      const objectives: Objective[] = [
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
      ];

      const rendered = renderObjectives(objectives);
      expect(rendered).toContain('1. **Objective 1**');
      expect(rendered).toContain('2. **Objective 2**');
      expect(rendered).toContain('⚠️ **Memory check required**: Check 1');
      expect(rendered).toContain('⚠️ **Memory update required**: Update 2');
    });
  });

  describe('renderList', () => {
    it('should format array as markdown list', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      const rendered = renderList(items);
      expect(rendered).toBe('- Item 1\n- Item 2\n- Item 3');
    });

    it('should handle empty array', () => {
      const rendered = renderList([]);
      expect(rendered).toBe('');
    });
  });
});
