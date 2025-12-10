# I18N 实施指南 - Subagent 任务分配

本文档包含 I18N 国际化实施的完整 subagent 任务指令。

**项目路径**: `/home/dai/code/claude-memory-init`
**技术栈**: typesafe-i18n 5.26.2
**支持语言**: 英文 (en) / 简体中文 (zh)

**重要约束**:
- `templates/` 目录下的所有文件是给 AI 的 prompt，**不需要国际化**
- 只国际化用户可见的 CLI 交互字符串

---

## Phase 1: 基础设施搭建

### Subagent Prompt

```
你是一个专业的 TypeScript/Node.js 开发者。你的任务是为 claude-memory-init 项目搭建 I18N 国际化基础设施。

## 项目信息
- 路径: /home/dai/code/claude-memory-init
- 技术选型: typesafe-i18n 5.26.2
- 目标语言: 英文 (en, 默认), 简体中文 (zh)

## 任务清单

### 1. 安装依赖
执行: pnpm add -D typesafe-i18n

### 2. 创建配置文件
创建 /home/dai/code/claude-memory-init/.typesafe-i18n.json:
{
  "$schema": "https://unpkg.com/typesafe-i18n@5.26.2/schema/typesafe-i18n.json",
  "baseLocale": "en",
  "locales": ["en", "zh"],
  "outputPath": "./src/i18n/",
  "outputFormat": "TypeScript",
  "adapter": "node",
  "esmImports": ".js",
  "generateOnlyTypes": false,
  "runAfterGenerator": ""
}

### 3. 创建目录结构
mkdir -p src/i18n/en src/i18n/zh

### 4. 创建英文翻译基础文件 src/i18n/en/index.ts
导出 BaseTranslation 类型的翻译对象，包含以下结构：

```typescript
import type { BaseTranslation } from '../i18n-types.js';

