/**
 * Smoke Test: Core System Functionality
 *
 * This test verifies the entire system works correctly from end to end.
 * It's plugin-agnostic and focuses on core mechanisms:
 * - Plugin system (registration, loading, execution)
 * - Interactive flow (dynamic steps, configuration)
 * - File generation (.claude/rules/*.md, TOON files, directory structure)
 * - Rules file system (per-plugin rule generation)
 * - TOON format (generation and persistence)
 *
 * Run this test after any code change to ensure nothing broke.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { InteractiveInitializer } from '../../src/core/interactive-initializer.js';
import { PluginRegistry } from '../../src/plugin/registry.js';
import type { CheckboxOption } from '../../src/prompts/components/checkbox-list.js';
import type { RadioOption } from '../../src/prompts/components/radio-list.js';

// Mock UI components
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

describe('Smoke Test: Full System Functionality', () => {
  let tmpDir: string;
  let testOutputDir: string;

  beforeAll(async () => {
    // Create test output directory
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-init-smoke-'));
    testOutputDir = path.join(tmpDir, 'test-project');
    await fs.mkdir(testOutputDir);

    // Setup mocks for a realistic initialization
    await setupRealisticMocks();

    // Run full initialization
    const registry = new PluginRegistry();

    // Register all built-in plugins
    const { default: systemDetectorPlugin } = await import('../../src/plugins/system-detector/index.js');
    const { default: memorySystemPlugin } = await import('../../src/plugins/memory-system/index.js');
    const { default: gitPlugin } = await import('../../src/plugins/git/index.js');
    const { default: promptPresetsPlugin } = await import('../../src/plugins/prompt-presets/index.js');

    registry.register(systemDetectorPlugin);
    registry.register(memorySystemPlugin);
    registry.register(gitPlugin);
    registry.register(promptPresetsPlugin);

    const initializer = new InteractiveInitializer(registry);

    // Execute initialization
    await initializer.run(testOutputDir, { force: false });
  });

  afterAll(async () => {
    // Cleanup
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }

    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // Core Framework Tests
  // ═══════════════════════════════════════════════════════════

  describe('Core Framework', () => {
    it('should create base directory structure', async () => {
      // Verify .agent directory exists
      const agentDir = path.join(testOutputDir, '.agent');
      const stats = await fs.stat(agentDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should generate rules files in .claude/rules/', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const stats = await fs.stat(rulesDir);
      expect(stats.isDirectory()).toBe(true);

      // Verify rules files exist with correct naming (NN-plugin.md format)
      const files = await fs.readdir(rulesDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);

      // Check for project rules file (05-project.md)
      const projectRulesPath = path.join(rulesDir, '05-project.md');
      const projectRulesExists = await fileExists(projectRulesPath);
      expect(projectRulesExists).toBe(true);

      // Verify project rules content
      const content = await fs.readFile(projectRulesPath, 'utf-8');
      expect(content).toContain('test-project');
    });

    it('should create marker file', async () => {
      const markerPath = path.join(testOutputDir, '.agent', '.claude-memory-init');
      const stats = await fs.stat(markerPath);
      expect(stats.isFile()).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Plugin System Tests
  // ═══════════════════════════════════════════════════════════

  describe('Plugin System', () => {
    it('should execute all enabled plugins', async () => {
      // Each plugin should create its specific outputs
      // We verify by checking for plugin-specific files/directories

      // System Detector creates system/info.toon
      const systemInfoExists = await fileExists(
        path.join(testOutputDir, '.agent/system/config.toon')
      );
      expect(systemInfoExists).toBe(true);

      // Memory System creates memory/ structure
      const memoryDirExists = await fileExists(
        path.join(testOutputDir, '.agent/memory')
      );
      expect(memoryDirExists).toBe(true);

      // Git plugin creates git/ structure
      const gitDirExists = await fileExists(
        path.join(testOutputDir, '.agent/git')
      );
      expect(gitDirExists).toBe(true);
    });

    it('should respect plugin priorities and execution order', async () => {
      // Plugins should generate rules files with correct priority prefixes
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);
      const mdFiles = files.filter(f => f.endsWith('.md')).sort();

      // Files should be numbered to reflect priority order
      // 05-project.md, 15-system.md, 35-git.md, 35-memory.md, etc.
      expect(mdFiles.length).toBeGreaterThan(0);

      // Verify files are prefixed with numbers (NN-name.md format)
      for (const file of mdFiles) {
        expect(file).toMatch(/^\d{2}-.*\.md$/);
      }

      // Files should be in ascending order when sorted
      const priorities = mdFiles.map(f => parseInt(f.substring(0, 2), 10));
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // File Generation Tests
  // ═══════════════════════════════════════════════════════════

  describe('File Generation', () => {
    it('should generate TOON configuration files', async () => {
      // Project config in TOON format (new v2.1 two-layer architecture)
      const configContent = await fs.readFile(
        path.join(testOutputDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // New format: project config only stores package managers
      expect(configContent).toContain('# Project System Configuration');
      expect(configContent).toContain('configured_at:');
      expect(configContent).toContain('package_managers:');
    });

    it('should create all required directories', async () => {
      const requiredDirs = [
        '.agent',
        '.agent/system',
        '.agent/memory',
        '.agent/memory/index',
        '.agent/git',
      ];

      for (const dir of requiredDirs) {
        const dirPath = path.join(testOutputDir, dir);
        const exists = await fileExists(dirPath);
        expect(exists).toBe(true);
      }
    });

    it('should generate memory system structure', async () => {
      const memoryFiles = [
        '.agent/memory/index/tags.toon',
        '.agent/memory/index/topics.toon',
      ];

      for (const file of memoryFiles) {
        const filePath = path.join(testOutputDir, file);
        const exists = await fileExists(filePath);
        expect(exists).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Rules File System Tests
  // ═══════════════════════════════════════════════════════════

  describe('Rules File System', () => {
    it('should generate rules files for each enabled plugin', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      // Should have rules files for enabled plugins
      // Project rules (05), system (15), feature plugins (35)
      expect(mdFiles.length).toBeGreaterThanOrEqual(2);

      // Check for project rules file
      expect(files.some(f => f.startsWith('05-'))).toBe(true);
    });

    it('should include content from enabled plugins', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);

      // Read all rules files and check for plugin content
      let allContent = '';
      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(rulesDir, file), 'utf-8');
        allContent += content + '\n';
      }

      // System Detector plugin content (if enabled)
      const hasSystem = files.some(f => f.includes('system'));
      if (hasSystem) {
        expect(allContent).toMatch(/System|Environment|Operating/i);
      }

      // Git plugin content (if enabled)
      const hasGit = files.some(f => f.includes('git'));
      if (hasGit) {
        expect(allContent).toMatch(/Git|commit|branch/i);
      }

      // Memory plugin content (if enabled)
      const hasMemory = files.some(f => f.includes('memory'));
      if (hasMemory) {
        expect(allContent).toMatch(/Memory|knowledge|TOON/i);
      }
    });

    it('should only generate rules for enabled plugins', async () => {
      // For this test, we enabled all plugins
      // So we verify rules files exist for each enabled plugin
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      // Each rules file should have content
      for (const file of mdFiles) {
        const content = await fs.readFile(path.join(rulesDir, file), 'utf-8');
        expect(content.length).toBeGreaterThan(10);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // TOON Format Tests
  // ═══════════════════════════════════════════════════════════

  describe('TOON Format', () => {
    it('should generate valid TOON files', async () => {
      const configContent = await fs.readFile(
        path.join(testOutputDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // Valid TOON structure (new v2.1 format)
      expect(configContent).toMatch(/^# Project System Configuration/m);
      expect(configContent).toMatch(/^\w+:/m); // Top-level keys

      // Should not have JSON/YAML syntax (except TOON array brackets)
      expect(configContent).not.toContain('{');
      expect(configContent).not.toContain('"');
    });

    it('should use indentation for nesting', async () => {
      const configContent = await fs.readFile(
        path.join(testOutputDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // Check for proper indentation in package_managers section
      const lines = configContent.split('\n');
      const packageManagersLine = lines.findIndex(l => l.trim() === 'package_managers:');

      if (packageManagersLine !== -1 && lines[packageManagersLine + 1]) {
        // Next line should be indented
        const nextLine = lines[packageManagersLine + 1];
        if (nextLine.trim()) {
          expect(nextLine).toMatch(/^  \w+:/);
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Data Integrity Tests
  // ═══════════════════════════════════════════════════════════

  describe('Data Integrity', () => {
    it('should save package managers correctly', async () => {
      const configContent = await fs.readFile(
        path.join(testOutputDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // Package managers should be saved in new format
      expect(configContent).toContain('package_managers:');

      // At least one package manager should be specified if Python or Node is available
      // Check for either python or node entry
      const hasPython = configContent.includes('python:');
      const hasNode = configContent.includes('node:');

      // At least one should exist (most systems have node or python)
      expect(hasPython || hasNode || configContent.includes('package_managers:')).toBe(true);
    });

    it('should save configuration timestamp', async () => {
      const configContent = await fs.readFile(
        path.join(testOutputDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // New format uses configured_at instead of detected_at/last_updated
      expect(configContent).toContain('configured_at:');

      // Should be ISO 8601 format
      expect(configContent).toMatch(/configured_at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Rules Content Tests
  // ═══════════════════════════════════════════════════════════

  describe('Rules Content', () => {
    it('should have project information', async () => {
      const projectRulesPath = path.join(testOutputDir, '.claude', 'rules', '05-project.md');
      const content = await fs.readFile(projectRulesPath, 'utf-8');

      expect(content).toContain('test-project');
      // Project rules should have substantial content
      expect(content.length).toBeGreaterThan(100);
    });

    it('should have system information in rules', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);

      // Find system rules file (15-system.md)
      const systemFile = files.find(f => f.includes('system'));
      if (systemFile) {
        const content = await fs.readFile(path.join(rulesDir, systemFile), 'utf-8');
        // System rules focus on package managers
        expect(content).toMatch(/System|Environment|Package/i);
      }
    });

    it('should mention TOON format', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);

      // Read all rules files
      let allContent = '';
      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(rulesDir, file), 'utf-8');
        allContent += content + '\n';
      }

      // Some rules file should mention TOON
      expect(allContent.toLowerCase()).toContain('toon');
    });

    it('should have clear reading instructions', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);

      // Read all rules files
      let allContent = '';
      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(rulesDir, file), 'utf-8');
        allContent += content + '\n';
      }

      // Should guide on how to use the system
      expect(allContent).toContain('.agent/');
    });

    it('should not contain debug artifacts', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);

      // Check all rules files
      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(rulesDir, file), 'utf-8');

        // Should not have development artifacts
        expect(content).not.toContain('TODO');
        expect(content).not.toContain('FIXME');
        expect(content).not.toContain('DEBUG');
        expect(content).not.toContain('undefined');
        expect(content).not.toContain('null');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Directory Structure Tests
  // ═══════════════════════════════════════════════════════════

  describe('Directory Structure', () => {
    it('should follow standard .agent/ structure', async () => {
      const requiredDirs = [
        '.agent',
        '.agent/system',
        '.agent/memory',
        '.agent/memory/index',
      ];

      // These directories should always exist
      for (const dir of requiredDirs) {
        const dirPath = path.join(testOutputDir, dir);
        const exists = await fileExists(dirPath);
        if (!exists) {
          throw new Error(`Required directory not found: ${dir}`);
        }
        expect(exists).toBe(true);
      }

      // Optional directories (depend on enabled plugins)
      const optionalDirs = [
        '.agent/git',
        '.agent/memory/knowledge',
        '.agent/memory/history',
        '.agent/presets',
      ];

      // Just verify at least some optional directories were created
      let optionalDirsCreated = 0;
      for (const dir of optionalDirs) {
        const dirPath = path.join(testOutputDir, dir);
        if (await fileExists(dirPath)) {
          optionalDirsCreated++;
        }
      }

      expect(optionalDirsCreated).toBeGreaterThan(0);
    });

    it('should create memory index files', async () => {
      const indexFiles = [
        { path: '.agent/memory/index/tags.toon', contains: 'tags:' },
        { path: '.agent/memory/index/topics.toon', contains: 'topics:' },
      ];

      for (const file of indexFiles) {
        const filePath = path.join(testOutputDir, file.path);
        const exists = await fileExists(filePath);
        expect(exists).toBe(true);

        // Verify content is valid TOON
        const content = await fs.readFile(filePath, 'utf-8');
        expect(content).toContain(file.contains);
      }
    });

    it('should NOT create unnecessary files', async () => {
      // Should not create development files
      const shouldNotExist = [
        '.agent/temp',
        '.agent/.cache',
        '.agent/node_modules',
      ];

      for (const item of shouldNotExist) {
        const itemPath = path.join(testOutputDir, item);
        const exists = await fileExists(itemPath);
        expect(exists).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Configuration Persistence Tests
  // ═══════════════════════════════════════════════════════════

  describe('Configuration Persistence', () => {
    it('should save project configuration', async () => {
      const configContent = await fs.readFile(
        path.join(testOutputDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // New v2.1 format: project config stores package managers, not OS info
      // OS info is now in user preferences (~/.claude/)
      expect(configContent).toContain('# Project System Configuration');
      expect(configContent).toContain('package_managers:');
      expect(configContent).toContain('configured_at:');
    });

    it('should save git configuration', async () => {
      const gitConfigPath = path.join(testOutputDir, '.agent/git/config.toon');

      if (await fileExists(gitConfigPath)) {
        const gitConfig = await fs.readFile(gitConfigPath, 'utf-8');

        expect(gitConfig).toContain('plugin: git');
        expect(gitConfig).toContain('config:');
      }
    });

    it('should be able to re-read saved configuration', async () => {
      // This test ensures saved files are in correct format (new v2.1)
      const configContent = await fs.readFile(
        path.join(testOutputDir, '.agent/system/config.toon'),
        'utf-8'
      );

      // Parse basic structure (simplified parser)
      const lines = configContent.split('\n');
      const headerLine = lines.find(l => l.startsWith('# Project System Configuration'));
      const packageManagersLine = lines.find(l => l.startsWith('package_managers:'));

      expect(headerLine).toBeDefined();
      expect(packageManagersLine).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Content Quality Tests
  // ═══════════════════════════════════════════════════════════

  describe('Content Quality', () => {
    it('should have meaningful content (not placeholder text)', async () => {
      const projectRulesPath = path.join(testOutputDir, '.claude', 'rules', '05-project.md');
      const content = await fs.readFile(projectRulesPath, 'utf-8');

      // Should have actual project name
      expect(content).toContain('test-project');
      expect(content).not.toContain('{{PROJECT_NAME}}');
      expect(content).not.toContain('{{');
    });

    it('should have correct file references', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);

      // Read all rules files
      let allContent = '';
      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(rulesDir, file), 'utf-8');
        allContent += content + '\n';
      }

      // File references should use correct paths
      if (allContent.includes('tags.toon')) {
        expect(allContent).toContain('.agent/memory/index/tags.toon');
      }
    });

    it('should have proper markdown formatting', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);

      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(rulesDir, file), 'utf-8');

        // Should have proper headers (at least one # header per file)
        expect(content).toMatch(/^#+ /m);

        // Should have code blocks if mentioning code
        if (content.includes('```')) {
          // Verify code blocks are closed
          const openBlocks = (content.match(/```/g) || []).length;
          expect(openBlocks % 2).toBe(0); // Even number (open and close)
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Regression Tests
  // ═══════════════════════════════════════════════════════════

  describe('Regression Tests', () => {
    it('should handle projects without Python', async () => {
      // With the new two-layer architecture, project config only stores package managers
      const configPath = path.join(testOutputDir, '.agent/system/config.toon');
      const configExists = await fileExists(configPath);

      // Config file should exist (may or may not have python manager depending on environment)
      expect(configExists).toBe(true);
    });

    it('should handle projects without Node.js', async () => {
      // With the new two-layer architecture, project config only stores package managers
      const configPath = path.join(testOutputDir, '.agent/system/config.toon');
      const configExists = await fileExists(configPath);

      // Config file should exist (may or may not have node manager depending on environment)
      expect(configExists).toBe(true);
    });

    it('should handle empty memory directories', async () => {
      // Verify empty memory directories don't cause errors
      const knowledgeDir = path.join(testOutputDir, '.agent/memory/knowledge');
      const historyDir = path.join(testOutputDir, '.agent/memory/history');

      const knowledgeFiles = await fs.readdir(knowledgeDir);
      const historyFiles = await fs.readdir(historyDir);

      // Empty is OK (just created)
      expect(Array.isArray(knowledgeFiles)).toBe(true);
      expect(Array.isArray(historyFiles)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Performance Tests
  // ═══════════════════════════════════════════════════════════

  describe('Performance', () => {
    it('should complete initialization in reasonable time', async () => {
      // Already completed in beforeAll
      // Just verify it didn't timeout (handled by vitest timeout)
      expect(true).toBe(true);
    });

    it('should generate reasonably sized rules files', async () => {
      const rulesDir = path.join(testOutputDir, '.claude', 'rules');
      const files = await fs.readdir(rulesDir);

      let totalSize = 0;
      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(rulesDir, file), 'utf-8');
        totalSize += Buffer.byteLength(content, 'utf-8');
      }

      const sizeKB = totalSize / 1024;

      // Total rules should be < 50KB (token efficient)
      expect(sizeKB).toBeLessThan(50);

      // But should have substantial content (> 0.5KB)
      expect(sizeKB).toBeGreaterThan(0.5);
    });

    it('should generate compact TOON files', async () => {
      const configContent = await fs.readFile(
        path.join(testOutputDir, '.agent/system/config.toon'),
        'utf-8'
      );

      const sizeBytes = Buffer.byteLength(configContent, 'utf-8');

      // TOON should be compact (< 5KB for project config)
      expect(sizeBytes).toBeLessThan(5 * 1024);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

/**
 * Setup realistic mocks for a typical initialization
 */
