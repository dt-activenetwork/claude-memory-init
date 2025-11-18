# 插件化架构重构方案

## 问题分析

### 当前架构的耦合问题

1. **记忆系统与其他功能强耦合**
   - Git 操作（auto-commit）混在记忆系统初始化流程中
   - 系统环境扫描（system-detector）作为记忆系统的一部分
   - CLAUDE.md 内容固定，无法灵活配置

2. **功能边界不清晰**
   - `initializer.ts` 职责过重：模板复制、配置渲染、git操作、索引更新
   - `FullConfig` 类型包含所有功能的配置，缺乏模块化
   - 插件功能无法独立启用/禁用

3. **扩展性差**
   - 添加新功能需要修改核心代码
   - 无法仅使用部分功能（如只要提示词插件，不要记忆系统）
   - 第三方无法轻松贡献插件

## 重构目标

### 核心原则

1. **插件化**: 所有功能作为插件实现
2. **可组合**: 用户可选择需要的插件组合
3. **解耦**: 插件之间通过标准接口通信
4. **向后兼容**: 保持现有用户的使用体验

### 功能拆分

```
claude-init (核心工具)
├── 核心功能 (最小化)
│   ├── CLI 框架
│   ├── 插件系统
│   ├── 配置管理
│   └── 模板引擎
│
└── 插件 (可选组合)
    ├── @claude-init/plugin-memory-system     # 记忆系统
    ├── @claude-init/plugin-prompt-presets    # 预设提示词
    ├── @claude-init/plugin-git               # Git 操作 (包含 auto-commit, remote-sync)
    └── @claude-init/plugin-system-detector   # 环境扫描
```

## 架构设计

### 1. 插件系统接口

```typescript
// src/plugin/types.ts

/**
 * 插件生命周期钩子
 */
export interface PluginHooks {
  // 初始化前
  beforeInit?: (context: PluginContext) => Promise<void> | void;

  // 配置阶段
  configure?: (context: PluginContext) => Promise<PluginConfig> | PluginConfig;

  // 执行阶段
  execute?: (context: PluginContext) => Promise<void> | void;

  // 初始化后
  afterInit?: (context: PluginContext) => Promise<void> | void;

  // 清理阶段
  cleanup?: (context: PluginContext) => Promise<void> | void;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  // 项目根目录
  projectRoot: string;

  // 目标目录
  targetDir: string;

  // 共享配置
  config: SharedConfig;

  // 插件间共享数据
  shared: Map<string, any>;

  // 日志工具
  logger: Logger;

  // 文件操作工具
  fs: FileOperations;

  // 模板引擎
  template: TemplateEngine;
}

/**
 * 插件定义
 */
export interface Plugin {
  // 插件元信息
  meta: {
    name: string;           // 插件完整名称，如 'memory-system'
    commandName: string;    // CLI 命令名称，如 'memory' (用于 claude-init memory <cmd>)
    version: string;
    description: string;
    author?: string;
    dependencies?: string[];  // 依赖的其他插件
  };

  // 插件钩子
  hooks: PluginHooks;

  // 插件配置模式（用于验证用户配置）
  configSchema?: JSONSchema;

  // CLI 命令扩展（格式：claude-init <commandName> <command.name>）
  commands?: PluginCommand[];
}

/**
 * 插件命令定义
 */
export interface PluginCommand {
  name: string;                // 命令名称（不含插件前缀）
  description: string;         // 命令描述
  options?: CommandOption[];   // 命令选项
  action: (options: any, context: PluginContext) => Promise<void>;
}

export interface CommandOption {
  flags: string;        // '-f, --force'
  description: string;
  defaultValue?: any;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  enabled: boolean;
  options: Record<string, any>;
}

/**
 * 插件命令
 */
export interface PluginCommand {
  name: string;
  description: string;
  options?: CommandOption[];
  action: (args: any, context: PluginContext) => Promise<void>;
}
```

### 2. 核心配置结构

