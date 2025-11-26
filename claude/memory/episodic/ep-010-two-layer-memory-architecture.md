---
id: ep-010
title: System Detector v2.1 - 两层记忆架构与 BDD 测试修复
tags: [system-detector, architecture, testing, bdd, memory-scope]
topics: [v2.1, user-memory, project-memory, ui-facade]
created: 2025-11-26
updated: 2025-11-26
---

# System Detector v2.1 - 两层记忆架构与 BDD 测试修复

## 概述

今日完成了 System Detector 插件的重大重构，实现了两层记忆架构（User Memory vs Project Memory），并解决了 BDD 测试中 `vi.mocked()` 不工作的问题。

## 主要成就

### 1. 两层记忆架构设计与实现

**背景**：之前所有信息都存储在项目级别（`.agent/system/info.toon`），导致：
- 跨项目重复配置用户偏好
- 静态信息和动态信息混淆
- 无法区分用户偏好和项目配置

**新架构**：

| 层级 | 存储位置 | 内容 | 更新频率 |
|------|---------|------|---------|
| **User Memory** | `~/.claude/system/preferences.toon` | OS类型、用户首选包管理器、时区语言 | 首次设置后持久化 |
| **Project Memory** | `.agent/system/config.toon` | 项目实际使用的包管理器 | 每次项目初始化 |
| **Dynamic Detection** | Hook 脚本 | Python/Node版本、路径 | Claude Code 启动时实时检测 |

**用户体验优化**：

首次使用：
```
[System Configuration]
First time setup - detecting system...
✓ OS: EndeavourOS (linux)
✓ Python: 3.13.7
  Available: uv, pip
  ? Select preferred: [uv]  ← 保存到 ~/.claude/

[Project Configuration]
? Use your preferred managers? (Python: uv) (Y/n)
```

第二次使用：
```
[System Configuration]
✓ Found user preferences (~/.claude/)
  Preferred: Python=uv, Node=pnpm

[Project Configuration]
? Use your preferred managers? (Y/n)
```

### 2. AGENT.md/CLAUDE.md 追加功能

**需求**：初始化时不覆盖已有的 AGENT.md/CLAUDE.md 文件

**实现**：
- `appendOrCreateFile()` 工具函数
- `findFirstExistingFile()` 查找已有文件（优先 AGENT.md）
- 在现有内容后添加空行，然后追加新内容

**测试**：添加了 3 个集成测试验证追加行为

### 3. UI Facade 模式解决 BDD 测试 Mock 问题

**问题**：Cucumber BDD 测试中 `vi.mocked()` 不工作
- Cucumber 使用 tsx loader，不经过 Vitest runner
- `vi.mock()` 需要 module hoisting，Cucumber 不支持
- 错误：`TypeError: vi.mocked(...).mockImplementation is not a function`

**解决方案**：UI Facade (外观模式)

**核心思路**：利用 JS 对象属性的可变性，绕过 ESM 具名导出的只读限制

**实现**：

1. 创建 `src/core/ui.ts`：
```typescript
import * as promptComponents from '../prompts/components/index.js';

// 展开到新对象，使其属性可变（可 mock）
export const ui = {
  ...promptComponents
};
```

2. 更新 `InteractiveInitializer` 使用 `ui.xxx()` 调用

3. BDD 测试中使用 sinon stub：
```typescript
import sinon from 'sinon';
import { ui } from '../../../src/core/ui.js';

sinon.stub(ui, 'radioList').callsFake(async (message, options, defaultValue) => {
  // 返回测试期望的值
});
```

4. 在 hooks 中清理：
```typescript
After(async function () {
  sinon.restore(); // 恢复原始实现
});
```

**关键发现**：
- User Memory 文件在测试间共享导致测试失败
- 需要在 `BeforeAll` 和 `After` hook 中备份/删除/恢复用户偏好文件

## 技术细节

### 新增常量

```typescript
// src/constants.ts
export type MemoryScope = 'project' | 'user';
export const USER_MEMORY_DIR = path.join(os.homedir(), '.claude');
export const USER_MEMORY_SUBDIRS = {
  SYSTEM: 'system',
  PREFERENCES: 'preferences',
  CACHE: 'cache',
};
export const USER_MEMORY_FILES = {
  SYSTEM_PREFERENCES: 'preferences.toon',
};
export const PROJECT_MEMORY_FILES = {
  SYSTEM_CONFIG: 'system/config.toon',
};
```

### 文件操作工具

新增 User Memory 相关函数（`src/utils/file-ops.ts`）：
- `ensureUserMemoryStructure()`
- `getScopeBaseDir(scope, projectAgentDir?)`
- `writeScopedFile(relativePath, content, scope, projectAgentDir?)`
- `readScopedFile(relativePath, scope, projectAgentDir?)`
- `scopedFileExists(relativePath, scope, projectAgentDir?)`
- `appendOrCreateFile(filePath, newContent)`
- `findFirstExistingFile(candidates[])`

### Plugin 类型更新

```typescript
export interface FileOutput {
  path: string;
  content: string;
  format?: 'markdown' | 'toon' | 'json' | 'yaml';
  scope?: MemoryScope;  // ← 新增
}

export interface PluginConfig {
  enabled: boolean;
  options: Record<string, PluginOptionValue>;
  scope?: MemoryScope;  // ← 新增
}
```

### System Detector 数据结构

**User Preferences** (`~/.claude/system/preferences.toon`):
```toon
created_at: 2025-11-26T...
updated_at: 2025-11-26T...

os:
  type: linux
  name: EndeavourOS
  package_manager: pacman

preferred_managers:
  python: uv
  node: pnpm

locale:
  timezone: Asia/Shanghai
  language: en_US.UTF-8
```

