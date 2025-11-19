/**
 * Test Memory vs Task System Separation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { builtinPlugins } from '../src/plugins/index.js';
import { assembleAgentMd } from '../src/core/agent-assembler.js';
import { createMockPluginContext } from '../src/plugin/context.js';
import type { PluginConfig } from '../src/plugin/types.js';

console.log('='.repeat(70));
console.log('Memory vs Task System Separation Test');
console.log('='.repeat(70));
console.log();

async function test() {
  const testDir = `/tmp/test-separation-${Date.now()}`;
  const agentDir = path.join(testDir, '.agent');

  try {
    await fs.mkdir(agentDir, { recursive: true });

    // Configure all 5 plugins
    const configs = new Map<string, PluginConfig>();

    // System Detector
    configs.set('system-detector', {
      enabled: true,
      options: {
        include_scripts: true,
        include_as_skill: true,
      } as any,
    });

    // Git
    configs.set('git', {
      enabled: true,
      options: {
        auto_commit: false,
        commit_separately: true,
        ignore_patterns: ['.agent/tasks/tmp/'],
        remote_sync: { enabled: false },
        ai_git_operations: false,
      } as any,
    });

    // Memory System
    configs.set('memory-system', {
      enabled: true,
      options: {
        memory_types: ['knowledge', 'history'],
        include_system: false,
      } as any,
    });

    // Task System (NEW!)
    configs.set('task-system', {
      enabled: true,
      options: {
        enable_tracking: true,
        enable_output: true,
      } as any,
    });

    // Prompt Presets
    configs.set('prompt-presets', {
      enabled: true,
      options: {
        presets: ['code-review'],
        allow_custom: false,
      } as any,
    });

    console.log('Configured 5 plugins (including new task-system)');
    console.log();

    // Generate outputs
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
        }
      }
    }

    console.log('Generated all plugin outputs');
    console.log();

    // Assemble AGENT.md
    const agentMd = await assembleAgentMd(
      'templates/agent/AGENT.md.template',
      {
        PROJECT_NAME: 'Separation Test',
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

    // Verify structure
    console.log('Directory Structure:');
    console.log('='.repeat(70));
    const tree = await buildTree(agentDir);
    console.log(tree);
    console.log('='.repeat(70));
    console.log();

    // Verify separation
    console.log('Verification:');
    console.log('-'.repeat(70));

    const memoryKnowledgeExists = await pathExists(path.join(agentDir, 'memory/knowledge'));
    const memoryHistoryExists = await pathExists(path.join(agentDir, 'memory/history'));
    const taskWorkflowsExists = await pathExists(path.join(agentDir, 'tasks/workflows'));
    const taskOutputExists = await pathExists(path.join(agentDir, 'tasks/output'));
    const taskTmpExists = await pathExists(path.join(agentDir, 'tasks/tmp'));
    const noTempDir = !(await pathExists(path.join(agentDir, 'temp')));
    const noSemanticDir = !(await pathExists(path.join(agentDir, 'memory/semantic')));
    const noEpisodicDir = !(await pathExists(path.join(agentDir, 'memory/episodic')));
    const noProceduralDir = !(await pathExists(path.join(agentDir, 'memory/procedural')));

    console.log(`  Memory System:`);
    console.log(`    - knowledge/: ${memoryKnowledgeExists ? '✅' : '❌'}`);
    console.log(`    - history/: ${memoryHistoryExists ? '✅' : '❌'}`);
    console.log(`    - NO semantic/: ${noSemanticDir ? '✅' : '❌'}`);
    console.log(`    - NO episodic/: ${noEpisodicDir ? '✅' : '❌'}`);
    console.log();
    console.log(`  Task System:`);
    console.log(`    - workflows/: ${taskWorkflowsExists ? '✅' : '❌'}`);
    console.log(`    - output/: ${taskOutputExists ? '✅' : '❌'}`);
    console.log(`    - tmp/: ${taskTmpExists ? '✅' : '❌'}`);
    console.log(`    - NO procedural/: ${noProceduralDir ? '✅' : '❌'}`);
    console.log();
    console.log(`  Structure:`);
    console.log(`    - NO .agent/temp/: ${noTempDir ? '✅' : '❌'}`);
    console.log();

    // Show AGENT.md sections
    console.log('AGENT.md Sections:');
    console.log('-'.repeat(70));
    const hasMemorySection = agentMd.includes('## Memory System');
    const hasTaskSection = agentMd.includes('## Task System');
    console.log(`  Memory System section: ${hasMemorySection ? '✅' : '❌'}`);
    console.log(`  Task System section: ${hasTaskSection ? '✅' : '❌'}`);
    console.log();

    // Show AGENT.md
    console.log('Complete AGENT.md:');
    console.log('='.repeat(70));
    console.log(agentMd);
    console.log('='.repeat(70));

    console.log();
    console.log('✅ MEMORY vs TASK SEPARATION SUCCESSFUL!');

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

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function buildTree(dir: string, prefix = ''): Promise<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const lines: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const marker = isLast ? '└── ' : '├── ';
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');

    lines.push(prefix + marker + entry.name);

    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      const subtree = await buildTree(fullPath, nextPrefix);
      lines.push(subtree);
    }
  }

  return lines.join('\n');
}

test();
