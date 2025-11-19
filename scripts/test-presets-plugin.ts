/**
 * Test Prompt Presets Plugin
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { promptPresetsPlugin, AVAILABLE_PRESETS } from '../src/plugins/prompt-presets/index.js';
import { createMockPluginContext } from '../src/plugin/context.js';
import type { PluginConfig } from '../src/plugin/types.js';

console.log('='.repeat(70));
console.log('Prompt Presets Plugin Test');
console.log('='.repeat(70));
console.log();

async function test() {
  const testDir = `/tmp/test-presets-${Date.now()}`;
  const agentDir = path.join(testDir, '.agent');

  try {
    await fs.mkdir(agentDir, { recursive: true });

    // Test Scenario 1: Select some presets
    console.log('Scenario 1: Select code-review and documentation');
    console.log('-'.repeat(70));

    const config: PluginConfig = {
      enabled: true,
      options: {
        presets: ['code-review', 'documentation'],
        allow_custom: true,
        custom_dir: 'custom',
      } as any,
    };

    // Test summary
    const summary = promptPresetsPlugin.configuration!.getSummary(config);
    console.log('Summary:');
    summary.forEach((line) => console.log(`  ${line}`));
    console.log();

    // Test prompt generation
    const promptContent = promptPresetsPlugin.prompt!.generate(config, {} as any);
    console.log('Generated AGENT.md section:');
    console.log('-'.repeat(70));
    console.log(promptContent);
    console.log('-'.repeat(70));
    console.log();

    // Test file outputs
    const mockContext = createMockPluginContext(testDir, agentDir);
    const outputs = await promptPresetsPlugin.outputs!.generate(config, mockContext);

    console.log(`Generated files: ${outputs.length}`);
    outputs.forEach((output) => {
      console.log(`  - ${output.path} (${output.format})`);
    });
    console.log();

    // Write files and verify
    console.log('Writing files to disk...');
    for (const output of outputs) {
      const fullPath = path.join(agentDir, output.path);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, output.content);
      console.log(`  ✅ ${output.path}`);
    }
    console.log();

    // Verify preset file content
    const codeReviewPath = path.join(agentDir, 'presets/code-review.md');
    const codeReviewContent = await fs.readFile(codeReviewPath, 'utf-8');
    console.log('code-review.md preview (first 15 lines):');
    console.log('-'.repeat(70));
    console.log(codeReviewContent.split('\n').slice(0, 15).join('\n'));
    console.log('  ...');
    console.log('-'.repeat(70));
    console.log();

    // Test Scenario 2: No presets selected
    console.log('Scenario 2: No presets, custom disabled');
    console.log('-'.repeat(70));

    const emptyConfig: PluginConfig = {
      enabled: false,
      options: {
        presets: [],
        allow_custom: false,
      } as any,
    };

    const emptyPrompt = promptPresetsPlugin.prompt!.generate(emptyConfig, {} as any);
    console.log(`Generated section: ${emptyPrompt === '' ? '(empty)' : emptyPrompt}`);
    console.log();

    // Test Scenario 3: All presets
    console.log('Scenario 3: All 6 presets installed');
    console.log('-'.repeat(70));

    const allPresetsConfig: PluginConfig = {
      enabled: true,
      options: {
        presets: AVAILABLE_PRESETS.map((p) => p.id),
        allow_custom: false,
      } as any,
    };

    const allPresetsSummary = promptPresetsPlugin.configuration!.getSummary(allPresetsConfig);
    console.log('Summary:');
    allPresetsSummary.forEach((line) => console.log(`  ${line}`));
    console.log();

    const allPresetsPrompt = promptPresetsPlugin.prompt!.generate(allPresetsConfig, {} as any);
    console.log('Generated section preview:');
    console.log(allPresetsPrompt.split('\n').slice(0, 20).join('\n'));
    console.log('  ...');
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
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore
    }
  }
}

test();
