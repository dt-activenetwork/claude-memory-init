# 国际化 (i18n) 设计方案

## 概述

为 `claude-init` 添加多语言支持，初期支持英语和中文。

**支持语言**:
- `en` - English (默认)
- `zh` - 简体中文

---

## 技术选型

### 选择 i18next

```json
{
  "dependencies": {
    "i18next": "^23.7.0",
    "i18next-fs-backend": "^2.3.0"
  }
}
```

**为什么选择 i18next？**
- ✅ 成熟稳定，CLI 工具广泛使用
- ✅ 支持命名空间（namespace）组织翻译
- ✅ 支持插值和复数形式
- ✅ 轻量级，无运行时依赖

---

## 语言检测策略

### 检测顺序

```typescript
// src/i18n/detector.ts

export function detectLanguage(): string {
  // 1. 环境变量（用户显式设置）
  if (process.env.CLAUDE_INIT_LANG) {
    return normalizeLocale(process.env.CLAUDE_INIT_LANG);
  }

  // 2. 系统语言
  const systemLocale = process.env.LANG ||
                       process.env.LANGUAGE ||
                       process.env.LC_ALL ||
                       process.env.LC_MESSAGES;

  if (systemLocale) {
    return normalizeLocale(systemLocale);
  }

  // 3. 默认英语
  return 'en';
}

function normalizeLocale(locale: string): string {
  // zh_CN.UTF-8 -> zh
  // en_US -> en
  const lang = locale.split(/[_.-]/)[0].toLowerCase();

  // 支持的语言列表
  const supported = ['en', 'zh'];

  return supported.includes(lang) ? lang : 'en';
}
```

### 用户切换语言

```bash
# 方式 1: 环境变量
export CLAUDE_INIT_LANG=zh
claude-init init

# 方式 2: 临时设置
CLAUDE_INIT_LANG=en claude-init init

# 方式 3: 配置文件（未来）
# claude/config.yaml
language: zh
```

---

## 翻译文件结构

### 目录结构

```
src/
└── i18n/
    ├── index.ts              # i18n 初始化
    ├── detector.ts           # 语言检测
    ├── locales/
    │   ├── en/
    │   │   ├── common.json   # 通用文案
    │   │   ├── cli.json      # CLI 命令和参数
    │   │   ├── prompts.json  # 交互式提示
    │   │   ├── plugins.json  # 插件相关
    │   │   └── errors.json   # 错误信息
    │   └── zh/
    │       ├── common.json
    │       ├── cli.json
    │       ├── prompts.json
    │       ├── plugins.json
    │       └── errors.json
    └── types.ts              # TypeScript 类型定义
```

### 命名空间划分

| 命名空间 | 用途 | 示例 |
|---------|------|------|
| `common` | 通用文案 | 确认、取消、成功、失败 |
| `cli` | CLI 相关 | 命令描述、参数说明 |
| `prompts` | 交互提示 | 问题、选项、提示文字 |
| `plugins` | 插件相关 | 插件名称、描述、配置 |
| `errors` | 错误信息 | 错误提示、警告 |

---

## 翻译文件内容

### 1. common.json

**en/common.json**:
```json
{
  "yes": "Yes",
  "no": "No",
  "cancel": "Cancel",
  "confirm": "Confirm",
  "continue": "Continue",
  "skip": "Skip",
  "next": "Next",
  "back": "Back",
  "done": "Done",
  "success": "Success",
  "failed": "Failed",
  "warning": "Warning",
  "error": "Error",
  "loading": "Loading...",
  "step": "Step {{current}}/{{total}}",
  "selected": "Selected: {{count}} items",
  "selected_plural": "Selected: {{count}} items"
}
```

**zh/common.json**:
```json
{
  "yes": "是",
  "no": "否",
  "cancel": "取消",
  "confirm": "确认",
  "continue": "继续",
  "skip": "跳过",
  "next": "下一步",
  "back": "返回",
  "done": "完成",
  "success": "成功",
  "failed": "失败",
  "warning": "警告",
  "error": "错误",
  "loading": "加载中...",
  "step": "步骤 {{current}}/{{total}}",
  "selected": "已选择：{{count}} 项",
  "selected_plural": "已选择：{{count}} 项"
}
```