const en = {
  // 通用文本
  common: {
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    cancel: 'Cancel',
    skip: 'Skip',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    enabled: 'enabled',
    disabled: 'disabled',
    selected: 'Selected',
    step: 'Step {current:number}/{total:number}',
    features: '{count:number} feature{{s}}',
  },

  // CLI 命令
  cli: {
    name: 'claude-init',
    description: 'Initialize Claude Agent system in your project',
    commands: {
      init: {
        description: 'Initialize Claude Agent system (interactive)',
        forceOption: 'Force re-initialization (overwrite existing files)',
        targetOption: 'Target directory (default: current directory)',
      },
    },
    errors: {
      initFailed: 'Initialization failed:',
      commandFailed: 'Command failed:',
      fatalError: 'Fatal error:',
    },
  },

  // 交互式提示
  prompts: {
    // 项目信息步骤
    projectInfo: {
      stepTitle: 'Project Information',
      namePrompt: 'Project name:',
      nameRequired: 'Project name is required',
      descPrompt: 'Project description:',
      descDefault: 'A project with Claude integration',
      descRequired: 'Project description is required',
    },

    // 功能选择步骤
    featureSelect: {
      stepTitle: 'Select Features',
      prompt: 'What features do you want to enable?',
      heavyweightNote: 'Note: Some features are "heavyweight" plugins that run their own initialization commands and may modify existing files.',
      heavyweightLabel: '[heavyweight]',
      conflictsWith: '(conflicts with: {plugins:string})',
      selectedCount: 'Selected: {count:number} feature{{s}}',
      heavyweightWarning: 'Heavyweight plugins selected: {plugins:string}',
      heavyweightWarningDetail: 'These will run external initialization commands.',
    },

    // 冲突解决
    conflictResolution: {
      title: 'Conflict resolution:',
      removed: '  - Removed: {item:string}',
    },

    // 插件配置步骤
    pluginConfig: {
      stepTitle: 'Configure {plugin:string}',
      notFound: "Plugin '{name:string}' not found. Skipping.",
    },

    // 摘要步骤
    summary: {
      stepTitle: 'Summary',
      project: 'Project:',
      location: 'Location:',
      features: 'Features:',
      featureItem: '  ✓ {name:string}',
      confirmPrompt: 'Proceed with initialization?',
    },

    // 已初始化处理
    alreadyInitialized: {
      warning: 'This project is already initialized!',
      projectInfo: 'Project: {name:string}',
      initializedDate: 'Initialized: {date:string}',
      versionInfo: 'Version: {version:string}',
      whatToDo: 'What would you like to do?',
      keepOption: 'Keep existing setup',
      keepDesc: '(no changes)',
      reconfigOption: 'Reconfigure',
      reconfigDesc: '(modify settings)',
      reinitOption: 'Reinitialize',
      reinitDesc: '(start from scratch)',
      confirmOverwrite: 'This will overwrite existing files. Are you sure?',
    },

    // 取消和错误
    cancelled: 'Initialization cancelled.',
    noPlugins: 'No plugins selected. Initialization cancelled.',
    keepingSetup: 'Keeping existing setup. No changes made.',
    reconfigNotImpl: 'Reconfiguration is not yet implemented.',

    // 完成消息
    complete: {
      title: 'Initialization complete!',
      filesCreated: 'Files created:',
      agentMd: '  ✓ {filename:string}',
      agentDir: '  ✓ {dirname:string}/',
      slashCommands: 'Available slash commands:',
      commandItem: '  • /{name:string}{hint:string} - {description:string}',
      nextSteps: 'Next steps:',
      step1: '  • Review {filename:string} and customize as needed',
      step2: '  • Start chatting with Claude in this project',
      step3: '  • Try slash commands like /memory-search or /task-status',
      step4: "  • Run 'claude-init --help' for more commands",
    },

    // 进度组件
    progress: {
      complete: 'Complete',
      failed: 'Failed',
      warning: 'Warning',
      info: 'Info',
    },
  },

  // 插件相关
  plugins: {
    // system-detector 插件
    systemDetector: {
      name: 'system-detector',
      description: 'Configure system environment with two-layer memory',
      configTitle: '[System Configuration]',
      foundPrefs: '✓ Found user preferences (~/.claude/)',
      osInfo: '  OS: {name:string} ({type:string})',
      pythonManager: '  Preferred Python manager: {manager:string}',
      nodeManager: '  Preferred Node manager: {manager:string}',
      firstTimeSetup: 'First time setup - detecting system...',
      osDetected: '✓ OS: {name:string} ({type:string})',
      systemPm: '  System package manager: {pm:string}',
      timezone: '✓ Timezone: {tz:string}',
      language: '✓ Language: {lang:string}',
      pythonDetected: '✓ Python detected: {version:string}',
      availableManagers: '  Available managers: {list:string}',
      using: '  → Using: {manager:string}',
      selectPython: 'Select your preferred Python package manager:',
      selectNode: 'Select your preferred Node.js package manager:',
      nodeDetected: '✓ Node.js detected: {version:string}',
      projectConfig: '[Project Configuration]',
      usePreferred: 'Use your preferred managers for this project?',
      selectProjectPython: 'Select Python package manager for this project:',
      selectProjectNode: 'Select Node.js package manager for this project:',
      pythonConfig: '  Python: {manager:string}',
      nodeConfig: '  Node: {manager:string}',
      notConfigured: '(not configured)',
      userPrefsSaved: 'User preferences saved to ~/.claude/system/preferences.toon',
      projectConfigSaved: 'Project configuration saved to .agent/system/config.toon',
      // 包管理器描述
      pmDesc: {
        pip: 'Standard Python package installer',
        uv: 'Ultra-fast Python package installer (recommended)',
        poetry: 'Dependency management and packaging',
        pipenv: 'Virtual environments and dependencies',
        conda: 'Package and environment management',
        npm: 'Standard Node.js package manager',
        pnpm: 'Fast, disk space efficient (recommended)',
        yarn: 'Fast, reliable, secure dependency manager',
        bun: 'All-in-one JavaScript runtime and toolkit',
      },
    },

    // memory-system 插件
    memorySystem: {
      name: 'memory-system',
      description: 'Memory system for knowledge persistence',
      selectTypes: 'Which memory types do you want to enable?',
      knowledge: 'Knowledge',
      knowledgeDesc: 'Stable architectural knowledge',
      history: 'History',
      historyDesc: 'Task history records',
      includeSystem: 'Include system knowledge layer (universal tools, standards)?',
      typesSelected: 'Memory types: {types:string}',
      systemIncluded: 'System knowledge: included',
      initialized: 'Memory system initialized',
      // Slash 命令
      commands: {
        searchDesc: 'Find notes by tag',
        queryDesc: 'Query notes by topic',
        indexDesc: 'Show complete memory index',
        recentDesc: 'Show N recent notes',
      },
    },

    // git 插件
    git: {
      name: 'git',
      description: 'Git operations and auto-commit',
      enableAutoCommit: 'Enable auto-commit for memory system updates?',
      separateCommits: 'Commit memory files separately from other changes?',
      enableRemoteSync: 'Enable remote sync for system memory?',
      remoteUrl: 'Remote template repository URL:',
      autoCreatePr: 'Auto-create PRs when syncing?',
      allowAiGit: 'Allow AI agent to perform git operations?',
      autoCommitEnabled: 'Auto-commit: enabled',
      remoteSyncEnabled: 'Remote sync: enabled',
      aiGitAllowed: 'AI git ops: allowed',
      aiGitForbidden: 'AI git ops: forbidden',
      configStored: 'Git configuration stored',
    },

    // task-system 插件
    taskSystem: {
      name: 'task-system',
      description: 'Task workflows, state tracking, and outputs',
      enableTracking: 'Enable task state tracking (current.toon)?',
      enableOutput: 'Enable task output directory (.agent/tasks/output/)?',
      trackingEnabled: 'Task tracking: enabled',
      outputEnabled: 'Output directory: enabled',
      initialized: 'Task system initialized',
      // Slash 命令
      commands: {
        createDesc: 'Create task with dedicated prompt',
        startDesc: 'Start executing a task',
        pauseDesc: 'Pause current task (save state)',
        resumeDesc: 'Resume a paused task',
        statusDesc: 'Show current task state',
        listDesc: 'List all tasks',
        incompleteDesc: 'List unfinished tasks',
        completeDesc: 'Mark task as complete',
      },
    },

    // prompt-presets 插件
    promptPresets: {
      name: 'prompt-presets',
      description: 'Base prompt templates with optional enhancements',
      configTitle: '[Prompt Presets]',
      selectBase: 'Select a base prompt template:',
      selectedBase: '✓ Selected base: {name:string}',
      selectEnhancements: 'Select enhancement modules to include (optional):',
      selectedEnhancements: '✓ Selected enhancements: {list:string}',
      noEnhancements: '✓ No enhancements selected (minimal preset)',
      baseLabel: 'Base: {name:string}',
      enhancementsLabel: 'Enhancements ({count:number}): {list:string}',
      enhancementsNone: 'Enhancements: none (minimal)',
      willGenerate: 'Prompt preset will be generated',
      enhancementNotFound: 'Warning: Enhancement {name:string} not found',
      generateFailed: 'Failed to generate preset: {error:string}',
      // 基础模板
      bases: {
        codeReview: { name: 'Code Review', desc: 'Code quality and security review' },
        documentation: { name: 'Documentation', desc: 'Generate and maintain docs' },
        refactoring: { name: 'Refactoring', desc: 'Code improvement and cleanup' },
        testing: { name: 'Testing', desc: 'Test generation and quality' },
        architecture: { name: 'Architecture', desc: 'System design analysis' },
        bugFixing: { name: 'Bug Fixing', desc: 'Debugging and troubleshooting' },
      },
      // 增强模块
      enhancements: {
        systemInfo: { name: 'System Information', desc: 'OS, Python, Node.js environment' },
        memoryInstructions: { name: 'Memory Instructions', desc: 'How to use memory system' },
        fullContext: { name: 'Full Context Reading', desc: 'Read files completely, use all available tokens' },
        gitRules: { name: 'Git Rules', desc: 'Git operation guidelines' },
        taskWorkflow: { name: 'Task Workflow', desc: 'Task management instructions' },
        toonRef: { name: 'TOON Reference', desc: 'TOON format quick reference' },
      },
    },

    // claude-flow 插件 (heavyweight)
    claudeFlow: {
      name: 'claude-flow',
      description: 'Claude Flow integration for AI orchestration with multi-agent support',
      selectMode: 'Select Claude Flow initialization mode:',
      modes: {
        standard: { name: 'Standard', desc: 'Full setup with common workflows and 54+ agents' },
        sparc: { name: 'SPARC', desc: 'SPARC methodology with structured development phases' },
        minimal: { name: 'Minimal', desc: 'Essential files only, basic agent setup' },
        skip: { name: 'Skip', desc: 'Skip Claude Flow initialization' },
      },
      enableSwarm: 'Enable Swarm Mode (multi-agent orchestration)?',
      enableHiveMind: 'Enable Hive Mind System (collective intelligence)?',
      selectMcp: 'Select MCP servers to configure:',
      mcpServers: {
        claudeFlow: { name: 'claude-flow', desc: 'Core Claude Flow MCP server (required)' },
        ruvSwarm: { name: 'ruv-swarm', desc: 'Enhanced swarm coordination' },
        flowNexus: { name: 'flow-nexus', desc: 'Cloud features and advanced orchestration' },
      },
      skipped: 'Claude Flow: Skipped',
      modeSelected: 'Mode: {mode:string}',
      swarmEnabled: 'Swarm Mode: enabled',
      hiveMindEnabled: 'Hive Mind: enabled',
      mcpSelected: 'MCP Servers: {list:string}',
      statusDesc: 'Show Claude Flow status',
    },

    // pma-gh 插件
    pmaGh: {
      name: 'pma-gh',
      description: 'GitHub project management assistant with issue tracking and PR workflow',
      configTitle: '[PMA-GH Configuration]',
      enableValidation: 'Enable issue validation (check assignee and project linkage)?',
      autoCreateBranch: 'Automatically create feature branch when starting an issue?',
      branchPattern: 'Branch naming pattern:',
      validationEnabled: 'Validation: enabled',
      validationDisabled: 'Validation: disabled',
      autoBranchEnabled: 'Auto branch: enabled',
      autoBranchDisabled: 'Auto branch: disabled',
      branchPatternLabel: 'Branch pattern: {pattern:string}',
      initialized: 'PMA-GH plugin initialized',
      // Slash 命令
      commands: {
        issueDesc: 'Fetch, validate, and analyze a GitHub issue',
        prDesc: 'Create a Pull Request to resolve the current issue',
        closeDesc: 'Close the current issue as not planned',
      },
    },
  },

  // 错误消息
  errors: {
    validation: {
      configNotFound: 'Config file not found. Run "claude-memory-init init" first.',
      invalidKey: 'Invalid config key: {key:string}',
      invalidIndex: 'Invalid index: {index:number}. Valid range: 0-{max:number}',
    },
    plugin: {
      alreadyRegistered: "Plugin with name '{name:string}' is already registered",
      commandNameUsed: "Plugin commandName '{name:string}' is already used by plugin '{existing:string}'",
      notFound: "Plugin '{name:string}' not found in registry",
      mustHaveMeta: 'Plugin must have metadata',
      mustHaveName: 'Plugin must have a valid name',
      mustHaveCommand: "Plugin '{name:string}' must have a valid commandName",
      mustHaveVersion: "Plugin '{name:string}' must have a valid version",
      mustHaveDesc: "Plugin '{name:string}' must have a description",
      hookFailed: "Plugin '{name:string}' failed during '{hook:string}' hook: {error:string}",
      dependencyNotFound: 'Plugin dependency not found: {plugin:string}',
    },
    heavyweight: {
      noConfig: "Plugin '{name:string}' is marked as heavyweight but doesn't implement getHeavyweightConfig()",
      configFailed: "Failed to get heavyweight config for '{name:string}': {error:string}",
      backupFailed: 'Failed to backup protected files: {error:string}',
      commandExitCode: 'Command exited with code {code:number}',
      commandFailed: 'Command failed: {error:string}',
      mergeFailed: 'Failed to merge: {path:string} - {error:string}',
      unknownStrategy: 'Unknown merge strategy: {strategy:string}',
    },
    git: {
      notRepo: 'Not a git repository. Skipping auto-commit.',
      commitFailed: 'Failed to commit memory system changes',
      pushFailed: 'Push failed',
    },
    file: {
      loadFailed: 'Failed to load config from {path:string}: {message:string}',
      saveFailed: 'Failed to save config to {path:string}: {message:string}',
      createFailed: 'Failed to create {path:string}: {error:string}',
    },
  },

  // 工具类消息
  utils: {
    autoCommit: {
      noChanges: 'No changes to commit',
      noMemoryChanges: 'No memory system changes to commit',
      committing: 'Auto-committing changes...',
      committingSeparate: 'Committing {count:number} memory system file(s) separately...',
      committingCombined: 'Committing {count:number} memory system file(s)...',
      committed: 'Memory system changes committed',
      filesCommitted: 'Files committed:',
      otherFilesRemain: 'Note: {count:number} other file(s) remain uncommitted:',
      commitManually: 'Commit these files manually or they will be included in the next commit',
    },
    gitOps: {
      initSubmodule: 'Initializing git submodule: {path:string}',
      updateSubmodule: 'Updating git submodule: {path:string}',
      notSubmodule: '{path:string} exists but is not a git submodule',
      cloning: 'Cloning memory repo to temporary directory...',
      foundDiffs: 'Found {count:number} file(s) with differences',
      noDiffs: 'No differences found between local and remote memory repos',
      creatingBranch: 'Creating branch: {name:string}',
      branchCreated: "Branch '{name:string}' created with {count:number} system memory file(s)",
      filesIncluded: 'Files included in this PR:',
      prLabel: 'PR label: ',
      nextStepsTitle: 'Next steps:',
      commitPreview: 'COMMIT PREVIEW',
      commitMessage: 'Commit Message:',
      fileChanges: 'File Changes:',
      insertsDels: '{inserts:number} insertions(+), {dels:number} deletions(-)',
      newFile: '(new file)',
      createCommitPrompt: 'Create this commit?',
      commitCancelled: 'Commit cancelled',
      creatingCommit: 'Creating commit...',
      commitCreated: 'Commit created: {name:string}',
      commitCreateFailed: 'Failed to create commit',
      pushPrompt: 'Push to remote repository?',
      pushLater: 'Commit created locally. To push later:',
      pushing: 'Pushing to remote...',
      pushSuccess: 'Branch pushed successfully',
      ghDetected: 'GitHub CLI (gh) detected - can create PR automatically',
      ghNotFound: 'GitHub CLI (gh) not found - will provide manual instructions',
      ghInstallHint: 'Install gh: https://cli.github.com/',
      createPrPrompt: 'Create PR now using gh CLI?',
      showPrInfo: 'Show PR creation information?',
      creatingPr: 'Creating pull request with gh CLI...',
      prCreated: 'Pull request created',
      prCreateFailed: 'Failed to create PR with gh CLI',
      createPrManually: 'Please create PR manually:',
      prInfoTitle: 'PR Information (copy and use):',
    },
    heavyweight: {
      initializing: 'Initializing heavyweight plugin: {name:string}',
      backingUp: '  Backing up {count:number} protected file(s)...',
      executing: '  Executing: {command:string}',
      merging: '  Merging protected files...',
      merged: '    Merged: {path:string}',
      initSuccess: "  Plugin '{name:string}' initialized successfully",
      mergeFailed: '  Some files failed to merge. Restoring backups...',
      restored: '    Restored: {path:string}',
      removed: '    Removed: {path:string}',
    },
    resourceWriter: {
      created: 'Created: {path:string}',
      slashCommandFailed: 'Failed to create slash command {name:string}: {error:string}',
      skillFailed: 'Failed to create skill {name:string}: {error:string}',
      outputsFailed: 'Failed to generate outputs for {plugin:string}: {error:string}',
    },
  },
} satisfies BaseTranslation;

