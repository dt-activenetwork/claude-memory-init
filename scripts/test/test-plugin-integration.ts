/**
 * Test plugin integration with InteractiveInitializer
 *
 * This script demonstrates how the System Detector plugin works
 * within the full initialization flow.
 */

import { InteractiveInitializer } from '../src/core/interactive-initializer.js';
import { PluginRegistry } from '../src/plugin/registry.js';
import { systemDetectorPlugin } from '../src/plugins/system-detector/index.js';
import * as ui from '../src/prompts/components/index.js';
import { vi } from 'vitest';

console.log('='.repeat(60));
console.log('Plugin Integration Test');
console.log('='.repeat(60));
console.log();

// Mock UI components
const mockUI = {
  checkboxList: vi.fn(),
  radioList: vi.fn(),
  confirm: vi.fn(),
  input: vi.fn(),
};

// Setup mocks
(mockUI.input as any)
  .mockResolvedValueOnce('Test Project')
  .mockResolvedValueOnce('Testing system detector plugin integration');

(mockUI.checkboxList as any).mockResolvedValueOnce(['system-detector']);

(mockUI.confirm as any).mockResolvedValueOnce(true);

// Mock the UI module
vi.mock('../src/prompts/components/index.js', () => ({
  checkboxList: mockUI.checkboxList,
  radioList: mockUI.radioList,
  confirm: mockUI.confirm,
  input: mockUI.input,
}));

// Mock console.clear and console.log
global.console.clear = vi.fn();
const originalLog = console.log;
global.console.log = vi.fn((...args) => {
  // Still print to stdout
  originalLog(...args);
});

async function testIntegration() {
  console.log('1. Creating Plugin Registry...');
  const registry = new PluginRegistry();

  console.log('2. Registering System Detector Plugin...');
  registry.register(systemDetectorPlugin);

  console.log('3. Creating InteractiveInitializer...');
  const initializer = new InteractiveInitializer(registry);

  console.log('4. Running initialization flow...');
  console.log('-'.repeat(60));
  console.log();

  try {
    const testDir = '/tmp/test-plugin-integration-' + Date.now();

    // This will:
    // - Collect project info (mocked)
    // - Select plugins (mocked - will select system-detector)
    // - Configure system-detector (auto-detect)
    // - Show summary (mocked confirmation)
    // - Execute initialization
    await initializer.run(testDir, { force: true });

    console.log();
    console.log('-'.repeat(60));
    console.log('✅ Integration test completed successfully!');
    console.log();
    console.log('Expected behavior:');
    console.log('  - System detector ran silently (no prompts)');
    console.log('  - Detection results shown in summary');
    console.log('  - Results stored in shared context');
  } catch (error) {
    console.error();
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

testIntegration();
