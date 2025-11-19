/**
 * End-to-End Initialization Test
 *
 * Tests the complete initialization flow with real plugins.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { InteractiveInitializer } from '../src/core/interactive-initializer.js';
import { PluginRegistry } from '../src/plugin/registry.js';
import { systemDetectorPlugin } from '../src/plugins/system-detector/index.js';
import { gitPlugin } from '../src/plugins/git/index.js';
import { vi } from 'vitest';

console.log('='.repeat(70));
console.log('End-to-End Initialization Test');
console.log('='.repeat(70));
console.log();

// Mock UI components
const mockUI = {
  input: vi.fn()
    .mockResolvedValueOnce('E2E Test Project')         // Project name
    .mockResolvedValueOnce('Testing full init flow')   // Project description
    .mockResolvedValueOnce('git@github.com:test/repo.git'), // Git remote URL

  checkboxList: vi.fn()
    .mockResolvedValueOnce(['system-detector', 'git']), // Select plugins

  confirm: vi.fn()
    .mockResolvedValueOnce(true)   // Auto-commit
    .mockResolvedValueOnce(true)   // Commit separately
    .mockResolvedValueOnce(false)  // Enable sync (NO)
    .mockResolvedValueOnce(true)   // AI git operations
    .mockResolvedValueOnce(true),  // Final confirmation

  radioList: vi.fn(),
};

// Mock the UI module
vi.mock('../src/prompts/components/index.js', () => ({
  checkboxList: mockUI.checkboxList,
  radioList: mockUI.radioList,
  confirm: mockUI.confirm,
  input: mockUI.input,
}));

// Mock chalk
vi.mock('chalk', () => {
  const mockFn: any = (str: string) => str;
  mockFn.bold = mockFn;
  mockFn.cyan = mockFn;
  mockFn.gray = mockFn;
  mockFn.green = mockFn;
  mockFn.green.bold = mockFn;
  return { default: mockFn };
});

// Mock console
global.console.clear = vi.fn();
const originalLog = console.log;
global.console.log = vi.fn((...args) => {
  // Still print to stdout
  originalLog(...args);
});

async function test() {
  const testDir = `/tmp/test-e2e-init-${Date.now()}`;

  try {
    console.log('Test directory:', testDir);
    await fs.mkdir(testDir, { recursive: true });
    console.log();

    // Create registry and register plugins
    console.log('Step 1: Setting up plugins...');
    const registry = new PluginRegistry();
    registry.register(systemDetectorPlugin);
    registry.register(gitPlugin);
    console.log('  ✅ Registered 2 plugins');
    console.log();

    // Create initializer
    console.log('Step 2: Running initialization...');
    const initializer = new InteractiveInitializer(registry);

    await initializer.run(testDir, { force: true });
    console.log();

    // Verify outputs
    console.log('Step 3: Verifying outputs...');
    console.log('-'.repeat(70));

    // Check AGENT.md
    const agentMdPath = path.join(testDir, 'AGENT.md');
    const agentMdExists = await fs.access(agentMdPath).then(() => true).catch(() => false);
    console.log(`  AGENT.md: ${agentMdExists ? '✅ Created' : '❌ Missing'}`);

    if (agentMdExists) {
      const agentMdContent = await fs.readFile(agentMdPath, 'utf-8');
      console.log(`    Size: ${agentMdContent.length} bytes`);
      console.log(`    Has System Info section: ${agentMdContent.includes('## System Information') ? 'Yes' : 'No'}`);
      console.log(`    Has Git section: ${agentMdContent.includes('## Git Operations') ? 'Yes' : 'No'}`);
      console.log(`    Unreplaced placeholders: ${/\{\{[A-Z_]+\}\}/.test(agentMdContent) ? 'Found (bad)' : 'None (good)'}`);
    }

    // Check .agent/ directory
    const agentDirPath = path.join(testDir, '.agent');
    const agentDirExists = await fs.access(agentDirPath).then(() => true).catch(() => false);
    console.log(`  .agent/: ${agentDirExists ? '✅ Created' : '❌ Missing'}`);

    if (agentDirExists) {
      // Check system/info.toon
      const systemInfoPath = path.join(agentDirPath, 'system/info.toon');
      const systemInfoExists = await fs.access(systemInfoPath).then(() => true).catch(() => false);
      console.log(`    system/info.toon: ${systemInfoExists ? '✅' : '❌'}`);

      if (systemInfoExists) {
        const content = await fs.readFile(systemInfoPath, 'utf-8');
        console.log(`      Preview: ${content.split('\n').slice(0, 5).join('\n').substring(0, 100)}...`);
      }

      // Check git/rules.md
      const gitRulesPath = path.join(agentDirPath, 'git/rules.md');
      const gitRulesExists = await fs.access(gitRulesPath).then(() => true).catch(() => false);
      console.log(`    git/rules.md: ${gitRulesExists ? '✅' : '❌'}`);

      // Check git/config.toon
      const gitConfigPath = path.join(agentDirPath, 'git/config.toon');
      const gitConfigExists = await fs.access(gitConfigPath).then(() => true).catch(() => false);
      console.log(`    git/config.toon: ${gitConfigExists ? '✅' : '❌'}`);

      // List all created files
      console.log();
      console.log('  All created files:');
      const files = await listFilesRecursive(agentDirPath);
      files.forEach(file => {
        const relativePath = path.relative(testDir, file);
        console.log(`    - ${relativePath}`);
      });
    }

    console.log();
    console.log('-'.repeat(70));

    // Show AGENT.md content
    if (agentMdExists) {
      const agentMdContent = await fs.readFile(agentMdPath, 'utf-8');
      console.log();
      console.log('AGENT.md Content (first 60 lines):');
      console.log('='.repeat(70));
      const lines = agentMdContent.split('\n').slice(0, 60);
      console.log(lines.join('\n'));
      console.log('  ...');
      console.log('='.repeat(70));
    }

    console.log();
    console.log('='.repeat(70));
    console.log('✅ End-to-End Test PASSED!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error();
    console.error('❌ Test failed:', error);
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log();
      console.log(`Cleaned up: ${testDir}`);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await listFilesRecursive(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

test();
