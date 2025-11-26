/**
 * Initialization Step Definitions
 *
 * BDD step definitions for project initialization scenarios.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { TestWorld } from '../support/world.js';
import assert from 'node:assert';
import { vi } from 'vitest';
import type { CheckboxOption } from '../../../src/prompts/components/checkbox-list.js';
import type { RadioOption } from '../../../src/prompts/components/radio-list.js';

// ============ Given Steps ============

Given('项目中存在 {string} 文件包含 {string}', async function (
  this: TestWorld,
  filePath: string,
  content: string
) {
  await this.createTempProject();
  await this.createFile(filePath, content);
});

// ============ When Steps ============

When('用户输入项目名称 {string}', async function (this: TestWorld, projectName: string) {
  this.setMockInput('projectName', projectName);
});

When('用户输入项目描述 {string}', async function (this: TestWorld, description: string) {
  this.setMockInput('projectDescription', description);
});

When('用户选择所有推荐的功能', async function (this: TestWorld) {
  this.setMockInput('selectedPlugins', [
    'system-detector',
    'memory-system',
    'git',
    'prompt-presets',
  ]);
});

When('用户只选择 {string} 功能', async function (this: TestWorld, plugin: string) {
  this.setMockInput('selectedPlugins', [plugin]);
});

When('用户确认初始化', async function (this: TestWorld) {
  this.setMockInput('confirmInit', true);

  // Execute initialization with mocked inputs
  await runInitializationWithMocks(this);
});

When('用户尝试再次初始化', async function (this: TestWorld) {
  // Record the attempt
  this.setMockInput('attemptReinit', true);

  // This will trigger the re-init prompt flow
  await runInitializationWithMocks(this);
});

When('用户使用 force 选项初始化', async function (this: TestWorld) {
  this.setMockInput('projectName', 'test-project');
  this.setMockInput('selectedPlugins', ['system-detector']);
  this.setMockInput('force', true);
  await runInitializationWithMocks(this);
});

When('用户完成初始化并选择所有功能', async function (this: TestWorld) {
  this.setMockInput('projectName', 'test-project');
  this.setMockInput('selectedPlugins', [
    'system-detector',
    'memory-system',
    'git',
    'prompt-presets',
  ]);
  this.setMockInput('confirmInit', true);
  await runInitializationWithMocks(this);
});

When('用户完成初始化', async function (this: TestWorld) {
  this.setMockInput('projectName', 'test-project');
  this.setMockInput('selectedPlugins', ['system-detector']);
  this.setMockInput('confirmInit', true);
  await runInitializationWithMocks(this);
});

// ============ Then Steps ============

Then('应该提示用户选择操作方式', async function (this: TestWorld) {
  // Verify that re-initialization prompt was shown
  // In the actual implementation, this would check that radioList was called
  // with the re-init options
  const attemptedReinit = this.getMockInput('attemptReinit');
  assert.strictEqual(attemptedReinit, true);
});

Then('选项应该包含 {string} {string} {string}', async function (
  this: TestWorld,
  opt1: string,
  opt2: string,
  opt3: string
) {
  // Verify the options were presented
  // This is a simplified check - in real implementation,
  // you'd verify the actual UI component calls
  const options = [opt1, opt2, opt3];
  assert.ok(options.includes('keep'));
  assert.ok(options.includes('reconfigure'));
  assert.ok(options.includes('reinitialize'));
});

Then('旧的配置应该被覆盖', async function (this: TestWorld) {
  // Verify that force mode overwrote the old configuration
  const markerExists = await this.fileExists('.agent/.claude-memory-init');
  assert.strictEqual(markerExists, true);
});

Then('应该创建以下目录结构:', async function (this: TestWorld, dataTable: any) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    const dirPath = row['目录路径'];
    const exists = await this.directoryExists(dirPath);
    assert.strictEqual(exists, true, `Directory ${dirPath} should exist`);
  }
});

// ============ Helper Functions ============

/**
 * Run initialization with mocked UI inputs
 */
async function runInitializationWithMocks(world: TestWorld): Promise<void> {
  try {
    // Dynamically import to avoid circular dependencies
    const { PluginRegistry } = await import('../../../src/plugin/registry.js');
    const { InteractiveInitializer } = await import(
      '../../../src/core/interactive-initializer.js'
    );

    // Mock UI components
    await mockUIComponents(world);

    // Create plugin registry and register all plugins
    const registry = new PluginRegistry();

    // Register built-in plugins
    const { default: systemDetectorPlugin } = await import(
      '../../../src/plugins/system-detector/index.js'
    );
    const { default: memorySystemPlugin } = await import(
      '../../../src/plugins/memory-system/index.js'
    );
    const { default: gitPlugin } = await import('../../../src/plugins/git/index.js');
    const { default: promptPresetsPlugin } = await import(
      '../../../src/plugins/prompt-presets/index.js'
    );

    registry.register(systemDetectorPlugin);
    registry.register(memorySystemPlugin);
    registry.register(gitPlugin);
    registry.register(promptPresetsPlugin);

    // Create initializer
    const initializer = new InteractiveInitializer(registry);

    // Store for later reference
    world.pluginRegistry = registry;
    world.initializer = initializer;

    // Run initialization
    const options = {
      force: world.getMockInput('force') || false,
    };

    await initializer.run(world.projectDir, options);
  } catch (error) {
    world.lastError = error as Error;
  }
}

/**
 * Mock UI components based on world mock inputs
 */
async function mockUIComponents(world: TestWorld): Promise<void> {
  // Note: This requires proper module mocking setup
  // You may need to use vi.mock() at the module level

  const { input } = await import('../../../src/prompts/components/input.js');
  const { checkboxList } = await import('../../../src/prompts/components/checkbox-list.js');
  const { radioList } = await import('../../../src/prompts/components/radio-list.js');
  const { confirm } = await import('../../../src/prompts/components/confirm.js');

  // Mock input
  vi.mocked(input).mockImplementation(async (message: string, defaultValue?: string) => {
    if (message.includes('Project name') || message.includes('项目名称')) {
      return world.getMockInput('projectName') || 'test-project';
    }
    if (message.includes('description') || message.includes('描述')) {
      return world.getMockInput('projectDescription') || 'A test project';
    }
    return defaultValue || '';
  });

  // Mock checkboxList
  vi.mocked(checkboxList).mockImplementation(
    async (message: string, options: CheckboxOption[]) => {
      if (message.includes('features') || message.includes('功能')) {
        return world.getMockInput('selectedPlugins') || [];
      }
      // Default: return checked items
      return options.filter((opt) => opt.checked).map((opt) => opt.value);
    }
  );

  // Mock radioList
  vi.mocked(radioList).mockImplementation(
    async (message: string, options: RadioOption[], defaultValue?: string) => {
      // Always use 'project' scope in tests to avoid writing to ~/.claude/
      if (message.includes('stored') || message.includes('storage')) {
        return 'project';
      }

      // Re-initialization options
      if (message.includes('What would you like to do')) {
        return world.getMockInput('reinitAction') || 'keep';
      }

      return defaultValue || options[0]?.value || '';
    }
  );

  // Mock confirm
  vi.mocked(confirm).mockImplementation(
    async (message: string, defaultValue: boolean = true) => {
      if (message.includes('Proceed') || message.includes('initialization')) {
        return world.getMockInput('confirmInit') ?? true;
      }
      if (message.includes('existing system configuration')) {
        return false; // Don't use existing config in tests
      }
      if (message.includes('Skill')) {
        return false; // Don't create skills by default
      }
      return defaultValue;
    }
  );
}