```typescript
// src/types/config.ts (重构后)

/**
 * 核心配置（最小化）
 */
export interface CoreConfig {
  project: {
    name: string;
    root: string;
  };

  output: {
    base_dir: string;  // 默认 'claude'
  };

  plugins: PluginRegistry;
}

/**
 * 插件注册表
 */
export interface PluginRegistry {
  [pluginName: string]: PluginConfig;
}

/**
 * 共享配置（插件可访问）
 */
export interface SharedConfig {
  core: CoreConfig;
  plugins: Map<string, any>;  // 各插件的配置
}
```

### 3. 插件加载器

```typescript
// src/plugin/loader.ts

export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map();
  private loadedPlugins: Map<string, any> = new Map();

  /**
   * 注册插件
   */
  register(plugin: Plugin): void {
    this.validatePlugin(plugin);
    this.plugins.set(plugin.meta.name, plugin);
  }

  /**
   * 加载插件
   */
  async load(config: CoreConfig, context: PluginContext): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins(config);
    const sortedPlugins = this.sortByDependencies(enabledPlugins);

    for (const plugin of sortedPlugins) {
      await this.loadPlugin(plugin, context);
    }
  }

  /**
   * 执行插件钩子
   */
  async executeHook(
    hookName: keyof PluginHooks,
    context: PluginContext
  ): Promise<void> {
    for (const [name, plugin] of this.loadedPlugins) {
      const hook = plugin.hooks[hookName];
      if (hook) {
        await hook(context);
      }
    }
  }

  /**
   * 获取插件提供的 CLI 命令
   */
  getCommands(): PluginCommand[] {
    const commands: PluginCommand[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.commands) {
        commands.push(...plugin.commands);
      }
    }
    return commands;
  }

  private validatePlugin(plugin: Plugin): void {
    // 验证插件元信息
    // 验证依赖关系
    // 验证配置模式
  }

  private getEnabledPlugins(config: CoreConfig): Plugin[] {
    return Array.from(this.plugins.values()).filter(
      plugin => config.plugins[plugin.meta.name]?.enabled !== false
    );
  }

  private sortByDependencies(plugins: Plugin[]): Plugin[] {
    // 拓扑排序，确保依赖顺序正确
    // TODO: 实现依赖排序算法
    return plugins;
  }

  private async loadPlugin(plugin: Plugin, context: PluginContext): Promise<void> {
    this.loadedPlugins.set(plugin.meta.name, plugin);
  }
}
```

### 4. 重构后的初始化流程

```typescript
// src/core/initializer.ts (重构后)

export class Initializer {
  private pluginLoader: PluginLoader;

  constructor(pluginLoader: PluginLoader) {
    this.pluginLoader = pluginLoader;
  }

  async initialize(config: CoreConfig, targetDir: string): Promise<void> {
    // 1. 创建插件上下文
    const context = this.createContext(config, targetDir);

    // 2. 加载插件
    await this.pluginLoader.load(config, context);

    // 3. 执行生命周期钩子
    await this.pluginLoader.executeHook('beforeInit', context);
    await this.pluginLoader.executeHook('configure', context);
    await this.pluginLoader.executeHook('execute', context);
    await this.pluginLoader.executeHook('afterInit', context);

    // 4. 清理
    await this.pluginLoader.executeHook('cleanup', context);
  }

  private createContext(config: CoreConfig, targetDir: string): PluginContext {
    return {
      projectRoot: process.cwd(),
      targetDir,
      config: {
        core: config,
        plugins: new Map()
      },
      shared: new Map(),
      logger: createLogger(),
      fs: createFileOperations(),
      template: createTemplateEngine()
    };
  }
}
```

## 插件实现示例

### 1. 记忆系统插件

```typescript
// plugins/memory-system/index.ts

import type { Plugin } from '../../src/plugin/types';

export const memorySystemPlugin: Plugin = {
  meta: {
    name: 'memory-system',
    version: '1.0.0',
    description: 'Claude Memory System with semantic, episodic, and procedural memory',
    dependencies: []
  },

  configSchema: {
    type: 'object',
    properties: {
      template_source: {
        type: 'string',
        description: 'Memory template source (local path or git URL)'
      },
      memory_types: {
        type: 'array',
        items: { type: 'string' },
        default: ['semantic', 'episodic', 'procedural']
      }
    }
  },

  hooks: {
    configure: async (context) => {
      // 询问记忆系统配置
      return {
        enabled: true,
        options: {
          template_source: 'git@github.com:dt-activenetwork/mem.git',
          memory_types: ['semantic', 'episodic', 'procedural']
        }
      };
    },

    execute: async (context) => {
      const { targetDir, config, fs, logger } = context;

      // 复制记忆系统模板
      const memoryDir = path.join(targetDir, config.core.output.base_dir, 'memory');
      await fs.ensureDir(memoryDir);

      // 初始化索引文件
      await initializeIndexes(memoryDir);

      logger.success('Memory system initialized');
    }
  }
};
```

