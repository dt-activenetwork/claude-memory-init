/**
 * UI Facade - Mock 注入点
 *
 * 这个模块提供了一个可变的 UI 组件包装器，使得在非 Vitest 环境（如 Cucumber BDD 测试）中可以进行 mock。
 *
 * ## 为什么需要这个 Facade？
 *
 * ESM 的命名导出是只读的：
 * ```typescript
 * import { input } from './components';
 * // ❌ 无法在运行时替换 input
 * ```
 *
 * 但对象属性是可变的：
 * ```typescript
 * import { ui } from './ui';
 * sinon.stub(ui, 'input').callsFake(...);
 * // ✅ 可以 stub
 * ```
 *
 * ## 测试中如何 Mock
 *
 * ```typescript
 * // tests/bdd/step-definitions/*.steps.ts
 * import sinon from 'sinon';
 * import { ui } from '../../../src/core/ui.js';
 *
 * sinon.stub(ui, 'input').callsFake(async (message) => {
 *   if (message.includes('Project name')) return 'test-project';
 *   return '';
 * });
 * ```
 *
 * ## ⚠️ 重要：Mock 完整性
 *
 * **每当新增插件或修改 UI 交互时，必须同步更新 BDD 测试中的 Mock！**
 *
 * 如果 Mock 不完整，测试会超时等待用户输入：
 * ```
 * Error: function timed out, ensure the promise resolves within 5000 milliseconds
 * ```
 *
 * 需要更新的文件：
 * - tests/bdd/step-definitions/initialization.steps.ts (mockUIComponents 函数)
 * - tests/bdd/step-definitions/system-detection.steps.ts (mockSystemDetectorUI 函数)
 *
 * 详细说明见：claude/memory/semantic/sem-002-ui-facade-pattern.md
 *
 * @module core/ui
 */

import * as promptComponents from '../prompts/components/index.js';

/**
 * 可变的 UI 对象 - BDD 测试的 Mock 注入点
 *
 * 生产环境：使用真实的 UI 组件
 * 测试环境：通过 sinon.stub(ui, 'methodName') 进行 mock
 *
 * ## 包含的方法
 *
 * - `input(message, defaultValue?)` - 文本输入
 * - `confirm(message, defaultValue?)` - 是/否确认
 * - `radioList(message, options, defaultValue?)` - 单选列表
 * - `checkboxList(message, options)` - 多选列表
 *
 * ## Mock 检查清单
 *
 * 当你看到测试超时时，检查以下 UI 调用是否都有对应的 mock：
 *
 * ### input
 * - "Project name" → projectName
 * - "description" → projectDescription
 *
 * ### radioList
 * - "What would you like to do" → reinitAction (重新初始化选项)
 * - "base mode" / "Base" / "preset" → 'code-review' (prompt-presets 插件)
 * - "Python package manager" → preferredPythonManager
 * - "Node.js package manager" / "Node package manager" → preferredNodeManager
 *
 * ### checkboxList
 * - "features" / "功能" → selectedPlugins
 * - "enhancement" / "Enhancement" → ['system-information', ...] (prompt-presets 插件)
 *
 * ### confirm
 * - "Proceed" / "initialization" → confirmInit
 * - "preferred managers" → true
 * - "Skill" → false
 */
export const ui = {
  ...promptComponents,
};

export type UI = typeof ui;