export default en;
```

### 5. 创建语言检测器 src/i18n/detector.ts

```typescript
import { Locales } from './i18n-types.js';

const SUPPORTED_LOCALES: Locales[] = ['en', 'zh'];
const DEFAULT_LOCALE: Locales = 'en';

export function detectLocale(): Locales {
  // 1. 环境变量优先
  const envLang = process.env.CLAUDE_INIT_LANG;
  if (envLang && isSupported(envLang)) {
    return envLang as Locales;
  }

  // 2. 系统 locale
  const systemLocale = process.env.LANG ||
                       process.env.LANGUAGE ||
                       process.env.LC_ALL ||
                       process.env.LC_MESSAGES || '';

  const lang = systemLocale.split(/[_.@]/)[0]?.toLowerCase();

  if (lang === 'zh') return 'zh';
  if (lang === 'en') return 'en';

  // 3. 默认英文
  return DEFAULT_LOCALE;
}

function isSupported(locale: string): boolean {
  return SUPPORTED_LOCALES.includes(locale as Locales);
}

export { SUPPORTED_LOCALES, DEFAULT_LOCALE };
```

### 6. 创建 I18N 入口 src/i18n/index.ts

```typescript
import { detectLocale } from './detector.js';
import { loadAllLocales } from './i18n-util.sync.js';
import { i18n, type TranslationFunctions } from './i18n-util.js';
import type { Locales } from './i18n-types.js';

let currentLocale: Locales = 'en';
let initialized = false;

export function initI18n(locale?: Locales): void {
  if (initialized) return;

  loadAllLocales();
  currentLocale = locale || detectLocale();
  initialized = true;
}

export function t(): TranslationFunctions {
  if (!initialized) {
    initI18n();
  }
  return i18n()[currentLocale];
}

export function getLocale(): Locales {
  return currentLocale;
}

export function setLocale(locale: Locales): void {
  currentLocale = locale;
}

export { detectLocale } from './detector.js';
export type { Locales, TranslationFunctions };
```

### 7. 运行生成器
执行: npx typesafe-i18n

### 8. 更新 package.json scripts
添加:
- "i18n": "typesafe-i18n",
- "i18n:watch": "typesafe-i18n --watch"

修改:
- "dev": "pnpm i18n && vite build --watch"
- "build": "pnpm i18n && vite build && tsc"

## 验收标准
1. ✅ typesafe-i18n 依赖已安装
2. ✅ 配置文件 .typesafe-i18n.json 存在且正确
3. ✅ src/i18n/en/index.ts 包含完整的英文翻译
4. ✅ src/i18n/detector.ts 能正确检测语言
5. ✅ src/i18n/index.ts 导出 initI18n() 和 t() 函数
6. ✅ npx typesafe-i18n 成功生成类型文件
7. ✅ pnpm build 无错误

## 注意事项
- 翻译键结构必须与上述定义完全一致
- 参数化字符串使用 {name:type} 格式
- 复数使用 {{s}} 或 {{singular|plural}} 格式
- 所有字符串来自调查报告，确保覆盖完整
```

---

## Phase 2: 核心模块修改

### Subagent Prompt

```
你是一个专业的 TypeScript/Node.js 开发者。你的任务是将 claude-memory-init 项目的核心模块改造为支持 I18N。

## 前置条件
- Phase 1 已完成
- src/i18n/ 目录已设置好
- 可以通过 import { t } from '../i18n/index.js' 获取翻译函数

## 任务清单

### 1. 修改 src/cli.ts

替换所有硬编码字符串为 i18n 调用：

```typescript
// 在文件顶部添加
import { initI18n, t } from './i18n/index.js';

