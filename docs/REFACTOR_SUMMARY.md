# 重构方案总结

## 概述

将 `claude-memory-init` 从耦合的单体工具重构为插件化、交互式的现代 CLI 工具。

**版本**: v2.0
**日期**: 2025-01-18
**状态**: 设计完成，待实施

---

## 核心改进

### 1. 插件化架构

**从单体到插件**

```
❌ 之前: 所有功能混在一起
src/
├── core/initializer.ts  (1000+ 行，做所有事情)
├── utils/git-ops.ts     (Git 功能)
├── utils/auto-commit.ts (自动提交)
├── utils/system-detector.ts (系统检测)

✅ 重构后: 插件化
src/
├── core/              # 核心框架（最小化）
│   └── initializer.ts (只负责协调插件)
├── plugin/            # 插件系统
│   ├── types.ts
│   ├── loader.ts
│   └── registry.ts
└── plugins/           # 功能插件
    ├── memory-system/
    ├── prompt-presets/
    ├── git/
    └── system-detector/
```

### 2. 交互式 CLI

**从参数式到对话式**

```bash
❌ 之前: 反人类的参数
claude-memory-init init --plugins memory-system,prompt-presets,git --config config.yaml

✅ 重构后: 对话式交互
$ claude-init init

📦 Select Features
  ◉ Prompt Presets
  ◉ Memory System
  ◯ Git Integration

[Space 选择, Enter 确认]
```

### 3. 动态步骤

**根据选择自动调整流程**

```
场景 1: 选了 2 个需要配置的插件
Step 1/5: Project Info
Step 2/5: Select Features
Step 3/5: Configure Plugin A
Step 4/5: Configure Plugin B
Step 5/5: Summary

场景 2: 只选了自动检测插件
Step 1/3: Project Info
Step 2/3: Select Features
Step 3/3: Summary (插件静默执行)
```

---

## 插件体系

### 插件列表

| 插件名 | 功能 | 需要配置 | 说明 |
|--------|------|----------|------|
| `prompt-presets` | 预设提示词 | ✅ 是 | 选择要安装的预设模板 |
| `memory-system` | 记忆系统 | ✅ 是 | 选择模板来源和记忆类型 |
| `git` | Git 操作 | ✅ 是 | Auto-commit + Remote sync |
| `system-detector` | 环境检测 | ❌ 否 | 自动检测 OS/Python/Node |

### 插件接口

```typescript
export interface Plugin {
  // 元信息
  meta: {
    name: string;
    version: string;
    description: string;
    recommended?: boolean;  // 默认是否勾选
  };

  // 配置流程
  configuration?: {
    needsConfiguration: boolean;  // 是否需要交互配置
    configure: (context) => Promise<PluginConfig>;
    getSummary: (config) => string[];
  };

  // 生命周期钩子
  hooks: {
    beforeInit?: (context) => Promise<void>;
    execute?: (context) => Promise<void>;
    afterInit?: (context) => Promise<void>;
  };

  // CLI 命令扩展
  commands?: PluginCommand[];
}
```

### Git 插件（整合）

将原本分散的 3 个功能整合为 1 个插件：

```typescript
git/
├── index.ts           // 插件主入口
├── auto-commit.ts     // 自动提交功能
├── remote-sync.ts     // 远程同步功能
└── gitignore.ts       // .gitignore 管理
```

**配置结构**:

```yaml
git:
  enabled: true
  options:
    # Auto-commit
    auto_commit: false
    commit_separately: true

    # Gitignore
    ignore_patterns:
      - "claude/temp/"

    # Remote sync
    remote_sync:
      enabled: false
      remote_url: "git@github.com:..."
      auto_pr: false
```

---

## 交互式设计

### 唯一的使用方式

```bash
# 只有这一个命令
claude-init init

# 无需任何参数，全程对话式引导
```

**为什么不需要其他模式？**

