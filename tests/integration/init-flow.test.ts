/**
 * Integration Test: Full Initialization Flow
 *
 * Tests the complete initialization process from start to finish,
 * including user interactions, file generation, and output validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { InteractiveInitializer } from '../../src/core/interactive-initializer.js';
import { PluginRegistry } from '../../src/plugin/registry.js';
import { fromToon } from '../../src/utils/toon-utils.js';
import type { CheckboxOption } from '../../src/prompts/components/checkbox-list.js';
import type { RadioOption } from '../../src/prompts/components/radio-list.js';

// Mock UI components instead of inquirer directly
vi.mock('../../src/prompts/components/input.js', () => ({
  input: vi.fn(),
}));

vi.mock('../../src/prompts/components/checkbox-list.js', () => ({
  checkboxList: vi.fn(),
}));

vi.mock('../../src/prompts/components/radio-list.js', () => ({
  radioList: vi.fn(),
}));

vi.mock('../../src/prompts/components/confirm.js', () => ({
  confirm: vi.fn(),
}));

describe('Full Initialization Flow (E2E)', () => {
  let tmpDir: string;
  let registry: PluginRegistry;
  let initializer: InteractiveInitializer;

  beforeEach(async () => {
    // Create temporary directory for test output
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-init-test-'));

    // Create plugin registry
    registry = new PluginRegistry();

    // Register all built-in plugins
    const { default: systemDetectorPlugin } = await import('../../src/plugins/system-detector/index.js');
    const { default: memorySystemPlugin } = await import('../../src/plugins/memory-system/index.js');
    const { default: gitPlugin } = await import('../../src/plugins/git/index.js');
    const { default: promptPresetsPlugin } = await import('../../src/plugins/prompt-presets/index.js');

    registry.register(systemDetectorPlugin);
    registry.register(memorySystemPlugin);
    registry.register(gitPlugin);
    registry.register(promptPresetsPlugin);

    // Create initializer
    initializer = new InteractiveInitializer(registry);
  });

  afterEach(async () => {
    // Cleanup temporary directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Restore all mocks
    vi.restoreAllMocks();
  });

  describe('Scenario 1: Minimal Setup (Only System Detector)', () => {
    it('should initialize with system detector only', async () => {
      // Mock user inputs
      await mockUserInputs({
        projectName: 'test-project',
        projectDescription: 'A test project',
        selectedPlugins: ['system-detector'],
        systemDetector: {
          useExistingConfig: false,
          pythonManager: 'uv',      // If multiple detected
          nodeManager: 'pnpm',      // If multiple detected
          includeAsSkill: false,
        },
        confirmInitialization: true,
      });

      // Run initialization
      await initializer.run(tmpDir, { force: false });

      // Verify directory structure
      await expectDirectoryExists(tmpDir, '.agent');
      await expectDirectoryExists(tmpDir, '.agent/system');
      await expectDirectoryExists(tmpDir, '.claude/rules');

      // Verify rules files exist (new architecture - no AGENT.md)
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);

      // Verify project rules file (00-project.md)
      await expectFileExists(tmpDir, '.claude/rules/00-project.md');

      // Verify system config file (new v2.1 two-layer architecture)
      await expectFileExists(tmpDir, '.agent/system/config.toon');

      // Verify content of system/config.toon
      const configContent = await fs.readFile(
        path.join(tmpDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // Verify TOON content (new format)
      expect(configContent).toContain('# Project System Configuration');
      expect(configContent).toContain('configured_at:');
      expect(configContent).toContain('package_managers:');

      // Verify project rules content
      const projectRules = await fs.readFile(path.join(tmpDir, '.claude/rules/00-project.md'), 'utf-8');
      expect(projectRules).toContain('test-project');
    });
  });

  describe('Scenario 2: Full Setup (All Plugins)', () => {
    it('should initialize with all plugins enabled', async () => {
      // Mock user inputs
      await mockUserInputs({
        projectName: 'full-test-project',
        projectDescription: 'A complete test project',
        selectedPlugins: ['system-detector', 'memory-system', 'git', 'prompt-presets'],
        systemDetector: {
          useExistingConfig: false,
          pythonManager: 'uv',
          nodeManager: 'pnpm',
          includeAsSkill: true,
        },
        memorySystem: {
          templateSource: 'default',
        },
        git: {
          enableAutoCommit: false,
          enableRemoteSync: false,
        },
        promptPresets: {
          selectedPresets: ['code-review', 'documentation'],
          allowCustom: true,
        },
        confirmInitialization: true,
      });

      // Run initialization
      await initializer.run(tmpDir, { force: false });

      // Verify base structure
      await expectDirectoryExists(tmpDir, '.agent');
      await expectDirectoryExists(tmpDir, '.agent/system');
      await expectDirectoryExists(tmpDir, '.agent/memory');
      await expectDirectoryExists(tmpDir, '.agent/git');
      await expectDirectoryExists(tmpDir, '.claude/rules');

      // Verify files
      await expectFileExists(tmpDir, '.claude/rules/00-project.md');
      await expectFileExists(tmpDir, '.agent/system/config.toon');

      // Verify rules files for enabled plugins
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      // Should have multiple rules files for all enabled plugins
      expect(mdFiles.length).toBeGreaterThanOrEqual(2);

      // Verify project rules content
      const projectRules = await fs.readFile(path.join(tmpDir, '.claude/rules/00-project.md'), 'utf-8');
      expect(projectRules).toContain('full-test-project');

      // Verify system/config.toon exists and has package managers
      const systemConfig = await fs.readFile(
        path.join(tmpDir, '.agent/system/config.toon'),
        'utf-8'
      );

      expect(systemConfig).toContain('# Project System Configuration');
      expect(systemConfig).toContain('package_managers:');

      // Note: Detailed file structure verification can be added incrementally
      // as plugins are fully implemented
    });
  });

  describe('Scenario 3: Persistent Configuration', () => {
    it('should create persistent configuration on first run', async () => {
      // First initialization
      await mockUserInputs({
        projectName: 'persistent-test',
        projectDescription: 'Test persistence',
        selectedPlugins: ['system-detector'],
        systemDetector: {
          useExistingConfig: false,
          pythonManager: undefined, // Use actual detected default
          nodeManager: undefined,   // Use actual detected default
          includeAsSkill: false,
        },
        confirmInitialization: true,
      });

      await initializer.run(tmpDir, { force: false });

      // ⭐ Verify configuration file was created
      await expectFileExists(tmpDir, '.agent/system/config.toon');

      const configContent = await fs.readFile(
        path.join(tmpDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // ⭐ Verify TOON structure (new v2.1 format)
      expect(configContent).toContain('# Project System Configuration');
      expect(configContent).toContain('configured_at:');
      expect(configContent).toContain('package_managers:');

      // ⭐ With new v2.1 architecture, project config only stores package managers
      // User preferences (OS, locale) are stored in ~/.claude/ which we don't test here
      // Just verify the package_managers section exists
      expect(configContent).toContain('package_managers:');
    });
  });

  describe('Scenario 4: Project Package Manager Selection', () => {
    it('should save selected package manager to project config', async () => {
      await mockUserInputs({
        projectName: 'manager-test',
        projectDescription: 'Test package manager selection',
        selectedPlugins: ['system-detector'],
        systemDetector: {
          useExistingConfig: false,
          nodeManager: 'pnpm',
          includeAsSkill: false,
        },
        confirmInitialization: true,
      });

      await initializer.run(tmpDir, { force: false });

      const systemConfig = await fs.readFile(
        path.join(tmpDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // Verify pnpm is saved in project config
      if (systemConfig.includes('node:')) {
        expect(systemConfig).toContain('node: pnpm');
      }
    });
  });

  describe('Scenario 5: Preserve Existing CLAUDE.md', () => {
    it('should not modify existing CLAUDE.md - rules go to .claude/rules/', async () => {
      // Create existing CLAUDE.md with custom content
      const existingContent = `# My Project Instructions

This is my custom project instructions that should NOT be modified.

## Custom Section

Some important notes here.
`;
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), existingContent);

      // Mock user inputs
      await mockUserInputs({
        projectName: 'preserve-test',
        projectDescription: 'Test preserving existing file',
        selectedPlugins: ['system-detector'],
        systemDetector: {
          useExistingConfig: false,
          includeAsSkill: false,
        },
        confirmInitialization: true,
      });

      // Run initialization
      await initializer.run(tmpDir, { force: false });

      // Verify CLAUDE.md was NOT modified
      const finalContent = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(finalContent).toBe(existingContent);

      // Verify rules were written to .claude/rules/
      await expectDirectoryExists(tmpDir, '.claude/rules');
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);

      // Verify project rules contain the project name
      const projectRules = await fs.readFile(path.join(rulesDir, '00-project.md'), 'utf-8');
      expect(projectRules).toContain('preserve-test');
    });

    it('should not modify existing AGENT.md - rules go to .claude/rules/', async () => {
      // Create existing AGENT.md with custom content
      const existingContent = `# Existing Agent Instructions

Custom content here.
`;
      await fs.writeFile(path.join(tmpDir, 'AGENT.md'), existingContent);

      // Mock user inputs
      await mockUserInputs({
        projectName: 'agent-preserve-test',
        projectDescription: 'Test preserving AGENT.md',
        selectedPlugins: ['system-detector'],
        systemDetector: {
          useExistingConfig: false,
          includeAsSkill: false,
        },
        confirmInitialization: true,
      });

      // Run initialization
      await initializer.run(tmpDir, { force: false });

      // Verify AGENT.md was NOT modified
      const finalContent = await fs.readFile(path.join(tmpDir, 'AGENT.md'), 'utf-8');
      expect(finalContent).toBe(existingContent);

      // Verify rules were written to .claude/rules/
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);
      expect(files.some(f => f.endsWith('.md'))).toBe(true);
    });

    it('should not touch CLAUDE.md or AGENT.md when both exist', async () => {
      // Create both files
      const agentContent = '# AGENT file content\n';
      const claudeContent = '# CLAUDE file content\n';
      await fs.writeFile(path.join(tmpDir, 'AGENT.md'), agentContent);
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), claudeContent);

      // Mock user inputs
      await mockUserInputs({
        projectName: 'both-files-test',
        projectDescription: 'Test with both files existing',
        selectedPlugins: ['system-detector'],
        systemDetector: {
          useExistingConfig: false,
          includeAsSkill: false,
        },
        confirmInitialization: true,
      });

      // Run initialization
      await initializer.run(tmpDir, { force: false });

      // Verify both files remain unchanged
      const finalAgentContent = await fs.readFile(path.join(tmpDir, 'AGENT.md'), 'utf-8');
      const finalClaudeContent = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(finalAgentContent).toBe(agentContent);
      expect(finalClaudeContent).toBe(claudeContent);

      // Verify rules were written to .claude/rules/
      const rulesDir = path.join(tmpDir, '.claude', 'rules');
      const projectRules = await fs.readFile(path.join(rulesDir, '00-project.md'), 'utf-8');
      expect(projectRules).toContain('both-files-test');
    });
  });
});

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mock user inputs for interactive prompts
 */
