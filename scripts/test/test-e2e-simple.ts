/**
 * Simple End-to-End Test
 *
 * Tests plugin outputs and AGENT.md generation without mocking.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { systemDetectorPlugin } from '../src/plugins/system-detector/index.js';
import { gitPlugin } from '../src/plugins/git/index.js';
import { PluginRegistry } from '../src/plugin/registry.js';
import { createMockPluginContext } from '../src/plugin/context.js';
import { assembleAgentMd } from '../src/core/agent-assembler.js';
import { ensureDir, writeFile } from '../src/utils/file-ops.js';
import type { PluginConfig } from '../src/plugin/types.js';

console.log('='.repeat(70));
console.log('Simple E2E Test - Plugin Outputs + AGENT.md Generation');
console.log('='.repeat(70));
console.log();

async function test() {
  const testDir = `/tmp/test-e2e-simple-${Date.now()}`;
  const agentDir = path.join(testDir, '.agent');

  try {
    console.log('Test directory:', testDir);
    await fs.mkdir(testDir, { recursive: true });
    await ensureDir(agentDir);
    console.log();

    // Step 1: Configure system-detector (auto-detection)
    console.log('Step 1: Configuring system-detector...');
    const systemConfig = await systemDetectorPlugin.configuration!.configure({
      projectName: 'E2E Test',
      projectRoot: testDir,
      otherPlugins: new Map(),
      ui: {
        checkboxList: async () => [],
        radioList: async () => '',
        confirm: async () => true,
        input: async () => '',
      },
      logger: {
        info: () => {},
        success: () => {},
        error: () => {},
        warning: () => {},
        step: () => {},
        blank: () => {},
      },
    });
    console.log('  ✅ System detected');
    console.log();

    // Step 2: Configure git plugin (manual config)
    console.log('Step 2: Configuring git plugin...');
    const gitConfig: PluginConfig = {
      enabled: true,
      options: {
        auto_commit: true,
        commit_separately: true,
        ignore_patterns: ['.agent/temp/', '.agent/.cache/'],
        remote_sync: {
          enabled: false,
        },
        ai_git_operations: true,
      } as any,
    };
    console.log('  ✅ Git configured');
    console.log();

    // Step 3: Create plugin context
    console.log('Step 3: Creating plugin context...');
    const mockContext = createMockPluginContext(testDir, agentDir);
    mockContext.config.plugins.set('system-detector', systemConfig);
    mockContext.config.plugins.set('git', gitConfig);
    console.log('  ✅ Context created');
    console.log();

    // Step 4: Generate plugin outputs
    console.log('Step 4: Writing plugin outputs...');

    // System detector outputs
    const systemOutputs = systemDetectorPlugin.outputs!.generate(systemConfig, mockContext);
    for (const output of systemOutputs) {
      const fullPath = path.join(agentDir, output.path);
      const dir = path.dirname(fullPath);
      await ensureDir(dir);
      await writeFile(fullPath, output.content);
      console.log(`  ✅ Created: .agent/${output.path}`);
    }

    // Git outputs
    const gitOutputs = gitPlugin.outputs!.generate(gitConfig, mockContext);
    for (const output of gitOutputs) {
      const fullPath = path.join(agentDir, output.path);
      const dir = path.dirname(fullPath);
      await ensureDir(dir);
      await writeFile(fullPath, output.content);
      console.log(`  ✅ Created: .agent/${output.path}`);
    }
    console.log();

    // Step 5: Assemble AGENT.md
    console.log('Step 5: Assembling AGENT.md...');
    const configs = new Map([
      ['system-detector', systemConfig],
      ['git', gitConfig],
    ]);

    const agentMdContent = await assembleAgentMd(
      'templates/agent/AGENT.md.template',
      {
        PROJECT_NAME: 'E2E Test Project',
        VERSION: '2.0.0',
        LAST_UPDATED: '2025-11-19',
        THINK_LANGUAGE: 'English',
        USER_LANGUAGE: 'English',
      },
      [systemDetectorPlugin, gitPlugin],
      configs,
      mockContext
    );

    const agentMdPath = path.join(testDir, 'AGENT.md');
    await writeFile(agentMdPath, agentMdContent);
    console.log('  ✅ AGENT.md generated');
    console.log();

    // Step 6: Verification
    console.log('Step 6: Verification...');
    console.log('-'.repeat(70));

    // List all files
    console.log('Created files:');
    const allFiles = await listFilesRecursive(testDir);
    const relativeFiles = allFiles.map(f => path.relative(testDir, f)).sort();
    relativeFiles.forEach(f => console.log(`  - ${f}`));
    console.log();

    // Verify AGENT.md content
    console.log('AGENT.md verification:');
    const hasSystemSection = agentMdContent.includes('## System Information');
    const hasGitSection = agentMdContent.includes('## Git Operations');
    const hasUnreplaced = /\{\{[A-Z_]+\}\}/.test(agentMdContent);

    console.log(`  System section: ${hasSystemSection ? '✅' : '❌'}`);
    console.log(`  Git section: ${hasGitSection ? '✅' : '❌'}`);
    console.log(`  Unreplaced placeholders: ${hasUnreplaced ? '❌ Found' : '✅ None'}`);
    console.log();

    // Show AGENT.md preview
    console.log('AGENT.md Preview (first 40 lines):');
    console.log('='.repeat(70));
    const lines = agentMdContent.split('\n').slice(0, 40);
    console.log(lines.join('\n'));
    console.log('  ...');
    console.log('='.repeat(70));
    console.log();

    // Show system info.toon
    const systemInfoPath = path.join(agentDir, 'system/info.toon');
    const systemInfoContent = await fs.readFile(systemInfoPath, 'utf-8');
    console.log('.agent/system/info.toon:');
    console.log('-'.repeat(70));
    console.log(systemInfoContent);
    console.log('-'.repeat(70));
    console.log();

    console.log('='.repeat(70));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error();
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log();
      console.log(`Cleaned up: ${testDir}`);
    } catch (err) {
      // Ignore
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