- ❌ 不需要 CI 模式 - 这是开发者本地工具
- ❌ 不需要配置文件 - 配置由交互生成
- ❌ 不需要快速模式 - 智能默认值已经很快
- ✅ 只需要交互 - 简单、直观、自带文档

### 完整流程

```
┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - Interactive Setup                        │
└─────────────────────────────────────────────────────────────┘

📋 Step 1/5: Project Information
────────────────────────────────────────
? Project name: › my-project
? Project description: › A web application


📦 Step 2/5: Select Features
────────────────────────────────────────
What features do you want to enable?

  ◉ Prompt Presets        Generate CLAUDE.md with preset prompts
  ◉ Memory System         Full semantic memory system
  ◯ Git Integration       Auto-commit and remote sync
  ◉ System Detection      Detect OS and dev tools

Selected: 3 features


📝 Step 3/5: Configure Prompt Presets
────────────────────────────────────────
Which presets would you like to install?

  ◉ Code Review
  ◉ Documentation
  ◯ Refactoring
  ◉ Architecture

Selected: 3 presets


📝 Step 4/5: Configure Memory System
────────────────────────────────────────
? Memory template source:
  ● Use default template (recommended)
  ○ Custom git repository
  ○ Local directory


✨ Step 5/5: Summary
────────────────────────────────────────
Project: my-project
Location: /home/user/my-project

Features:
  ✓ Prompt Presets (3 presets: code-review, documentation, architecture)
  ✓ Memory System (default template)
  ✓ System Detection (auto-detected: Ubuntu 22.04, Python 3.11, Node.js 20.10)

? Proceed with initialization? (Y/n) › Yes


🎉 Initialization complete!
────────────────────────────────────────
Files created:
  ✓ CLAUDE.md
  ✓ claude/config.yaml
  ✓ claude/prompts/code-review.md
  ✓ claude/prompts/documentation.md
  ✓ claude/prompts/architecture.md
  ✓ claude/memory/index/tags.json
  ✓ claude/memory/index/topics.json

Next steps:
  • Review CLAUDE.md and customize as needed
  • Start chatting with Claude in this project
  • Run 'claude-init add-preset' to add more presets
```

### UI 组件库

基于 `inquirer` 提供统一的交互组件：

```typescript
// 多选列表
ui.checkboxList(message, options)

// 单选列表
ui.radioList(message, options, defaultValue)

// 确认框
ui.confirm(message, defaultValue)

// 文本输入
ui.input(message, defaultValue, validate)

// 进度显示
new ProgressIndicator(steps)
```

---

## 使用场景

### 场景 1: 仅使用提示词预设

用户只想要 CLAUDE.md，不需要复杂的记忆系统。

**交互**:
```
📦 Select Features
  ◉ Prompt Presets
  ◯ Memory System
  ◯ Git Integration
  ◯ System Detection
```

**结果**:
```
Files created:
  ✓ CLAUDE.md
  ✓ claude/config.yaml
  ✓ claude/prompts/code-review.md
  ✓ claude/prompts/documentation.md
```

### 场景 2: 完整记忆系统

用户需要完整的记忆系统 + 预设 + 环境检测。

**交互**:
```
📦 Select Features
  ◉ Prompt Presets
  ◉ Memory System
  ◯ Git Integration
  ◉ System Detection
```

**结果**:
```
Files created:
  ✓ CLAUDE.md
  ✓ claude/config.yaml
  ✓ claude/prompts/...
  ✓ claude/memory/semantic/
  ✓ claude/memory/episodic/
  ✓ claude/memory/procedural/
  ✓ claude/memory/index/tags.json
  ✓ claude/memory/index/topics.json
  ✓ claude/system-info.yaml
```

### 场景 3: 团队协作 + Git 同步

团队共享记忆模板，需要远程同步功能。

**交互**:
```
📦 Select Features
  ◉ Memory System
  ◉ Git Integration

📝 Configure Git
? Enable remote sync? › Yes
? Remote URL: › git@github.com:team/memory-template.git
? Auto-create PR? › Yes
```