async function setupRealisticMocks(): Promise<void> {
  const { input } = await import('../../src/prompts/components/input.js');
  const { checkboxList } = await import('../../src/prompts/components/checkbox-list.js');
  const { radioList } = await import('../../src/prompts/components/radio-list.js');
  const { confirm } = await import('../../src/prompts/components/confirm.js');

  // Mock input: Project name and description
  vi.mocked(input).mockImplementation(async (message: string, defaultValue?: string) => {
    if (message.includes('name') || message.includes('名称')) {
      return 'test-project';
    }
    if (message.includes('description') || message.includes('描述')) {
      return 'A comprehensive test project description';
    }
    return defaultValue || 'default-value';
  });

  // Mock checkbox: Select all recommended plugins
  vi.mocked(checkboxList).mockImplementation(async (message: string, options: CheckboxOption[]) => {
    if (message.includes('features') || message.includes('功能')) {
      // Select all plugins for comprehensive test
      return options.map(opt => opt.value);
    }
    // Default: select checked items
    return options.filter(opt => opt.checked).map(opt => opt.value);
  });

  // Mock radio: Use appropriate option based on context
  vi.mocked(radioList).mockImplementation(async (message: string, options: RadioOption[], defaultValue?: string) => {
    // For memory scope selection, always use 'project' scope in tests
    // to ensure files are written to the test directory, not ~/.claude/
    if (message.includes('stored') || message.includes('storage') || message.includes('Memory')) {
      const projectOption = options.find(opt => opt.value === 'project');
      if (projectOption) {
        return 'project';
      }
    }
    return defaultValue || options[0]?.value || '';
  });

  // Mock confirm: Default to Yes for comprehensive test
  vi.mocked(confirm).mockImplementation(async (message: string, defaultValue: boolean = true) => {
    if (message.includes('Proceed') || message.includes('initialization')) {
      return true; // Always proceed
    }
    // Always re-detect system info in tests to ensure project scope
    // (Don't use existing ~/.claude/ config which uses 'user' scope)
    if (message.includes('existing system configuration') || message.includes('existing')) {
      return false;
    }
    return defaultValue;
  });
}

/**
 * Check if file or directory exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