### 2. cli.json

**en/cli.json**:
```json
{
  "description": "Interactive CLI for setting up Claude in your projects",
  "commands": {
    "init": {
      "description": "Initialize Claude in your project",
      "options": {
        "force": "Reinitialize even if already initialized"
      }
    },
    "add-preset": {
      "description": "Add a new prompt preset"
    },
    "sync": {
      "description": "Sync with remote template"
    },
    "reconfigure": {
      "description": "Modify current configuration"
    },
    "status": {
      "description": "Show current configuration"
    }
  }
}
```

**zh/cli.json**:
```json
{
  "description": "为项目设置 Claude 的交互式命令行工具",
  "commands": {
    "init": {
      "description": "在你的项目中初始化 Claude",
      "options": {
        "force": "即使已初始化也强制重新初始化"
      }
    },
    "add-preset": {
      "description": "添加新的预设模板"
    },
    "sync": {
      "description": "与远程模板同步"
    },
    "reconfigure": {
      "description": "修改当前配置"
    },
    "status": {
      "description": "显示当前配置"
    }
  }
}
```

### 3. prompts.json

**en/prompts.json**:
```json
{
  "header": "🚀 Claude Init - Interactive Setup",
  "steps": {
    "projectInfo": {
      "title": "Project Information",
      "projectName": "Project name:",
      "projectDescription": "Project description:"
    },
    "selectFeatures": {
      "title": "Select Features",
      "question": "What features do you want to enable?",
      "hint": "(Use ↑↓ to move, Space to select, Enter to confirm)"
    },
    "configure": {
      "title": "Configure {{pluginName}}"
    },
    "summary": {
      "title": "Summary",
      "project": "Project: {{name}}",
      "location": "Location: {{path}}",
      "features": "Features:",
      "proceed": "Proceed with initialization?"
    }
  },
  "complete": {
    "title": "🎉 Initialization complete!",
    "filesCreated": "Files created:",
    "nextSteps": "Next steps:",
    "nextStepItems": {
      "review": "Review CLAUDE.md and customize as needed",
      "start": "Start chatting with Claude in this project",
      "addPreset": "Run 'claude-init add-preset' to add more presets"
    }
  },
  "alreadyInitialized": {
    "warning": "⚠️  This project is already initialized!",
    "info": "Project: {{name}}",
    "date": "Initialized: {{date}}",
    "question": "What would you like to do?",
    "options": {
      "keep": "Keep existing setup",
      "reconfigure": "Reconfigure (modify settings)",
      "reinitialize": "Reinitialize (start from scratch)"
    }
  }
}
```

**zh/prompts.json**:
```json
{
  "header": "🚀 Claude 初始化 - 交互式设置",
  "steps": {
    "projectInfo": {
      "title": "项目信息",
      "projectName": "项目名称：",
      "projectDescription": "项目描述："
    },
    "selectFeatures": {
      "title": "选择功能",
      "question": "你想启用哪些功能？",
      "hint": "（使用 ↑↓ 移动，空格选择，回车确认）"
    },
    "configure": {
      "title": "配置 {{pluginName}}"
    },
    "summary": {
      "title": "摘要",
      "project": "项目：{{name}}",
      "location": "位置：{{path}}",
      "features": "功能：",
      "proceed": "继续初始化？"
    }
  },
  "complete": {
    "title": "🎉 初始化完成！",
    "filesCreated": "已创建文件：",
    "nextSteps": "下一步：",
    "nextStepItems": {
      "review": "查看并自定义 CLAUDE.md",
      "start": "在本项目中开始与 Claude 对话",
      "addPreset": "运行 'claude-init add-preset' 添加更多预设"
    }
  },
  "alreadyInitialized": {
    "warning": "⚠️  此项目已经初始化！",
    "info": "项目：{{name}}",
    "date": "初始化时间：{{date}}",
    "question": "你想做什么？",
    "options": {
      "keep": "保持现有设置",
      "reconfigure": "重新配置（修改设置）",
      "reinitialize": "重新初始化（从头开始）"
    }
  }
}
```

### 4. plugins.json