**后续使用**:
```bash
# 修改了 system memory 后同步
$ claude-init sync

🔄 Syncing with remote...
Found 2 changes in system memory
? Create PR? › Yes
✅ PR created: https://github.com/team/memory-template/pull/42
```

---

## 命令列表

所有命令都是交互式的：

```bash
# 初始化项目（核心命令）
claude-init init

# 强制重新初始化
claude-init init --force

# 添加新预设（打开选择器）
claude-init add-preset

# 同步到远程（交互式确认）
claude-init sync

# 修改配置（交互式编辑）
claude-init reconfigure

# 查看当前状态（只读）
claude-init status
```

---

## 配置文件格式

### 新的 YAML 格式

```yaml
# claude/config.yaml

# 项目信息
project:
  name: "my-project"
  description: "A web application"

# 输出配置
output:
  base_dir: "claude"

# 插件配置
plugins:
  prompt-presets:
    enabled: true
    options:
      presets:
        - code-review
        - documentation
        - architecture
      allow_custom: true

  memory-system:
    enabled: true
    options:
      template_source: "default"
      memory_types:
        - semantic
        - episodic
        - procedural

  git:
    enabled: false
    options:
      auto_commit: false
      commit_separately: true
      ignore_patterns:
        - "claude/temp/"
      remote_sync:
        enabled: false
        remote_url: ""
        auto_pr: false

  system-detector:
    enabled: true
    options:
      include_in_config: true
```

### 向后兼容

提供配置迁移工具自动转换旧格式：

```typescript
// src/core/config-migrator.ts

export async function migrateOldConfig(
  oldConfig: OldFullConfig
): Promise<NewCoreConfig> {
  // 自动映射旧配置到新插件格式
}
```

---

## 目录结构

### 重构后的项目结构

```
claude-memory-init/
├── src/
│   ├── core/                    # 核心框架（精简）
│   │   ├── initializer.ts       # 初始化协调器
│   │   ├── interactive-initializer.ts  # 交互式流程
│   │   ├── config.ts            # 配置管理
│   │   └── config-migrator.ts   # 配置迁移
│   │
│   ├── plugin/                  # 插件系统
│   │   ├── types.ts             # 插件接口定义
│   │   ├── loader.ts            # 插件加载器
│   │   ├── registry.ts          # 插件注册表
│   │   └── context.ts           # 插件上下文
│   │
│   ├── plugins/                 # 内置插件
│   │   ├── memory-system/
│   │   │   ├── index.ts
│   │   │   ├── configure.ts     # 配置流程
│   │   │   ├── template-copier.ts
│   │   │   └── index-manager.ts
│   │   │
│   │   ├── prompt-presets/
│   │   │   ├── index.ts
│   │   │   ├── configure.ts
│   │   │   └── presets/
│   │   │       ├── code-review.md
│   │   │       ├── documentation.md
│   │   │       ├── refactoring.md
│   │   │       ├── testing.md
│   │   │       └── architecture.md
│   │   │
│   │   ├── git/
│   │   │   ├── index.ts
│   │   │   ├── configure.ts
│   │   │   ├── auto-commit.ts
│   │   │   ├── remote-sync.ts
│   │   │   └── gitignore.ts
│   │   │
│   │   ├── system-detector/
│   │   │   ├── index.ts
│   │   │   ├── configure.ts
│   │   │   └── detectors/
│   │   │       ├── os.ts
│   │   │       ├── python.ts
│   │   │       └── node.ts
│   │   │
│   │   └── index.ts             # 导出所有内置插件
│   │
│   ├── prompts/                 # 交互式 UI 组件
│   │   └── components/
│   │       ├── checkbox-list.ts
│   │       ├── radio-list.ts
│   │       ├── confirm.ts
│   │       ├── input.ts
│   │       └── progress.ts
│   │
│   ├── i18n/                    # 国际化 ⭐ 新增
│   │   ├── index.ts             # i18n 初始化
│   │   ├── detector.ts          # 语言检测
│   │   ├── types.ts             # 类型定义
│   │   └── locales/
│   │       ├── en/              # 英文翻译
│   │       │   ├── common.json
│   │       │   ├── cli.json
│   │       │   ├── prompts.json
│   │       │   ├── plugins.json
│   │       │   └── errors.json
│   │       └── zh/              # 中文翻译
│   │           ├── common.json
│   │           ├── cli.json
│   │           ├── prompts.json
│   │           ├── plugins.json
│   │           └── errors.json
│   │
│   ├── utils/                   # 共享工具
│   │   ├── logger.ts
│   │   ├── file-ops.ts
│   │   └── template-engine.ts
│   │
│   ├── cli.ts                   # CLI 入口（极简）
│   └── index.ts
│
├── templates/                   # 模板文件
│   ├── memory-system/
│   └── prompt-presets/
│
├── docs/                        # 设计文档
│   ├── PLUGIN_ARCHITECTURE_REFACTOR.md
│   ├── INTERACTIVE_CLI_DESIGN.md
│   └── REFACTOR_SUMMARY.md (本文档)
│
├── mem/                         # 记忆模板 (submodule)
├── package.json
└── tsconfig.json
```