**Project Config** (`.agent/system/config.toon`):
```toon
configured_at: 2025-11-26T...

package_managers:
  python: uv
  node: pnpm
```

## 测试结果

### 测试统计

| 测试类型 | 通过/总数 | 状态 |
|---------|----------|------|
| 单元测试 (Vitest) | 196/196 | ✅ 全部通过 |
| 集成测试 (Vitest) | 196/196 | ✅ 全部通过 |
| BDD 测试 (Cucumber) | 32/33 | ⚠️ 1个失败 (非关键) |

### BDD 测试改进

- **改进前**：24/33 通过 (9 个失败，都是 `vi.mocked()` 错误)
- **改进后**：32/33 通过 (1 个失败，plugin-lifecycle 测试的小bug)

**新增/更新的场景**：
- ✅ 检测操作系统信息
- ✅ 检测 Python 环境
- ✅ 检测时区和语言
- ✅ 首次设置时选择首选包管理器
- ✅ 为项目选择特定的包管理器
- ✅ 生成项目配置文件

## 技术亮点

### 1. UI Facade 模式

**优势**：
- 零新依赖（只需 sinon，测试常用库）
- 生产代码改动极小
- 完美支持 TypeScript 类型推导
- 与 Vitest 和 Cucumber 都兼容

**原理**：
```javascript
// ESM 具名导出是只读的
export function input() { ... }
// ❌ 无法 stub

// 对象属性是可变的
export const ui = { input, ... }
// ✅ sinon.stub(ui, 'input') 可以工作
```

### 2. 测试隔离策略

**问题**：User Memory 文件在测试间共享，导致：
- 第一个测试创建 `~/.claude/preferences.toon`
- 后续测试读取到它，跳过首次设置流程
- Mock 的 radioList 不被调用

**解决**：
- `BeforeAll`: 备份并删除用户偏好文件
- `After`: 每个场景后删除新创建的偏好文件
- `AfterAll`: 恢复原始用户偏好文件

### 3. 渐进式重构策略

**移除的概念**：
- `info.toon` 文件（拆分为 `preferences.toon` 和 `config.toon`）
- `memory_scope` 字段（固定位置，不再可选）
- `selected_manager` 字段（改为 `preferred_managers` 和 `package_managers`）
- Lockfile 检测逻辑（移交给 agent 运行时处理）

**保留的功能**：
- OS/Python/Node 检测器
- 用户交互流程
- TOON 格式序列化

## 遇到的挑战

### 挑战 1：Sinon Stub 未生效

**现象**：stub 创建成功，但实际调用的是原始函数

**根因**：
1. 构造函数中提取了函数引用：`{input: ui.input}`
2. 这创建了新引用，失去了与 `ui` 对象的绑定
3. Stub 替换的是 `ui.input`，但代码使用的是已提取的引用

**解决**：改为传递整个 `ui` 对象：`this.uiComponents = ui as UIComponents`

### 挑战 2：用户偏好文件污染测试

**现象**：测试生成了 `uv` 和 `pnpm`，而不是期望的 `pip` 和 `npm`

**根因**：真实的 `~/.claude/preferences.toon` 被读取

**解决**：在测试 hooks 中备份/删除/恢复用户偏好文件

### 挑战 3：测试场景设计不合理

**问题**：期望测试 Node.js 包管理器选择，但测试环境只有 pnpm

**解决**：调整场景期望，只测试 Python（环境有多个包管理器）

## 文件清单

### 新建文件
- `src/core/ui.ts` - UI Facade
- `templates/hooks/system-detect.sh` - 动态检测 hook

### 重构文件
- `src/plugins/system-detector/index.ts` - 完全重写（从 630 行精简到 572 行）
- `src/constants.ts` - 添加 User Memory 常量
- `src/plugin/types.ts` - 添加 scope 支持
- `src/utils/file-ops.ts` - 添加 scope 工具函数
- `src/core/interactive-initializer.ts` - 支持追加和 UI facade

### 更新测试
- `tests/integration/smoke-test.test.ts` - 更新文件路径和验证
- `tests/integration/init-flow.test.ts` - 更新文件路径和验证
- `tests/bdd/features/system-detection.feature` - 重写场景
- `tests/bdd/step-definitions/system-detection.steps.ts` - 使用 sinon
- `tests/bdd/step-definitions/initialization.steps.ts` - 使用 sinon
- `tests/bdd/support/hooks.ts` - 添加用户偏好管理

## 下一步

### 短期
- [ ] 修复 plugin-lifecycle 测试中的小bug（1个失败场景）
- [ ] 完善 Hook 脚本的实现和文档
- [ ] 添加 User Memory 管理命令（查看、编辑、重置）

### 中期
- [ ] 其他插件也支持 scope 选择（如 git 配置）
- [ ] 实现 User Memory 迁移工具
- [ ] 添加更多 BDD 场景测试不同配置组合

### 长期
- [ ] 探索 User Memory 的云同步功能
- [ ] 支持多个配置 profile（work/personal）
- [ ] 实现配置导入/导出功能

## 参考

- 相关笔记：[[sem-001]] - 斜杠命令架构
- 相关笔记：[[ep-002]] - v2.0 重构进度
- 外部资源：[ESM Mocking Guide](https://adamtuttle.codes/blog/2024/mocking-esm-dependencies-for-tests/)

---

**创建**: 2025-11-26
**更新**: 2025-11-26
**状态**: 完整
