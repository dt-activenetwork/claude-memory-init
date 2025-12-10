# 国际化 (i18n) 实施指南

## 概述

为 `claude-init` CLI 工具添加多语言支持。

| 项目 | 说明 |
|------|------|
| 支持语言 | English (en, 默认), 简体中文 (zh) |
| 技术方案 | typesafe-i18n v5.26.2 |
| 状态 | ✅ **已实现** (v2.2.0-alpha) |
| 实现日期 | 2025-11-26 |

> **注意**：本文档为设计参考文档，实际实现已完成。代码位于 `src/i18n/` 目录。

---

## 第一部分：现有代码结构

> 本节描述实施前需要了解的现有代码结构。实施者应先阅读本节了解架构。

### 1.1 项目目录结构

```
src/
├── cli.ts                          # CLI 入口，Commander.js 配置
├── core/
│   ├── interactive-initializer.ts  # 交互式初始化主流程
│   ├── ui.ts                       # UI Facade (封装 inquirer)
│   ├── marker.ts                   # 项目标记文件管理
│   └── ...
├── plugin/
│   ├── types.ts                    # 插件系统类型定义 (含 I18nAPI)
│   ├── context.ts                  # 插件上下文创建 (含 i18n 占位)
│   ├── registry.ts                 # 插件注册表
│   └── loader.ts                   # 插件加载器
├── plugins/                        # 内置插件
│   ├── system-detector/index.ts    # 系统检测插件
│   ├── git/index.ts                # Git 集成插件
│   ├── memory-system/index.ts      # 记忆系统插件
│   ├── task-system/index.ts        # 任务系统插件
│   └── prompt-presets/index.ts     # 预设模板插件
├── prompts/
│   └── components/
│       └── progress.ts             # 进度条组件
└── utils/
    └── logger.ts                   # 日志工具
```

### 1.2 已有的 i18n 接口定义

**文件**: `src/plugin/types.ts`

项目已定义了 i18n 接口，但尚未实现：

```typescript
// 翻译参数类型
export type TranslationOptions = Record<string, string | number | boolean>;

// i18n API 接口
export interface I18nAPI {
  t: (key: string, options?: TranslationOptions) => string;
  language: string;
}

// 插件上下文（包含 i18n）
export interface PluginContext {
  projectRoot: string;
  targetDir: string;
  config: SharedConfig;
  shared: Map<string, SharedDataValue>;
  logger: Logger;
  fs: FileOperations;
  template: TemplateEngine;
  ui: UIComponents;
  i18n: I18nAPI;  // ← 已定义，待实现
}
```

### 1.3 已有的 i18n 占位实现

**文件**: `src/plugin/context.ts`

```typescript
export const createPluginContext = (
  projectRoot: string,
  targetDir: string,
  config: SharedConfig,
  ui?: UIComponents,
  i18n?: I18nAPI      // ← 已支持注入
): PluginContext => {
  // ...

  // 当前占位实现：直接返回 key
  const i18nWrapper: I18nAPI = i18n || {
    t: (key: string) => key,
    language: 'en'
  };

  return {
    // ...其他字段
    i18n: i18nWrapper
  };
};
```

**关键发现**: 架构已为 i18n 预留接口，只需：
1. 实现真正的 i18n 模块
2. 替换 `context.ts` 中的占位实现
3. 将硬编码字符串替换为 `i18n.t()` 调用

### 1.4 字符串分布统计

通过代码分析，需要国际化的字符串分布如下：

| 文件 | 字符串数 | 主要内容 |
|------|---------|----------|
| `src/cli.ts` | ~10 | CLI 名称、描述、选项说明 |
| `src/core/interactive-initializer.ts` | ~50 | 步骤标题、提示文本、确认消息、完成消息 |
| `src/plugins/system-detector/index.ts` | ~40 | 配置提示、检测结果、包管理器描述 |
| `src/plugins/git/index.ts` | ~50 | 配置提示、Git 规则 Markdown |
| `src/plugins/memory-system/index.ts` | ~35 | 记忆类型描述、斜杠命令说明 |
| `src/plugins/task-system/index.ts` | ~20 | 任务命令描述 |
| `src/plugins/prompt-presets/index.ts` | ~40 | 预设名称、描述 |
| `src/prompts/components/progress.ts` | ~8 | 进度步骤描述 |
| **总计** | **~250-300** | |

### 1.5 字符串使用模式

#### 模式 A: 直接日志输出

```typescript
// src/core/interactive-initializer.ts
logger.info('\nKeeping existing setup. No changes made.');
logger.warning('\n⚠️  This project is already initialized!\n');
```

#### 模式 B: UI 提示调用

```typescript
// src/core/interactive-initializer.ts
const name = await ui.input('Project name:', path.basename(process.cwd()));
const confirmed = await ui.confirm('Proceed with initialization?', true);
```

#### 模式 C: 选项列表

```typescript
// src/core/interactive-initializer.ts
const action = await ui.radioList(
  'What would you like to do?',
  [
    { name: 'Keep existing setup', value: 'keep', description: '(no changes)' },
    { name: 'Reconfigure', value: 'reconfigure', description: '(modify settings)' },
    { name: 'Reinitialize', value: 'reinitialize', description: '(start from scratch)' },
  ],
  'keep'
);
```

#### 模式 D: 插件元数据

```typescript
// src/plugins/system-detector/index.ts
export const systemDetectorPlugin: Plugin = {
  meta: {
    name: 'system-detector',
    commandName: 'system',
    version: '2.1.0',
    description: 'Configure system environment with two-layer memory',  // ← 需翻译
    recommended: true,
  },
  // ...
};
```

#### 模式 E: 动态字符串

```typescript
// src/plugins/system-detector/index.ts
logger.info(`✓ Python detected: ${pythonInfo.version}`);
logger.info(`  Available managers: ${pythonInfo.available_managers.join(', ')}`);
```

#### 模式 F: Markdown 文档生成

```typescript
// src/plugins/git/index.ts
function generateGitRulesMarkdown(options: GitPluginOptions): string {
  const sections: string[] = [];
  sections.push('# Git Operations Guide');
  sections.push('This document defines Git rules and workflows for this project.');
  // ...约 150 行 Markdown 生成代码
}
```

---

## 第二部分：技术选型

### 2.1 选择 typesafe-i18n

```bash
pnpm add -D typesafe-i18n
```

### 2.2 与 i18next 对比

| 特性 | typesafe-i18n | i18next |
|------|---------------|---------|
| 类型安全 | 编译时完整检查 | 需手动维护类型 |
| 运行时大小 | ~1KB gzipped | ~8KB gzipped |
| 外部依赖 | 无 | 有 |
| IDE 自动补全 | 完整支持 | 需插件 |
| 错误检测 | 编译时 | 运行时 |
| 代码生成 | 自动 | 无 |

### 2.3 typesafe-i18n 工作原理

```
┌─────────────────────────────────────────────────────────────────┐
│                     开发时 (Development)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  src/i18n/en/index.ts  ──┐                                      │
│  (Base Locale)           │                                      │
│                          ▼                                      │
│                   ┌──────────────┐                              │
│                   │  Generator   │  ← typesafe-i18n CLI         │
│                   └──────────────┘                              │
│                          │                                      │
│            ┌─────────────┼─────────────┐                        │
│            ▼             ▼             ▼                        │
│    i18n-types.ts   i18n-util.ts  formatters.ts                  │
│    (类型定义)      (工具函数)    (格式化器)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     运行时 (Runtime)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  import { t } from './i18n'                                     │
│                                                                 │
│  t().common.step({ current: 1, total: 5 })                      │
│       │                                                         │
│       ▼                                                         │
│  "Step 1/5" (en) 或 "步骤 1/5" (zh)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 typesafe-i18n 语法

#### 基本字符串

```typescript
// 定义
yes: 'Yes'

