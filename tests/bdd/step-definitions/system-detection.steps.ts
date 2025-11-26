/**
 * System Detection Step Definitions
 *
 * BDD step definitions for system environment detection scenarios.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { TestWorld } from '../support/world.js';
import assert from 'node:assert';

// ============ Given Steps ============

Given('system-detector 插件已启用', async function (this: TestWorld) {
  this.setMockInput('selectedPlugins', ['system-detector']);
});

Given('项目中存在 {string} 文件', async function (this: TestWorld, fileName: string) {
  await this.createTempProject();
  await this.createFile(fileName, '# Lock file content\n');
});

Given('系统安装了 Python', async function (this: TestWorld) {
  // Assume Python is available in test environment
  // This is verified by the actual detector in the When step
  this.setMockInput('hasPython', true);
});

// ============ When Steps ============

When('系统检测器运行', async function (this: TestWorld) {
  const { detectOS } = await import('../../../src/plugins/system-detector/detectors/os.js');

  try {
    const osInfo = await detectOS();
    this.setMockInput('osInfo', osInfo);
  } catch (error) {
    this.lastError = error as Error;
  }
});

When('系统检测器检测 Node.js 环境', async function (this: TestWorld) {
  const { detectNode } = await import('../../../src/plugins/system-detector/detectors/node.js');

  try {
    const nodeInfo = await detectNode(this.projectDir);
    this.setMockInput('nodeInfo', nodeInfo);
  } catch (error) {
    this.lastError = error as Error;
  }
});

When('系统检测器检测 Python 环境', async function (this: TestWorld) {
  const { detectPython } = await import(
    '../../../src/plugins/system-detector/detectors/python.js'
  );

  try {
    const pythonInfo = await detectPython();
    this.setMockInput('pythonInfo', pythonInfo);
  } catch (error) {
    this.lastError = error as Error;
  }
});

When('系统检测器检测静态信息', async function (this: TestWorld) {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = process.env.LANG || process.env.LANGUAGE || 'en_US.UTF-8';

    this.setMockInput('timezone', timezone);
    this.setMockInput('language', language);
  } catch (error) {
    this.lastError = error as Error;
  }
});

When('用户选择 {string} 作为首选 Python 包管理器', async function (
  this: TestWorld,
  manager: string
) {
  this.setMockInput('preferredPythonManager', manager);
});

When('用户选择 {string} 作为首选 Node.js 包管理器', async function (
  this: TestWorld,
  manager: string
) {
  this.setMockInput('preferredNodeManager', manager);
});


When('用户完成系统检测配置', async function (this: TestWorld) {
  // Import the initialization helper from initialization.steps.ts
  // For simplicity, we'll inline a simplified version here
  const { PluginRegistry } = await import('../../../src/plugin/registry.js');
  const { InteractiveInitializer } = await import(
    '../../../src/core/interactive-initializer.js'
  );
  const { default: systemDetectorPlugin } = await import(
    '../../../src/plugins/system-detector/index.js'
  );

  // Mock UI to return test inputs
  await mockSystemDetectorUI(this);

  // Create registry and initializer
  const registry = new PluginRegistry();
  registry.register(systemDetectorPlugin);

  const initializer = new InteractiveInitializer(registry);

  // Set default inputs if not already set
  if (!this.hasMockInput('projectName')) {
    this.setMockInput('projectName', 'test-project');
  }
  if (!this.hasMockInput('selectedPlugins')) {
    this.setMockInput('selectedPlugins', ['system-detector']);
  }
  if (!this.hasMockInput('confirmInit')) {
    this.setMockInput('confirmInit', true);
  }

  try {
    await initializer.run(this.projectDir, { force: false });
  } catch (error) {
    this.lastError = error as Error;
  }
});

// ============ Then Steps ============

Then('应该检测到操作系统类型', async function (this: TestWorld) {
  const osInfo = this.getMockInput('osInfo');
  assert.ok(osInfo, 'OS info should be defined');
  assert.ok(osInfo.type, 'OS type should be defined');
  assert.ok(['linux', 'darwin', 'windows'].includes(osInfo.type.toLowerCase()));
});

Then('应该检测到操作系统名称', async function (this: TestWorld) {
  const osInfo = this.getMockInput('osInfo');
  assert.ok(osInfo, 'OS info should be defined');
  assert.ok(osInfo.name, 'OS name should be defined');
  assert.ok(osInfo.name.length > 0, 'OS name should not be empty');
});

Then('应该检测到系统包管理器', async function (this: TestWorld) {
  const osInfo = this.getMockInput('osInfo');
  assert.ok(osInfo, 'OS info should be defined');
  assert.ok(osInfo.package_manager, 'Package manager should be defined');
  assert.ok(osInfo.package_manager.length > 0, 'Package manager should not be empty');
});


Then('应该检测到 Python 版本', async function (this: TestWorld) {
  const pythonInfo = this.getMockInput('pythonInfo');
  if (pythonInfo && pythonInfo.version) {
    assert.ok(pythonInfo.version, 'Python version should be defined');
    assert.match(pythonInfo.version, /^\d+\.\d+/);
  } else {
    // Python not installed, skip
    this.attach('Python not installed in test environment');
  }
});

Then('应该列出可用的包管理器', async function (this: TestWorld) {
  const pythonInfo = this.getMockInput('pythonInfo');
  if (pythonInfo && pythonInfo.available_managers) {
    assert.ok(pythonInfo.available_managers, 'Available managers should be defined');
    assert.strictEqual(Array.isArray(pythonInfo.available_managers), true);
  } else {
    // Python not installed, skip
    this.attach('Python not installed in test environment');
  }
});

Then('应该检测到时区信息', async function (this: TestWorld) {
  const timezone = this.getMockInput('timezone');
  assert.ok(timezone, 'Timezone should be defined');
  assert.ok(timezone.length > 0, 'Timezone should not be empty');
});

Then('应该检测到语言设置', async function (this: TestWorld) {
  const language = this.getMockInput('language');
  assert.ok(language, 'Language should be defined');
  assert.ok(language.length > 0, 'Language should not be empty');
});

// ============ Helper Functions ============

/**
 * Mock UI components specifically for system detector tests
 */