**en/plugins.json**:
```json
{
  "promptPresets": {
    "name": "Prompt Presets",
    "description": "Generate CLAUDE.md with preset prompts",
    "configure": {
      "title": "Prompt Presets Configuration",
      "selectPresets": "Which presets would you like to install?",
      "allowCustom": "Allow custom prompt templates?",
      "presets": {
        "codeReview": {
          "name": "Code Review",
          "description": "Help review code changes"
        },
        "documentation": {
          "name": "Documentation",
          "description": "Generate and maintain docs"
        },
        "refactoring": {
          "name": "Refactoring",
          "description": "Assist with code refactoring"
        },
        "testing": {
          "name": "Testing",
          "description": "Generate and review tests"
        },
        "architecture": {
          "name": "Architecture",
          "description": "Analyze system architecture"
        },
        "bugFixing": {
          "name": "Bug Fixing",
          "description": "Help debug and fix issues"
        }
      }
    },
    "summary": {
      "presets": "Presets: {{presets}}",
      "customEnabled": "Custom templates: enabled",
      "customDisabled": "Custom templates: disabled"
    }
  },
  "memorySystem": {
    "name": "Memory System",
    "description": "Full semantic memory system",
    "configure": {
      "title": "Memory System Configuration",
      "templateSource": "Memory template source:",
      "templateOptions": {
        "default": "Use default template",
        "defaultHint": "(recommended)",
        "git": "Custom Git repository",
        "local": "Local directory"
      },
      "gitUrl": "Git repository URL:",
      "localPath": "Local template directory:",
      "memoryTypes": "Which memory types to enable?",
      "types": {
        "semantic": {
          "name": "Semantic Memory",
          "description": "Knowledge and concepts"
        },
        "episodic": {
          "name": "Episodic Memory",
          "description": "Task history"
        },
        "procedural": {
          "name": "Procedural Memory",
          "description": "Workflows and processes"
        }
      }
    },
    "summary": {
      "templateDefault": "Template: Default",
      "templateGit": "Template: {{url}}",
      "templateLocal": "Template: {{path}}",
      "memoryTypes": "Memory types: {{types}}"
    }
  },
  "git": {
    "name": "Git Integration",
    "description": "Auto-commit and remote sync",
    "configure": {
      "title": "Git Integration Configuration",
      "notGitRepo": "This is not a Git repository. Git features will be limited.",
      "initGit": "Initialize Git repository?",
      "autoCommit": "Auto-commit changes after initialization?",
      "commitSeparately": "Commit Claude files separately from other changes?",
      "enableSync": "Enable remote sync for memory templates?",
      "remoteUrl": "Remote template repository URL:",
      "autoPR": "Auto-create PR when syncing changes?"
    },
    "summary": {
      "autoCommitEnabled": "Auto-commit: enabled",
      "autoCommitDisabled": "Auto-commit: disabled",
      "separateCommits": "• Separate commits for Claude files",
      "remoteSyncEnabled": "Remote sync: {{url}}",
      "autoPREnabled": "• Auto-create PRs"
    }
  },
  "systemDetector": {
    "name": "System Detection",
    "description": "Detect OS and dev tools",
    "detected": "Detected environment:",
    "os": "• OS: {{name}}",
    "python": "• Python: {{version}} ({{manager}} available)",
    "node": "• Node.js: {{version}} ({{manager}} available)",
    "summary": {
      "autoDetected": "Auto-detected: {{info}}"
    }
  }
}
```