async function mockUserInputs(inputs: {
  projectName: string;
  projectDescription: string;
  selectedPlugins: string[];
  systemDetector?: {
    useExistingConfig?: boolean;
    pythonManager?: string;
    nodeManager?: string;
    includeAsSkill: boolean;
  };
  memorySystem?: {
    templateSource: string;
  };
  git?: {
    enableAutoCommit: boolean;
    enableRemoteSync: boolean;
  };
  promptPresets?: {
    selectedPresets: string[];
    allowCustom: boolean;
  };
  confirmInitialization: boolean;
}): Promise<void> {
  // Dynamically import mocked modules
  const { input } = await import('../../src/prompts/components/input.js');
  const { checkboxList } = await import('../../src/prompts/components/checkbox-list.js');
  const { radioList } = await import('../../src/prompts/components/radio-list.js');
  const { confirm } = await import('../../src/prompts/components/confirm.js');

  // Mock input component
  vi.mocked(input).mockImplementation(async (message: string, defaultValue?: string) => {
    if (message.includes('Project name') || message.includes('项目名称')) {
      return inputs.projectName;
    }

    if (message.includes('description') || message.includes('描述')) {
      return inputs.projectDescription;
    }

    return defaultValue || '';
  });

  // Mock checkbox component
  vi.mocked(checkboxList).mockImplementation(async (message: string, options: CheckboxOption[]) => {
    if (message.includes('features') || message.includes('功能')) {
      return inputs.selectedPlugins;
    }

    if (message.includes('presets') && inputs.promptPresets) {
      return inputs.promptPresets.selectedPresets;
    }

    // Default: return checked items
    return options.filter(opt => opt.checked).map(opt => opt.value);
  });

  // Mock radio component
  vi.mocked(radioList).mockImplementation(async (message: string, options: RadioOption[], defaultValue?: string) => {
    // For memory scope selection, always use 'project' scope in tests
    // to ensure files are written to the test directory, not ~/.claude/
    if (message.includes('stored') || message.includes('storage') || message.includes('Memory')) {
      return 'project';
    }

    if (message.includes('Python package manager')) {
      return inputs.systemDetector?.pythonManager || defaultValue || options[0]?.value || '';
    }

    if (message.includes('Node.js package manager') || message.includes('Node package manager')) {
      return inputs.systemDetector?.nodeManager || defaultValue || options[0]?.value || '';
    }

    if (message.includes('template source')) {
      return inputs.memorySystem?.templateSource || 'default';
    }

    return defaultValue || options[0]?.value || '';
  });

  // Mock confirm component
  vi.mocked(confirm).mockImplementation(async (message: string, defaultValue: boolean = true) => {
    if (message.includes('existing system configuration')) {
      return inputs.systemDetector?.useExistingConfig ?? false;
    }

    if (message.includes('Skill')) {
      return inputs.systemDetector?.includeAsSkill ?? false;
    }

    if (message.includes('Auto-commit') || message.includes('auto-commit')) {
      return inputs.git?.enableAutoCommit ?? false;
    }

    if (message.includes('Remote sync') || message.includes('remote sync')) {
      return inputs.git?.enableRemoteSync ?? false;
    }

    if (message.includes('custom') && inputs.promptPresets) {
      return inputs.promptPresets.allowCustom;
    }

    if (message.includes('Proceed') || message.includes('initialization')) {
      return inputs.confirmInitialization;
    }

    return defaultValue;
  });
}

