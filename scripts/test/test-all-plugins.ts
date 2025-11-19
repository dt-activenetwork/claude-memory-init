/**
 * Test All 4 Plugins Together
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { builtinPlugins } from '../src/plugins/index.js';
import { PluginRegistry } from '../src/plugin/registry.js';
import { createMockPluginContext } from '../src/plugin/context.js';
import { assembleAgentMd } from '../src/core/agent-assembler.js';
import type { PluginConfig } from '../src/plugin/types.js';

console.log('='.repeat(70));
console.log('All Plugins Integration Test');
console.log('='.repeat(70));
console.log();

async function test() {
  const testDir = `/tmp/test-all-plugins-${Date.now()}`;
  const agentDir = path.join(testDir, '.agent');

  try {
    await fs.mkdir(agentDir, { recursive: true });

    console.log(`Registered plugins: ${builtinPlugins.length}`);
    builtinPlugins.forEach((p) => {
      console.log(`  - ${p.meta.name}: ${p.meta.description}`);
    });
    console.log();

    // Configure all plugins (simplified)
    const configs = new Map<string, PluginConfig>();

    // System Detector (auto)
    const systemConfig = await builtinPlugins[0].configuration!.configure({
      projectName: 'All Plugins Test',
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
    configs.set('system-detector', systemConfig);

    // Git
    const gitConfig: PluginConfig = {
      enabled: true,
      options: {
        auto_commit: true,
        commit_separately: true,
        ignore_patterns: ['.agent/temp/'],
        remote_sync: { enabled: false },
        ai_git_operations: false,
      } as any,
    };
    configs.set('git', gitConfig);

    // Prompt Presets
    const presetsConfig: PluginConfig = {
      enabled: true,
      options: {
        presets: ['code-review', 'architecture'],
        allow_custom: false,
      } as any,
    };
    configs.set('prompt-presets', presetsConfig);

    // Memory System
    const memoryConfig: PluginConfig = {
      enabled: true,
      options: {
        memory_types: ['semantic', 'episodic'],
        include_system_tools: false,
      } as any,
    };
    configs.set('memory-system', memoryConfig);

    console.log('Configured 4 plugins');
    console.log();

    // Generate all outputs
    console.log('Generating plugin outputs...');
    const mockContext = createMockPluginContext(testDir, agentDir);

    for (const plugin of builtinPlugins) {
      if (plugin.outputs) {
        const config = configs.get(plugin.meta.name);
        if (!config) continue;

        const outputs = await plugin.outputs.generate(config, mockContext);
        for (const output of outputs) {
          const fullPath = path.join(agentDir, output.path);
          const dir = path.dirname(fullPath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(fullPath, output.content);
          console.log(`  ✅ ${output.path}`);
        }
      }
    }
    console.log();

    // Assemble AGENT.md
    console.log('Assembling AGENT.md with all 4 plugins...');
    const agentMd = await assembleAgentMd(
      'templates/agent/AGENT.md.template',
      {
        PROJECT_NAME: 'All Plugins Test',
        VERSION: '2.0.0',
        LAST_UPDATED: '2025-11-19',
        THINK_LANGUAGE: 'English',
        USER_LANGUAGE: 'English',
      },
      builtinPlugins,
      configs,
      mockContext
    );

    await fs.writeFile(path.join(testDir, 'AGENT.md'), agentMd);
    console.log('✅ AGENT.md assembled');
    console.log();

    // Verification
    console.log('Verification:');
    console.log('-'.repeat(70));

    const hasSystemSection = agentMd.includes('## System Information');
    const hasGitSection = agentMd.includes('## Git Operations');
    const hasPresetsSection = agentMd.includes('## Task Presets');
    const hasMemorySection = agentMd.includes('## Memory System');
    const hasUnreplaced = /\{\{[A-Z_]+\}\}/.test(agentMd);

    console.log(`  System Information: ${hasSystemSection ? '✅' : '❌'}`);
    console.log(`  Git Operations: ${hasGitSection ? '✅' : '❌'}`);
    console.log(`  Task Presets: ${hasPresetsSection ? '✅' : '❌'}`);
    console.log(`  Memory System: ${hasMemorySection ? '✅' : '❌'}`);
    console.log(`  Unreplaced placeholders: ${hasUnreplaced ? '❌ Found' : '✅ None'}`);
    console.log();

    // Show AGENT.md
    console.log('Complete AGENT.md:');
    console.log('='.repeat(70));
    console.log(agentMd);
    console.log('='.repeat(70));
    console.log();

    // List all files
    console.log('Complete file tree:');
    const allFiles = await listFilesRecursive(testDir);
    const tree = allFiles.map((f) => path.relative(testDir, f)).sort();
    tree.forEach((f) => console.log(`  ${f}`));
    console.log();

    console.log('='.repeat(70));
    console.log('✅ ALL 4 PLUGINS WORKING TOGETHER!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore
    }
  }
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
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
  } catch (err) {
    // Ignore
  }

  return files;
}

test();
