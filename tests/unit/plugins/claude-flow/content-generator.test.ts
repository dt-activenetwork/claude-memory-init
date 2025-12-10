/**
 * Tests for Claude Flow Content Generator
 *
 * Tests content generation for the Claude Flow plugin including:
 * - Full content generation
 * - Section-specific generation (overview, quick reference, workflow, etc.)
 * - SPARC guide generation (only when SPARC mode enabled)
 * - Workflow guide generation based on selected workflows
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { PluginConfig, PluginContext } from '../../../../src/plugin/types.js';

/**
 * Mock Claude Flow Content Generator
 *
 * Generates AGENT.md content sections for the Claude Flow plugin.
 * The actual plugin implementation should follow this pattern.
 */
class ClaudeFlowContentGenerator {
  /**
   * Generate full AGENT.md content contribution
   */
  generateContent(config: PluginConfig, context: PluginContext): string {
    if (!config.enabled) {
      return '';
    }

    const sections: string[] = [];
    const mode = config.options.mode as string;

    // Overview section
    sections.push(this.generateOverview(mode));

    // Quick reference section
    sections.push(this.generateQuickReference(config));

    // Workflow section (based on selected workflows)
    const workflows = config.options.workflows as string[] || [];
    if (workflows.length > 0) {
      sections.push(this.generateWorkflowGuide(mode, workflows));
    }

    // SPARC guide (only for SPARC mode)
    if (mode === 'sparc') {
      sections.push(this.generateSPARCGuide());
    }

    // MCP section (if MCP enabled)
    const additionalOptions = config.options.additionalOptions as string[] || [];
    if (additionalOptions.includes('mcp')) {
      const mcpOptions = config.options.mcpOptions as string[] || [];
      sections.push(this.generateMCPGuide(mcpOptions));
    }

    // Swarm section (if swarm enabled)
    if (additionalOptions.includes('swarm')) {
      sections.push(this.generateSwarmGuide());
    }

    return sections.filter(s => s.length > 0).join('\n\n');
  }

  /**
   * Generate overview section
   */
  generateOverview(mode: string): string {
    const modeDescriptions: Record<string, string> = {
      standard: 'Standard development workflows with code review and documentation support.',
      sparc: 'SPARC methodology for structured specification, design, and implementation.',
      minimal: 'Minimal setup with essential Claude Flow features.',
    };

    return `## Claude Flow Integration

Claude Flow provides advanced orchestration capabilities for AI-assisted development.

**Mode**: ${mode}
${modeDescriptions[mode] || 'Custom configuration.'}`;
  }

  /**
   * Generate quick reference section
   */
  generateQuickReference(config: PluginConfig): string {
    const commands: string[] = [
      '# Quick Reference',
      '',
      '## Available Commands',
      '',
      '```bash',
      '# Start Claude Flow',
      'claude-flow start',
      '',
      '# Run a workflow',
      'claude-flow workflow <name>',
      '',
    ];

    const additionalOptions = config.options.additionalOptions as string[] || [];

    if (additionalOptions.includes('swarm')) {
      commands.push('# Start swarm mode');
      commands.push('claude-flow swarm start');
      commands.push('');
    }

    commands.push('# Get help');
    commands.push('claude-flow help');
    commands.push('```');

    return commands.join('\n');
  }

  /**
   * Generate workflow guide based on mode and selected workflows
   */
  generateWorkflowGuide(mode: string, workflows: string[]): string {
    const sections: string[] = ['## Workflows'];

    if (mode === 'standard') {
      sections.push(this.generateStandardWorkflowGuide(workflows));
    } else if (mode === 'sparc') {
      sections.push(this.generateSPARCWorkflowGuide(workflows));
    }

    return sections.join('\n\n');
  }