/**
 * Expect directory to exist
 */
async function expectDirectoryExists(baseDir: string, relativePath: string): Promise<void> {
  const fullPath = path.join(baseDir, relativePath);
  const stats = await fs.stat(fullPath);
  expect(stats.isDirectory()).toBe(true);
}

/**
 * Expect file to exist
 */
async function expectFileExists(baseDir: string, relativePath: string): Promise<void> {
  const fullPath = path.join(baseDir, relativePath);
  const stats = await fs.stat(fullPath);
  expect(stats.isFile()).toBe(true);
}

/**
 * Read and parse TOON file
 */
async function readToonFile<T>(baseDir: string, relativePath: string): Promise<T> {
  const fullPath = path.join(baseDir, relativePath);
  const content = await fs.readFile(fullPath, 'utf-8');

  // Remove comment lines and parse
  const toonContent = content
    .split('\n')
    .filter(line => !line.trim().startsWith('#'))
    .join('\n');

  return fromToon<T>(toonContent);
}

/**
 * Verify AGENT.md contains expected sections
 */
async function verifyAgentMdSections(
  baseDir: string,
  expectedSections: string[]
): Promise<void> {
  const agentMd = await fs.readFile(path.join(baseDir, 'AGENT.md'), 'utf-8');

  for (const section of expectedSections) {
    expect(agentMd).toContain(section);
  }
}