// 使用
L.common.yes  // → "Yes"
```

#### 参数插值

```typescript
// 定义 - {name:type} 格式
step: 'Step {current:number}/{total:number}'
greeting: 'Hello, {name:string}!'

// 使用
L.common.step({ current: 1, total: 5 })  // → "Step 1/5"
L.common.greeting({ name: 'Claude' })     // → "Hello, Claude!"
```

#### 复数形式

```typescript
// 定义 - {{singular|plural}} 格式
items: '{count:number} item{{s}}'

// 使用
L.common.items({ count: 1 })  // → "1 item"
L.common.items({ count: 3 })  // → "3 items"

// 更复杂的复数
files: '{{No files|One file|?? files}}'

// 使用
L.common.files({ count: 0 })  // → "No files"
L.common.files({ count: 1 })  // → "One file"
L.common.files({ count: 5 })  // → "5 files"
```

---

## 第三部分：目录结构设计

### 3.1 新增文件结构

```
src/
├── i18n/                           # 新增目录
│   ├── en/
│   │   └── index.ts                # 英文翻译 (Base Locale) [手动编写]
│   ├── zh/
│   │   └── index.ts                # 中文翻译 [手动编写]
│   ├── detector.ts                 # 语言检测 [手动编写]
│   ├── index.ts                    # 导出入口 [手动编写]
│   ├── formatters.ts               # 格式化器 [自动生成]
│   ├── i18n-types.ts               # 类型定义 [自动生成]
│   ├── i18n-util.ts                # 工具函数 [自动生成]
│   ├── i18n-util.sync.ts           # 同步加载 [自动生成]
│   └── i18n-node.ts                # Node 适配器 [自动生成]
└── ...
```

### 3.2 配置文件

**文件**: `.typesafe-i18n.json` (项目根目录)

```json
{
  "$schema": "https://unpkg.com/typesafe-i18n@5.26.2/schema/typesafe-i18n.json",
  "baseLocale": "en",
  "outputPath": "./src/i18n/",
  "outputFormat": "TypeScript",
  "adapter": "node",
  "esmImports": ".js"
}
```

---

## 第四部分：翻译 Key 结构设计

### 4.1 设计原则

1. **模块化**: 按功能模块组织，与代码结构对应
2. **层次化**: 使用嵌套对象，便于管理和自动补全
3. **语义化**: key 名称反映内容含义
4. **参数化**: 动态内容使用参数，避免字符串拼接

### 4.2 顶层结构

```typescript
const translations = {
  common: { ... },      // 通用文本 (是/否/确认等)
  cli: { ... },         // CLI 命令和选项
  prompts: { ... },     // 交互式提示
  plugins: {            // 插件相关
    systemDetector: { ... },
    git: { ... },
    memorySystem: { ... },
    taskSystem: { ... },
    promptPresets: { ... },
    claudeFlow: { ... },
  },
  errors: { ... },      // 错误消息
}
```

### 4.3 Key 命名约定

| 场景 | 命名模式 | 示例 |
|------|----------|------|
| 标题 | `xxxTitle` | `stepTitle`, `sectionTitle` |
| 描述 | `xxxDesc` / `description` | `featureDesc` |
| 问题 | `xxxQuestion` | `confirmQuestion` |
| 标签 | `xxxLabel` | `projectLabel` |
| 提示 | `xxxHint` / `xxxNote` | `pythonHint` |
| 选项 | `options.xxx` | `options.keep` |
| 状态 | `xxxEnabled` / `xxxDisabled` | `autoCommitEnabled` |

---

## 第五部分：完整翻译文件

### 5.1 英文翻译 (Base Locale)

**文件**: `src/i18n/en/index.ts`

```typescript
import type { BaseTranslation } from '../i18n-types.js';

