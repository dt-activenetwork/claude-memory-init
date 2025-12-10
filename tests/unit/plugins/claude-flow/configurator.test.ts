/**
 * Tests for Claude Flow Plugin Configurator
 *
 * Tests the configuration flow for the Claude Flow heavyweight plugin including:
 * - Initialization mode selection (standard, sparc, minimal, skip)
 * - Workflow selection based on mode
 * - MCP configuration options
 * - Additional options selection
 * - Command building logic
 * - Configuration summary display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  PluginConfig,
  ConfigurationContext,
  UIComponents,
  Logger,
  RadioOption,
  CheckboxOption,
} from '../../../../src/plugin/types.js';

// Mock UI components for testing
function createMockUI(): UIComponents {
  return {
    radioList: vi.fn(),
    checkboxList: vi.fn(),
    confirm: vi.fn(),
    input: vi.fn(),
  };
}

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    step: vi.fn(),
    blank: vi.fn(),
  };
}

function createMockConfigContext(ui: UIComponents, logger: Logger): ConfigurationContext {
  return {
    projectName: 'test-project',
    projectRoot: '/test/project',
    otherPlugins: new Map(),
    ui,
    logger,
  };
}

/**
 * Mock Claude Flow Configurator
 *
 * This represents the expected structure of the Claude Flow plugin configurator.
 * The actual plugin implementation should follow this pattern.
 */
class ClaudeFlowConfigurator {
  private ui: UIComponents;
  private logger: Logger;

  constructor(context: ConfigurationContext) {
    this.ui = context.ui;
    this.logger = context.logger;
  }

  /**
   * Available initialization modes
   */
  static readonly INIT_MODES: RadioOption[] = [
    { name: 'Standard', value: 'standard', description: 'Full initialization with common workflows' },
    { name: 'SPARC', value: 'sparc', description: 'SPARC methodology with specialized workflows' },
    { name: 'Minimal', value: 'minimal', description: 'Minimal setup with only essential files' },
    { name: 'Skip', value: 'skip', description: 'Skip Claude Flow initialization' },
  ];

  /**
   * Available workflows by mode
   */
  static readonly WORKFLOWS: Record<string, CheckboxOption[]> = {
    standard: [
      { name: 'Code Review', value: 'code-review', checked: true },
      { name: 'Documentation', value: 'documentation', checked: true },
      { name: 'Testing', value: 'testing', checked: false },
      { name: 'Refactoring', value: 'refactoring', checked: false },
    ],
    sparc: [
      { name: 'Specification', value: 'specification', checked: true },
      { name: 'Pseudocode', value: 'pseudocode', checked: true },
      { name: 'Architecture', value: 'architecture', checked: true },
      { name: 'Refinement', value: 'refinement', checked: true },
      { name: 'Completion', value: 'completion', checked: true },
    ],
    minimal: [],
  };

  /**
   * MCP server options
   */
  static readonly MCP_OPTIONS: CheckboxOption[] = [
    { name: 'Filesystem', value: 'filesystem', checked: true, description: 'File operations' },
    { name: 'Memory', value: 'memory', checked: true, description: 'Persistent memory' },
    { name: 'GitHub', value: 'github', checked: false, description: 'GitHub integration' },
    { name: 'Database', value: 'database', checked: false, description: 'Database operations' },
  ];

  /**
   * Additional options
   */
  static readonly ADDITIONAL_OPTIONS: CheckboxOption[] = [
    { name: 'Enable Swarm Mode', value: 'swarm', checked: false, description: 'Multi-agent orchestration' },
    { name: 'Enable MCP Integration', value: 'mcp', checked: true, description: 'Model Context Protocol' },
    { name: 'Create Slash Commands', value: 'commands', checked: true, description: 'Custom slash commands' },
  ];

  /**
   * Run the configuration flow
   */
  async configure(): Promise<PluginConfig> {
    // Step 1: Select initialization mode
    const mode = await this.selectInitMode();

    if (mode === 'skip') {
      return { enabled: false, options: { mode: 'skip' } };
    }

    // Step 2: Select workflows (if applicable)
    const workflows = await this.selectWorkflows(mode);

    // Step 3: Select MCP options (if not minimal)
    const mcpOptions = mode !== 'minimal' ? await this.selectMCPOptions() : [];

    // Step 4: Select additional options
    const additionalOptions = await this.selectAdditionalOptions();

    // Step 5: Custom command input (if needed)
    const customCommand = additionalOptions.includes('custom')
      ? await this.inputCustomCommand()
      : undefined;

    // Build the configuration
    return {
      enabled: true,
      options: {
        mode,
        workflows,
        mcpOptions,
        additionalOptions,
        customCommand,
        initCommand: this.buildInitCommand(mode, workflows, additionalOptions),
      },
    };
  }