// 在 main() 函数开头调用
initI18n();
const L = t();

// 替换示例
// 之前: .name('claude-init')
// 之后: .name(L.cli.name)

// 之前: .description('Initialize Claude Agent system in your project')
// 之后: .description(L.cli.description)

// 之前: console.error('❌ Initialization failed:', error)
// 之后: console.error(`❌ ${L.cli.errors.initFailed}`, error)
```

需要替换的字符串位置（行号参考）：
- 第 19-21 行：程序名称、描述、版本
- 第 29-32 行：init 命令描述和选项
- 第 52 行：初始化失败错误
- 第 131 行：命令失败错误
- 第 163 行：致命错误

### 2. 修改 src/core/interactive-initializer.ts

这是最大的修改文件，包含 ~80 个字符串。

```typescript
// 在文件顶部添加
import { t } from '../i18n/index.js';

// 在每个需要翻译的方法中获取翻译函数
private async showProjectInfoStep(): Promise<ProjectInfo> {
  const L = t();
  // 使用 L.prompts.projectInfo.xxx
}
```

需要修改的方法和对应翻译键：

1. **showWelcomeBanner()** - 保持原样（ASCII art 不翻译）

2. **showProjectInfoStep()**
   - stepTitle → L.prompts.projectInfo.stepTitle
   - 'Project name:' → L.prompts.projectInfo.namePrompt
   - 'Project description:' → L.prompts.projectInfo.descPrompt
   - 默认值 → L.prompts.projectInfo.descDefault

3. **showFeatureSelectStep()**
   - stepTitle → L.prompts.featureSelect.stepTitle
   - 重量级提示 → L.prompts.featureSelect.heavyweightNote
   - '[heavyweight]' → L.prompts.featureSelect.heavyweightLabel
   - 冲突提示 → L.prompts.featureSelect.conflictsWith({ plugins })
   - 选择提示 → L.prompts.featureSelect.prompt
   - 选中统计 → L.prompts.featureSelect.selectedCount({ count })
   - 警告 → L.prompts.featureSelect.heavyweightWarning

4. **resolveConflicts()**
   - 标题 → L.prompts.conflictResolution.title
   - 移除项 → L.prompts.conflictResolution.removed({ item })

5. **showPluginConfigStep()**
   - stepTitle → L.prompts.pluginConfig.stepTitle({ plugin })
   - 未找到 → L.prompts.pluginConfig.notFound({ name })

6. **showSummaryStep()**
   - stepTitle → L.prompts.summary.stepTitle
   - 'Project:' → L.prompts.summary.project
   - 'Location:' → L.prompts.summary.location
   - 'Features:' → L.prompts.summary.features
   - 功能项 → L.prompts.summary.featureItem({ name })
   - 确认 → L.prompts.summary.confirmPrompt

7. **handleAlreadyInitialized()**
   - 警告 → L.prompts.alreadyInitialized.warning
   - 项目信息 → L.prompts.alreadyInitialized.projectInfo({ name })
   - 日期 → L.prompts.alreadyInitialized.initializedDate({ date })
   - 版本 → L.prompts.alreadyInitialized.versionInfo({ version })
   - 问题 → L.prompts.alreadyInitialized.whatToDo
   - 选项 → L.prompts.alreadyInitialized.keepOption 等

8. **showCompletionMessage()**
   - 标题 → L.prompts.complete.title
   - 文件创建 → L.prompts.complete.filesCreated
   - 命令列表 → L.prompts.complete.slashCommands
   - 下一步 → L.prompts.complete.nextSteps 等

9. **取消/错误消息**
   - 取消 → L.prompts.cancelled
   - 无插件 → L.prompts.noPlugins
   - 保留设置 → L.prompts.keepingSetup

### 3. 修改 src/prompts/components/progress.ts

```typescript
// 替换默认消息
const L = t();

// 'Complete' → L.prompts.progress.complete
// 'Failed' → L.prompts.progress.failed
// 'Warning' → L.prompts.progress.warning
// 'Info' → L.prompts.progress.info
```

### 4. 修改 src/prompts/*.ts 其他文件

对以下文件中的硬编码字符串进行替换：
- project-info.ts
- system-info.ts
- objectives.ts
- simple-prompts.ts

每个文件的替换方式相同：导入 t()，替换字符串。

## 测试验证

完成修改后运行：
```bash
pnpm build
CLAUDE_INIT_LANG=en pnpm start  # 验证英文
```

确保所有 UI 正常显示。

## 验收标准
1. ✅ src/cli.ts 所有字符串已国际化
2. ✅ src/core/interactive-initializer.ts 所有字符串已国际化
3. ✅ src/prompts/ 下所有文件已国际化
4. ✅ pnpm build 无错误
5. ✅ 运行 CLI 英文界面正常显示
```

---

## Phase 3: 插件国际化

### Subagent Prompt

```
你是一个专业的 TypeScript/Node.js 开发者。你的任务是将 claude-memory-init 项目的所有插件改造为支持 I18N。

## 前置条件
- Phase 1 和 Phase 2 已完成
- I18N 基础设施已就绪
- 通过 import { t } from '../../i18n/index.js' 获取翻译函数

## 重要说明
- **不要修改** templates/ 目录下的任何文件（AI prompt 不需要国际化）
- 只国际化用户可见的 CLI 交互字符串

## 任务清单

### 1. system-detector 插件
**文件**: src/plugins/system-detector/index.ts

需要国际化的内容：
- 插件 meta.description
- configure() 中的所有 UI 提示
- getSummary() 中的输出
- 包管理器描述（pip, uv, poetry 等）

```typescript
import { t } from '../../i18n/index.js';

// 在 configure() 方法中
const L = t();
// 使用 L.plugins.systemDetector.xxx
```

主要替换：
- '[System Configuration]' → L.plugins.systemDetector.configTitle
- '✓ Found user preferences' → L.plugins.systemDetector.foundPrefs
- 'Select your preferred Python package manager:' → L.plugins.systemDetector.selectPython
- 包管理器描述 → L.plugins.systemDetector.pmDesc.xxx

### 2. memory-system 插件
**文件**: src/plugins/memory-system/index.ts

需要国际化的内容：
- 插件 meta.description
- configure() 中的选项和提示
- slash 命令描述
- getSummary() 输出

主要替换：
- 'Which memory types do you want to enable?' → L.plugins.memorySystem.selectTypes
- 'Knowledge' / 'History' → L.plugins.memorySystem.knowledge / .history
- 命令描述 → L.plugins.memorySystem.commands.xxx

### 3. git 插件
**文件**: src/plugins/git/index.ts

需要国际化的内容：
- 插件 meta.description
- configure() 中的所有确认提示
- getSummary() 输出

主要替换：
- 'Enable auto-commit...' → L.plugins.git.enableAutoCommit
- 'Commit memory files separately...' → L.plugins.git.separateCommits
- 'Allow AI agent to perform git operations?' → L.plugins.git.allowAiGit

**注意**: generateGitRulesMarkdown() 生成的 Markdown 内容是给 AI 看的规则文档，保持英文。

### 4. task-system 插件
**文件**: src/plugins/task-system/index.ts

需要国际化的内容：
- 插件 meta.description
- configure() 中的确认提示
- slash 命令描述
- getSummary() 输出

主要替换：
- 'Enable task state tracking...' → L.plugins.taskSystem.enableTracking
- 命令描述 → L.plugins.taskSystem.commands.xxx

### 5. prompt-presets 插件
**文件**: src/plugins/prompt-presets/index.ts

需要国际化的内容：
- 插件 meta.description
- configure() 中的选择提示
- 基础模板名称和描述
- 增强模块名称和描述
- getSummary() 输出

主要替换：
- 'Select a base prompt template:' → L.plugins.promptPresets.selectBase
- 模板名称/描述 → L.plugins.promptPresets.bases.xxx
- 增强名称/描述 → L.plugins.promptPresets.enhancements.xxx

### 6. claude-flow 插件
**文件**: src/plugins/claude-flow/index.ts

需要国际化的内容：
- 插件 meta.description
- configure() 中的选择和确认提示
- 模式名称和描述
- MCP 服务器名称和描述
- getSummary() 输出

主要替换：
- 'Select Claude Flow initialization mode:' → L.plugins.claudeFlow.selectMode
- 模式 → L.plugins.claudeFlow.modes.xxx
- MCP 服务器 → L.plugins.claudeFlow.mcpServers.xxx

### 7. pma-gh 插件
**文件**: src/plugins/pma-gh/index.ts

需要国际化的内容：
- 插件 meta.description
- configure() 中的提示
- slash 命令描述
- getSummary() 输出

主要替换：
- '[PMA-GH Configuration]' → L.plugins.pmaGh.configTitle
- 'Enable issue validation...' → L.plugins.pmaGh.enableValidation
- 命令描述 → L.plugins.pmaGh.commands.xxx

## 工具类文件

### 8. src/utils/auto-commit.ts
所有用户可见的日志消息：
- 'No changes to commit' → L.utils.autoCommit.noChanges
- 'Auto-committing changes...' → L.utils.autoCommit.committing
- 等等

### 9. src/utils/git-ops.ts
所有用户可见的日志和提示消息需要国际化。
这是一个大文件，有很多字符串。

### 10. src/core/heavyweight-plugin-manager.ts
重量级插件初始化过程的日志消息：
- 'Initializing heavyweight plugin: {name}' → L.utils.heavyweight.initializing
- 等等

### 11. 其他核心文件
- src/core/config-manager.ts - 错误消息
- src/core/config-loader.ts - 错误消息
- src/core/marker.ts - 错误消息
- src/plugin/registry.ts - 验证错误消息
- src/plugin/loader.ts - 错误消息

## 验收标准
1. ✅ 所有 7 个插件的 UI 字符串已国际化
2. ✅ 所有工具类的日志消息已国际化
3. ✅ 所有错误消息已国际化
4. ✅ templates/ 目录未被修改
5. ✅ pnpm build 无错误
6. ✅ 运行 CLI 所有界面正常显示
```

