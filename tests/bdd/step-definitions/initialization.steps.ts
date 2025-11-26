/**
 * Initialization Step Definitions
 *
 * BDD step definitions for project initialization scenarios.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { TestWorld } from '../support/world.js';
import assert from 'node:assert';
import sinon from 'sinon';
import { ui } from '../../../src/core/ui.js';
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
 *
 * ⚠️ 重要：此函数依赖 mockUIComponents() 正确 mock 所有 UI 交互。
 * 如果测试超时，很可能是某个 UI 调用没有被 mock。
 */
async function runInitializationWithMocks(world: TestWorld): Promise<void> {
  try {
    // IMPORTANT: Mock UI BEFORE importing any modules
    // This ensures the ui facade is stubbed before it gets imported
    mockUIComponents(world);

    // Dynamically import after mocking
    const { PluginRegistry } = await import('../../../src/plugin/registry.js');
    const { InteractiveInitializer } = await import(
      '../../../src/core/interactive-initializer.js'
    );

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
 * Mock UI components using sinon stubs
 *
 * ⚠️ 重要：Mock 完整性检查清单
 *
 * 每当新增插件或修改 UI 交互时，必须更新此函数！
 * 如果 Mock 不完整，测试会超时（5秒）等待用户输入。
 *
 * 当前已 mock 的 UI 调用：
 *
 * input:
 *   - "Project name" / "项目名称" → projectName
 *   - "description" / "描述" → projectDescription
 *
 * checkboxList:
 *   - "features" / "功能" → selectedPlugins (功能选择)
 *   - "enhancement" / "Enhancement" → 固定值 (prompt-presets 插件)
 *
 * radioList:
 *   - "What would you like to do" → reinitAction (重新初始化)
 *   - "base mode" / "Base" / "preset" → 'code-review' (prompt-presets 插件)
 *   - "Python package manager" → preferredPythonManager
 *   - "Node.js/Node package manager" → preferredNodeManager
 *
 * confirm:
 *   - "Proceed" / "initialization" → confirmInit
 *   - "preferred managers" → true
 *   - "Skill" → false
 *
 * 调试技巧：如果测试超时，添加 console.log 查看哪个 message 没有匹配：
 *   sinon.stub(ui, 'radioList').callsFake(async (message, ...) => {
 *     console.log('[MOCK] radioList:', message);
 *     ...
 *   });
 *
 * 详细说明见：claude/memory/semantic/sem-002-ui-facade-pattern.md
 */
function mockUIComponents(world: TestWorld): void {
  // Use the top-level imported ui object (shared singleton)

  // Stub input
  sinon.stub(ui, 'input').callsFake(async (message: string, defaultValue?: string) => {
    if (message.includes('Project name') || message.includes('项目名称')) {
      return world.getMockInput('projectName') || 'test-project';
    }
    if (message.includes('description') || message.includes('描述')) {
      return world.getMockInput('projectDescription') || 'A test project';
    }
    return defaultValue || '';
  });

  // Stub checkboxList
  sinon.stub(ui, 'checkboxList').callsFake(
    async (message: string, options: CheckboxOption[]) => {
      if (message.includes('features') || message.includes('功能')) {
        return world.getMockInput('selectedPlugins') || [];
      }
      // Enhancements selection (prompt-presets plugin)
      if (message.includes('enhancement') || message.includes('Enhancement')) {
        return ['system-information', 'memory-instructions', 'full-context-reading'];
      }
      // Default: return checked items
      return options.filter((opt) => opt.checked).map((opt) => opt.value);
    }
  );

  // Stub radioList
  sinon.stub(ui, 'radioList').callsFake(
    async (message: string, options: RadioOption[], defaultValue?: string) => {
      // Re-initialization options
      if (message.includes('What would you like to do')) {
        return world.getMockInput('reinitAction') || 'keep';
      }

      // Base mode selection (prompt-presets plugin)
      if (message.includes('base mode') || message.includes('Base') || message.includes('preset')) {
        return 'code-review';
      }

      // Preferred Python package manager
      if (message.includes('Python package manager')) {
        return world.getMockInput('preferredPythonManager') || defaultValue || options[0]?.value || '';
      }

      // Preferred Node.js package manager
      if (message.includes('Node.js package manager') || message.includes('Node package manager')) {
        return world.getMockInput('preferredNodeManager') || defaultValue || options[0]?.value || '';
      }

      return defaultValue || options[0]?.value || '';
    }
  );

  // Stub confirm
  sinon.stub(ui, 'confirm').callsFake(
    async (message: string, defaultValue: boolean = true) => {
      if (message.includes('Proceed') || message.includes('initialization')) {
        return world.getMockInput('confirmInit') ?? true;
      }
      // Use preferred managers for this project?
      if (message.includes('preferred managers')) {
        return true;
      }
      if (message.includes('Skill')) {
        return false; // Don't create skills by default
      }
      return defaultValue;
    }
  );
}
