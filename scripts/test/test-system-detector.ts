/**
 * Manual test script for System Detector Plugin
 *
 * This script demonstrates the plugin running in a real environment.
 */

import { systemDetectorPlugin } from '../src/plugins/system-detector/index.js';
import { createMockPluginContext } from '../src/plugin/context.js';
import type { ConfigurationContext } from '../src/plugin/types.js';

console.log('='.repeat(60));
console.log('System Detector Plugin - Manual Test');
console.log('='.repeat(60));
console.log();

// Create mock configuration context
const mockConfigContext: ConfigurationContext = {
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
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
    error: (msg: string) => console.log(`[ERROR] ${msg}`),
    warning: (msg: string) => console.log(`[WARNING] ${msg}`),
    step: (n: number, msg: string) => console.log(`[STEP ${n}] ${msg}`),
    blank: () => console.log(),
  },
};

async function testPlugin() {
  console.log('1. Testing Plugin Configuration (Detection)...');
  console.log('-'.repeat(60));

  try {
    const config = await systemDetectorPlugin.configuration!.configure(mockConfigContext);

    console.log('✅ Configuration completed');
    console.log('   Enabled:', config.enabled);
    console.log('   Include in config:', config.options.include_in_config);
    console.log();

    // Extract detection result
    const result: any = config.options.detection_result;

    console.log('2. Detection Results:');
    console.log('-'.repeat(60));

    // OS Information
    console.log('OS Information:');
    console.log(`   Type: ${result.os.type}`);
    console.log(`   Name: ${result.os.name}`);
    console.log(`   Version: ${result.os.version}`);
    console.log(`   MSYS2: ${result.os.is_msys2}`);
    console.log();

    // Python Information
    if (result.python) {
      console.log('Python Information:');
      console.log(`   Version: ${result.python.version}`);
      console.log(`   Package Manager: ${result.python.package_manager}`);
      console.log();
    } else {
      console.log('Python: Not detected');
      console.log();
    }

    // Node.js Information
    if (result.node) {
      console.log('Node.js Information:');
      console.log(`   Version: ${result.node.version}`);
      console.log(`   Package Manager: ${result.node.package_manager}`);
      console.log();
    } else {
      console.log('Node.js: Not detected');
      console.log();
    }

    console.log('3. Testing Summary Generation...');
    console.log('-'.repeat(60));

    const summary = systemDetectorPlugin.configuration!.getSummary(config);
    console.log('Summary:', summary[0]);
    console.log();

    console.log('4. Testing Execute Hook (Shared Context)...');
    console.log('-'.repeat(60));

    const pluginContext = createMockPluginContext(process.cwd(), process.cwd() + '/claude');

    // Add config to context
    pluginContext.config.plugins.set('system-detector', config);

    // Execute hook
    await systemDetectorPlugin.hooks!.execute!(pluginContext);

    // Check shared context
    const sharedInfo = pluginContext.shared.get('system_info');
    console.log('✅ Detection result stored in shared context');
    console.log('   Shared context keys:', Array.from(pluginContext.shared.keys()));
    console.log();

    console.log('='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testPlugin();