**zh/plugins.json**:
```json
{
  "promptPresets": {
    "name": "预设提示词",
    "description": "使用预设提示词生成 CLAUDE.md",
    "configure": {
      "title": "预设提示词配置",
      "selectPresets": "你想安装哪些预设？",
      "allowCustom": "允许自定义提示词模板？",
      "presets": {
        "codeReview": {
          "name": "代码审查",
          "description": "帮助审查代码变更"
        },
        "documentation": {
          "name": "文档生成",
          "description": "生成和维护文档"
        },
        "refactoring": {
          "name": "重构辅助",
          "description": "协助代码重构"
        },
        "testing": {
          "name": "测试生成",
          "description": "生成和审查测试"
        },
        "architecture": {
          "name": "架构分析",
          "description": "分析系统架构"
        },
        "bugFixing": {
          "name": "Bug 修复",
          "description": "帮助调试和修复问题"
        }
      }
    },
    "summary": {
      "presets": "预设：{{presets}}",
      "customEnabled": "自定义模板：已启用",
      "customDisabled": "自定义模板：已禁用"
    }
  },
  "memorySystem": {
    "name": "记忆系统",
    "description": "完整的语义记忆系统",
    "configure": {
      "title": "记忆系统配置",
      "templateSource": "记忆模板来源：",
      "templateOptions": {
        "default": "使用默认模板",
        "defaultHint": "（推荐）",
        "git": "自定义 Git 仓库",
        "local": "本地目录"
      },
      "gitUrl": "Git 仓库 URL：",
      "localPath": "本地模板目录：",
      "memoryTypes": "启用哪些记忆类型？",
      "types": {
        "semantic": {
          "name": "语义记忆",
          "description": "知识和概念"
        },
        "episodic": {
          "name": "情节记忆",
          "description": "任务历史"
        },
        "procedural": {
          "name": "程序记忆",
          "description": "工作流和流程"
        }
      }
    },
    "summary": {
      "templateDefault": "模板：默认",
      "templateGit": "模板：{{url}}",
      "templateLocal": "模板：{{path}}",
      "memoryTypes": "记忆类型：{{types}}"
    }
  },
  "git": {
    "name": "Git 集成",
    "description": "自动提交和远程同步",
    "configure": {
      "title": "Git 集成配置",
      "notGitRepo": "这不是一个 Git 仓库。Git 功能将受限。",
      "initGit": "初始化 Git 仓库？",
      "autoCommit": "初始化后自动提交变更？",
      "commitSeparately": "将 Claude 文件与其他变更分开提交？",
      "enableSync": "启用记忆模板的远程同步？",
      "remoteUrl": "远程模板仓库 URL：",
      "autoPR": "同步变更时自动创建 PR？"
    },
    "summary": {
      "autoCommitEnabled": "自动提交：已启用",
      "autoCommitDisabled": "自动提交：已禁用",
      "separateCommits": "• Claude 文件单独提交",
      "remoteSyncEnabled": "远程同步：{{url}}",
      "autoPREnabled": "• 自动创建 PR"
    }
  },
  "systemDetector": {
    "name": "系统检测",
    "description": "检测操作系统和开发工具",
    "detected": "检测到的环境：",
    "os": "• 操作系统：{{name}}",
    "python": "• Python：{{version}}（{{manager}} 可用）",
    "node": "• Node.js：{{version}}（{{manager}} 可用）",
    "summary": {
      "autoDetected": "自动检测：{{info}}"
    }
  }
}
```

### 5. errors.json

**en/errors.json**:
```json
{
  "notInitialized": "Project is not initialized. Run \"claude-init init\" first.",
  "alreadyInitialized": "Project already initialized. Use --force to re-initialize.",
  "configNotFound": "Config file not found: {{path}}",
  "invalidConfig": "Invalid configuration: {{message}}",
  "pluginNotFound": "Plugin not found: {{name}}",
  "fileNotFound": "File not found: {{path}}",
  "gitNotInstalled": "Git is not installed or not in PATH",
  "networkError": "Network error: {{message}}",
  "templateCloneFailed": "Failed to clone template: {{url}}",
  "permissionDenied": "Permission denied: {{path}}",
  "unknownError": "An unknown error occurred: {{message}}"
}
```

**zh/errors.json**:
```json
{
  "notInitialized": "项目未初始化。请先运行 \"claude-init init\"。",
  "alreadyInitialized": "项目已初始化。使用 --force 强制重新初始化。",
  "configNotFound": "配置文件未找到：{{path}}",
  "invalidConfig": "配置无效：{{message}}",
  "pluginNotFound": "插件未找到：{{name}}",
  "fileNotFound": "文件未找到：{{path}}",
  "gitNotInstalled": "Git 未安装或不在 PATH 中",
  "networkError": "网络错误：{{message}}",
  "templateCloneFailed": "克隆模板失败：{{url}}",
  "permissionDenied": "权限被拒绝：{{path}}",
  "unknownError": "发生未知错误：{{message}}"
}
```