const en = {
  // ════════════════════════════════════════════════════════════════
  // COMMON - 通用文本
  // ════════════════════════════════════════════════════════════════
  common: {
    // 基本操作
    yes: 'Yes',
    no: 'No',
    cancel: 'Cancel',
    confirm: 'Confirm',
    continue: 'Continue',
    skip: 'Skip',

    // 状态
    enabled: 'ENABLED',
    disabled: 'DISABLED',

    // 带参数的文本
    step: 'Step {current:number}/{total:number}',
    selected: 'Selected: {count:number} feature{{s}}',
    version: 'Version: {version:string}',
  },

  // ════════════════════════════════════════════════════════════════
  // CLI - 命令行界面
  // ════════════════════════════════════════════════════════════════
  cli: {
    name: 'claude-init',
    description: 'Initialize Claude Agent system in your project',
    version: '2.2.0',

    commands: {
      init: {
        description: 'Initialize Claude Agent system (interactive)',
        options: {
          force: 'Force re-initialization (overwrite existing files)',
          target: 'Target directory (default: current directory)',
        },
      },
    },

    errors: {
      initFailed: 'Initialization failed:',
      commandFailed: 'Command failed:',
      fatalError: 'Fatal error:',
    },
  },

  // ════════════════════════════════════════════════════════════════
  // PROMPTS - 交互式提示
  // ════════════════════════════════════════════════════════════════
  prompts: {
    // ─────────────────────────────────────────────────────────────
    // 头部横幅
    // ─────────────────────────────────────────────────────────────
    header: {
      title: 'Claude Init - Interactive Setup',
      banner: `
┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - Interactive Setup                        │
└─────────────────────────────────────────────────────────────┘`,
    },

    // ─────────────────────────────────────────────────────────────
    // 步骤 1: 项目信息
    // ─────────────────────────────────────────────────────────────
    projectInfo: {
      stepTitle: 'Project Information',
      projectName: 'Project name:',
      projectDescription: 'Project description:',
      defaultDescription: 'A project with Claude integration',
    },

    // ─────────────────────────────────────────────────────────────
    // 步骤 2: 插件选择
    // ─────────────────────────────────────────────────────────────
    pluginSelection: {
      stepTitle: 'Select Features',
      question: 'What features do you want to enable?',

      // 重量级插件提示
      heavyweightNote: 'Note: Some features are "heavyweight" plugins that run their own',
      heavyweightNote2: 'initialization commands and may modify existing files.',
      heavyweightWarning: 'Heavyweight plugins selected: {plugins:string}',
      heavyweightWarning2: 'These will run external initialization commands.',

      // 冲突处理
      conflictsWith: 'conflicts with: {plugins:string}',
      conflictResolution: 'Conflict resolution:',
      removed: 'Removed: {item:string}',
    },

    // ─────────────────────────────────────────────────────────────
    // 步骤 N: 插件配置
    // ─────────────────────────────────────────────────────────────
    pluginConfig: {
      stepTitle: 'Configure {pluginName:string}',
    },

    // ─────────────────────────────────────────────────────────────
    // 最后步骤: 摘要确认
    // ─────────────────────────────────────────────────────────────
    summary: {
      stepTitle: 'Summary',
      project: 'Project:',
      location: 'Location:',
      features: 'Features:',
      proceedQuestion: 'Proceed with initialization?',
    },

    // ─────────────────────────────────────────────────────────────
    // 已初始化处理
    // ─────────────────────────────────────────────────────────────
    alreadyInitialized: {
      warning: '⚠️  This project is already initialized!',
      projectLabel: 'Project: {name:string}',
      initializedLabel: 'Initialized: {date:string}',
      versionLabel: 'Version: {version:string}',
      question: 'What would you like to do?',
      options: {
        keep: 'Keep existing setup',
        keepDesc: '(no changes)',
        reconfigure: 'Reconfigure',
        reconfigureDesc: '(modify settings)',
        reinitialize: 'Reinitialize',
        reinitializeDesc: '(start from scratch)',
      },
      confirmReinit: 'This will overwrite existing files. Are you sure?',
    },

    // ─────────────────────────────────────────────────────────────
    // 完成消息
    // ─────────────────────────────────────────────────────────────
    completion: {
      title: '🎉 Initialization complete!',
      filesCreated: 'Files created:',
      slashCommands: 'Available slash commands:',
      nextSteps: 'Next steps:',
      nextStepItems: {
        review: 'Review {fileName:string} and customize as needed',
        startChat: 'Start chatting with Claude in this project',
        tryCommands: 'Try slash commands like /memory-search or /task-status',
        runHelp: "Run 'claude-init --help' for more commands",
      },
    },

    // ─────────────────────────────────────────────────────────────
    // 进度指示器
    // ─────────────────────────────────────────────────────────────
    progress: {
      creatingDirs: 'Creating directory structure',
      initLightweight: 'Initializing lightweight plugins',
      writingOutputs: 'Writing plugin outputs',
      generatingAgent: 'Generating AGENT.md',
      initHeavyweight: 'Initializing heavyweight plugins',
      finalizing: 'Finalizing setup',
      complete: 'Initialization complete!',
      failed: 'Initialization failed',
    },

    // ─────────────────────────────────────────────────────────────
    // 通用消息
    // ─────────────────────────────────────────────────────────────
    messages: {
      keepingExisting: 'Keeping existing setup. No changes made.',
      reconfigureNotImpl: 'Reconfiguration is not yet implemented.',
      noPluginsSelected: 'No plugins selected. Initialization cancelled.',
      cancelled: 'Initialization cancelled.',
      pluginNotFound: "Plugin '{name:string}' not found. Skipping.",
      userMemoryInit: 'Initialized: User Memory (~/.claude/)',
      fileCreated: 'Created: {path:string}',
      fileUpdated: 'Updated: {fileName:string} (appended new content)',
      fileGenerated: 'Generated: {fileName:string}',
    },

    // ─────────────────────────────────────────────────────────────
    // 重量级插件消息
    // ─────────────────────────────────────────────────────────────
    heavyweight: {
      issues: "Heavyweight plugin '{name:string}' had issues:",
      mergeError: 'File merge failed: {path:string} - {error:string}',
    },
  },

  // ════════════════════════════════════════════════════════════════
  // PLUGINS - 插件
  // ════════════════════════════════════════════════════════════════
  plugins: {
    // ─────────────────────────────────────────────────────────────
    // System Detector 插件
    // ─────────────────────────────────────────────────────────────
    systemDetector: {
      meta: {
        name: 'system-detector',
        description: 'Configure system environment with two-layer memory',
      },

      config: {
        sectionTitle: '[System Configuration]',
        projectSectionTitle: '[Project Configuration]',

        // 用户偏好
        foundPrefs: '✓ Found user preferences (~/.claude/)',
        firstTimeSetup: 'First time setup - detecting system...',

        // 检测结果
        osDetected: '✓ OS: {name:string} ({type:string})',
        systemPkgMgr: 'System package manager: {manager:string}',
        timezone: '✓ Timezone: {tz:string}',
        language: '✓ Language: {lang:string}',
        pythonDetected: '✓ Python detected: {version:string}',
        nodeDetected: '✓ Node.js detected: {version:string}',
        availableManagers: 'Available managers: {managers:string}',

        // 选择
        using: '→ Using: {manager:string}',
        selected: '→ Selected: {manager:string}',
        selectPythonManager: 'Select your preferred Python package manager:',
        selectNodeManager: 'Select your preferred Node.js package manager:',
        selectPythonForProject: 'Select Python package manager for this project:',
        selectNodeForProject: 'Select Node.js package manager for this project:',
        usePreferred: 'Use your preferred managers for this project?{pythonHint:string}{nodeHint:string}',
        pythonHint: ' (Python: {manager:string})',
        nodeHint: ' (Node: {manager:string})',

        // 状态
        preferredPython: 'Preferred Python manager: {manager:string}',
        preferredNode: 'Preferred Node manager: {manager:string}',
        notConfigured: '(not configured)',

        // 保存消息
        userPrefsSaved: 'User preferences saved to ~/.claude/system/preferences.toon',
        projectConfigSaved: 'Project configuration saved to .agent/system/config.toon',
      },

      // 包管理器描述
      managers: {
        python: {
          pip: 'Standard Python package installer',
          uv: '⚡ Ultra-fast Python package installer (recommended)',
          poetry: '📦 Dependency management and packaging',
          pipenv: '🔧 Virtual environments and dependencies',
          conda: '🐍 Package and environment management',
        },
        node: {
          npm: '📦 Standard Node.js package manager',
          pnpm: '⚡ Fast, disk space efficient (recommended)',
          yarn: '🧶 Fast, reliable, secure dependency manager',
          bun: '🔥 All-in-one JavaScript runtime and toolkit',
        },
      },

      // 生成的 AGENT.md 内容
      prompt: {
        systemEnvTitle: '## System Environment',
        osLabel: '**Operating System**: {name:string} ({type:string})',
        sysPkgMgrLabel: '**System Package Manager**: {manager:string}',
        pkgMgrTitle: '## Package Managers',
        useTheseManagers: 'Use these package managers for this project:',
        pythonLabel: '- **Python**: `{manager:string}`',
        nodeLabel: '- **Node.js**: `{manager:string}`',
        runtimeNote: '> Note: Runtime versions are detected dynamically. Use appropriate commands to check versions when needed.',
      },

      // 摘要
      summary: {
        os: 'OS: {name:string}',
        python: 'Python: {manager:string}',
        node: 'Node: {manager:string}',
      },
    },

    // ─────────────────────────────────────────────────────────────
    // Git 插件
    // ─────────────────────────────────────────────────────────────
    git: {
      meta: {
        name: 'git',
        description: 'Auto-commit and remote sync',
      },

      config: {
        notGitRepo: 'This directory is not a Git repository. Some features will be limited.',
        autoCommitQuestion: 'Enable auto-commit for memory system files?',
        commitSeparatelyQuestion: 'Commit memory files separately from other changes?',
        enableRemoteSync: 'Enable remote sync for system memory files?',
        remoteUrlPrompt: 'Remote template repository URL:',
        autoPrQuestion: 'Auto-create PRs when syncing?',
        prLabelPrompt: 'PR label for auto-created PRs:',
        aiGitOpsQuestion: 'Allow AI agent to perform Git operations?',
      },

      summary: {
        autoCommit: 'Auto-commit: {status:string}',
        separateCommits: '• Separate commits for memory files',
        remoteSync: 'Remote sync: {url:string}',
        autoPr: '• Auto-create PRs (label: {label:string})',
        aiOps: 'AI Git operations: {status:string}',
      },

      // Git 规则文档 (Markdown 生成)
      rules: {
        // 文档头
        title: '# Git Operations Guide',
        intro: 'This document defines Git rules and workflows for this project.',

        // Auto-Commit 部分
        autoCommitTitle: '## Auto-Commit',
        statusLine: '**Status**: {emoji:string} {status:string}',
        autoCommitEnabled: 'Memory system files are automatically committed after initialization.',
        autoCommitDisabled: 'Memory system files are NOT automatically committed.',
        manualCommit: 'You must commit changes manually using standard git commands.',

        commitStrategyTitle: '**Commit Strategy**:',
        separateStrategy: '- Memory system files (`.agent/` directory) are committed SEPARATELY',
        separateStrategyNote: '- This keeps memory updates isolated and easier to review',
        togetherStrategy: '- All changes are committed TOGETHER',
        togetherStrategyNote: '- Single commit includes memory and other modifications',

        commitMessageTitle: '**Commit Message Format**:',

        // Remote Sync 部分
        remoteSyncTitle: '## Remote Sync',
        repository: '**Repository**: `{url:string}`',
        syncDescription: 'System memory files can be synced to the remote template repository.',
        remoteSyncDisabled: 'Remote sync is not configured.',
        localOnly: 'System memory files remain local only.',

        whatGetsSyncedTitle: '**What Gets Synced**:',
        syncedSystem: '- ✅ `.agent/memory/system/` (team-shared knowledge)',
        notSyncedSemantic: '- ❌ `.agent/memory/semantic/` (project-specific)',
        notSyncedEpisodic: '- ❌ `.agent/memory/episodic/` (task history)',

        workflowTitle: '**Workflow**:',

        // AI Git Rules 部分
        aiRulesTitle: '## AI Agent Git Rules',
        aiCanOperate: '**Status**: ✅ AI CAN PERFORM GIT OPERATIONS',
        aiCannotOperate: '**Status**: ❌ AI CANNOT PERFORM GIT OPERATIONS',
        aiConstraints: 'The AI agent is permitted to use git with these constraints:',
        aiMustAsk: 'AI must ask permission before any Git operation.',

        allowedTitle: '**Allowed**:',
        allowedOps: {
          status: '- ✅ `git status` - Check repository status',
          add: '- ✅ `git add` - Stage files for commit',
          commit: '- ✅ `git commit` - Create commits with descriptive messages',
          push: '- ✅ `git push` - Push to remote branches',
          diff: '- ✅ `git diff` - View changes',
        },

        forbiddenTitle: '**Forbidden**:',
        forbiddenOps: {
          forceOps: '- ❌ `git push --force` - Never force push',
          resetHard: '- ❌ `git reset --hard` - Never hard reset',
          rebasePublic: '- ❌ Rebasing public/shared branches',
          deleteRemote: '- ❌ Deleting remote branches without permission',
        },
      },
    },

    // ─────────────────────────────────────────────────────────────
    // Memory System 插件
    // ─────────────────────────────────────────────────────────────
    memorySystem: {
      meta: {
        name: 'memory-system',
        description: 'Knowledge persistence with TOON indexes',
      },

      config: {
        enableTypesQuestion: 'Enable which memory types?',
        types: {
          semantic: {
            name: 'Semantic Memory',
            description: 'Stable knowledge and facts',
          },
          episodic: {
            name: 'Episodic Memory',
            description: 'Task history and records',
          },
        },
      },

      summary: {
        types: 'Memory types: {types:string}',
      },

      slashCommands: {
        search: {
          description: 'Search knowledge base',
          hint: '[query]',
        },
        add: {
          description: 'Add new memory entry',
          hint: '[type]',
        },
        index: {
          description: 'Rebuild memory indexes',
        },
        status: {
          description: 'Show memory system status',
        },
      },
    },

    // ─────────────────────────────────────────────────────────────
    // Task System 插件
    // ─────────────────────────────────────────────────────────────
    taskSystem: {
      meta: {
        name: 'task-system',
        description: 'Task state tracking and workflows',
      },

      slashCommands: {
        status: { description: 'Show current task status' },
        new: { description: 'Create new task', hint: '[name]' },
        complete: { description: 'Mark task as complete' },
        list: { description: 'List all tasks' },
        archive: { description: 'Archive completed tasks' },
        workflow: { description: 'Execute task workflow', hint: '[name]' },
        output: { description: 'Save task output', hint: '[filename]' },
        summary: { description: 'Generate task summary' },
      },
    },

    // ─────────────────────────────────────────────────────────────
    // Prompt Presets 插件
    // ─────────────────────────────────────────────────────────────
    promptPresets: {
      meta: {
        name: 'prompt-presets',
        description: 'Custom prompt templates',
      },

      config: {
        selectBasesQuestion: 'Select base mode presets:',
        selectEnhancementsQuestion: 'Select enhancement modules:',

        bases: {
          codeAssist: { name: 'Code Assistant', description: 'General coding help' },
          debugger: { name: 'Debugger', description: 'Problem diagnosis and fixing' },
          architect: { name: 'Architect', description: 'System design and planning' },
          reviewer: { name: 'Code Reviewer', description: 'Code quality and review' },
          documenter: { name: 'Documenter', description: 'Documentation generation' },
          tester: { name: 'Tester', description: 'Test generation and QA' },
        },

        enhancements: {
          thinkAloud: { name: 'Think Aloud', description: 'Show reasoning process' },
          stepByStep: { name: 'Step by Step', description: 'Break down complex tasks' },
          askFirst: { name: 'Ask First', description: 'Clarify before acting' },
          cautious: { name: 'Cautious', description: 'Extra safety checks' },
          verbose: { name: 'Verbose', description: 'Detailed explanations' },
          concise: { name: 'Concise', description: 'Brief responses' },
        },
      },

      summary: {
        bases: 'Base modes: {modes:string}',
        enhancements: 'Enhancements: {enhancements:string}',
      },
    },

    // ─────────────────────────────────────────────────────────────
    // Claude Flow 插件 (Heavyweight)
    // ─────────────────────────────────────────────────────────────
    claudeFlow: {
      meta: {
        name: 'claude-flow',
        description: 'AI orchestration with multi-agent support',
      },
    },
  },

  // ════════════════════════════════════════════════════════════════
  // ERRORS - 错误消息
  // ════════════════════════════════════════════════════════════════
  errors: {
    general: {
      unknownError: 'An unknown error occurred: {message:string}',
      fileNotFound: 'File not found: {path:string}',
      permissionDenied: 'Permission denied: {path:string}',
    },
    config: {
      loadFailed: 'Failed to load configuration: {message:string}',
      parseFailed: 'Failed to parse configuration: {message:string}',
      invalidConfig: 'Invalid configuration: {message:string}',
    },
    plugin: {
      notFound: "Plugin '{name:string}' not found",
      loadFailed: "Failed to load plugin '{name:string}': {message:string}",
      executeFailed: "Plugin '{name:string}' execution failed: {message:string}",
    },
    git: {
      notInstalled: 'Git is not installed or not in PATH',
      operationFailed: 'Git operation failed: {message:string}',
    },
    network: {
      fetchFailed: 'Network request failed: {message:string}',
      timeout: 'Request timed out after {ms:number}ms',
    },
  },
} satisfies BaseTranslation;

