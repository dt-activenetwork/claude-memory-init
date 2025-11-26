---
id: sem-001
title: 斜杠命令架构设计
tags: [architecture, slash-commands, design-pattern]
topics: [v2.0, plugin-system]
created: 2025-11-20
updated: 2025-11-20
---

# 斜杠命令架构设计

## 概述

斜杠命令是 Claude Code 中的 Prompt 模板系统，用于封装可复用的工作流程。

## 核心概念

### 斜杠命令 = 封装的 Prompt

**本质**：
- Markdown 文件（存储在 `.agent/commands/` 或 `.claude/commands/`）
- 包含结构化的指令
- 可参数化（`$ARGUMENTS`, `$1`, `$2`）
- Claude Code 展开为 prompt 发送给 AI

**不是**：
- 可执行代码
- Shell 脚本
- API 调用

### 工作流程

```
用户/AI 调用: /memory-search authentication
    ↓
Claude Code: 读取 .agent/commands/memory-search.md
    ↓
展开: 用 "authentication" 替换 $ARGUMENTS
    ↓
发送给 AI: [展开后的完整 prompt]
    ↓
AI 执行: 按照 prompt 中的步骤操作
    ↓
返回结果
```

## 三层架构

### Layer 1: AGENT.md（高层工作流）

**作用**：提供工作流程和原则

**内容**：
- When: 什么时候做什么
- What: 关键原则
- How: 使用哪些命令

**示例**：
```markdown
## Memory System

### Workflow
Before: Use /memory-search or /memory-query
During: Apply knowledge
After: Update notes and indexes

### Commands
- /memory-search <tag>
- /memory-query <topic>

### Principles
- Use commands, not manual grep
- Read complete files
```

**Token**: ~50 行

### Layer 2: 斜杠命令（中层操作）

**作用**：封装具体操作步骤

**内容**：
- 详细的执行步骤
- 文件路径
- 数据格式
- 示例

**示例**：
```markdown
# Memory Search: $ARGUMENTS

1. Read .agent/memory/index/tags.toon
2. Find tag "$ARGUMENTS"
3. Extract note IDs
4. Read each note file
5. Report findings
```

**Token**: ~100-200 行（仅使用时加载）

### Layer 3: AI 工具（底层执行）

**作用**：实际执行操作

**工具**：
- Read - 读取文件
- Edit - 修改文件
- Grep - 搜索内容
- Bash - 执行命令

## 设计原则

### 1. 封装复杂性

**Bad**：
```markdown
AGENT.md (300 lines):
"读取 tags.toon，格式是 YAML，找到 tags 键，
 解析 tag[N]: id1,id2 格式，逗号分隔，
 然后读取 .agent/memory/knowledge/id1.md..."
```

**Good**：
```markdown
AGENT.md (5 lines):
"Use /memory-search <tag> to find notes"

Command file (100 lines):
[详细步骤]
```

### 2. 可参数化

**支持**：
- `$ARGUMENTS` - 所有参数
- `$1`, `$2`, `$N` - 位置参数
- 动态查询和操作

**示例**：
```
/memory-search authentication
→ $ARGUMENTS = "authentication"

/task-start task-043
→ $ARGUMENTS = "task-043"
```

### 3. 人机共用

**调用者**：
- 用户：手动输入 `/command`
- AI：主动调用（在思考中决定）

**好处**：
- 统一接口
- 标准化操作
- 可预测行为

### 4. Token 高效

**Before**：
- AGENT.md 每次加载：3000 tokens
- 详细步骤总是存在

**After**：
- AGENT.md 每次加载：500 tokens
- 命令仅使用时展开：200 tokens

**节省**：使用 1 个命令时：3000 → 700（77% 节省）

## 实现细节

### Plugin 接口扩展

```typescript
interface SlashCommand {
  name: string;              // "memory-search"
  description: string;       // "Find notes by tag"
  argumentHint?: string;     // "[tag-name]"
  templateFile: string;      // "memory/search.md"
}

interface Plugin {
  // ... existing fields
  slashCommands?: SlashCommand[];  // ⭐ 新增
}
```

### 插件声明命令

```typescript
export const memorySystemPlugin: Plugin = {
  meta: {...},

  slashCommands: [
    {
      name: 'memory-search',
      description: 'Find notes by tag',
      argumentHint: '[tag-name]',
      templateFile: 'memory/search.md',
    },
    // ...
  ],

  outputs: {
    generate: async () => {
      // 复制命令文件到 .agent/commands/
    }
  }
};
```

### 系统收集命令

```typescript
// 初始化完成时
const allCommands = [];
for (const plugin of enabledPlugins) {
  if (plugin.slashCommands) {
    allCommands.push(...plugin.slashCommands);
  }
}

// 显示给用户
console.log('Available slash commands:');
for (const cmd of allCommands) {
  console.log(`  /${cmd.name} ${cmd.argumentHint || ''}`);
}
```

## 使用场景

### 场景 1：记忆查询

```
User: "查找关于认证的笔记"

AI (thinking): 需要查找记忆 → 使用 /memory-search

AI (action): /memory-search authentication

AI (sees): [命令展开后的详细步骤]

AI (executes):
1. Read .agent/memory/index/tags.toon
2. Parse tag "authentication" → [know-001, know-005]
3. Read know-001.md and know-005.md

AI (responds):
"找到 2 条笔记：
 - know-001: OAuth 2.0 实现
 - know-005: Session 管理"
```

### 场景 2：任务管理

```
Session 1:
User: "开始做支付功能"
AI: /task-create "实现支付"
    [生成 task-043 和 prompt]
    /task-start task-043
    [工作 1 小时]
    /task-pause
    [保存进度]

Session 2（第二天）:
User: "继续昨天的工作"
AI: /task-resume task-043
    [加载完整上下文]
    "恢复任务：实现支付
     上次进度：已完成 API 集成
     下一步：测试 webhook"
    [继续工作]
```

## 对比分析

### vs Prompt 注入

| 特性 | 斜杠命令 | Prompt 注入 |
|------|---------|-----------|
| 加载时机 | 使用时 | 每次对话 |
| Token 成本 | 按需 | 固定 |
| 内容详细度 | 详细步骤 | 简洁原则 |
| 适用场景 | 操作、查询 | 规范、原则 |
| 可参数化 | ✅ | ❌ |

### vs Skills

| 特性 | 斜杠命令 | Skills |
|------|---------|--------|
| 调用方式 | 显式 `/cmd` | 自动触发 |
| 文件结构 | 单个 .md | 目录 + 多文件 |
| 复杂度 | 简单 prompt | 复杂工作流 |
| 存在性 | 一直可用 | 按需加载 |

## 最佳实践

### 1. 命令命名

```
✅ Good:
/memory-search       (动作-对象)
/task-status         (对象-动作)
/workflow-load       (对象-动作)

❌ Bad:
/search-memory       (不一致)
/get-task-status     (冗余 get)
```

### 2. 参数设计

```
✅ Good:
/memory-search <tag>          (必需参数)
/memory-recent [count]        (可选参数)

❌ Bad:
/memory-search <tag> <type> <date> <author>  (太多参数)
```

### 3. Prompt 结构

```markdown
---
description: 简短说明
argument-hint: [参数提示]
---

# 命令标题

简短说明

## Steps
1. 详细步骤 1
2. 详细步骤 2

## Key Points
- 关键注意事项
```

---

## 参考

- Claude Code 文档：斜杠命令
- 项目文件：`templates/commands/`
- 相关笔记：[[ep-002]] - 今日实现记录

---

**创建**: 2025-11-20
**更新**: 2025-11-20
**状态**: 完整
