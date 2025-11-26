---
id: sem-002
title: UI Facade 模式 - 解决 Cucumber 测试中的 ESM Mock 问题
tags: [testing, bdd, design-pattern, esm, mocking]
topics: [cucumber, sinon, ui-facade]
created: 2025-11-26
updated: 2025-11-26
---

# UI Facade 模式 - 解决 Cucumber 测试中的 ESM Mock 问题

## 问题背景

### Vitest vs Cucumber 的 Mock 不兼容

| 特性 | Vitest | Cucumber (tsx) |
|------|--------|----------------|
| Mock 系统 | `vi.mock()` + `vi.mocked()` | 无内置支持 |
| Module Hoisting | ✅ 支持 | ❌ 不支持 |
| 运行环境 | Vitest runner | Node.js + tsx loader |

**错误信息**：
```
TypeError: vi.mocked(...).mockImplementation is not a function
```

## 解决方案：UI Facade 模式

### 核心原理

**ESM 限制**：
```typescript
// 具名导出是只读的
export function input() { ... }
// ❌ 无法在运行时替换

// 对象属性是可变的
export const ui = { input, ... }
// ✅ sinon.stub(ui, 'input') 可以工作
```

### 实现步骤

#### 1. 创建 UI Facade (`src/core/ui.ts`)

```typescript
import * as promptComponents from '../prompts/components/index.js';

// 使用 Namespace Import + 展开语法
// promptComponents 是只读的 Module Namespace Object
// 展开后得到可变的普通对象
export const ui = {
  ...promptComponents
};

export type UI = typeof ui;
```

**关键点**：
- `import * as X` 返回冻结的模块命名空间对象
- `{ ...X }` 创建新的可变对象（浅拷贝）

#### 2. 生产代码使用 Facade

```typescript
// src/core/interactive-initializer.ts
import { ui } from './ui.js';

export class InteractiveInitializer {
  async run() {
    const name = await ui.input('Project name:');
    const plugins = await ui.checkboxList('Select features', options);
  }
}
```

#### 3. BDD 测试中 Mock

```typescript
// tests/bdd/step-definitions/*.steps.ts
import sinon from 'sinon';
import { ui } from '../../../src/core/ui.js';

function mockUI(world: TestWorld): void {
  sinon.stub(ui, 'input').callsFake(async (message, defaultValue) => {
    if (message.includes('Project name')) {
      return world.getMockInput('projectName') || 'test-project';
    }
    return defaultValue || '';
  });

  sinon.stub(ui, 'radioList').callsFake(async (message, options, defaultValue) => {
    if (message.includes('Python package manager')) {
      return world.getMockInput('preferredPythonManager') || defaultValue;
    }
    return defaultValue || options[0]?.value || '';
  });
}
```

#### 4. 清理 Stubs

```typescript
// tests/bdd/support/hooks.ts
import { After } from '@cucumber/cucumber';
import sinon from 'sinon';

After(async function () {
  sinon.restore(); // 恢复原始实现
});
```

## 替代方案对比

### 方案 A：依赖注入

**实现**：
```typescript
constructor(registry: PluginRegistry, customUI?: UIComponents) {
  this.ui = customUI || defaultUI;
}
```

**优劣**：
- ✅ 无需额外库
- ❌ 需要修改所有类的构造函数
- ❌ 层层传递依赖，代码冗长

### 方案 B：Testdouble/Proxyquire

**实现**：
```typescript
const mocks = await td.replaceEsm('./ui.js', { input: mockFn });
```

**优劣**：
- ✅ 不修改生产代码
- ❌ 需要配置 loader（`--loader=testdouble`）
- ❌ 可能与 tsx loader 冲突
- ❌ 调试困难

### 方案 C：UI Facade (选用)

**优劣**：
- ✅ 生产代码改动极小
- ✅ 无需 loader 配置
- ✅ TypeScript 类型完美支持
- ✅ 调试简单直观
- ✅ 与 Vitest 和 Cucumber 都兼容

## 关键注意事项

### 1. 导入时机很重要

```typescript
// ❌ 错误顺序
const { InteractiveInitializer } = await import('./initializer.js');
mockUI(); // 太晚了，initializer 已经导入了 ui

// ✅ 正确顺序
mockUI(); // 先 stub
const { InteractiveInitializer } = await import('./initializer.js'); // 后导入
```

### 2. 顶层导入 UI 对象

```typescript
// tests/bdd/step-definitions/*.steps.ts
// ✅ 顶层导入，确保所有地方使用同一个对象
import { ui } from '../../../src/core/ui.js';

function mockUI() {
  // ✅ 直接使用顶层导入的 ui
  sinon.stub(ui, 'input').callsFake(...);
}

// ❌ 不要在函数内动态导入
async function mockUI() {
  const { ui } = await import('../../../src/core/ui.js'); // 可能是不同实例
}
```

### 3. 避免提取函数引用

```typescript
// ❌ 错误：提取引用
const inputFn = ui.input;
// stub ui.input 不会影响 inputFn

// ✅ 正确：始终通过对象访问
const name = await ui.input('prompt');
```

