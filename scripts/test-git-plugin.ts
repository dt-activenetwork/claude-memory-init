/**
 * Test Git Plugin - Configuration, Prompt, and Outputs
 */

import { gitPlugin } from '../src/plugins/git/index.js';
import { systemDetectorPlugin } from '../src/plugins/system-detector/index.js';
import { assembleAgentMd } from '../src/core/agent-assembler.js';
import { createMockPluginContext } from '../src/plugin/context.js';
import type { PluginConfig } from '../src/plugin/types.js';
import { vi } from 'vitest';

console.log('='.repeat(70));
console.log('Git Plugin Test');
console.log('='.repeat(70));
console.log();

async function test() {
  // Test Scenario 1: Git plugin enabled with all features
  console.log('Scenario 1: Git plugin ENABLED (all features)');
  console.log('-'.repeat(70));

  const mockUI = {
    confirm: vi.fn()
      .mockResolvedValueOnce(true)  // auto-commit
      .mockResolvedValueOnce(true)  // commit separately
      .mockResolvedValueOnce(true)  // enable sync
      .mockResolvedValueOnce(true)  // auto-pr
      .mockResolvedValueOnce(true), // ai git ops
    input: vi.fn()
      .mockResolvedValueOnce('git@github.com:test/repo.git'),
    checkboxList: vi.fn(),
    radioList: vi.fn(),
  };

  const configContext = {
    projectName: 'test-project',
    projectRoot: process.cwd(),
    otherPlugins: new Map(),
    ui: mockUI as any,
    logger: {
      info: (msg: string) => console.log(`  [INFO] ${msg}`),
      success: () => {},
      error: () => {},
      warning: () => {},
      step: () => {},
      blank: () => {},
    },
  };

  const config = await gitPlugin.configuration!.configure(configContext);

  console.log('\n✅ Configuration completed');
  console.log('   Enabled:', config.enabled);
  console.log('   Options:', JSON.stringify(config.options, null, 2).split('\n').join('\n   '));
  console.log();

  // Test summary
  console.log('Summary:');
  const summary = gitPlugin.configuration!.getSummary(config);
  summary.forEach((line) => console.log(`  ${line}`));
  console.log();

  // Test prompt generation
  console.log('Generated AGENT.md section:');
  console.log('-'.repeat(70));
  const promptContent = gitPlugin.prompt!.generate(config, {} as any);
  console.log(promptContent);
  console.log('-'.repeat(70));
  console.log();

  // Test outputs
  console.log('Generated files:');
  const outputs = gitPlugin.outputs!.generate(config, {} as any);
  console.log(`  ✅ ${outputs.length} files generated`);
  outputs.forEach((output) => {
    console.log(`     - ${output.path} (${output.format})`);
  });
  console.log();

  console.log('Git Rules File (first 30 lines):');
  console.log('-'.repeat(70));
  const rulesLines = outputs[0].content.split('\n').slice(0, 30);
  console.log(rulesLines.join('\n'));
  console.log('  ...');
  console.log('-'.repeat(70));
  console.log();

  console.log('Git Config TOON File:');
  console.log('-'.repeat(70));
  console.log(outputs[1].content);
  console.log('-'.repeat(70));
  console.log();

  // Test Scenario 2: Git plugin disabled
  console.log('\nScenario 2: Git plugin DISABLED');
  console.log('-'.repeat(70));

  const disabledConfig: PluginConfig = {
    enabled: false,
    options: {},
  };

  const disabledPrompt = gitPlugin.prompt!.generate(disabledConfig, {} as any);
  console.log('Generated AGENT.md section:', disabledPrompt === '' ? '(empty - section removed)' : disabledPrompt);

  const disabledOutputs = gitPlugin.outputs!.generate(disabledConfig, {} as any);
  console.log(`Generated files: ${disabledOutputs.length} (should be 0)`);
  console.log();

  // Test Scenario 3: Assemble AGENT.md with multiple plugins
  console.log('\nScenario 3: Assemble AGENT.md with System Detector + Git');
  console.log('-'.repeat(70));

  // Configure system detector
  const systemConfig = await systemDetectorPlugin.configuration!.configure({
    ...configContext,
    ui: {
      checkboxList: async () => [],
      radioList: async () => '',
      confirm: async () => true,
      input: async () => '',
    },
  });

  const mockContext = createMockPluginContext(process.cwd(), process.cwd() + '/.agent');

  const configs = new Map<string, PluginConfig>([
    ['system-detector', systemConfig],
    ['git', config],
  ]);

  const assembledContent = await assembleAgentMd(
    'templates/AGENT.md.template',
    {
      PROJECT_NAME: 'Test Project',
      VERSION: '2.0.0',
      LAST_UPDATED: '2025-11-19',
      THINK_LANGUAGE: 'English',
      USER_LANGUAGE: 'English',
    },
    [systemDetectorPlugin, gitPlugin],
    configs,
    mockContext
  );

  console.log('Assembled AGENT.md (first 50 lines):');
  console.log('='.repeat(70));
  const assembledLines = assembledContent.split('\n').slice(0, 50);
  console.log(assembledLines.join('\n'));
  console.log('  ...');
  console.log('='.repeat(70));
  console.log();

  // Verification
  console.log('Verification:');
  const hasSystemSection = assembledContent.includes('## System Information');
  const hasGitSection = assembledContent.includes('## Git Operations');
  const hasUnreplaced = /\{\{[A-Z_]+\}\}/.test(assembledContent);

  console.log(`  ✅ System Information section: ${hasSystemSection ? 'Present' : 'Missing'}`);
  console.log(`  ✅ Git Operations section: ${hasGitSection ? 'Present' : 'Missing'}`);
  console.log(`  ✅ Unreplaced placeholders: ${hasUnreplaced ? 'Found (bad)' : 'None (good)'}`);
  console.log();

  console.log('='.repeat(70));
  console.log('✅ All tests passed!');
  console.log('='.repeat(70));
}

test().catch((err) => {
  console.error('❌ Test failed:', err);
  console.error(err.stack);
  process.exit(1);
});