---

## 实施计划

### 阶段 1: 核心框架（2-3 天）

**目标**: 搭建插件系统骨架

- [ ] 定义插件接口 (`plugin/types.ts`)
- [ ] 实现插件加载器 (`plugin/loader.ts`)
- [ ] 实现插件注册表 (`plugin/registry.ts`)
- [ ] 实现插件上下文 (`plugin/context.ts`)
- [ ] 重构 `Initializer` 为插件协调器

**验收标准**: 能够注册和加载一个空插件

### 阶段 2: UI 组件库（1-2 天）

**目标**: 封装交互式 UI 组件

- [ ] 实现 `checkboxList` 组件
- [ ] 实现 `radioList` 组件
- [ ] 实现 `confirm` 组件
- [ ] 实现 `input` 组件
- [ ] 实现 `ProgressIndicator` 组件

**验收标准**: 能够使用组件库创建交互式流程

### 阶段 3: 交互式初始化器（2-3 天）

**目标**: 实现动态步骤的初始化流程

- [ ] 实现 `InteractiveInitializer`
- [ ] 实现动态步骤计算
- [ ] 实现项目信息收集
- [ ] 实现插件选择
- [ ] 实现插件配置循环
- [ ] 实现摘要和确认

**验收标准**: 能够完整走完交互流程（无实际功能）

### 阶段 4: 插件实现（5-7 天）

**目标**: 将现有功能迁移为插件

#### 4.1 System Detector 插件（1 天）
- [ ] 迁移系统检测代码
- [ ] 实现插件接口（`needsConfiguration: false`）
- [ ] 实现 `getSummary()` 方法
- [ ] 测试自动检测功能

#### 4.2 Prompt Presets 插件（2 天）
- [ ] 设计预设模板结构
- [ ] 创建内置预设（5-6 个）
- [ ] 实现配置流程（多选预设）
- [ ] 实现模板渲染和复制
- [ ] 实现 `add-preset` 命令

#### 4.3 Memory System 插件（2 天）
- [ ] 迁移现有记忆系统代码
- [ ] 实现配置流程（模板来源选择）
- [ ] 实现模板复制逻辑
- [ ] 实现索引文件初始化
- [ ] 保持与现有模板兼容

#### 4.4 Git 插件（2 天）
- [ ] 整合 auto-commit 功能
- [ ] 整合 remote-sync 功能
- [ ] 整合 gitignore 管理
- [ ] 实现配置流程（三个子功能）
- [ ] 实现 `sync` 命令

### 阶段 5: CLI 重构（1 天）

**目标**: 简化 CLI 入口

- [ ] 简化 `cli.ts` 为极简入口
- [ ] 移除所有旧的参数式命令
- [ ] 实现插件命令动态注册
- [ ] 更新帮助信息

### 阶段 6: 配置迁移（1-2 天）

**目标**: 支持从旧版本平滑升级