---

## Phase 4: 中文翻译

### Subagent Prompt

```
你是一个专业的中英文翻译者和 TypeScript 开发者。你的任务是为 claude-memory-init 项目创建完整的中文翻译文件。

## 前置条件
- Phase 1-3 已完成
- src/i18n/en/index.ts 包含完整的英文翻译
- 需要创建对应的中文翻译

## 任务

### 创建 src/i18n/zh/index.ts

基于 src/i18n/en/index.ts 的结构，创建完整的中文翻译文件。

```typescript
import type { Translation } from '../i18n-types.js';

const zh = {
  common: {
    yes: '是',
    no: '否',
    confirm: '确认',
    cancel: '取消',
    skip: '跳过',
    back: '返回',
    next: '下一步',
    done: '完成',
    enabled: '已启用',
    disabled: '已禁用',
    selected: '已选择',
    step: '步骤 {current}/{total}',
    features: '{count} 个功能',
  },

  cli: {
    name: 'claude-init',  // 命令名保持英文
    description: '在项目中初始化 Claude Agent 系统',
    commands: {
      init: {
        description: '初始化 Claude Agent 系统（交互式）',
        forceOption: '强制重新初始化（覆盖现有文件）',
        targetOption: '目标目录（默认：当前目录）',
      },
    },
    errors: {
      initFailed: '初始化失败：',
      commandFailed: '命令执行失败：',
      fatalError: '致命错误：',
    },
  },

  prompts: {
    projectInfo: {
      stepTitle: '项目信息',
      namePrompt: '项目名称：',
      nameRequired: '项目名称为必填项',
      descPrompt: '项目描述：',
      descDefault: '一个集成 Claude 的项目',
      descRequired: '项目描述为必填项',
    },

    featureSelect: {
      stepTitle: '选择功能',
      prompt: '您想启用哪些功能？',
      heavyweightNote: '注意：部分功能是"重量级"插件，会运行自己的初始化命令，可能会修改现有文件。',
      heavyweightLabel: '[重量级]',
      conflictsWith: '（与 {plugins} 冲突）',
      selectedCount: '已选择：{count} 个功能',
      heavyweightWarning: '已选择重量级插件：{plugins}',
      heavyweightWarningDetail: '这些插件将运行外部初始化命令。',
    },

    conflictResolution: {
      title: '冲突解决：',
      removed: '  - 已移除：{item}',
    },

    pluginConfig: {
      stepTitle: '配置 {plugin}',
      notFound: "未找到插件 '{name}'，跳过。",
    },

    summary: {
      stepTitle: '摘要',
      project: '项目：',
      location: '位置：',
      features: '功能：',
      featureItem: '  ✓ {name}',
      confirmPrompt: '确认开始初始化？',
    },

    alreadyInitialized: {
      warning: '此项目已经初始化！',
      projectInfo: '项目：{name}',
      initializedDate: '初始化时间：{date}',
      versionInfo: '版本：{version}',
      whatToDo: '您想怎么做？',
      keepOption: '保留现有设置',
      keepDesc: '（不做更改）',
      reconfigOption: '重新配置',
      reconfigDesc: '（修改设置）',
      reinitOption: '重新初始化',
      reinitDesc: '（从头开始）',
      confirmOverwrite: '这将覆盖现有文件。确定吗？',
    },

    cancelled: '初始化已取消。',
    noPlugins: '未选择任何插件。初始化已取消。',
    keepingSetup: '保留现有设置。未做任何更改。',
    reconfigNotImpl: '重新配置功能尚未实现。',

    complete: {
      title: '初始化完成！',
      filesCreated: '已创建文件：',
      agentMd: '  ✓ {filename}',
      agentDir: '  ✓ {dirname}/',
      slashCommands: '可用的斜杠命令：',
      commandItem: '  • /{name}{hint} - {description}',
      nextSteps: '后续步骤：',
      step1: '  • 查看 {filename} 并按需自定义',
      step2: '  • 在此项目中开始与 Claude 对话',
      step3: '  • 尝试斜杠命令，如 /memory-search 或 /task-status',
      step4: "  • 运行 'claude-init --help' 查看更多命令",
    },

    progress: {
      complete: '完成',
      failed: '失败',
      warning: '警告',
      info: '信息',
    },
  },

  plugins: {
    systemDetector: {
      name: 'system-detector',
      description: '配置系统环境（双层记忆架构）',
      configTitle: '[系统配置]',
      foundPrefs: '✓ 找到用户偏好设置 (~/.claude/)',
      osInfo: '  操作系统：{name} ({type})',
      pythonManager: '  首选 Python 管理器：{manager}',
      nodeManager: '  首选 Node 管理器：{manager}',
      firstTimeSetup: '首次设置 - 正在检测系统...',
      osDetected: '✓ 操作系统：{name} ({type})',
      systemPm: '  系统包管理器：{pm}',
      timezone: '✓ 时区：{tz}',
      language: '✓ 语言：{lang}',
      pythonDetected: '✓ 检测到 Python：{version}',
      availableManagers: '  可用管理器：{list}',
      using: '  → 使用：{manager}',
      selectPython: '选择您首选的 Python 包管理器：',
      selectNode: '选择您首选的 Node.js 包管理器：',
      nodeDetected: '✓ 检测到 Node.js：{version}',
      projectConfig: '[项目配置]',
      usePreferred: '在此项目中使用您的首选管理器？',
      selectProjectPython: '为此项目选择 Python 包管理器：',
      selectProjectNode: '为此项目选择 Node.js 包管理器：',
      pythonConfig: '  Python：{manager}',
      nodeConfig: '  Node：{manager}',
      notConfigured: '（未配置）',
      userPrefsSaved: '用户偏好已保存到 ~/.claude/system/preferences.toon',
      projectConfigSaved: '项目配置已保存到 .agent/system/config.toon',
      pmDesc: {
        pip: '标准 Python 包安装器',
        uv: '⚡ 超快速 Python 包安装器（推荐）',
        poetry: '📦 依赖管理和打包工具',
        pipenv: '🔧 虚拟环境和依赖管理',
        conda: '🐍 包和环境管理',
        npm: '📦 标准 Node.js 包管理器',
        pnpm: '⚡ 快速、节省磁盘空间（推荐）',
        yarn: '🧶 快速、可靠、安全的依赖管理器',
        bun: '🔥 一体化 JavaScript 运行时和工具包',
      },
    },

    memorySystem: {
      name: 'memory-system',
      description: '知识持久化记忆系统',
      selectTypes: '您想启用哪些记忆类型？',
      knowledge: '知识库',
      knowledgeDesc: '稳定的架构知识',
      history: '历史记录',
      historyDesc: '任务历史记录',
      includeSystem: '包含系统知识层（通用工具、标准）？',
      typesSelected: '记忆类型：{types}',
      systemIncluded: '系统知识：已包含',
      initialized: '记忆系统已初始化',
      commands: {
        searchDesc: '按标签查找笔记',
        queryDesc: '按主题查询笔记',
        indexDesc: '显示完整记忆索引',
        recentDesc: '显示最近 N 条笔记',
      },
    },

    git: {
      name: 'git',
      description: 'Git 操作和自动提交',
      enableAutoCommit: '为记忆系统更新启用自动提交？',
      separateCommits: '将记忆文件与其他更改分开提交？',
      enableRemoteSync: '为系统记忆启用远程同步？',
      remoteUrl: '远程模板仓库 URL：',
      autoCreatePr: '同步时自动创建 PR？',
      allowAiGit: '允许 AI 代理执行 Git 操作？',
      autoCommitEnabled: '自动提交：已启用',
      remoteSyncEnabled: '远程同步：已启用',
      aiGitAllowed: 'AI Git 操作：允许',
      aiGitForbidden: 'AI Git 操作：禁止',
      configStored: 'Git 配置已保存',
    },

    taskSystem: {
      name: 'task-system',
      description: '任务工作流、状态跟踪和输出',
      enableTracking: '启用任务状态跟踪 (current.toon)？',
      enableOutput: '启用任务输出目录 (.agent/tasks/output/)？',
      trackingEnabled: '任务跟踪：已启用',
      outputEnabled: '输出目录：已启用',
      initialized: '任务系统已初始化',
      commands: {
        createDesc: '创建带专用提示的任务',
        startDesc: '开始执行任务',
        pauseDesc: '暂停当前任务（保存状态）',
        resumeDesc: '恢复暂停的任务',
        statusDesc: '显示当前任务状态',
        listDesc: '列出所有任务',
        incompleteDesc: '列出未完成的任务',
        completeDesc: '标记任务为完成',
      },
    },

    promptPresets: {
      name: 'prompt-presets',
      description: '基础提示模板和可选增强',
      configTitle: '[提示预设]',
      selectBase: '选择基础提示模板：',
      selectedBase: '✓ 已选择基础模板：{name}',
      selectEnhancements: '选择要包含的增强模块（可选）：',
      selectedEnhancements: '✓ 已选择增强模块：{list}',
      noEnhancements: '✓ 未选择增强模块（最小化预设）',
      baseLabel: '基础模板：{name}',
      enhancementsLabel: '增强模块 ({count})：{list}',
      enhancementsNone: '增强模块：无（最小化）',
      willGenerate: '提示预设将被生成',
      enhancementNotFound: '警告：未找到增强模块 {name}',
      generateFailed: '生成预设失败：{error}',
      bases: {
        codeReview: { name: '代码审查', desc: '代码质量和安全审查' },
        documentation: { name: '文档', desc: '生成和维护文档' },
        refactoring: { name: '重构', desc: '代码改进和清理' },
        testing: { name: '测试', desc: '测试生成和质量' },
        architecture: { name: '架构', desc: '系统设计分析' },
        bugFixing: { name: '错误修复', desc: '调试和故障排除' },
      },
      enhancements: {
        systemInfo: { name: '系统信息', desc: '操作系统、Python、Node.js 环境' },
        memoryInstructions: { name: '记忆指南', desc: '如何使用记忆系统' },
        fullContext: { name: '完整上下文', desc: '完整读取文件，使用所有可用 token' },
        gitRules: { name: 'Git 规则', desc: 'Git 操作指南' },
        taskWorkflow: { name: '任务工作流', desc: '任务管理指南' },
        toonRef: { name: 'TOON 参考', desc: 'TOON 格式快速参考' },
      },
    },

    claudeFlow: {
      name: 'claude-flow',
      description: 'Claude Flow 集成，支持 AI 编排和多代理',
      selectMode: '选择 Claude Flow 初始化模式：',
      modes: {
        standard: { name: '标准', desc: '完整设置，包含常用工作流和 54+ 代理' },
        sparc: { name: 'SPARC', desc: 'SPARC 方法论，结构化开发阶段' },
        minimal: { name: '最小化', desc: '仅必要文件，基本代理设置' },
        skip: { name: '跳过', desc: '跳过 Claude Flow 初始化' },
      },
      enableSwarm: '启用 Swarm 模式（多代理编排）？',
      enableHiveMind: '启用 Hive Mind 系统（集体智能）？',
      selectMcp: '选择要配置的 MCP 服务器：',
      mcpServers: {
        claudeFlow: { name: 'claude-flow', desc: '核心 Claude Flow MCP 服务器（必需）' },
        ruvSwarm: { name: 'ruv-swarm', desc: '增强的 Swarm 协调' },
        flowNexus: { name: 'flow-nexus', desc: '云功能和高级编排' },
      },
      skipped: 'Claude Flow：已跳过',
      modeSelected: '模式：{mode}',
      swarmEnabled: 'Swarm 模式：已启用',
      hiveMindEnabled: 'Hive Mind：已启用',
      mcpSelected: 'MCP 服务器：{list}',
      statusDesc: '显示 Claude Flow 状态',
    },

    pmaGh: {
      name: 'pma-gh',
      description: 'GitHub 项目管理助手，支持 Issue 跟踪和 PR 工作流',
      configTitle: '[PMA-GH 配置]',
      enableValidation: '启用 Issue 验证（检查分配人和项目关联）？',
      autoCreateBranch: '开始处理 Issue 时自动创建功能分支？',
      branchPattern: '分支命名模式：',
      validationEnabled: '验证：已启用',
      validationDisabled: '验证：已禁用',
      autoBranchEnabled: '自动创建分支：已启用',
      autoBranchDisabled: '自动创建分支：已禁用',
      branchPatternLabel: '分支模式：{pattern}',
      initialized: 'PMA-GH 插件已初始化',
      commands: {
        issueDesc: '获取、验证并分析 GitHub Issue',
        prDesc: '创建 PR 以解决当前 Issue',
        closeDesc: '关闭当前 Issue（标记为不计划）',
      },
    },
  },

  errors: {
    validation: {
      configNotFound: '未找到配置文件。请先运行 "claude-memory-init init"。',
      invalidKey: '无效的配置键：{key}',
      invalidIndex: '无效的索引：{index}。有效范围：0-{max}',
    },
    plugin: {
      alreadyRegistered: "插件 '{name}' 已注册",
      commandNameUsed: "插件命令名 '{name}' 已被插件 '{existing}' 使用",
      notFound: "在注册表中未找到插件 '{name}'",
      mustHaveMeta: '插件必须有元数据',
      mustHaveName: '插件必须有有效的名称',
      mustHaveCommand: "插件 '{name}' 必须有有效的 commandName",
      mustHaveVersion: "插件 '{name}' 必须有有效的版本",
      mustHaveDesc: "插件 '{name}' 必须有描述",
      hookFailed: "插件 '{name}' 在 '{hook}' 钩子中失败：{error}",
      dependencyNotFound: '未找到插件依赖：{plugin}',
    },
    heavyweight: {
      noConfig: "插件 '{name}' 被标记为重量级但未实现 getHeavyweightConfig()",
      configFailed: "获取插件 '{name}' 的重量级配置失败：{error}",
      backupFailed: '备份受保护文件失败：{error}',
      commandExitCode: '命令退出代码：{code}',
      commandFailed: '命令执行失败：{error}',
      mergeFailed: '合并失败：{path} - {error}',
      unknownStrategy: '未知的合并策略：{strategy}',
    },
    git: {
      notRepo: '不是 Git 仓库。跳过自动提交。',
      commitFailed: '提交记忆系统更改失败',
      pushFailed: '推送失败',
    },
    file: {
      loadFailed: '从 {path} 加载配置失败：{message}',
      saveFailed: '保存配置到 {path} 失败：{message}',
      createFailed: '创建 {path} 失败：{error}',
    },
  },

  utils: {
    autoCommit: {
      noChanges: '没有要提交的更改',
      noMemoryChanges: '没有记忆系统更改需要提交',
      committing: '正在自动提交更改...',
      committingSeparate: '正在单独提交 {count} 个记忆系统文件...',
      committingCombined: '正在提交 {count} 个记忆系统文件...',
      committed: '记忆系统更改已提交',
      filesCommitted: '已提交的文件：',
      otherFilesRemain: '注意：还有 {count} 个其他文件未提交：',
      commitManually: '请手动提交这些文件，否则它们将包含在下次提交中',
    },
    gitOps: {
      initSubmodule: '正在初始化 Git 子模块：{path}',
      updateSubmodule: '正在更新 Git 子模块：{path}',
      notSubmodule: '{path} 存在但不是 Git 子模块',
      cloning: '正在克隆记忆仓库到临时目录...',
      foundDiffs: '发现 {count} 个有差异的文件',
      noDiffs: '本地和远程记忆仓库之间没有差异',
      creatingBranch: '正在创建分支：{name}',
      branchCreated: "分支 '{name}' 已创建，包含 {count} 个系统记忆文件",
      filesIncluded: '此 PR 中包含的文件：',
      prLabel: 'PR 标签：',
      nextStepsTitle: '后续步骤：',
      commitPreview: '提交预览',
      commitMessage: '提交信息：',
      fileChanges: '文件更改：',
      insertsDels: '{inserts} 处插入(+)，{dels} 处删除(-)',
      newFile: '（新文件）',
      createCommitPrompt: '创建此提交？',
      commitCancelled: '提交已取消',
      creatingCommit: '正在创建提交...',
      commitCreated: '提交已创建：{name}',
      commitCreateFailed: '创建提交失败',
      pushPrompt: '推送到远程仓库？',
      pushLater: '提交已在本地创建。稍后推送：',
      pushing: '正在推送到远程...',
      pushSuccess: '分支推送成功',
      ghDetected: '检测到 GitHub CLI (gh) - 可自动创建 PR',
      ghNotFound: '未找到 GitHub CLI (gh) - 将提供手动指引',
      ghInstallHint: '安装 gh：https://cli.github.com/',
      createPrPrompt: '现在使用 gh CLI 创建 PR？',
      showPrInfo: '显示 PR 创建信息？',
      creatingPr: '正在使用 gh CLI 创建 Pull Request...',
      prCreated: 'Pull Request 已创建',
      prCreateFailed: '使用 gh CLI 创建 PR 失败',
      createPrManually: '请手动创建 PR：',
      prInfoTitle: 'PR 信息（复制使用）：',
    },
    heavyweight: {
      initializing: '正在初始化重量级插件：{name}',
      backingUp: '  正在备份 {count} 个受保护文件...',
      executing: '  正在执行：{command}',
      merging: '  正在合并受保护文件...',
      merged: '    已合并：{path}',
      initSuccess: "  插件 '{name}' 初始化成功",
      mergeFailed: '  部分文件合并失败。正在恢复备份...',
      restored: '    已恢复：{path}',
      removed: '    已删除：{path}',
    },
    resourceWriter: {
      created: '已创建：{path}',
      slashCommandFailed: '创建斜杠命令 {name} 失败：{error}',
      skillFailed: '创建技能 {name} 失败：{error}',
      outputsFailed: '为 {plugin} 生成输出失败：{error}',
    },
  },
} satisfies Translation;