### 2. 预设提示词插件

```typescript
// plugins/prompt-presets/index.ts

import type { Plugin } from '../../src/plugin/types';

export const promptPresetsPlugin: Plugin = {
  meta: {
    name: 'prompt-presets',
    version: '1.0.0',
    description: 'Pre-configured prompt templates for common use cases'
  },

  configSchema: {
    type: 'object',
    properties: {
      presets: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of preset names to enable'
      }
    }
  },

  hooks: {
    configure: async (context) => {
      const { logger } = context;

      // 列出可用的预设
      const availablePresets = [
        'code-review',
        'documentation',
        'refactoring',
        'testing',
        'architecture-analysis'
      ];

      logger.info('Available presets:', availablePresets);

      // 询问用户选择
      const selected = await promptMultiSelect(
        'Select prompt presets to install:',
        availablePresets
      );

      return {
        enabled: true,
        options: { presets: selected }
      };
    },

    execute: async (context) => {
      const { targetDir, config, fs, template } = context;
      const pluginConfig = config.plugins.get('prompt-presets');
      const presets = pluginConfig.options.presets;

      const promptDir = path.join(targetDir, config.core.output.base_dir, 'prompts');
      await fs.ensureDir(promptDir);

      // 安装每个预设
      for (const preset of presets) {
        const presetContent = await loadPreset(preset);
        const rendered = await template.render(presetContent, config);
        await fs.writeFile(
          path.join(promptDir, `${preset}.md`),
          rendered
        );
      }
    }
  },

  commands: [
    {
      name: 'add-preset',
      description: 'Add a new prompt preset',
      options: [
        { name: 'name', description: 'Preset name', required: true }
      ],
      action: async (args, context) => {
        // 添加新预设的逻辑
      }
    }
  ]
};
```

### 3. Git 插件（整合所有 Git 功能）

```typescript
// plugins/git/index.ts

import type { Plugin } from '../../src/plugin/types';

export const gitPlugin: Plugin = {
  meta: {
    name: 'git',
    version: '1.0.0',
    description: 'Git operations: auto-commit, remote sync, and automation'
  },

  configSchema: {
    type: 'object',
    properties: {
      // Auto-commit 功能
      auto_commit: {
        type: 'boolean',
        default: false,
        description: 'Auto-commit changes after initialization'
      },
      commit_separately: {
        type: 'boolean',
        default: true,
        description: 'Commit memory system files separately from other files'
      },

      // Gitignore 管理
      ignore_patterns: {
        type: 'array',
        items: { type: 'string' },
        default: ['claude/temp/'],
        description: 'Patterns to add to .gitignore'
      },

      // Remote sync 功能
      remote_sync: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: false },
          remote_url: {
            type: 'string',
            description: 'Remote repository URL for memory template'
          },
          auto_pr: {
            type: 'boolean',
            default: false,
            description: 'Auto-create PR for system memory updates'
          },
          pr_label: {
            type: 'string',
            default: 'system-prompt-update',
            description: 'Label for auto-created PRs'
          }
        }
      }
    }
  },

  hooks: {
    afterInit: async (context) => {
      const { targetDir, config, logger } = context;
      const pluginConfig = config.plugins.get('git');

      // 1. 更新 .gitignore
      if (pluginConfig.options.ignore_patterns?.length > 0) {
        await updateGitignore(
          targetDir,
          pluginConfig.options.ignore_patterns
        );
        logger.info('Updated .gitignore');
      }

      // 2. Auto-commit (如果启用)
      if (pluginConfig.options.auto_commit) {
        await autoCommitChanges(targetDir, {
          commit_separately: pluginConfig.options.commit_separately
        });
        logger.success('Changes auto-committed');
      }
    }
  },

  commands: [
    {
      name: 'commit',
      description: 'Commit changes with generated message',
      options: [
        {
          name: '--separate',
          description: 'Commit memory files separately',
          type: 'boolean'
        }
      ],
      action: async (args, context) => {
        const { targetDir, config } = context;
        await autoCommitChanges(targetDir, {
          commit_separately: args.separate ?? true
        });
      }
    },
    {
      name: 'sync',
      description: 'Sync local memory with remote repository',
      options: [
        {
          name: '--pr',
          description: 'Create pull request for changes',
          type: 'boolean'
        },
        {
          name: '--auto-confirm',
          description: 'Auto-confirm all prompts',
          type: 'boolean'
        }
      ],
      action: async (args, context) => {
        const { targetDir, config, logger } = context;
        const pluginConfig = config.plugins.get('git');

        // Sync logic (from current git-ops.ts)
        await syncMemoryRepo(
          targetDir,
          pluginConfig.options.remote_sync.remote_url,
          {
            createPR: args.pr,
            autoConfirm: args.autoConfirm
          }
        );
      }
    }
  ]
};
```