## 性能影响

| 方面 | 影响 |
|------|------|
| 运行时性能 | 无影响（对象属性访问与直接调用速度相同） |
| 内存占用 | +几百字节（创建一个对象） |
| Bundle 大小 | 无影响 |
| 类型检查 | 无影响（类型完全推导） |

## 适用场景

**适合使用 UI Facade 的情况**：
- ✅ Cucumber/Mocha/Jest 等非 Vitest 测试框架
- ✅ 需要在测试中 mock ES 模块
- ✅ 不想引入复杂的 loader 机制
- ✅ 希望保持代码简洁

**不需要的情况**：
- ❌ 纯 Vitest 项目（`vi.mock()` 已足够）
- ❌ 已有完善的依赖注入架构
- ❌ 不需要测试的 UI 交互代码

## 扩展应用

### 其他可 Facade 化的模块

在本项目中，可以考虑为以下模块创建 Facade：
- `src/utils/logger.ts` → `loggerFacade`
- `src/utils/file-ops.ts` → `fsFacade`
- `src/plugin/context.ts` → `contextFacade`

**示例**：
```typescript
// src/core/facades.ts
import * as logger from '../utils/logger.js';
import * as fileOps from '../utils/file-ops.js';

export const log = { ...logger };
export const fs = { ...fileOps };
```

## ⚠️ Mock 完整性陷阱

### 问题场景 (2025-11-26 修复)

BDD 测试超时（5秒），原因是 UI Mock 不完整：

```
Error: function timed out, ensure the promise resolves within 5000 milliseconds
```

### 根因分析

`prompt-presets` 插件在配置阶段会调用：
```typescript
// 选择 base mode
const base = await ui.radioList('Select base mode...', options);

// 选择 enhancements
const enhancements = await ui.checkboxList('Select enhancements...', options);
```

但原来的 Mock 只处理了：
- `features` 关键词的 checkboxList
- `Python/Node package manager` 的 radioList

**结果**：测试在等待用户输入，但测试环境没有用户，所以超时。

### 解决方案

**每次添加新的 UI 交互，必须同步更新 Mock**：

```typescript
// tests/bdd/step-definitions/*.steps.ts

// ✅ 完整的 checkboxList mock
sinon.stub(ui, 'checkboxList').callsFake(async (message, options) => {
  // 功能选择
  if (message.includes('features') || message.includes('功能')) {
    return world.getMockInput('selectedPlugins') || [];
  }
  // ⚠️ prompt-presets 插件的 enhancements 选择
  if (message.includes('enhancement') || message.includes('Enhancement')) {
    return ['system-information', 'memory-instructions', 'full-context-reading'];
  }
  return options.filter(opt => opt.checked).map(opt => opt.value);
});

// ✅ 完整的 radioList mock
sinon.stub(ui, 'radioList').callsFake(async (message, options, defaultValue) => {
  // ⚠️ prompt-presets 插件的 base mode 选择
  if (message.includes('base mode') || message.includes('Base') || message.includes('preset')) {
    return 'code-review';
  }
  // 重新初始化选项
  if (message.includes('What would you like to do')) {
    return world.getMockInput('reinitAction') || 'keep';
  }
  // 包管理器选择
  if (message.includes('Python package manager')) {
    return world.getMockInput('preferredPythonManager') || defaultValue || options[0]?.value || '';
  }
  if (message.includes('Node') && message.includes('package manager')) {
    return world.getMockInput('preferredNodeManager') || defaultValue || options[0]?.value || '';
  }
  return defaultValue || options[0]?.value || '';
});
```

### 检查清单

新增插件或修改 UI 交互时：

1. [ ] 列出所有 `ui.input()` 调用及其 message 关键词
2. [ ] 列出所有 `ui.radioList()` 调用及其 message 关键词
3. [ ] 列出所有 `ui.checkboxList()` 调用及其 message 关键词
4. [ ] 列出所有 `ui.confirm()` 调用及其 message 关键词
5. [ ] 更新 `initialization.steps.ts` 的 `mockUIComponents()`
6. [ ] 更新 `system-detection.steps.ts` 的 `mockSystemDetectorUI()`
7. [ ] 运行 `pnpm test:bdd` 验证无超时

### 调试技巧

如果测试超时，在 Mock 函数中添加日志：

```typescript
sinon.stub(ui, 'radioList').callsFake(async (message, options, defaultValue) => {
  console.log('[MOCK] radioList called with:', message); // 调试用
  // ... mock 实现
});
```

查看日志，找出哪个 message 没有匹配到 Mock 条件。

## 总结

UI Facade 模式是一个简洁、实用的解决方案，完美平衡了：
- 代码简洁性
- 测试便利性
- 类型安全性
- 性能影响

**重要教训**：Mock 必须覆盖所有 UI 交互路径，否则测试会超时等待用户输入。

---

**创建**: 2025-11-26
**更新**: 2025-11-26
**状态**: 完整