export default zh;
```

## 运行生成器更新

完成翻译后，运行：
```bash
npx typesafe-i18n
```

## 测试验证

```bash
# 测试中文
CLAUDE_INIT_LANG=zh pnpm start

# 测试英文
CLAUDE_INIT_LANG=en pnpm start
```

## 验收标准
1. ✅ src/i18n/zh/index.ts 结构与 en/index.ts 完全对应
2. ✅ 所有中文翻译准确、自然
3. ✅ 技术术语保持一致（如 Git、Node.js 等保留英文）
4. ✅ npx typesafe-i18n 成功生成/更新类型文件
5. ✅ CLAUDE_INIT_LANG=zh 时界面显示中文
6. ✅ CLAUDE_INIT_LANG=en 时界面显示英文
```

---

## Phase 5: 测试

### Subagent Prompt

```
你是一个专业的 TypeScript/Node.js 测试工程师。你的任务是为 claude-memory-init 项目的 I18N 功能编写测试。

## 前置条件
- Phase 1-4 已完成
- I18N 基础设施已就绪
- 英文和中文翻译已创建

## 任务清单

### 1. 创建单元测试目录
mkdir -p tests/unit/i18n

### 2. 创建语言检测测试 tests/unit/i18n/detector.test.ts

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../../../src/i18n/detector.js';

describe('I18N Language Detector', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 清除所有相关环境变量
    delete process.env.CLAUDE_INIT_LANG;
    delete process.env.LANG;
    delete process.env.LANGUAGE;
    delete process.env.LC_ALL;
    delete process.env.LC_MESSAGES;
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = { ...originalEnv };
  });

  describe('CLAUDE_INIT_LANG environment variable', () => {
    it('should return "en" when CLAUDE_INIT_LANG=en', () => {
      process.env.CLAUDE_INIT_LANG = 'en';
      expect(detectLocale()).toBe('en');
    });

    it('should return "zh" when CLAUDE_INIT_LANG=zh', () => {
      process.env.CLAUDE_INIT_LANG = 'zh';
      expect(detectLocale()).toBe('zh');
    });

    it('should ignore unsupported CLAUDE_INIT_LANG values', () => {
      process.env.CLAUDE_INIT_LANG = 'fr';
      expect(detectLocale()).toBe(DEFAULT_LOCALE);
    });
  });

  describe('System locale detection', () => {
    it('should detect zh from LANG=zh_CN.UTF-8', () => {
      process.env.LANG = 'zh_CN.UTF-8';
      expect(detectLocale()).toBe('zh');
    });

    it('should detect en from LANG=en_US.UTF-8', () => {
      process.env.LANG = 'en_US.UTF-8';
      expect(detectLocale()).toBe('en');
    });

    it('should check LC_ALL when LANG is not set', () => {
      process.env.LC_ALL = 'zh_CN.UTF-8';
      expect(detectLocale()).toBe('zh');
    });

    it('should fallback to DEFAULT_LOCALE for unsupported locales', () => {
      process.env.LANG = 'ja_JP.UTF-8';
      expect(detectLocale()).toBe(DEFAULT_LOCALE);
    });
  });

  describe('Priority order', () => {
    it('CLAUDE_INIT_LANG should take priority over LANG', () => {
      process.env.CLAUDE_INIT_LANG = 'en';
      process.env.LANG = 'zh_CN.UTF-8';
      expect(detectLocale()).toBe('en');
    });
  });

  describe('Constants', () => {
    it('should have correct supported locales', () => {
      expect(SUPPORTED_LOCALES).toContain('en');
      expect(SUPPORTED_LOCALES).toContain('zh');
      expect(SUPPORTED_LOCALES).toHaveLength(2);
    });

    it('should have "en" as default locale', () => {
      expect(DEFAULT_LOCALE).toBe('en');
    });
  });
});
```