### 4. 系统检测插件

```typescript
// plugins/system-detector/index.ts

import type { Plugin } from '../../src/plugin/types';

export const systemDetectorPlugin: Plugin = {
  meta: {
    name: 'system-detector',
    version: '1.0.0',
    description: 'Detect system environment and development tools'
  },

  hooks: {
    configure: async (context) => {
      const { logger, shared } = context;

      // 检测系统信息
      const systemInfo = await detectSystemInfo();
      const devTools = await detectDevelopmentTools();

      // 存储到共享数据，供其他插件使用
      shared.set('system_info', systemInfo);
      shared.set('dev_tools', devTools);

      logger.info(`Detected: ${systemInfo.os_name}`);
      logger.info(`Python: ${devTools.python?.version || 'Not found'}`);
      logger.info(`Node.js: ${devTools.node?.version || 'Not found'}`);

      return {
        enabled: true,
        options: {
          include_in_config: true  // 是否写入配置文件
        }
      };
    },

    execute: async (context) => {
      const { targetDir, config, shared, fs } = context;
      const pluginConfig = config.plugins.get('system-detector');

      if (pluginConfig.options.include_in_config) {
        const systemInfo = shared.get('system_info');
        const devTools = shared.get('dev_tools');

        // 写入系统信息到配置文件
        const configPath = path.join(
          targetDir,
          config.core.output.base_dir,
          'system-info.yaml'
        );

        await fs.writeFile(configPath, yaml.stringify({
          system: systemInfo,
          tools: devTools
        }));
      }
    }
  }
};
```

## 配置文件格式

### 新的配置格式

```yaml
# claude.config.yaml

# 核心配置
project:
  name: "My Project"
  root: "."

output:
  base_dir: "claude"

# 插件配置
plugins:
  # 记忆系统插件
  memory-system:
    enabled: true
    options:
      template_source: "git@github.com:dt-activenetwork/mem.git"
      memory_types:
        - semantic
        - episodic
        - procedural

  # 预设提示词插件
  prompt-presets:
    enabled: true
    options:
      presets:
        - code-review
        - documentation

  # Git 插件（整合 auto-commit, remote-sync）
  git:
    enabled: true
    options:
      # Auto-commit 配置
      auto_commit: false
      commit_separately: true

      # Gitignore 配置
      ignore_patterns:
        - "claude/temp/"

      # Remote sync 配置
      remote_sync:
        enabled: false
        remote_url: "git@github.com:dt-activenetwork/mem.git"
        auto_pr: false
        pr_label: "system-prompt-update"

  # 系统检测插件
  system-detector:
    enabled: true
    options:
      include_in_config: true

  # 远程同步插件
  remote-sync:
    enabled: false
    options:
      remote_url: "git@github.com:dt-activenetwork/mem.git"
```

### 向后兼容

为了保持向后兼容，提供配置迁移工具：