export default en;
```

### 5.2 中文翻译

**文件**: `src/i18n/zh/index.ts`

> 完整中文翻译见附录 A，结构与英文完全对应。

---

## 第六部分：核心模块实现

### 6.1 语言检测器

**文件**: `src/i18n/detector.ts`

**功能**: 检测用户语言偏好

**检测优先级**:
1. `CLAUDE_INIT_LANG` 环境变量（用户显式设置）
2. 系统 locale（`LANG`, `LANGUAGE`, `LC_ALL`, `LC_MESSAGES`）
3. 默认英语

```typescript
import type { Locales } from './i18n-types.js';

const SUPPORTED_LOCALES: readonly string[] = ['en', 'zh'];

/**
 * 检测用户语言偏好
 */
export function detectLocale(): Locales {
  // 1. 环境变量
  const envLang = process.env.CLAUDE_INIT_LANG;
  if (envLang) {
    const normalized = normalizeLocale(envLang);
    if (normalized) return normalized;
  }

  // 2. 系统 locale
  const systemLocale =
    process.env.LANG ||
    process.env.LANGUAGE ||
    process.env.LC_ALL ||
    process.env.LC_MESSAGES;

  if (systemLocale) {
    const normalized = normalizeLocale(systemLocale);
    if (normalized) return normalized;
  }

  // 3. 默认英语
  return 'en';
}

/**
 * 标准化 locale 字符串
 *
 * @example
 * normalizeLocale('zh_CN.UTF-8') // → 'zh'
 * normalizeLocale('en_US')       // → 'en'
 * normalizeLocale('fr')          // → null (不支持)
 */