### 3. 创建翻译完整性测试 tests/unit/i18n/translations.test.ts

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import en from '../../../src/i18n/en/index.js';
import zh from '../../../src/i18n/zh/index.js';

describe('I18N Translations', () => {
  describe('Translation completeness', () => {
    function getAllKeys(obj: object, prefix = ''): string[] {
      const keys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          keys.push(...getAllKeys(value, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    it('should have all English keys present in Chinese translation', () => {
      const enKeys = getAllKeys(en);
      const zhKeys = new Set(getAllKeys(zh));

      const missingInZh = enKeys.filter(key => !zhKeys.has(key));

      expect(missingInZh).toEqual([]);
    });

    it('should not have extra keys in Chinese that are not in English', () => {
      const enKeys = new Set(getAllKeys(en));
      const zhKeys = getAllKeys(zh);

      const extraInZh = zhKeys.filter(key => !enKeys.has(key));

      expect(extraInZh).toEqual([]);
    });
  });

  describe('Parameter placeholders', () => {
    function checkPlaceholders(enStr: string, zhStr: string, key: string) {
      // 提取参数占位符 {name:type} 或 {name}
      const enParams = (enStr.match(/\{[^}]+\}/g) || []).sort();
      const zhParams = (zhStr.match(/\{[^}]+\}/g) || []).sort();

      expect(zhParams, `Key "${key}" has mismatched placeholders`).toEqual(enParams);
    }

    function compareValues(enObj: object, zhObj: object, prefix = '') {
      for (const [key, enValue] of Object.entries(enObj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const zhValue = (zhObj as Record<string, unknown>)[key];

        if (typeof enValue === 'string' && typeof zhValue === 'string') {
          checkPlaceholders(enValue, zhValue, fullKey);
        } else if (typeof enValue === 'object' && typeof zhValue === 'object' && enValue !== null && zhValue !== null) {
          compareValues(enValue as object, zhValue as object, fullKey);
        }
      }
    }

    it('should have matching parameter placeholders in all translations', () => {
      compareValues(en, zh);
    });
  });

  describe('Translation quality', () => {
    it('should not have empty translations', () => {
      function checkNotEmpty(obj: object, prefix = ''): string[] {
        const emptyKeys: string[] = [];
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'string' && value.trim() === '') {
            emptyKeys.push(fullKey);
          } else if (typeof value === 'object' && value !== null) {
            emptyKeys.push(...checkNotEmpty(value, fullKey));
          }
        }
        return emptyKeys;
      }

      const emptyInEn = checkNotEmpty(en);
      const emptyInZh = checkNotEmpty(zh);

      expect(emptyInEn).toEqual([]);
      expect(emptyInZh).toEqual([]);
    });

    it('should preserve technical terms in Chinese', () => {
      // 技术术语应保留英文
      const technicalTerms = ['Git', 'Node.js', 'Python', 'CLI', 'PR', 'URL'];

      const zhStr = JSON.stringify(zh);

      for (const term of technicalTerms) {
        // 这些术语在中文翻译中应该保留
        expect(zhStr).toContain(term);
      }
    });
  });
});
```

### 4. 创建 I18N 集成测试 tests/unit/i18n/integration.test.ts

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initI18n, t, getLocale, setLocale } from '../../../src/i18n/index.js';

describe('I18N Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 重置模块状态
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('initI18n', () => {
    it('should initialize with specified locale', async () => {
      const { initI18n, getLocale } = await import('../../../src/i18n/index.js');
      initI18n('zh');
      expect(getLocale()).toBe('zh');
    });

    it('should auto-detect locale when not specified', async () => {
      process.env.CLAUDE_INIT_LANG = 'zh';
      const { initI18n, getLocale } = await import('../../../src/i18n/index.js');
      initI18n();
      expect(getLocale()).toBe('zh');
    });
  });

  describe('t() function', () => {
    it('should return translation functions', async () => {
      const { initI18n, t } = await import('../../../src/i18n/index.js');
      initI18n('en');
      const L = t();

      expect(typeof L.common.yes).toBe('string');
      expect(L.common.yes).toBe('Yes');
    });

    it('should return Chinese translations when locale is zh', async () => {
      const { initI18n, t } = await import('../../../src/i18n/index.js');
      initI18n('zh');
      const L = t();

      expect(L.common.yes).toBe('是');
    });
  });

  describe('setLocale', () => {
    it('should change locale at runtime', async () => {
      const { initI18n, t, setLocale } = await import('../../../src/i18n/index.js');
      initI18n('en');

      let L = t();
      expect(L.common.yes).toBe('Yes');

      setLocale('zh');
      L = t();
      expect(L.common.yes).toBe('是');
    });
  });

  describe('Parameter interpolation', () => {
    it('should interpolate parameters correctly', async () => {
      const { initI18n, t } = await import('../../../src/i18n/index.js');
      initI18n('en');
      const L = t();

      // 测试带参数的翻译
      const result = L.common.step({ current: 1, total: 5 });
      expect(result).toBe('Step 1/5');
    });

    it('should interpolate parameters in Chinese', async () => {
      const { initI18n, t } = await import('../../../src/i18n/index.js');
      initI18n('zh');
      const L = t();

      const result = L.common.step({ current: 1, total: 5 });
      expect(result).toBe('步骤 1/5');
    });
  });
});
```