---

## 代码实现

### 1. i18n 初始化

```typescript
// src/i18n/index.ts

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as path from 'path';
import { detectLanguage } from './detector.js';

let initialized = false;

export async function initI18n(): Promise<void> {
  if (initialized) return;

  const language = detectLanguage();

  await i18next
    .use(Backend)
    .init({
      lng: language,
      fallbackLng: 'en',
      ns: ['common', 'cli', 'prompts', 'plugins', 'errors'],
      defaultNS: 'common',
      backend: {
        loadPath: path.join(__dirname, 'locales', '{{lng}}', '{{ns}}.json')
      },
      interpolation: {
        escapeValue: false
      }
    });

  initialized = true;
}

export { i18next as i18n };
```

### 2. 使用示例

```typescript
// src/core/interactive-initializer.ts

import { i18n } from '../i18n/index.js';

export class InteractiveInitializer {
  private printHeader() {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│  ${i18n.t('prompts:header')}                                │
└─────────────────────────────────────────────────────────────┘
    `);
  }

  private async promptProjectInfo(currentStep: number, totalSteps: number) {
    const stepLabel = i18n.t('common:step', { current: currentStep, total: totalSteps });
    console.log(`📋 ${stepLabel}: ${i18n.t('prompts:steps.projectInfo.title')}`);
    console.log('─'.repeat(60));

    const name = await this.ui.input(
      i18n.t('prompts:steps.projectInfo.projectName'),
      path.basename(process.cwd())
    );

    const description = await this.ui.input(
      i18n.t('prompts:steps.projectInfo.projectDescription'),
      i18n.t('prompts:steps.projectInfo.defaultDescription')
    );

    return { name, description };
  }

  private async promptPluginSelection(currentStep: number, totalSteps: number) {
    const stepLabel = i18n.t('common:step', { current: currentStep, total: totalSteps });
    console.log(`\n📦 ${stepLabel}: ${i18n.t('prompts:steps.selectFeatures.title')}`);
    console.log('─'.repeat(60));

    const selected = await this.ui.checkboxList(
      i18n.t('prompts:steps.selectFeatures.question') + '\n' +
      i18n.t('prompts:steps.selectFeatures.hint'),
      this.getPluginOptions()
    );

    console.log(`\n${i18n.t('common:selected', { count: selected.length })}\n`);

    return selected;
  }

  private getPluginOptions() {
    return [
      {
        name: i18n.t('plugins:promptPresets.name'),
        value: 'prompt-presets',
        description: i18n.t('plugins:promptPresets.description'),
        checked: true
      },
      {
        name: i18n.t('plugins:memorySystem.name'),
        value: 'memory-system',
        description: i18n.t('plugins:memorySystem.description'),
        checked: true
      },
      {
        name: i18n.t('plugins:git.name'),
        value: 'git',
        description: i18n.t('plugins:git.description'),
        checked: false
      },
      {
        name: i18n.t('plugins:systemDetector.name'),
        value: 'system-detector',
        description: i18n.t('plugins:systemDetector.description'),
        checked: true
      }
    ];
  }
}
```

### 3. 插件中使用

```typescript
// plugins/prompt-presets/configure.ts

import { i18n } from '../../i18n/index.js';

export const promptPresetsConfiguration: PluginConfigurationFlow = {
  needsConfiguration: true,

  configure: async (context) => {
    const { ui } = context;

    const presets = await ui.checkboxList(
      i18n.t('plugins:promptPresets.configure.selectPresets'),
      [
        {
          name: i18n.t('plugins:promptPresets.configure.presets.codeReview.name'),
          value: 'code-review',
          description: i18n.t('plugins:promptPresets.configure.presets.codeReview.description'),
          checked: true
        },
        {
          name: i18n.t('plugins:promptPresets.configure.presets.documentation.name'),
          value: 'documentation',
          description: i18n.t('plugins:promptPresets.configure.presets.documentation.description'),
          checked: true
        },
        // ... 其他预设
      ]
    );

    const allowCustom = await ui.confirm(
      i18n.t('plugins:promptPresets.configure.allowCustom'),
      true
    );

    return {
      enabled: true,
      options: { presets, allow_custom: allowCustom }
    };
  },

  getSummary: (config) => {
    const lines = [];
    if (config.options.presets.length > 0) {
      lines.push(i18n.t('plugins:promptPresets.summary.presets', {
        presets: config.options.presets.join(', ')
      }));
    }
    if (config.options.allow_custom) {
      lines.push(i18n.t('plugins:promptPresets.summary.customEnabled'));
    }
    return lines;
  }
};
```

### 4. CLI 入口

```typescript
// src/cli.ts