function normalizeLocale(locale: string): Locales | null {
  const lang = locale.split(/[_.-]/)[0].toLowerCase();

  if (SUPPORTED_LOCALES.includes(lang)) {
    return lang as Locales;
  }

  return null;
}
```

### 6.2 i18n 入口模块

**文件**: `src/i18n/index.ts`

**功能**:
- 初始化 i18n 系统
- 提供全局翻译函数
- 桥接 typesafe-i18n 和现有 `I18nAPI` 接口

```typescript
import { loadAllLocales } from './i18n-util.sync.js';
import { i18n } from './i18n-util.js';
import { detectLocale } from './detector.js';
import type { Locales, TranslationFunctions } from './i18n-types.js';
import type { I18nAPI, TranslationOptions } from '../plugin/types.js';

// 同步加载所有语言（CLI 应用适用）
loadAllLocales();

// 当前状态
let currentLocale: Locales;
let L: TranslationFunctions;

/**
 * 初始化 i18n 系统
 *
 * 必须在使用任何翻译之前调用。
 * 通常在 CLI 入口点调用。
 */
export function initI18n(): TranslationFunctions {
  currentLocale = detectLocale();
  L = i18n()[currentLocale];
  return L;
}

/**
 * 获取当前语言
 */
export function getLocale(): Locales {
  return currentLocale;
}

/**
 * 运行时切换语言
 */
export function setLocale(locale: Locales): void {
  currentLocale = locale;
  L = i18n()[currentLocale];
}

/**
 * 获取当前语言的翻译函数
 *
 * @example
 * const L = t();
 * console.log(L.common.yes);  // "Yes" 或 "是"
 * console.log(L.common.step({ current: 1, total: 5 }));  // "Step 1/5"
 */
export function t(): TranslationFunctions {
  return L;
}

/**
 * 创建 I18nAPI 实例（用于插件上下文）
 *
 * 桥接 typesafe-i18n 和现有的 I18nAPI 接口。
 * 支持点分隔的 key 路径，如 'prompts.header.title'
 */
export function createI18nAPI(): I18nAPI {
  return {
    t: (key: string, options?: TranslationOptions): string => {
      // 导航嵌套 key，如 'prompts.header.title'
      const parts = key.split('.');
      let result: unknown = L;

      for (const part of parts) {
        if (result && typeof result === 'object' && part in result) {
          result = (result as Record<string, unknown>)[part];
        } else {
          return key; // key 不存在，返回原 key
        }
      }

      // 如果是函数（带参数的翻译），调用它
      if (typeof result === 'function') {
        return result(options || {});
      }

      // 如果是字符串，直接返回
      if (typeof result === 'string') {
        return result;
      }

      return key;
    },
    language: currentLocale,
  };
}

// 重新导出类型
export type { Locales, TranslationFunctions } from './i18n-types.js';
```

---

## 第七部分：代码修改指南

### 7.1 修改 `src/plugin/context.ts`

**修改内容**: 使用真正的 i18n 实现替换占位符

**修改位置**: 第 82-85 行

```typescript
// 添加导入 (文件顶部)
import { createI18nAPI } from '../i18n/index.js';

// 修改 createPluginContext 函数中的 i18n 创建部分
// 原代码:
const i18nWrapper: I18nAPI = i18n || {
  t: (key: string) => key,
  language: 'en'
};

// 修改为:
const i18nWrapper: I18nAPI = i18n || createI18nAPI();
```

### 7.2 修改 `src/cli.ts`

**修改内容**: 初始化 i18n 并使用翻译

**修改位置**: 文件开头和 Commander 配置

```typescript
// 1. 添加导入 (文件顶部，约第 7 行后)
import { initI18n, t } from './i18n/index.js';

// 2. 在 Commander 配置之前初始化 i18n (约第 16 行前)
initI18n();
const L = t();

// 3. 修改 Commander 配置 (约第 18-21 行)
// 原代码:
program
  .name('claude-init')
  .description('Initialize Claude Agent system in your project')
  .version('2.0.0');

// 修改为:
program
  .name(L.cli.name)
  .description(L.cli.description)
  .version(L.cli.version);

// 4. 修改 init 命令 (约第 28-31 行)
// 原代码:
program
  .command('init')
  .description('Initialize Claude Agent system (interactive)')
  .option('-f, --force', 'Force re-initialization (overwrite existing files)')
  .option('-t, --target <path>', 'Target directory (default: current directory)', process.cwd())

// 修改为:
program
  .command('init')
  .description(L.cli.commands.init.description)
  .option('-f, --force', L.cli.commands.init.options.force)
  .option('-t, --target <path>', L.cli.commands.init.options.target, process.cwd())

// 5. 修改错误消息 (约第 51-52 行)
// 原代码:
logger.error('❌ Initialization failed:');

// 修改为:
logger.error(`❌ ${L.cli.errors.initFailed}`);
```

### 7.3 修改 `src/core/interactive-initializer.ts`

**修改模式**: 每个方法开头获取 `L = t()`，替换所有硬编码字符串

**需要修改的方法列表**:

| 方法 | 行号范围 | 主要修改 |
|------|---------|----------|
| `printHeader` | 277-283 | 横幅文本 |
| `promptProjectInfo` | 288-302 | 步骤标题、提示文本 |
| `promptPluginSelection` | 310-371 | 步骤标题、问题、提示 |
| `resolveConflicts` | 400-445 | 冲突消息 |
| `configurePlugins` | 453-509 | 步骤标题 |
| `showSummaryAndConfirm` | 514-551 | 摘要标签、确认问题 |
| `handleAlreadyInitialized` | 193-246 | 警告、选项、确认 |
| `showCompletionMessage` | 841-872 | 完成标题、下一步 |
| `executeInitialization` | 560-682 | 进度步骤 |

**示例修改** (`printHeader`):

```typescript
// 原代码 (277-283):
private printHeader(): void {
  console.log(chalk.bold(`
┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - Interactive Setup                        │
└─────────────────────────────────────────────────────────────┘
  `));
}

// 修改为:
import { t } from '../i18n/index.js';  // 在文件顶部添加

private printHeader(): void {
  const L = t();
  console.log(chalk.bold(L.prompts.header.banner));
}
```

**示例修改** (`handleAlreadyInitialized`，节选):

```typescript
// 原代码 (199-229):
logger.warning('\n⚠️  This project is already initialized!\n');
if (markerInfo) {
  if (markerInfo.project_name) {
    logger.info(`Project: ${markerInfo.project_name}`);
  }
  logger.info(`Initialized: ${markerInfo.date}`);
  logger.info(`Version: ${markerInfo.version}\n`);
}

const action = await ui.radioList(
  'What would you like to do?',
  [
    { name: 'Keep existing setup', value: 'keep', description: '(no changes)' },
    { name: 'Reconfigure', value: 'reconfigure', description: '(modify settings)' },
    { name: 'Reinitialize', value: 'reinitialize', description: '(start from scratch)' },
  ],
  'keep'
);

// 修改为:
const L = t();
logger.warning(`\n${L.prompts.alreadyInitialized.warning}\n`);
if (markerInfo) {
  if (markerInfo.project_name) {
    logger.info(L.prompts.alreadyInitialized.projectLabel({ name: markerInfo.project_name }));
  }
  logger.info(L.prompts.alreadyInitialized.initializedLabel({ date: markerInfo.date }));
  logger.info(L.prompts.alreadyInitialized.versionLabel({ version: markerInfo.version }) + '\n');
}