- [ ] 实现配置迁移工具
- [ ] 检测旧配置并自动转换
- [ ] 提供迁移报告
- [ ] 添加迁移测试用例

### 阶段 7: 国际化（i18n）（6-7 天）

**目标**: 添加多语言支持

- [ ] 安装 i18next 依赖
- [ ] 实现语言检测逻辑
- [ ] 创建所有命名空间的英文翻译
- [ ] 创建所有命名空间的中文翻译
- [ ] CLI 和插件集成 i18n
- [ ] 创建多语言模板文件
- [ ] 测试两种语言

详见：[I18N_DESIGN.md](./I18N_DESIGN.md)

### 阶段 8: 测试和文档（2-3 天）

**目标**: 确保质量和可用性

- [ ] 单元测试（插件系统）
- [ ] 集成测试（完整流程）
- [ ] i18n 完整性测试
- [ ] 更新 README.md
- [ ] 编写插件开发指南
- [ ] 创建示例插件
- [ ] 更新 CHANGELOG.md

### 阶段 9: 发布（1 天）

**目标**: 正式发布 v2.0

- [ ] 版本号升级到 2.0.0
- [ ] 打包和构建
- [ ] 发布到 npm（如果需要）
- [ ] 发布 GitHub Release
- [ ] 宣布重大更新（多语言支持）

**总计**: 21-28 天（4-5 周）

---

## 风险和挑战

### 技术风险

1. **向后兼容性**
   - **风险**: 现有用户的配置和工作流中断
   - **缓解**: 配置自动迁移 + 详细的迁移指南

2. **插件加载性能**
   - **风险**: 插件过多导致启动变慢
   - **缓解**: 懒加载 + 缓存机制

3. **交互式 UI 在不同终端的兼容性**
   - **风险**: 某些终端不支持 `inquirer` 的特性
   - **缓解**: 提供降级方案（纯文本交互）

### 用户体验风险

1. **学习曲线**
   - **风险**: 用户不适应新的交互方式
   - **缓解**: 清晰的视觉引导 + 智能默认值

2. **配置丢失**
   - **风险**: 重新初始化时丢失现有配置
   - **缓解**: 检测已初始化 + 提供重配置选项

---

## 成功指标

### 技术指标

- ✅ 代码行数减少 30%+（核心代码）
- ✅ 测试覆盖率 > 80%
- ✅ 插件系统 API 稳定
- ✅ 启动时间 < 1 秒

### 用户体验指标

- ✅ 新用户完成初始化时间 < 2 分钟
- ✅ 无需查阅文档即可完成配置
- ✅ 支持所有现有功能
- ✅ 配置文件自动迁移成功率 > 95%

---

## 附录

### 相关文档

1. [PLUGIN_ARCHITECTURE_REFACTOR.md](./PLUGIN_ARCHITECTURE_REFACTOR.md) - 插件化架构详细设计
2. [INTERACTIVE_CLI_DESIGN.md](./INTERACTIVE_CLI_DESIGN.md) - 交互式 CLI 详细设计
3. [I18N_DESIGN.md](./I18N_DESIGN.md) - 国际化（i18n）设计 ⭐ 新增

### 技术栈

- **CLI 框架**: Commander.js v12
- **交互式 UI**: Inquirer.js v9
- **进度显示**: Ora v8
- **彩色输出**: Chalk v5
- **Git 操作**: Simple-git v3
- **配置格式**: YAML v2
- **国际化**: i18next v23 + i18next-fs-backend v2
- **类型系统**: TypeScript v5

### 多语言支持

- **英语** (en) - 默认
- **简体中文** (zh)

详见：[I18N_DESIGN.md](./I18N_DESIGN.md)

### 参考项目

- `create-vite` - 简洁的交互式项目初始化
- `nx` - 强大的插件系统
- `eslint` - 灵活的配置和规则系统

---

**最后更新**: 2025-01-18
**负责人**: 待定
**评审状态**: ✅ 设计通过，待开始实施