  /**
   * Select initialization mode
   */
  async selectInitMode(): Promise<string> {
    return await this.ui.radioList(
      'Select Claude Flow initialization mode:',
      ClaudeFlowConfigurator.INIT_MODES,
      'standard'
    );
  }

  /**
   * Select workflows based on mode
   */
  async selectWorkflows(mode: string): Promise<string[]> {
    const workflows = ClaudeFlowConfigurator.WORKFLOWS[mode] || [];
    if (workflows.length === 0) return [];

    return await this.ui.checkboxList(
      `Select workflows for ${mode} mode:`,
      workflows
    );
  }

  /**
   * Select MCP server options
   */
  async selectMCPOptions(): Promise<string[]> {
    return await this.ui.checkboxList(
      'Select MCP servers to configure:',
      ClaudeFlowConfigurator.MCP_OPTIONS
    );
  }

  /**
   * Select additional options
   */
  async selectAdditionalOptions(): Promise<string[]> {
    return await this.ui.checkboxList(
      'Select additional options:',
      ClaudeFlowConfigurator.ADDITIONAL_OPTIONS
    );
  }

  /**
   * Input custom command
   */
  async inputCustomCommand(): Promise<string> {
    return await this.ui.input(
      'Enter custom initialization command:',
      'pnpm dlx claude-flow@alpha init'
    );
  }

  /**
   * Build the initialization command
   */
  buildInitCommand(mode: string, workflows: string[], additionalOptions: string[]): string {
    const parts = ['pnpm', 'dlx', 'claude-flow@alpha', 'init'];

    if (mode !== 'standard') {
      parts.push(`--mode=${mode}`);
    }

    if (workflows.length > 0) {
      parts.push(`--workflows=${workflows.join(',')}`);
    }

    if (additionalOptions.includes('swarm')) {
      parts.push('--swarm');
    }

    if (!additionalOptions.includes('mcp')) {
      parts.push('--no-mcp');
    }

    return parts.join(' ');
  }

  /**
   * Generate configuration summary
   */
  getSummary(config: PluginConfig): string[] {
    const summary: string[] = [];
    const options = config.options;

    if (!config.enabled) {
      return ['Claude Flow: Skipped'];
    }

    summary.push(`Mode: ${options.mode}`);

    if (options.workflows && (options.workflows as string[]).length > 0) {
      summary.push(`Workflows: ${(options.workflows as string[]).join(', ')}`);
    }

    if (options.mcpOptions && (options.mcpOptions as string[]).length > 0) {
      summary.push(`MCP Servers: ${(options.mcpOptions as string[]).join(', ')}`);
    }

    if (options.additionalOptions) {
      const additional = options.additionalOptions as string[];
      if (additional.includes('swarm')) {
        summary.push('Swarm Mode: Enabled');
      }
    }

    return summary;
  }
}