const action = await ui.radioList(
  L.prompts.alreadyInitialized.question,
  [
    {
      name: L.prompts.alreadyInitialized.options.keep,
      value: 'keep',
      description: L.prompts.alreadyInitialized.options.keepDesc,
    },
    {
      name: L.prompts.alreadyInitialized.options.reconfigure,
      value: 'reconfigure',
      description: L.prompts.alreadyInitialized.options.reconfigureDesc,
    },
    {
      name: L.prompts.alreadyInitialized.options.reinitialize,
      value: 'reinitialize',
      description: L.prompts.alreadyInitialized.options.reinitializeDesc,
    },
  ],
  'keep'
);
```

### 7.4 修改插件文件

以 `src/plugins/system-detector/index.ts` 为例：

**需要修改的位置**:

| 位置 | 行号范围 | 修改内容 |
|------|---------|----------|
| 导入 | 1-29 | 添加 `import { t } from '../../i18n/index.js';` |
| `getPythonManagerDescription` | 247-256 | 使用 i18n 的描述 |
| `getNodeManagerDescription` | 258-266 | 使用 i18n 的描述 |
| `configure` 函数 | 284-457 | 所有日志和提示文本 |
| `getSummary` 函数 | 459-476 | 摘要文本 |
| `hooks.execute` | 479-492 | 日志消息 |
| `prompt.generate` | 495-532 | AGENT.md 内容 |

**示例修改** (`getPythonManagerDescription`):

```typescript
// 原代码 (247-256):
function getPythonManagerDescription(pm: string): string {
  const descriptions: Record<string, string> = {
    'pip': 'Standard Python package installer',
    'uv': '⚡ Ultra-fast Python package installer (recommended)',
    'poetry': '📦 Dependency management and packaging',
    'pipenv': '🔧 Virtual environments and dependencies',
    'conda': '🐍 Package and environment management',
  };
  return descriptions[pm] || '';
}

// 修改为:
function getPythonManagerDescription(pm: string): string {
  const L = t();
  const descriptions = L.plugins.systemDetector.managers.python;
  return descriptions[pm as keyof typeof descriptions] || '';
}
```

### 7.5 修改 Git 规则生成

**文件**: `src/plugins/git/index.ts`

**函数**: `generateGitRulesMarkdown` (约 46-170 行)

**修改策略**: 逐行替换，使用 i18n key

```typescript
// 原代码片段:
sections.push('# Git Operations Guide');
sections.push('');
sections.push('This document defines Git rules and workflows for this project.');

// 修改为:
const L = t();
sections.push(L.plugins.git.rules.title);
sections.push('');
sections.push(L.plugins.git.rules.intro);
```

---

## 第八部分：测试策略

### 8.1 新增测试文件

**文件**: `tests/unit/i18n/detector.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Language Detection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should detect from CLAUDE_INIT_LANG', async () => {
    process.env.CLAUDE_INIT_LANG = 'zh';
    const { detectLocale } = await import('../../../src/i18n/detector.js');
    expect(detectLocale()).toBe('zh');
  });

  it('should detect from LANG', async () => {
    delete process.env.CLAUDE_INIT_LANG;
    process.env.LANG = 'zh_CN.UTF-8';
    const { detectLocale } = await import('../../../src/i18n/detector.js');
    expect(detectLocale()).toBe('zh');
  });

  it('should normalize zh_CN.UTF-8 to zh', async () => {
    process.env.LANG = 'zh_CN.UTF-8';
    delete process.env.CLAUDE_INIT_LANG;
    const { detectLocale } = await import('../../../src/i18n/detector.js');
    expect(detectLocale()).toBe('zh');
  });

  it('should fallback to en for unsupported locale', async () => {
    process.env.CLAUDE_INIT_LANG = 'fr';
    const { detectLocale } = await import('../../../src/i18n/detector.js');
    expect(detectLocale()).toBe('en');
  });

  it('should default to en when no locale set', async () => {
    delete process.env.CLAUDE_INIT_LANG;
    delete process.env.LANG;
    delete process.env.LC_ALL;
    delete process.env.LANGUAGE;
    delete process.env.LC_MESSAGES;
    const { detectLocale } = await import('../../../src/i18n/detector.js');
    expect(detectLocale()).toBe('en');
  });
});
```

**文件**: `tests/unit/i18n/translations.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAllLocales } from '../../../src/i18n/i18n-util.sync.js';
import { i18n } from '../../../src/i18n/i18n-util.js';

describe('Translations', () => {
  beforeAll(() => {
    loadAllLocales();
  });

  it('should load all locales', () => {
    const L = i18n();
    expect(L.en).toBeDefined();
    expect(L.zh).toBeDefined();
  });

  it('should interpolate parameters correctly', () => {
    const L = i18n();
    expect(L.en.common.step({ current: 1, total: 5 })).toBe('Step 1/5');
    expect(L.zh.common.step({ current: 1, total: 5 })).toBe('步骤 1/5');
  });

  it('should have all critical keys in both locales', () => {
    const L = i18n();
    const criticalPaths = [
      ['common', 'yes'],
      ['cli', 'description'],
      ['prompts', 'header', 'title'],
      ['plugins', 'systemDetector', 'config', 'sectionTitle'],
    ];

    for (const path of criticalPaths) {
      let enValue: unknown = L.en;
      let zhValue: unknown = L.zh;
      for (const key of path) {
        enValue = (enValue as Record<string, unknown>)[key];
        zhValue = (zhValue as Record<string, unknown>)[key];
      }
      expect(enValue, `Missing en.${path.join('.')}`).toBeDefined();
      expect(zhValue, `Missing zh.${path.join('.')}`).toBeDefined();
    }
  });
});
```

### 8.2 BDD 测试修改

**问题**: 现有 BDD 测试使用字符串匹配来 mock UI 响应，翻译后会失败。

**解决方案**: 改为基于调用顺序

```typescript
// 原代码 (会在翻译后失败):
sinon.stub(ui, 'input').callsFake(async (message) => {
  if (message.includes('Project name')) return 'test-project';
  if (message.includes('Project description')) return 'Test description';
  return '';
});

// 修改为 (基于调用顺序):
let inputCallCount = 0;
sinon.stub(ui, 'input').callsFake(async () => {
  const responses = ['test-project', 'Test description'];
  return responses[inputCallCount++] || '';
});
```

---

## 第九部分：实施步骤

### Phase 1: 基础设施 (Day 1)

```bash
# 1. 安装依赖
pnpm add -D typesafe-i18n

# 2. 创建配置文件 .typesafe-i18n.json

# 3. 创建目录结构
mkdir -p src/i18n/en src/i18n/zh

# 4. 创建 src/i18n/en/index.ts

# 5. 运行 generator
npx typesafe-i18n

# 6. 创建 src/i18n/detector.ts 和 src/i18n/index.ts
```

### Phase 2: 核心模块 (Day 2)

1. 修改 `src/plugin/context.ts`
2. 修改 `src/cli.ts`
3. 修改 `src/core/interactive-initializer.ts`
4. 验证英文界面正常

### Phase 3: 插件 (Day 2-3)

按顺序修改：
1. `src/plugins/system-detector/index.ts`
2. `src/plugins/git/index.ts`
3. `src/plugins/memory-system/index.ts`
4. `src/plugins/task-system/index.ts`
5. `src/plugins/prompt-presets/index.ts`

### Phase 4: 中文翻译 (Day 3)

1. 创建 `src/i18n/zh/index.ts`
2. 运行 generator 更新类型
3. 验证中文界面

### Phase 5: 测试 (Day 4)

1. 编写 i18n 单元测试
2. 更新 BDD 测试 mock
3. 运行完整测试套件

### Phase 6: 文档 (Day 4-5)

1. 更新 `package.json` scripts
2. 更新 README.md

---

## 第十部分：开发指南

### 10.1 package.json scripts

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:watch typesafe-i18n",
    "dev:watch": "vite build --watch",
    "typesafe-i18n": "typesafe-i18n",
    "i18n:generate": "typesafe-i18n --no-watch",
    "build": "pnpm i18n:generate && vite build"
  }
}
```

### 10.2 添加新翻译的工作流