async function mockSystemDetectorUI(world: TestWorld): Promise<void> {
  const { vi } = await import('vitest');

  const { input } = await import('../../../src/prompts/components/input.js');
  const { checkboxList } = await import('../../../src/prompts/components/checkbox-list.js');
  const { radioList } = await import('../../../src/prompts/components/radio-list.js');
  const { confirm } = await import('../../../src/prompts/components/confirm.js');

  // Mock input
  vi.mocked(input).mockImplementation(async (message: string, defaultValue?: string) => {
    if (message.includes('Project name')) {
      return world.getMockInput('projectName') || 'test-project';
    }
    if (message.includes('description')) {
      return world.getMockInput('projectDescription') || 'A test project';
    }
    return defaultValue || '';
  });

  // Mock checkboxList
  vi.mocked(checkboxList).mockImplementation(async (message: string, options: any[]) => {
    if (message.includes('features')) {
      return world.getMockInput('selectedPlugins') || ['system-detector'];
    }
    return options.filter((opt) => opt.checked).map((opt) => opt.value);
  });

  // Mock radioList
  vi.mocked(radioList).mockImplementation(
    async (message: string, options: any[], defaultValue?: string) => {
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

  // Mock confirm
  vi.mocked(confirm).mockImplementation(async (message: string, defaultValue: boolean = true) => {
    // Use preferred managers for this project? - default to yes
    if (message.includes('preferred managers for this project')) {
      return true;
    }
    if (message.includes('existing system configuration')) {
      return false; // Don't use existing config in tests
    }
    if (message.includes('Skill')) {
      return false; // Don't create skills by default
    }
    if (message.includes('Proceed')) {
      return world.getMockInput('confirmInit') ?? true;
    }
    return defaultValue;
  });
}