describe('ClaudeFlowConfigurator', () => {
  let mockUI: UIComponents;
  let mockLogger: Logger;
  let context: ConfigurationContext;
  let configurator: ClaudeFlowConfigurator;

  beforeEach(() => {
    mockUI = createMockUI();
    mockLogger = createMockLogger();
    context = createMockConfigContext(mockUI, mockLogger);
    configurator = new ClaudeFlowConfigurator(context);
  });

  describe('INIT_MODES', () => {
    it('should have all expected initialization modes', () => {
      const modes = ClaudeFlowConfigurator.INIT_MODES.map(m => m.value);

      expect(modes).toContain('standard');
      expect(modes).toContain('sparc');
      expect(modes).toContain('minimal');
      expect(modes).toContain('skip');
    });

    it('should have descriptions for all modes', () => {
      ClaudeFlowConfigurator.INIT_MODES.forEach(mode => {
        expect(mode.description).toBeDefined();
        expect(mode.description!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('WORKFLOWS', () => {
    it('should have workflows for standard mode', () => {
      const standardWorkflows = ClaudeFlowConfigurator.WORKFLOWS['standard'];

      expect(standardWorkflows).toBeDefined();
      expect(standardWorkflows.length).toBeGreaterThan(0);
    });

    it('should have SPARC workflows for sparc mode', () => {
      const sparcWorkflows = ClaudeFlowConfigurator.WORKFLOWS['sparc'];

      expect(sparcWorkflows).toBeDefined();
      expect(sparcWorkflows.length).toBe(5); // S, P, A, R, C
      expect(sparcWorkflows.map(w => w.value)).toContain('specification');
      expect(sparcWorkflows.map(w => w.value)).toContain('pseudocode');
      expect(sparcWorkflows.map(w => w.value)).toContain('architecture');
      expect(sparcWorkflows.map(w => w.value)).toContain('refinement');
      expect(sparcWorkflows.map(w => w.value)).toContain('completion');
    });

    it('should have empty workflows for minimal mode', () => {
      const minimalWorkflows = ClaudeFlowConfigurator.WORKFLOWS['minimal'];

      expect(minimalWorkflows).toHaveLength(0);
    });
  });

  describe('selectInitMode', () => {
    it('should call radioList with correct options', async () => {
      vi.mocked(mockUI.radioList).mockResolvedValue('standard');

      const result = await configurator.selectInitMode();

      expect(mockUI.radioList).toHaveBeenCalledWith(
        expect.stringContaining('initialization mode'),
        ClaudeFlowConfigurator.INIT_MODES,
        'standard'
      );
      expect(result).toBe('standard');
    });

    it('should return sparc when selected', async () => {
      vi.mocked(mockUI.radioList).mockResolvedValue('sparc');

      const result = await configurator.selectInitMode();

      expect(result).toBe('sparc');
    });
  });

  describe('selectWorkflows', () => {
    it('should return selected workflows for standard mode', async () => {
      vi.mocked(mockUI.checkboxList).mockResolvedValue(['code-review', 'testing']);

      const result = await configurator.selectWorkflows('standard');

      expect(mockUI.checkboxList).toHaveBeenCalledWith(
        expect.stringContaining('standard'),
        ClaudeFlowConfigurator.WORKFLOWS['standard']
      );
      expect(result).toEqual(['code-review', 'testing']);
    });

    it('should return all SPARC workflows when selected', async () => {
      const sparcWorkflows = ['specification', 'pseudocode', 'architecture', 'refinement', 'completion'];
      vi.mocked(mockUI.checkboxList).mockResolvedValue(sparcWorkflows);

      const result = await configurator.selectWorkflows('sparc');

      expect(result).toEqual(sparcWorkflows);
    });

    it('should return empty array for minimal mode', async () => {
      const result = await configurator.selectWorkflows('minimal');

      expect(result).toEqual([]);
      expect(mockUI.checkboxList).not.toHaveBeenCalled();
    });

    it('should return empty array for unknown mode', async () => {
      const result = await configurator.selectWorkflows('unknown');

      expect(result).toEqual([]);
    });
  });

  describe('selectMCPOptions', () => {
    it('should call checkboxList with MCP options', async () => {
      vi.mocked(mockUI.checkboxList).mockResolvedValue(['filesystem', 'memory']);

      const result = await configurator.selectMCPOptions();

      expect(mockUI.checkboxList).toHaveBeenCalledWith(
        expect.stringContaining('MCP'),
        ClaudeFlowConfigurator.MCP_OPTIONS
      );
      expect(result).toEqual(['filesystem', 'memory']);
    });

    it('should include optional servers when selected', async () => {
      vi.mocked(mockUI.checkboxList).mockResolvedValue(['filesystem', 'memory', 'github', 'database']);

      const result = await configurator.selectMCPOptions();

      expect(result).toContain('github');
      expect(result).toContain('database');
    });
  });

  describe('selectAdditionalOptions', () => {
    it('should call checkboxList with additional options', async () => {
      vi.mocked(mockUI.checkboxList).mockResolvedValue(['mcp', 'commands']);

      const result = await configurator.selectAdditionalOptions();

      expect(mockUI.checkboxList).toHaveBeenCalledWith(
        expect.stringContaining('additional'),
        ClaudeFlowConfigurator.ADDITIONAL_OPTIONS
      );
      expect(result).toEqual(['mcp', 'commands']);
    });

    it('should allow swarm mode selection', async () => {
      vi.mocked(mockUI.checkboxList).mockResolvedValue(['swarm', 'mcp']);

      const result = await configurator.selectAdditionalOptions();

      expect(result).toContain('swarm');
    });
  });

  describe('inputCustomCommand', () => {
    it('should call input with default command', async () => {
      vi.mocked(mockUI.input).mockResolvedValue('pnpm dlx claude-flow@alpha init --custom');

      const result = await configurator.inputCustomCommand();

      expect(mockUI.input).toHaveBeenCalledWith(
        expect.stringContaining('custom'),
        'pnpm dlx claude-flow@alpha init'
      );
      expect(result).toBe('pnpm dlx claude-flow@alpha init --custom');
    });
  });

  describe('buildInitCommand', () => {
    it('should build standard command without extra flags', () => {
      const command = configurator.buildInitCommand('standard', ['code-review'], ['mcp']);

      expect(command).toBe('pnpm dlx claude-flow@alpha init --workflows=code-review');
    });

    it('should add mode flag for non-standard modes', () => {
      const command = configurator.buildInitCommand('sparc', [], ['mcp']);

      expect(command).toContain('--mode=sparc');
    });

    it('should add workflows when provided', () => {
      const command = configurator.buildInitCommand('standard', ['code-review', 'testing'], ['mcp']);

      expect(command).toContain('--workflows=code-review,testing');
    });

    it('should add swarm flag when enabled', () => {
      const command = configurator.buildInitCommand('standard', [], ['swarm', 'mcp']);

      expect(command).toContain('--swarm');
    });

    it('should add no-mcp flag when MCP is disabled', () => {
      const command = configurator.buildInitCommand('standard', [], []);

      expect(command).toContain('--no-mcp');
    });

    it('should build complex command with all options', () => {
      const command = configurator.buildInitCommand(
        'sparc',
        ['specification', 'pseudocode'],
        ['swarm', 'mcp', 'commands']
      );

      expect(command).toContain('pnpm dlx claude-flow@alpha init');
      expect(command).toContain('--mode=sparc');
      expect(command).toContain('--workflows=specification,pseudocode');
      expect(command).toContain('--swarm');
      expect(command).not.toContain('--no-mcp');
    });
  });

  describe('configure', () => {
    it('should return disabled config when skip is selected', async () => {
      vi.mocked(mockUI.radioList).mockResolvedValue('skip');

      const config = await configurator.configure();

      expect(config.enabled).toBe(false);
      expect(config.options.mode).toBe('skip');
    });

    it('should complete full standard configuration', async () => {
      vi.mocked(mockUI.radioList).mockResolvedValue('standard');
      vi.mocked(mockUI.checkboxList)
        .mockResolvedValueOnce(['code-review', 'documentation']) // workflows
        .mockResolvedValueOnce(['filesystem', 'memory']) // MCP options
        .mockResolvedValueOnce(['mcp', 'commands']); // additional options

      const config = await configurator.configure();

      expect(config.enabled).toBe(true);
      expect(config.options.mode).toBe('standard');
      expect(config.options.workflows).toEqual(['code-review', 'documentation']);
      expect(config.options.mcpOptions).toEqual(['filesystem', 'memory']);
      expect(config.options.additionalOptions).toEqual(['mcp', 'commands']);
      expect(config.options.initCommand).toBeDefined();
    });

    it('should complete SPARC configuration', async () => {
      vi.mocked(mockUI.radioList).mockResolvedValue('sparc');
      vi.mocked(mockUI.checkboxList)
        .mockResolvedValueOnce(['specification', 'pseudocode', 'architecture', 'refinement', 'completion'])
        .mockResolvedValueOnce(['filesystem'])
        .mockResolvedValueOnce(['mcp']);

      const config = await configurator.configure();

      expect(config.enabled).toBe(true);
      expect(config.options.mode).toBe('sparc');
      expect((config.options.workflows as string[])).toHaveLength(5);
    });

    it('should skip MCP selection for minimal mode', async () => {
      vi.mocked(mockUI.radioList).mockResolvedValue('minimal');
      vi.mocked(mockUI.checkboxList).mockResolvedValue([]);

      const config = await configurator.configure();

      expect(config.enabled).toBe(true);
      expect(config.options.mode).toBe('minimal');
      expect(config.options.mcpOptions).toEqual([]);
      // checkboxList should only be called once (for additional options)
      expect(mockUI.checkboxList).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSummary', () => {
    it('should return skip message for disabled config', () => {
      const config: PluginConfig = { enabled: false, options: { mode: 'skip' } };

      const summary = configurator.getSummary(config);

      expect(summary).toContain('Claude Flow: Skipped');
    });

    it('should include mode in summary', () => {
      const config: PluginConfig = {
        enabled: true,
        options: { mode: 'standard', workflows: [], mcpOptions: [], additionalOptions: [] },
      };

      const summary = configurator.getSummary(config);

      expect(summary.some(s => s.includes('standard'))).toBe(true);
    });

    it('should include workflows in summary', () => {
      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          workflows: ['code-review', 'testing'],
          mcpOptions: [],
          additionalOptions: [],
        },
      };

      const summary = configurator.getSummary(config);

      expect(summary.some(s => s.includes('code-review'))).toBe(true);
      expect(summary.some(s => s.includes('testing'))).toBe(true);
    });

    it('should include MCP servers in summary', () => {
      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          workflows: [],
          mcpOptions: ['filesystem', 'memory'],
          additionalOptions: [],
        },
      };

      const summary = configurator.getSummary(config);

      expect(summary.some(s => s.includes('filesystem'))).toBe(true);
    });

    it('should include swarm mode in summary when enabled', () => {
      const config: PluginConfig = {
        enabled: true,
        options: {
          mode: 'standard',
          workflows: [],
          mcpOptions: [],
          additionalOptions: ['swarm', 'mcp'],
        },
      };

      const summary = configurator.getSummary(config);

      expect(summary.some(s => s.includes('Swarm'))).toBe(true);
    });
  });
});