  /**
   * Generate standard workflow guide
   */
  private generateStandardWorkflowGuide(workflows: string[]): string {
    const workflowDescriptions: Record<string, string> = {
      'code-review': `### Code Review Workflow

Use this workflow to conduct thorough code reviews:

1. Run \`claude-flow workflow code-review <file-or-pr>\`
2. Follow the guided review process
3. Apply suggested improvements`,

      'documentation': `### Documentation Workflow

Generate and update documentation:

1. Run \`claude-flow workflow documentation <target>\`
2. Review generated documentation
3. Commit changes`,

      'testing': `### Testing Workflow

Generate and run tests:

1. Run \`claude-flow workflow testing <module>\`
2. Review generated tests
3. Execute test suite`,

      'refactoring': `### Refactoring Workflow

Safely refactor code:

1. Run \`claude-flow workflow refactoring <target>\`
2. Review proposed changes
3. Apply refactoring`,
    };

    return workflows
      .map(w => workflowDescriptions[w] || `### ${w}\n\nCustom workflow.`)
      .join('\n\n');
  }

  /**
   * Generate SPARC workflow guide
   */
  private generateSPARCWorkflowGuide(workflows: string[]): string {
    const sparcPhases: Record<string, string> = {
      'specification': `### Specification Phase

Define clear requirements and acceptance criteria:

1. Run \`claude-flow sparc specification\`
2. Define user stories and requirements
3. Establish acceptance criteria`,

      'pseudocode': `### Pseudocode Phase

Design the solution at a high level:

1. Run \`claude-flow sparc pseudocode\`
2. Create algorithm outlines
3. Define data structures`,

      'architecture': `### Architecture Phase

Design system architecture:

1. Run \`claude-flow sparc architecture\`
2. Define component boundaries
3. Establish interfaces`,

      'refinement': `### Refinement Phase

Iterate on implementation:

1. Run \`claude-flow sparc refinement\`
2. Implement incrementally
3. Refine based on feedback`,

      'completion': `### Completion Phase

Finalize and validate:

1. Run \`claude-flow sparc completion\`
2. Run all tests
3. Generate documentation`,
    };

    return workflows
      .map(w => sparcPhases[w] || `### ${w}\n\nCustom SPARC phase.`)
      .join('\n\n');
  }

  /**
   * Generate SPARC methodology guide
   */
  generateSPARCGuide(): string {
    return `## SPARC Methodology

Claude Flow implements the SPARC methodology for structured development:

### Overview

**S**pecification - Define what needs to be built
**P**seudocode - Design the solution at a high level
**A**rchitecture - Design the system structure
**R**efinement - Iterate and improve
**C**ompletion - Finalize and validate

### Best Practices

1. **Start with Specification**: Always begin by clearly defining requirements
2. **Think Before Coding**: Use pseudocode to plan your approach
3. **Design for Scale**: Consider architecture early
4. **Iterate**: Use refinement to improve incrementally
5. **Validate**: Complete with thorough testing and documentation

### Commands

\`\`\`bash
# Run full SPARC workflow
claude-flow sparc <task>

# Run specific phase
claude-flow sparc <phase> <task>
\`\`\``;
  }

  /**
   * Generate MCP guide
   */
  generateMCPGuide(mcpOptions: string[]): string {
    const sections: string[] = [
      '## MCP Integration',
      '',
      'Claude Flow integrates with Model Context Protocol (MCP) servers:',
      '',
    ];

    const serverDescriptions: Record<string, string> = {
      'filesystem': '- **Filesystem**: File read/write operations within allowed directories',
      'memory': '- **Memory**: Persistent memory for cross-session context',
      'github': '- **GitHub**: GitHub repository operations and PR management',
      'database': '- **Database**: SQLite database operations',
    };

    sections.push('### Configured Servers');
    sections.push('');

    for (const server of mcpOptions) {
      sections.push(serverDescriptions[server] || `- **${server}**: Custom MCP server`);
    }

    sections.push('');
    sections.push('### Usage');
    sections.push('');
    sections.push('MCP servers are automatically available in Claude conversations.');

    return sections.join('\n');
  }