import { Command } from 'commander';
import { initI18n, i18n } from './i18n/index.js';

// 初始化 i18n
await initI18n();

const program = new Command();

program
  .name('claude-init')
  .description(i18n.t('cli:description'))
  .version('2.0.0');

program
  .command('init')
  .description(i18n.t('cli:commands.init.description'))
  .option('-f, --force', i18n.t('cli:commands.init.options.force'))
  .action(async (options) => {
    // ...
  });

program
  .command('add-preset')
  .description(i18n.t('cli:commands.add-preset.description'))
  .action(async () => {
    // ...
  });

program
  .command('sync')
  .description(i18n.t('cli:commands.sync.description'))
  .action(async () => {
    // ...
  });

program.parse();
```

---

## 插件上下文增强

### 添加 i18n 到插件上下文

```typescript
// src/plugin/types.ts

export interface PluginContext {
  // ... 现有字段

  // 新增：i18n 支持
  i18n: {
    t: (key: string, options?: any) => string;
    language: string;
  };
}
```

```typescript
// src/core/interactive-initializer.ts

private createContext(config: CoreConfig): PluginContext {
  return {
    // ... 现有字段

    i18n: {
      t: i18n.t.bind(i18n),
      language: i18n.language
    }
  };
}
```

---

## 模板文件多语言支持

### CLAUDE.md 模板

```
templates/
├── CLAUDE.md.en.template
└── CLAUDE.md.zh.template
```

**生成逻辑**:

```typescript
// src/core/template-engine.ts

export async function renderCLAUDEmd(
  config: CoreConfig,
  language: string
): Promise<string> {
  const templatePath = path.join(
    __dirname,
    '..',
    'templates',
    `CLAUDE.md.${language}.template`
  );

  // 如果没有对应语言的模板，使用英文
  const finalPath = await fileExists(templatePath)
    ? templatePath
    : path.join(__dirname, '..', 'templates', 'CLAUDE.md.en.template');

  return await renderTemplate(finalPath, config);
}
```

---

## 测试策略

### 1. 语言检测测试

```typescript
// tests/i18n/detector.test.ts

import { detectLanguage } from '../../src/i18n/detector';

describe('Language Detection', () => {
  it('should detect language from CLAUDE_INIT_LANG', () => {
    process.env.CLAUDE_INIT_LANG = 'zh';
    expect(detectLanguage()).toBe('zh');
  });

  it('should detect language from LANG', () => {
    delete process.env.CLAUDE_INIT_LANG;
    process.env.LANG = 'zh_CN.UTF-8';
    expect(detectLanguage()).toBe('zh');
  });

  it('should fallback to English', () => {
    delete process.env.CLAUDE_INIT_LANG;
    delete process.env.LANG;
    expect(detectLanguage()).toBe('en');
  });

  it('should normalize locales', () => {
    process.env.LANG = 'zh_CN.UTF-8';
    expect(detectLanguage()).toBe('zh');

    process.env.LANG = 'en_US';
    expect(detectLanguage()).toBe('en');
  });
});
```

### 2. 翻译完整性测试

```typescript
// tests/i18n/completeness.test.ts

import * as fs from 'fs';
import * as path from 'path';