```typescript
// src/core/config-migrator.ts

export async function migrateOldConfig(oldConfig: OldFullConfig): Promise<CoreConfig> {
  return {
    project: {
      name: oldConfig.project.name,
      root: oldConfig.paths.codebase
    },
    output: {
      base_dir: oldConfig.paths.base_dir
    },
    plugins: {
      'memory-system': {
        enabled: true,
        options: {
          template_source: 'default',
          memory_types: ['semantic', 'episodic', 'procedural']
        }
      },
      'git-operations': {
        enabled: oldConfig.git.ai_git_operations,
        options: {
          auto_commit: oldConfig.git.auto_commit_memory_updates,
          commit_separately: oldConfig.git.commit_memory_separately,
          ignore_patterns: oldConfig.git.ignore_patterns
        }
      },
      'system-detector': {
        enabled: true,
        options: {
          include_in_config: true
        }
      }
    }
  };
}
```

## CLI 集成

### 交互式体验优先

详细设计请参考：[Interactive CLI Design](./INTERACTIVE_CLI_DESIGN.md)

**核心理念**：对话式交互，而非参数式命令

```typescript
// src/cli.ts (重构后)

import { Command } from 'commander';
import { InteractiveInitializer } from './core/interactive-initializer';
import { PluginRegistry } from './plugin/registry';
import { builtinPlugins } from './plugins';

const program = new Command();

program
  .name('claude-init')
  .description('Interactive CLI for setting up Claude in your projects')
  .version('2.0.0');

// 主命令：初始化（只有交互式）
program
  .command('init')
  .description('Initialize Claude in your project')
  .option('-f, --force', 'Reinitialize even if already initialized')
  .action(async (options) => {
    const pluginRegistry = new PluginRegistry();
    for (const plugin of builtinPlugins) {
      pluginRegistry.register(plugin);
    }

    const initializer = new InteractiveInitializer(pluginRegistry);
    await initializer.run(process.cwd(), { force: options.force });
  });

// 其他命令也是交互式
program
  .command('add-preset')
  .description('Add a new prompt preset (interactive)')
  .action(async () => {
    // 交互式选择和添加预设
    await interactiveAddPreset();
  });

program
  .command('sync')
  .description('Sync with remote template (interactive)')
  .action(async () => {
    // 交互式同步流程
    await interactiveSync();
  });

program.parse();
```

### 交互流程示例

```
$ claude-init init

┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - Interactive Setup                        │
└─────────────────────────────────────────────────────────────┘

📋 Step 1/4: Project Information
────────────────────────────────────────

? Project name: › my-project
? Project description: › A web application


📦 Step 2/4: Select Features
────────────────────────────────────────

What features do you want to enable?
(Use ↑↓ to move, Space to select, Enter to confirm)

  ◉ Prompt Presets        Generate CLAUDE.md with preset prompts
  ◉ Memory System         Full semantic memory system
  ◯ Git Integration       Auto-commit and remote sync
  ◉ System Detection      Detect OS and dev tools

Selected: 3 features


📝 Step 3/4: Configure Features
────────────────────────────────────────

[Prompt Presets]
Which presets would you like to install?

  ◉ Code Review
  ◉ Documentation
  ◯ Refactoring
  ◯ Testing
  ◉ Architecture

Selected: 3 presets

[Memory System]
? Memory template source:
  ● Use default template (recommended)
  ○ Custom git repository
  ○ Local directory

[System Detection]
Detected:
  • OS: Ubuntu 22.04
  • Python: 3.11.5
  • Node.js: 20.10.0


✨ Summary
────────────────────────────────────────

Project: my-project

Features:
  ✓ Prompt Presets (3 presets)
  ✓ Memory System (default template)
  ✓ System Detection

? Proceed with initialization? › Yes


🎉 Initialization complete!
```

### 所有命令都是交互式的

```bash
# 初始化项目（唯一的核心命令）
claude-init init

# 重新初始化
claude-init init --force

# 添加预设（交互式选择）
claude-init add-preset

# 同步到远程（交互式确认）
claude-init sync

# 修改配置（交互式编辑）
claude-init reconfigure

# 查看当前状态（只读）
claude-init status
```

