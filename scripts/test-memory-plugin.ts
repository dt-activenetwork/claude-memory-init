/**
 * Test Memory System Plugin
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { memorySystemPlugin } from '../src/plugins/memory-system/index.js';
import { createMockPluginContext } from '../src/plugin/context.js';
import type { PluginConfig } from '../src/plugin/types.js';

console.log('='.repeat(70));
console.log('Memory System Plugin Test');
console.log('='.repeat(70));
console.log();

async function test() {
  const testDir = `/tmp/test-memory-${Date.now()}`;
  const agentDir = path.join(testDir, '.agent');

  try {
    await fs.mkdir(agentDir, { recursive: true });

    // Configure with all memory types
    const config: PluginConfig = {
      enabled: true,
      options: {
        memory_types: ['semantic', 'episodic', 'procedural', 'system'],
        include_system_tools: true,
      } as any,
    };

    console.log('Configuration:');
    console.log('  Memory types:', config.options.memory_types);
    console.log('  System tools:', config.options.include_system_tools);
    console.log();

    // Test summary
    const summary = memorySystemPlugin.configuration!.getSummary(config);
    console.log('Summary:');
    summary.forEach((line) => console.log(`  ${line}`));
    console.log();

    // Test prompt generation
    const promptContent = memorySystemPlugin.prompt!.generate(config, {} as any);
    console.log('Generated AGENT.md section:');
    console.log('-'.repeat(70));
    console.log(promptContent);
    console.log('-'.repeat(70));
    console.log();

    // Test file outputs
    const mockContext = createMockPluginContext(testDir, agentDir);
    const outputs = await memorySystemPlugin.outputs!.generate(config, mockContext);

    console.log(`Generated files: ${outputs.length}`);
    outputs.forEach((output) => {
      console.log(`  - ${output.path} (${output.format})`);
    });
    console.log();

    // Write files
    console.log('Writing files to disk...');
    for (const output of outputs) {
      const fullPath = path.join(agentDir, output.path);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, output.content);
    }
    console.log('✅ All files written');
    console.log();

    // Verify workflow.md
    const workflowPath = path.join(agentDir, 'memory/workflow.md');
    const workflowContent = await fs.readFile(workflowPath, 'utf-8');
    console.log('workflow.md preview (first 30 lines):');
    console.log('-'.repeat(70));
    console.log(workflowContent.split('\n').slice(0, 30).join('\n'));
    console.log('  ...');
    console.log('-'.repeat(70));
    console.log();

    // Verify tags.toon
    const tagsPath = path.join(agentDir, 'memory/index/tags.toon');
    const tagsContent = await fs.readFile(tagsPath, 'utf-8');
    console.log('tags.toon:');
    console.log('-'.repeat(70));
    console.log(tagsContent);
    console.log('-'.repeat(70));
    console.log();

    // Verify topics.toon
    const topicsPath = path.join(agentDir, 'memory/index/topics.toon');
    const topicsContent = await fs.readFile(topicsPath, 'utf-8');
    console.log('topics.toon:');
    console.log('-'.repeat(70));
    console.log(topicsContent);
    console.log('-'.repeat(70));
    console.log();

    // List all created files
    console.log('All created files:');
    const allFiles = await listFilesRecursive(path.join(agentDir, 'memory'));
    const relativeFiles = allFiles.map((f) => path.relative(agentDir, f)).sort();
    relativeFiles.forEach((f) => console.log(`  - ${f}`));
    console.log();

    console.log('='.repeat(70));
    console.log('✅ All tests passed!');
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