describe('Translation Completeness', () => {
  const locales = ['en', 'zh'];
  const namespaces = ['common', 'cli', 'prompts', 'plugins', 'errors'];

  it('should have all translation files', () => {
    for (const locale of locales) {
      for (const ns of namespaces) {
        const filePath = path.join(
          __dirname,
          '..',
          '..',
          'src',
          'i18n',
          'locales',
          locale,
          `${ns}.json`
        );
        expect(fs.existsSync(filePath)).toBe(true);
      }
    }
  });

  it('should have same keys in all locales', () => {
    for (const ns of namespaces) {
      const enPath = path.join(__dirname, '..', '..', 'src', 'i18n', 'locales', 'en', `${ns}.json`);
      const zhPath = path.join(__dirname, '..', '..', 'src', 'i18n', 'locales', 'zh', `${ns}.json`);

      const enKeys = Object.keys(JSON.parse(fs.readFileSync(enPath, 'utf-8')));
      const zhKeys = Object.keys(JSON.parse(fs.readFileSync(zhPath, 'utf-8')));

      expect(enKeys.sort()).toEqual(zhKeys.sort());
    }
  });
});
```

---

## 开发工作流

### 添加新翻译

1. **添加英文翻译** (en/*.json)
2. **添加中文翻译** (zh/*.json)
3. **运行完整性测试** - 确保所有 key 存在
4. **在代码中使用** - `i18n.t('namespace:key')`
5. **测试两种语言** - `CLAUDE_INIT_LANG=en` 和 `CLAUDE_INIT_LANG=zh`

### 翻译检查脚本

```bash
# scripts/check-i18n.sh

#!/bin/bash

echo "Checking i18n completeness..."

# 运行完整性测试
npm test -- i18n/completeness

# 检查未使用的翻译 key
npm run lint:i18n

echo "✅ i18n check complete"
```

---

## 实施计划

### 阶段 1: 基础设施（1 天）

- [ ] 安装 i18next 依赖
- [ ] 创建 i18n 目录结构
- [ ] 实现语言检测逻辑
- [ ] 实现 i18n 初始化

### 阶段 2: 翻译文件（2-3 天）

- [ ] 创建所有命名空间的英文翻译
- [ ] 创建所有命名空间的中文翻译
- [ ] 编写翻译完整性测试

### 阶段 3: 代码集成（2 天）

- [ ] CLI 入口集成 i18n
- [ ] 交互式初始化器集成 i18n
- [ ] 所有插件集成 i18n
- [ ] 插件上下文添加 i18n 支持

### 阶段 4: 模板多语言（1 天）

- [ ] 创建 CLAUDE.md 英文模板
- [ ] 创建 CLAUDE.md 中文模板
- [ ] 模板引擎支持多语言

### 阶段 5: 测试和文档（1 天）

- [ ] 手动测试两种语言
- [ ] 编写 i18n 使用文档
- [ ] 更新 README 说明多语言支持

**总计**: 6-7 天

---

## 最佳实践

### 1. 翻译 Key 命名

✅ **推荐**:
```typescript
i18n.t('prompts:steps.projectInfo.projectName')
i18n.t('plugins:memorySystem.configure.templateSource')
```

❌ **不推荐**:
```typescript
i18n.t('PROJECT_NAME')  // 太简短，容易冲突
i18n.t('prompts:steps:projectInfo:projectName')  // 使用 : 分隔，不是 .
```

### 2. 插值使用

✅ **推荐**:
```typescript
i18n.t('common:step', { current: 1, total: 5 })
// en: "Step 1/5"
// zh: "步骤 1/5"
```

### 3. 复数形式

```json
{
  "selected": "Selected: {{count}} item",
  "selected_plural": "Selected: {{count}} items"
}
```

```typescript
i18n.t('common:selected', { count: 3 })
// en: "Selected: 3 items"
```

### 4. 避免拼接

❌ **不推荐**:
```typescript
const message = i18n.t('project') + ': ' + name;
```

✅ **推荐**:
```typescript
const message = i18n.t('prompts:summary.project', { name });
```

---

## 用户文档

### README.md 添加语言说明

```markdown
## Language Support

Claude Init supports multiple languages:

- English (default)
- 简体中文

### Change Language

Set the `CLAUDE_INIT_LANG` environment variable:

\`\`\`bash
# Use Chinese
export CLAUDE_INIT_LANG=zh
claude-init init

# Use English
export CLAUDE_INIT_LANG=en
claude-init init
\`\`\`

The language is automatically detected from your system locale.
```

---

**最后更新**: 2025-01-18
**状态**: ✅ 设计完成，待实施