  /**
   * Generate swarm mode guide
   */
  generateSwarmGuide(): string {
    return `## Swarm Mode

Swarm mode enables multi-agent orchestration for complex tasks.

### Starting Swarm

\`\`\`bash
# Start swarm with default configuration
claude-flow swarm start

# Start with specific agents
claude-flow swarm start --agents=3

# Monitor swarm activity
claude-flow swarm status
\`\`\`

### Agent Roles

- **Orchestrator**: Coordinates other agents and manages task distribution
- **Worker**: Executes specific tasks assigned by the orchestrator
- **Reviewer**: Validates work produced by worker agents

### Best Practices

1. Use swarm mode for tasks that can be parallelized
2. Monitor agent coordination through the status command
3. Set appropriate limits to avoid resource exhaustion`;
  }

  /**
   * Get section by name
   */
  getSection(sectionName: string, config: PluginConfig, context: PluginContext): string {
    const mode = config.options.mode as string;
    const workflows = config.options.workflows as string[] || [];
    const mcpOptions = config.options.mcpOptions as string[] || [];
    const additionalOptions = config.options.additionalOptions as string[] || [];

    switch (sectionName) {
      case 'overview':
        return this.generateOverview(mode);
      case 'quick-reference':
        return this.generateQuickReference(config);
      case 'workflows':
        return this.generateWorkflowGuide(mode, workflows);
      case 'sparc':
        return mode === 'sparc' ? this.generateSPARCGuide() : '';
      case 'mcp':
        return additionalOptions.includes('mcp') ? this.generateMCPGuide(mcpOptions) : '';
      case 'swarm':
        return additionalOptions.includes('swarm') ? this.generateSwarmGuide() : '';
      default:
        return '';
    }
  }
}

// Create mock context for tests
function createMockContext(): PluginContext {
  return {
    projectRoot: '/test/project',
    targetDir: '/test/project/.agent',
    config: {
      core: {
        project: { name: 'test-project', root: '/test/project' },
        output: { base_dir: '.agent' },
        plugins: {},
      },
      plugins: new Map(),
    },
    shared: new Map(),
    logger: {
      info: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      step: () => {},
      blank: () => {},
    },
    fs: {
      ensureDir: async () => {},
      copyFile: async () => {},
      readFile: async () => '',
      writeFile: async () => {},
      fileExists: async () => false,
      dirExists: async () => false,
      readJsonFile: async () => ({}),
      writeJsonFile: async () => {},
    },
    template: {
      loadTemplate: async () => '',
      renderTemplate: () => '',
      loadAndRenderTemplate: async () => '',
    },
    ui: {
      checkboxList: async () => [],
      radioList: async () => '',
      confirm: async () => true,
      input: async () => '',
    },
    i18n: {
      t: (key) => key,
      language: 'en',
    },
  };
}