```
1. 修改 src/i18n/en/index.ts 添加新 key
              ↓
2. 运行 pnpm typesafe-i18n (自动更新类型)
              ↓
3. 修改 src/i18n/zh/index.ts 添加对应翻译
   (IDE 会提示缺失的 key)
              ↓
4. 在代码中使用:
   const L = t();
   L.your.new.key({ param: value })
```

### 10.3 测试不同语言

```bash
# 测试中文
CLAUDE_INIT_LANG=zh pnpm start

# 测试英文
CLAUDE_INIT_LANG=en pnpm start
```

---

## 附录 A: 中文翻译完整版

**文件**: `src/i18n/zh/index.ts`

```typescript
import type { Translation } from '../i18n-types.js';

const zh = {
  common: {
    yes: '是',
    no: '否',
    cancel: '取消',
    confirm: '确认',
    continue: '继续',
    skip: '跳过',
    enabled: '已启用',
    disabled: '已禁用',
    step: '步骤 {current}/{total}',
    selected: '已选择: {count} 个功能',
    version: '版本: {version}',
  },

  cli: {
    name: 'claude-init',
    description: '在你的项目中初始化 Claude Agent 系统',
    version: '2.2.0',
    commands: {
      init: {
        description: '初始化 Claude Agent 系统（交互式）',
        options: {
          force: '强制重新初始化（覆盖现有文件）',
          target: '目标目录（默认：当前目录）',
        },
      },
    },
    errors: {
      initFailed: '初始化失败：',
      commandFailed: '命令失败：',
      fatalError: '致命错误：',
    },
  },

  prompts: {
    header: {
      title: 'Claude Init - 交互式设置',
      banner: `
┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - 交互式设置                                │
└─────────────────────────────────────────────────────────────┘`,
    },
    projectInfo: {
      stepTitle: '项目信息',
      projectName: '项目名称：',
      projectDescription: '项目描述：',
      defaultDescription: '一个集成 Claude 的项目',
    },
    pluginSelection: {
      stepTitle: '选择功能',
      question: '你想启用哪些功能？',
      heavyweightNote: '注意：部分功能是"重量级"插件，会运行自己的',
      heavyweightNote2: '初始化命令，可能会修改现有文件。',
      heavyweightWarning: '已选择重量级插件：{plugins}',
      heavyweightWarning2: '这些插件会运行外部初始化命令。',
      conflictsWith: '与 {plugins} 冲突',
      conflictResolution: '冲突解决：',
      removed: '已移除：{item}',
    },
    pluginConfig: {
      stepTitle: '配置 {pluginName}',
    },
    summary: {
      stepTitle: '摘要',
      project: '项目：',
      location: '位置：',
      features: '功能：',
      proceedQuestion: '继续初始化？',
    },
    alreadyInitialized: {
      warning: '⚠️  此项目已经初始化！',
      projectLabel: '项目：{name}',
      initializedLabel: '初始化时间：{date}',
      versionLabel: '版本：{version}',
      question: '你想做什么？',
      options: {
        keep: '保持现有设置',
        keepDesc: '（不做更改）',
        reconfigure: '重新配置',
        reconfigureDesc: '（修改设置）',
        reinitialize: '重新初始化',
        reinitializeDesc: '（从头开始）',
      },
      confirmReinit: '这将覆盖现有文件。确定吗？',
    },
    completion: {
      title: '🎉 初始化完成！',
      filesCreated: '已创建文件：',
      slashCommands: '可用的斜杠命令：',
      nextSteps: '下一步：',
      nextStepItems: {
        review: '查看 {fileName} 并按需自定义',
        startChat: '在此项目中开始与 Claude 对话',
        tryCommands: '尝试斜杠命令，如 /memory-search 或 /task-status',
        runHelp: "运行 'claude-init --help' 查看更多命令",
      },
    },
    progress: {
      creatingDirs: '创建目录结构',
      initLightweight: '初始化轻量级插件',
      writingOutputs: '写入插件输出',
      generatingAgent: '生成 AGENT.md',
      initHeavyweight: '初始化重量级插件',
      finalizing: '完成设置',
      complete: '初始化完成！',
      failed: '初始化失败',
    },
    messages: {
      keepingExisting: '保持现有设置。未做更改。',
      reconfigureNotImpl: '重新配置功能尚未实现。',
      noPluginsSelected: '未选择任何插件。初始化已取消。',
      cancelled: '初始化已取消。',
      pluginNotFound: "未找到插件 '{name}'。已跳过。",
      userMemoryInit: '已初始化：用户记忆 (~/.claude/)',
      fileCreated: '已创建：{path}',
      fileUpdated: '已更新：{fileName}（追加了新内容）',
      fileGenerated: '已生成：{fileName}',
    },
    heavyweight: {
      issues: "重量级插件 '{name}' 出现问题：",
      mergeError: '文件合并失败：{path} - {error}',
    },
  },

  plugins: {
    systemDetector: {
      meta: {
        name: 'system-detector',
        description: '配置系统环境（双层记忆架构）',
      },
      config: {
        sectionTitle: '[系统配置]',
        projectSectionTitle: '[项目配置]',
        foundPrefs: '✓ 找到用户偏好 (~/.claude/)',
        firstTimeSetup: '首次设置 - 检测系统中...',
        osDetected: '✓ 操作系统：{name} ({type})',
        systemPkgMgr: '系统包管理器：{manager}',
        timezone: '✓ 时区：{tz}',
        language: '✓ 语言：{lang}',
        pythonDetected: '✓ 检测到 Python：{version}',
        nodeDetected: '✓ 检测到 Node.js：{version}',
        availableManagers: '可用管理器：{managers}',
        using: '→ 使用：{manager}',
        selected: '→ 已选择：{manager}',
        selectPythonManager: '选择你首选的 Python 包管理器：',
        selectNodeManager: '选择你首选的 Node.js 包管理器：',
        selectPythonForProject: '选择此项目的 Python 包管理器：',
        selectNodeForProject: '选择此项目的 Node.js 包管理器：',
        usePreferred: '在此项目中使用你的首选管理器？{pythonHint}{nodeHint}',
        pythonHint: '（Python：{manager}）',
        nodeHint: '（Node：{manager}）',
        preferredPython: '首选 Python 管理器：{manager}',
        preferredNode: '首选 Node 管理器：{manager}',
        notConfigured: '（未配置）',
        userPrefsSaved: '用户偏好已保存到 ~/.claude/system/preferences.toon',
        projectConfigSaved: '项目配置已保存到 .agent/system/config.toon',
      },
      managers: {
        python: {
          pip: '标准 Python 包安装器',
          uv: '⚡ 超快速 Python 包安装器（推荐）',
          poetry: '📦 依赖管理和打包工具',
          pipenv: '🔧 虚拟环境和依赖管理',
          conda: '🐍 包和环境管理',
        },
        node: {
          npm: '📦 标准 Node.js 包管理器',
          pnpm: '⚡ 快速、节省磁盘空间（推荐）',
          yarn: '🧶 快速、可靠、安全的依赖管理器',
          bun: '🔥 一体化 JavaScript 运行时和工具包',
        },
      },
      prompt: {
        systemEnvTitle: '## 系统环境',
        osLabel: '**操作系统**：{name} ({type})',
        sysPkgMgrLabel: '**系统包管理器**：{manager}',
        pkgMgrTitle: '## 包管理器',
        useTheseManagers: '在此项目中使用以下包管理器：',
        pythonLabel: '- **Python**：`{manager}`',
        nodeLabel: '- **Node.js**：`{manager}`',
        runtimeNote: '> 注意：运行时版本是动态检测的。需要时请使用相应命令检查版本。',
      },
      summary: {
        os: '操作系统：{name}',
        python: 'Python：{manager}',
        node: 'Node：{manager}',
      },
    },

    git: {
      meta: {
        name: 'git',
        description: '自动提交和远程同步',
      },
      config: {
        notGitRepo: '此目录不是 Git 仓库。部分功能将受限。',
        autoCommitQuestion: '为记忆系统文件启用自动提交？',
        commitSeparatelyQuestion: '将记忆文件与其他更改分开提交？',
        enableRemoteSync: '启用系统记忆文件的远程同步？',
        remoteUrlPrompt: '远程模板仓库 URL：',
        autoPrQuestion: '同步时自动创建 PR？',
        prLabelPrompt: '自动创建 PR 的标签：',
        aiGitOpsQuestion: '允许 AI 助手执行 Git 操作？',
      },
      summary: {
        autoCommit: '自动提交：{status}',
        separateCommits: '• 记忆文件单独提交',
        remoteSync: '远程同步：{url}',
        autoPr: '• 自动创建 PR（标签：{label}）',
        aiOps: 'AI Git 操作：{status}',
      },
      rules: {
        title: '# Git 操作指南',
        intro: '本文档定义了此项目的 Git 规则和工作流。',
        autoCommitTitle: '## 自动提交',
        statusLine: '**状态**：{emoji} {status}',
        autoCommitEnabled: '初始化后会自动提交记忆系统文件。',
        autoCommitDisabled: '记忆系统文件不会自动提交。',
        manualCommit: '你需要使用标准 git 命令手动提交更改。',
        commitStrategyTitle: '**提交策略**：',
        separateStrategy: '- 记忆系统文件（`.agent/` 目录）会单独提交',
        separateStrategyNote: '- 这样可以使记忆更新隔离，便于审查',
        togetherStrategy: '- 所有更改一起提交',
        togetherStrategyNote: '- 单次提交包含记忆和其他修改',
        commitMessageTitle: '**提交消息格式**：',
        remoteSyncTitle: '## 远程同步',
        repository: '**仓库**：`{url}`',
        syncDescription: '系统记忆文件可以同步到远程模板仓库。',
        remoteSyncDisabled: '远程同步未配置。',
        localOnly: '系统记忆文件仅保留在本地。',
        whatGetsSyncedTitle: '**同步内容**：',
        syncedSystem: '- ✅ `.agent/memory/system/`（团队共享知识）',
        notSyncedSemantic: '- ❌ `.agent/memory/semantic/`（项目特定）',
        notSyncedEpisodic: '- ❌ `.agent/memory/episodic/`（任务历史）',
        workflowTitle: '**工作流**：',
        aiRulesTitle: '## AI 助手 Git 规则',
        aiCanOperate: '**状态**：✅ AI 可以执行 GIT 操作',
        aiCannotOperate: '**状态**：❌ AI 不能执行 GIT 操作',
        aiConstraints: 'AI 助手被允许使用 git，但有以下限制：',
        aiMustAsk: 'AI 必须在执行任何 Git 操作前请求许可。',
        allowedTitle: '**允许**：',
        allowedOps: {
          status: '- ✅ `git status` - 检查仓库状态',
          add: '- ✅ `git add` - 暂存文件',
          commit: '- ✅ `git commit` - 创建提交',
          push: '- ✅ `git push` - 推送到远程分支',
          diff: '- ✅ `git diff` - 查看更改',
        },
        forbiddenTitle: '**禁止**：',
        forbiddenOps: {
          forceOps: '- ❌ `git push --force` - 禁止强制推送',
          resetHard: '- ❌ `git reset --hard` - 禁止硬重置',
          rebasePublic: '- ❌ 变基公共/共享分支',
          deleteRemote: '- ❌ 未经许可删除远程分支',
        },
      },
    },

    memorySystem: {
      meta: {
        name: 'memory-system',
        description: '使用 TOON 索引的知识持久化',
      },
      config: {
        enableTypesQuestion: '启用哪些记忆类型？',
        types: {
          semantic: { name: '语义记忆', description: '稳定的知识和事实' },
          episodic: { name: '情节记忆', description: '任务历史和记录' },
        },
      },
      summary: { types: '记忆类型：{types}' },
      slashCommands: {
        search: { description: '搜索知识库', hint: '[查询]' },
        add: { description: '添加新记忆条目', hint: '[类型]' },
        index: { description: '重建记忆索引' },
        status: { description: '显示记忆系统状态' },
      },
    },

    taskSystem: {
      meta: {
        name: 'task-system',
        description: '任务状态跟踪和工作流',
      },
      slashCommands: {
        status: { description: '显示当前任务状态' },
        new: { description: '创建新任务', hint: '[名称]' },
        complete: { description: '标记任务完成' },
        list: { description: '列出所有任务' },
        archive: { description: '归档已完成任务' },
        workflow: { description: '执行任务工作流', hint: '[名称]' },
        output: { description: '保存任务输出', hint: '[文件名]' },
        summary: { description: '生成任务摘要' },
      },
    },

    promptPresets: {
      meta: {
        name: 'prompt-presets',
        description: '自定义提示词模板',
      },
      config: {
        selectBasesQuestion: '选择基础模式预设：',
        selectEnhancementsQuestion: '选择增强模块：',
        bases: {
          codeAssist: { name: '代码助手', description: '通用编码帮助' },
          debugger: { name: '调试器', description: '问题诊断和修复' },
          architect: { name: '架构师', description: '系统设计和规划' },
          reviewer: { name: '代码审查员', description: '代码质量和审查' },
          documenter: { name: '文档撰写者', description: '文档生成' },
          tester: { name: '测试员', description: '测试生成和质量保证' },
        },
        enhancements: {
          thinkAloud: { name: '思考过程', description: '展示推理过程' },
          stepByStep: { name: '逐步执行', description: '分解复杂任务' },
          askFirst: { name: '先问后做', description: '行动前先确认' },
          cautious: { name: '谨慎模式', description: '额外的安全检查' },
          verbose: { name: '详细模式', description: '详细的解释' },
          concise: { name: '简洁模式', description: '简短的回复' },
        },
      },
      summary: {
        bases: '基础模式：{modes}',
        enhancements: '增强模块：{enhancements}',
      },
    },

    claudeFlow: {
      meta: {
        name: 'claude-flow',
        description: '多智能体编排支持',
      },
    },
  },

  errors: {
    general: {
      unknownError: '发生未知错误：{message}',
      fileNotFound: '文件未找到：{path}',
      permissionDenied: '权限被拒绝：{path}',
    },
    config: {
      loadFailed: '加载配置失败：{message}',
      parseFailed: '解析配置失败：{message}',
      invalidConfig: '配置无效：{message}',
    },
    plugin: {
      notFound: "未找到插件 '{name}'",
      loadFailed: "加载插件 '{name}' 失败：{message}",
      executeFailed: "插件 '{name}' 执行失败：{message}",
    },
    git: {
      notInstalled: 'Git 未安装或不在 PATH 中',
      operationFailed: 'Git 操作失败：{message}',
    },
    network: {
      fetchFailed: '网络请求失败：{message}',
      timeout: '请求超时（{ms}ms）',
    },
  },
} satisfies Translation;

export default zh;
```

---

## 附录 B: 不翻译的内容

| 类型 | 示例 | 原因 |
|------|------|------|
| CLI 参数名 | `--force`, `--target` | 保持命令行一致性 |
| 文件路径 | `.agent/`, `~/.claude/` | 技术标识 |
| 日期格式 | ISO 8601 | 国际标准 |
| 命令名 | `git status`, `npm install` | 技术命令 |
| Emoji | ✅ ❌ ⚠️ 🚀 | 通用符号 |

---

## 附录 C: 参考资料

- [typesafe-i18n GitHub](https://github.com/ivanhofer/typesafe-i18n)
- [typesafe-i18n 文档](https://typesafe-i18n.pages.dev/)

---

**文档版本**: 1.0
**最后更新**: 2025-11-26
**状态**: 设计完成，待实施
