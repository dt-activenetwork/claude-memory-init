---
id: ep-011
title: BDD 测试超时修复 - Mock 完整性问题
tags: [v2.1, testing, bdd, cucumber, mock-completeness, timeout-fix]
topics: [testing/bdd, debugging]
created: 2025-11-26
updated: 2025-11-26
---

# BDD 测试超时修复 - Mock 完整性问题

## 问题描述

BDD 测试（Cucumber）出现 7 个场景超时失败：

```
Error: function timed out, ensure the promise resolves within 5000 milliseconds
```

失败的场景：
- 首次初始化新项目 (initialization.feature:10)
- 最小化初始化 (initialization.feature:20)
- 生成正确的目录结构 (initialization.feature:40)
- AGENT.md 不应包含未替换的占位符 (initialization.feature:52)
- 追加到现有 AGENT.md 文件 (initialization.feature:57)
- 为项目选择特定的包管理器 (system-detection.feature:37)
- 生成项目配置文件 (system-detection.feature:43)

## 根因分析

### 问题根源

UI Mock 不完整。`prompt-presets` 插件在配置阶段会调用：

```typescript
// prompt-presets 插件的 configure() 方法
const base = await ui.radioList('Select base mode...', options);
const enhancements = await ui.checkboxList('Select enhancements...', options);
```

但原来的 Mock 只处理了：
- `features` 关键词的 checkboxList
- `Python/Node package manager` 的 radioList

**没有处理** `base mode` 和 `enhancement` 关键词，导致 inquirer.js 在等待用户输入，但测试环境没有用户，所以超时。

### 为什么是超时而不是报错？

inquirer.js 是一个交互式 CLI 库，当没有 mock 时，它会等待 stdin 输入。在测试环境中 stdin 没有输入，所以一直等待直到 Cucumber 的默认超时（5秒）。

## 解决方案

### 1. 完善 checkboxList Mock

```typescript
// tests/bdd/step-definitions/initialization.steps.ts
sinon.stub(ui, 'checkboxList').callsFake(async (message, options) => {
  if (message.includes('features') || message.includes('功能')) {
    return world.getMockInput('selectedPlugins') || [];
  }
  // ✅ 新增：prompt-presets 插件的 enhancements 选择
  if (message.includes('enhancement') || message.includes('Enhancement')) {
    return ['system-information', 'memory-instructions', 'full-context-reading'];
  }
  return options.filter(opt => opt.checked).map(opt => opt.value);
});
```

### 2. 完善 radioList Mock

```typescript
sinon.stub(ui, 'radioList').callsFake(async (message, options, defaultValue) => {
  // ✅ 新增：prompt-presets 插件的 base mode 选择
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

### 3. 在 Before 钩子中清理 stubs

```typescript
// tests/bdd/support/hooks.ts
Before(async function (this: TestWorld) {
  // ✅ 新增：清理可能遗留的 stubs，避免 "already wrapped" 错误
  sinon.restore();

  this.lastOutput = '';
  this.lastError = null;
  this.mockInputs.clear();
});
```

## 修改的文件

1. `tests/bdd/step-definitions/initialization.steps.ts`
   - mockUIComponents() 添加 prompt-presets 相关 mock

2. `tests/bdd/step-definitions/system-detection.steps.ts`
   - mockSystemDetectorUI() 添加相同的 mock

3. `tests/bdd/support/hooks.ts`
   - Before 钩子添加 sinon.restore()

4. `src/core/ui.ts`
   - 添加详细注释，说明 Mock 检查清单

## 修复效果

修复前：
```
33 scenarios (7 failed, 26 passed)
147 steps (7 failed, 17 skipped, 123 passed)
0m47.100s (超时)
```

修复后：
```
33 scenarios (33 passed)
147 steps (147 passed)
0m09.077s (正常)
```

## 经验教训

### 1. Mock 必须完整

每次新增插件或修改 UI 交互时，必须同步更新 BDD 测试中的 Mock。

### 2. 超时 = Mock 缺失

如果 BDD 测试超时，首先检查是否有 UI 调用没有被 mock。

### 3. 调试技巧

在 Mock 函数中添加日志，找出哪个 message 没有匹配：

```typescript
sinon.stub(ui, 'radioList').callsFake(async (message, ...) => {
  console.log('[MOCK] radioList called with:', message);
  // ...
});
```

### 4. 文档化 Mock 清单

在 `src/core/ui.ts` 中维护 Mock 检查清单，方便开发者参考。

## 相关文档

- `claude/memory/semantic/sem-002-ui-facade-pattern.md` - UI Facade 模式详解

---

**创建**: 2025-11-26
**状态**: 完成