describe('ClaudeFlowContentGenerator', () => {
  let generator: ClaudeFlowContentGenerator;
  let mockContext: PluginContext;

  beforeEach(() => {
    generator = new ClaudeFlowContentGenerator();
    mockContext = createMockContext();
  });

  describe('generateContent', () => {
    it('should return empty string when plugin is disabled', () => {
      const config: PluginConfig = { enabled: false, options: {} };

      const content = generator.generateContent(config, mockContext);

      expect(content).toBe('');
    });

    it('should generate content for standard mode', () => {
      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          workflows: ['code-review'],
          mcpOptions: [],
          additionalOptions: [],
        },
      };

      const content = generator.generateContent(config, mockContext);

      expect(content).toContain('Claude Flow Integration');
      expect(content).toContain('Standard');
    });

    it('should include SPARC guide only for SPARC mode', () => {
      const standardConfig: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          workflows: [],
          additionalOptions: [],
        },
      };

      const sparcConfig: PluginConfig = {
        enabled: true,
        options: {
          mode: 'sparc',
          workflows: ['specification'],
          additionalOptions: [],
        },
      };

      const standardContent = generator.generateContent(standardConfig, mockContext);
      const sparcContent = generator.generateContent(sparcConfig, mockContext);

      expect(standardContent).not.toContain('SPARC Methodology');
      expect(sparcContent).toContain('SPARC Methodology');
    });

    it('should include MCP guide when MCP is enabled', () => {
      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          workflows: [],
          mcpOptions: ['filesystem', 'memory'],
          additionalOptions: ['mcp'],
        },
      };

      const content = generator.generateContent(config, mockContext);

      expect(content).toContain('MCP Integration');
      expect(content).toContain('Filesystem');
      expect(content).toContain('Memory');
    });

    it('should include Swarm guide when swarm is enabled', () => {
      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          workflows: [],
          additionalOptions: ['swarm'],
        },
      };

      const content = generator.generateContent(config, mockContext);

      expect(content).toContain('Swarm Mode');
    });
  });

  describe('generateOverview', () => {
    it('should generate overview for standard mode', () => {
      const overview = generator.generateOverview('standard');

      expect(overview).toContain('Claude Flow Integration');
      expect(overview).toContain('**Mode**');
      expect(overview).toContain('standard');
      expect(overview).toContain('code review');
    });

    it('should generate overview for sparc mode', () => {
      const overview = generator.generateOverview('sparc');

      expect(overview).toContain('**Mode**');
      expect(overview).toContain('sparc');
      expect(overview).toContain('SPARC methodology');
    });

    it('should generate overview for minimal mode', () => {
      const overview = generator.generateOverview('minimal');

      expect(overview).toContain('**Mode**');
      expect(overview).toContain('minimal');
      expect(overview).toContain('Minimal setup');
    });

    it('should handle unknown mode', () => {
      const overview = generator.generateOverview('custom');

      expect(overview).toContain('**Mode**');
      expect(overview).toContain('custom');
      expect(overview).toContain('Custom configuration');
    });
  });

  describe('generateQuickReference', () => {
    it('should include basic commands', () => {
      const config: PluginConfig = {
        enabled: true,
        options: { mode: 'standard', additionalOptions: [] },
      };

      const reference = generator.generateQuickReference(config);

      expect(reference).toContain('claude-flow start');
      expect(reference).toContain('claude-flow workflow');
      expect(reference).toContain('claude-flow help');
    });

    it('should include swarm commands when swarm is enabled', () => {
      const config: PluginConfig = {
        enabled: true,
        options: { mode: 'standard', additionalOptions: ['swarm'] },
      };

      const reference = generator.generateQuickReference(config);

      expect(reference).toContain('claude-flow swarm');
    });

    it('should not include swarm commands when swarm is disabled', () => {
      const config: PluginConfig = {
        enabled: true,
        options: { mode: 'standard', additionalOptions: [] },
      };

      const reference = generator.generateQuickReference(config);

      expect(reference).not.toContain('claude-flow swarm');
    });
  });

  describe('generateWorkflowGuide', () => {
    it('should generate standard workflow guide', () => {
      const guide = generator.generateWorkflowGuide('standard', ['code-review', 'documentation']);

      expect(guide).toContain('Code Review Workflow');
      expect(guide).toContain('Documentation Workflow');
      expect(guide).not.toContain('Testing Workflow');
    });

    it('should generate SPARC workflow guide', () => {
      const guide = generator.generateWorkflowGuide('sparc', ['specification', 'architecture']);

      expect(guide).toContain('Specification Phase');
      expect(guide).toContain('Architecture Phase');
    });

    it('should handle empty workflows', () => {
      const guide = generator.generateWorkflowGuide('standard', []);

      expect(guide).toContain('Workflows');
      expect(guide).not.toContain('Code Review');
    });

    it('should handle custom workflows', () => {
      const guide = generator.generateWorkflowGuide('standard', ['custom-workflow']);

      expect(guide).toContain('custom-workflow');
      expect(guide).toContain('Custom workflow');
    });
  });

  describe('generateSPARCGuide', () => {
    it('should include all SPARC phases', () => {
      const guide = generator.generateSPARCGuide();

      // The guide uses **S**pecification format (bolded first letter)
      expect(guide).toContain('**S**pecification');
      expect(guide).toContain('**P**seudocode');
      expect(guide).toContain('**A**rchitecture');
      expect(guide).toContain('**R**efinement');
      expect(guide).toContain('**C**ompletion');
    });

    it('should include best practices', () => {
      const guide = generator.generateSPARCGuide();

      expect(guide).toContain('Best Practices');
    });

    it('should include commands', () => {
      const guide = generator.generateSPARCGuide();

      expect(guide).toContain('claude-flow sparc');
    });
  });

  describe('generateMCPGuide', () => {
    it('should list configured MCP servers', () => {
      const guide = generator.generateMCPGuide(['filesystem', 'memory']);

      expect(guide).toContain('Filesystem');
      expect(guide).toContain('Memory');
      expect(guide).not.toContain('GitHub');
    });

    it('should handle custom MCP servers', () => {
      const guide = generator.generateMCPGuide(['custom-server']);

      expect(guide).toContain('custom-server');
      expect(guide).toContain('Custom MCP server');
    });

    it('should handle empty MCP options', () => {
      const guide = generator.generateMCPGuide([]);

      expect(guide).toContain('MCP Integration');
      expect(guide).toContain('Configured Servers');
    });
  });

  describe('generateSwarmGuide', () => {
    it('should include swarm commands', () => {
      const guide = generator.generateSwarmGuide();

      expect(guide).toContain('claude-flow swarm start');
      expect(guide).toContain('claude-flow swarm status');
    });

    it('should include agent roles', () => {
      const guide = generator.generateSwarmGuide();

      expect(guide).toContain('Orchestrator');
      expect(guide).toContain('Worker');
      expect(guide).toContain('Reviewer');
    });

    it('should include best practices', () => {
      const guide = generator.generateSwarmGuide();

      expect(guide).toContain('Best Practices');
    });
  });

  describe('getSection', () => {
    const baseConfig: PluginConfig = {
      enabled: true,
      options: {
        mode: 'sparc',
        workflows: ['specification'],
        mcpOptions: ['filesystem'],
        additionalOptions: ['mcp', 'swarm'],
      },
    };

    it('should return overview section', () => {
      const section = generator.getSection('overview', baseConfig, mockContext);

      expect(section).toContain('Claude Flow Integration');
    });

    it('should return quick-reference section', () => {
      const section = generator.getSection('quick-reference', baseConfig, mockContext);

      expect(section).toContain('Quick Reference');
    });

    it('should return workflows section', () => {
      const section = generator.getSection('workflows', baseConfig, mockContext);

      expect(section).toContain('Workflows');
    });

    it('should return sparc section only for sparc mode', () => {
      const section = generator.getSection('sparc', baseConfig, mockContext);

      expect(section).toContain('SPARC Methodology');

      const standardConfig = { ...baseConfig, options: { ...baseConfig.options, mode: 'standard' } };
      const emptySection = generator.getSection('sparc', standardConfig, mockContext);

      expect(emptySection).toBe('');
    });

    it('should return mcp section only when mcp is enabled', () => {
      const section = generator.getSection('mcp', baseConfig, mockContext);

      expect(section).toContain('MCP Integration');

      const noMcpConfig = {
        ...baseConfig,
        options: { ...baseConfig.options, additionalOptions: [] },
      };
      const emptySection = generator.getSection('mcp', noMcpConfig, mockContext);

      expect(emptySection).toBe('');
    });

    it('should return swarm section only when swarm is enabled', () => {
      const section = generator.getSection('swarm', baseConfig, mockContext);

      expect(section).toContain('Swarm Mode');

      const noSwarmConfig = {
        ...baseConfig,
        options: { ...baseConfig.options, additionalOptions: ['mcp'] },
      };
      const emptySection = generator.getSection('swarm', noSwarmConfig, mockContext);

      expect(emptySection).toBe('');
    });

    it('should return empty string for unknown section', () => {
      const section = generator.getSection('unknown', baseConfig, mockContext);

      expect(section).toBe('');
    });
  });
});