**设计理念**：这是一个开发者工具，不是自动化脚本，所有操作都应该让用户清楚地知道在做什么。

## 使用场景示例

### 场景 1: 仅使用提示词预设（无记忆系统）

```bash
# 初始化时仅启用提示词插件
claude-init init --plugins prompt-presets,git

# 配置文件
plugins:
  prompt-presets:
    enabled: true
    options:
      presets:
        - code-review
        - documentation
  git:
    enabled: true
    options:
      auto_commit: true
      commit_separately: false  # 不需要分离提交
```

### 场景 2: 完整记忆系统（默认）

```bash
# 使用所有插件（默认）
claude-init init --simple

# 或显式指定
claude-init init --plugins memory-system,prompt-presets,git,system-detector
```

### 场景 3: 记忆系统 + 远程同步

```bash
# 启用记忆系统和 Git 同步
claude-init init --plugins memory-system,git,system-detector

# 同步到远程
claude-init sync --pr

# 配置文件
plugins:
  memory-system:
    enabled: true
  git:
    enabled: true
    options:
      remote_sync:
        enabled: true
        remote_url: "git@github.com:org/mem-template.git"
        auto_pr: true
```

### 场景 4: 最小化配置（仅系统检测）

```bash
# 只检测系统环境，写入配置
claude-init init --plugins system-detector
```

## 迁移路径

### 阶段 1: 准备阶段（v2.0-alpha）

1. 实现插件系统核心
2. 将现有功能拆分为插件
3. 保持 API 向后兼容

### 阶段 2: 迁移阶段（v2.0-beta）

1. 提供配置迁移工具
2. 文档更新
3. 弃用警告

### 阶段 3: 发布阶段（v2.0）

1. 移除旧 API
2. 发布插件市场
3. 社区插件支持

## 目录结构

```
claude-memory-init/
├── src/
│   ├── core/              # 核心功能
│   │   ├── cli-builder.ts
│   │   ├── config.ts
│   │   └── initializer.ts
│   ├── plugin/            # 插件系统
│   │   ├── types.ts
│   │   ├── loader.ts
│   │   ├── context.ts
│   │   └── registry.ts
│   ├── plugins/           # 内置插件
│   │   ├── memory-system/
│   │   │   ├── index.ts
│   │   │   ├── template-copier.ts
│   │   │   └── index-manager.ts
│   │   ├── prompt-presets/
│   │   │   ├── index.ts
│   │   │   └── presets/
│   │   │       ├── code-review.md
│   │   │       ├── documentation.md
│   │   │       └── refactoring.md
│   │   ├── git/
│   │   │   ├── index.ts
│   │   │   ├── auto-commit.ts   # Auto-commit 功能
│   │   │   ├── remote-sync.ts   # Remote sync 功能
│   │   │   └── gitignore.ts     # Gitignore 管理
│   │   ├── system-detector/
│   │   │   ├── index.ts
│   │   │   └── detectors/
│   │   │       ├── os.ts
│   │   │       ├── python.ts
│   │   │       └── node.ts
│   │   └── index.ts
│   ├── utils/             # 共享工具
│   │   ├── logger.ts
│   │   ├── file-ops.ts
│   │   └── template-engine.ts
│   └── index.ts
├── plugins/               # 第三方插件目录（可选）
├── templates/             # 模板文件
│   ├── memory-system/
│   └── prompt-presets/
└── package.json
```

## 优势总结

### 1. 灵活性
- 用户可按需选择功能
- 轻松添加新插件
- 不同项目可使用不同配置

### 2. 可维护性
- 功能模块化，职责清晰
- 插件独立开发和测试
- 减少核心代码复杂度

### 3. 可扩展性
- 插件系统标准化
- 支持第三方插件
- 社区贡献更容易

### 4. 向后兼容
- 配置自动迁移
- 默认行为保持一致
- 渐进式升级路径

## 下一步行动

1. **评审设计**: 确认架构方案
2. **实现插件系统**: 核心 API 和加载器
3. **拆分现有功能**: 逐个迁移为插件
4. **文档和示例**: 插件开发指南
5. **社区反馈**: 收集用户意见

---

**版本**: Draft 1.0
**日期**: 2025-01-18
**状态**: 待评审