### 5. 更新 BDD 测试

BDD 测试可能需要调整以适应国际化。主要策略：

**文件**: tests/bdd/step-definitions/interactive-init.steps.ts

```typescript
// 替换基于字符串匹配的断言为基于调用顺序的断言

// 之前：
// expect(mockUI.lastOutput).toContain('Project Information');

// 之后：
// expect(mockUI.showStepHeader).toHaveBeenCalledWith(expect.objectContaining({
//   stepNumber: 1
// }));
```

或者使用语言无关的验证：
```typescript
// 验证 UI 方法被调用，而不是验证具体字符串
expect(mockUI.input).toHaveBeenCalled();
expect(mockUI.confirm).toHaveBeenCalled();
expect(mockUI.radioList).toHaveBeenCalled();
```

### 6. 运行测试

```bash
# 运行所有 I18N 测试
pnpm test tests/unit/i18n/

# 运行完整测试套件
pnpm test:all
```

## 验收标准
1. ✅ tests/unit/i18n/detector.test.ts 所有测试通过
2. ✅ tests/unit/i18n/translations.test.ts 所有测试通过
3. ✅ tests/unit/i18n/integration.test.ts 所有测试通过
4. ✅ 现有 BDD 测试在国际化后仍然通过（可能需要调整）
5. ✅ pnpm test:all 所有测试通过
6. ✅ 测试覆盖率达到预期
```

---

## 执行顺序

1. **Phase 1** (基础设施) - 必须首先完成
2. **Phase 2** (核心模块) - 依赖 Phase 1
3. **Phase 3** (插件) - 依赖 Phase 1，可与 Phase 2 并行
4. **Phase 4** (中文翻译) - 依赖 Phase 1-3
5. **Phase 5** (测试) - 依赖 Phase 1-4

## 总字符串统计

| 类别 | 数量 |
|------|------|
| CLI | ~12 |
| 交互提示 | ~80 |
| 插件 | ~200 |
| 工具类 | ~60 |
| 错误消息 | ~50 |
| **总计** | **~400** |

## 重要提醒

1. **templates/ 目录不翻译** - 这些是 AI prompt，保持英文
2. **技术术语保留英文** - Git, Node.js, Python, CLI, PR, URL 等
3. **命令名保留英文** - `claude-init`, `--force`, `--target` 等
4. **Emoji 保留** - ✅ ❌ ⚠️ 🚀 🎉 等在所有语言中通用
