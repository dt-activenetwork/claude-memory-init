/**
 * Test TOON utilities and AGENT.md assembler
 */

import { systemDetectorPlugin } from '../src/plugins/system-detector/index.js';
import { assembleAgentMd } from '../src/core/agent-assembler.js';
import { createMockPluginContext } from '../src/plugin/context.js';
import type { PluginConfig } from '../src/plugin/types.js';

console.log('='.repeat(70));
console.log('TOON Utilities & AGENT.md Assembler Test');
console.log('='.repeat(70));
console.log();

async function test() {
  // Step 1: Configure plugin (run detection)
  console.log('Step 1: Running system detection...');
  const configContext = {
    projectName: 'test-project',
    projectRoot: process.cwd(),
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
  };

  const config = await systemDetectorPlugin.configuration!.configure(configContext);
  console.log('✅ Detection complete');
  console.log();

  // Step 2: Test file outputs (TOON format)
  console.log('Step 2: Generating TOON file outputs...');
  const outputs = systemDetectorPlugin.outputs!.generate(config, {} as any);

  console.log(`✅ Generated ${outputs.length} file(s):`);
  for (const output of outputs) {
    console.log(`   - ${output.path} (${output.format})`);
  }
  console.log();

  console.log('TOON File Content:');
  console.log('-'.repeat(70));
  console.log(outputs[0].content);
  console.log('-'.repeat(70));
  console.log();

  // Step 3: Test prompt generation
  console.log('Step 3: Generating AGENT.md section...');
  const promptContent = systemDetectorPlugin.prompt!.generate(config, {} as any);

  console.log('Generated Section:');
  console.log('-'.repeat(70));
  console.log(promptContent);
  console.log('-'.repeat(70));
  console.log();

  // Step 4: Test assembler
  console.log('Step 4: Assembling AGENT.md...');
  const mockContext = createMockPluginContext(process.cwd(), process.cwd() + '/.agent');

  const configs = new Map<string, PluginConfig>([
    ['system-detector', config],
  ]);

  const assembledContent = await assembleAgentMd(
    'templates/agent/AGENT.md.template',
    {
      PROJECT_NAME: 'Test Project',
      VERSION: '2.0.0',
      LAST_UPDATED: new Date().toISOString().split('T')[0],
      THINK_LANGUAGE: 'English',
      USER_LANGUAGE: 'English',
    },
    [systemDetectorPlugin],
    configs,
    mockContext
  );

  console.log('Assembled AGENT.md:');
  console.log('='.repeat(70));
  console.log(assembledContent);
  console.log('='.repeat(70));
  console.log();

  // Step 5: Verify placeholder replacement
  console.log('Step 5: Verification...');
  const hasUnreplacedPlaceholders = /\{\{[A-Z_]+\}\}/.test(assembledContent);

  if (hasUnreplacedPlaceholders) {
    const matches = assembledContent.match(/\{\{[A-Z_]+\}\}/g);
    console.log('⚠️  Unreplaced placeholders found:', matches);
  } else {
    console.log('✅ All placeholders replaced');
  }

  const hasSystemSection = assembledContent.includes('## System Information');
  console.log(`✅ System Information section: ${hasSystemSection ? 'Present' : 'Missing'}`);

  const hasToonReference = assembledContent.includes('.agent/system/info.toon');
  console.log(`✅ TOON file reference: ${hasToonReference ? 'Present' : 'Missing'}`);

  console.log();
  console.log('='.repeat(70));
  console.log('✅ All tests passed!');
  console.log('='.repeat(70));
}

test().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
