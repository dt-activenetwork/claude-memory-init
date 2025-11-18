# CLI 命令结构设计

## 核心理念

### 默认行为

```bash
# 无参数 = 初始化
claude-init
# 等同于
claude-init init
```

### 插件子命令

插件可以注册自己的子命令，直接通过插件名调用：

```bash
# 记忆系统插件的子命令
claude-init memory add
claude-init memory list
claude-init memory sync

# 预设插件的子命令
claude-init preset add
claude-init preset list

# Git 插件的子命令
claude-init git commit
claude-init git sync
```

---

## 命令结构

### 核心命令

```bash
# 默认命令：初始化（交互式）
claude-init
# 等同于
claude-init init

# 强制重新初始化
claude-init init --force
```

### 插件子命令

插件可以注册自己的子命令。目前只有一个必需的命令：

```bash
# Memory System 插件提供
claude-init memory system-add
```

**就这一个！** 其他命令都是脑补的，不需要。

---

## 插件命令注册接口

### 命令格式

```
claude-init <plugin-command-name> <command>
```

- `<plugin-command-name>`: 插件的 CLI 命令名称（由 `meta.commandName` 定义）
- `<command>`: 插件暴露的命令名称

**示例**:
```bash
# memory-system 插件 (commandName: 'memory') 暴露 system-add 命令
claude-init memory system-add

# 如果未来 preset 插件需要暴露命令
claude-init preset refresh
```

### 核心原则

1. **显式定义**: 插件通过 `meta.commandName` 显式定义 CLI 命令名称
2. **命令组**: 插件的所有命令自动归组到 `commandName` 下
3. **可选命令**: 插件可以不暴露命令（`commands: []`）
4. **简化签名**: 命令 action 只接收 `(options, context)`

### 类型定义

```typescript
// src/plugin/types.ts

/**
 * 插件定义
 */
export interface Plugin {
  meta: {
    name: string;           // 插件完整名称，如 'memory-system'
    commandName: string;    // CLI 命令名称，如 'memory'
    version: string;
    description: string;
    author?: string;
    recommended?: boolean;  // 初始化时是否默认勾选
  };

  // 插件暴露的命令列表（可选）
  commands?: PluginCommand[];

  // 插件配置流程（可选）
  configuration?: PluginConfigurationFlow;

  // 插件生命周期钩子（可选）
  hooks?: PluginHooks;
}

/**
 * 插件命令定义
 */
export interface PluginCommand {
  // 命令名称（不包含插件前缀）
  // 例如：'system-add'（完整命令：claude-init memory system-add）
  name: string;

  // 命令描述
  description: string;

  // 命令选项
  options?: CommandOption[];

  // 命令处理函数
  action: (options: CommandOptions, context: PluginContext) => Promise<void>;
}

/**
 * 命令选项
 */
export interface CommandOption {
  flags: string;        // 选项标志，如 '-f, --force'
  description: string;  // 选项描述
  defaultValue?: any;   // 默认值
}

/**
 * 命令选项（运行时）
 */
export interface CommandOptions {
  [key: string]: any;   // 命令行传入的选项
}
```

### 命令注册流程

```typescript
// 1. 插件定义 commandName
const plugin: Plugin = {
  meta: {
    name: 'memory-system',
    commandName: 'memory',  // 🔥 定义 CLI 命令名称
    ...
  },
  commands: [...]
};

// 2. CLI 注册器读取 commandName
const commandName = plugin.meta.commandName;  // 'memory'

// 3. 创建命令组
program.command(commandName);  // claude-init memory

// 4. 注册插件的命令
for (const cmd of plugin.commands) {
  program
    .command(`${commandName} ${cmd.name}`)  // claude-init memory system-add
    .action(async (options) => {
      await cmd.action(options, context);
    });
}
```

---

## Memory System 插件子命令

### 唯一的命令：`memory system-add`

**功能**：将当前项目的记忆系统内容，按照用户指令生成新的 system 级记忆，并提交 PR 到 mem 仓库

**使用场景**：
- 团队在项目中总结出了新的最佳实践
- 发现了通用的工具使用技巧
- 整理出可复用的代码模式
- 想要贡献到团队共享的记忆模板

**完整流程**：

```bash
$ claude-init memory system-add

┌─────────────────────────────────────────────────────────────┐
│  📝 Add System Memory                                       │
└─────────────────────────────────────────────────────────────┘

? Memory type:
  ● System Memory (shared across projects)
  ○ Project Memory (local only)

? Category:
  ● Tools & Guidelines
  ○ Best Practices
  ○ Code Patterns
  ○ Architecture Patterns

? Title: › Code Reference Format Best Practice

? Description: › Guidelines for referencing code locations in responses

📝 Content Entry
────────────────────────────────────────

Please describe the memory content (Ctrl+D to finish):

When referencing code, always use the format:
- file_path:line_number for specific lines
- file_path:start-end for ranges
Example: src/utils/helper.ts:42

────────────────────────────────────────

? Add tags (comma-separated): › code-reference, guidelines, formatting

✨ Preview
────────────────────────────────────────

File: memory/system/tools/code-reference-format.md

---
title: Code Reference Format Best Practice
category: Tools & Guidelines
tags: [code-reference, guidelines, formatting]
date: 2025-01-18
---

# Code Reference Format Best Practice

Guidelines for referencing code locations in responses

## Content

When referencing code, always use the format:
- file_path:line_number for specific lines
- file_path:start-end for ranges
Example: src/utils/helper.ts:42

────────────────────────────────────────

? Save this memory? (Y/n) › Yes

✅ Memory saved locally

? Create PR to mem repository? (Y/n) › Yes

🔄 Syncing with remote...
────────────────────────────────────────

1. Cloning mem repository...
2. Creating branch: system-memory-20250118-xyz
3. Copying memory file...
4. Committing changes...
5. Pushing to remote...
6. Creating PR...

✅ PR created successfully!

📋 PR Details
────────────────────────────────────────
Title: Add system memory: Code Reference Format Best Practice
URL:   https://github.com/dt-activenetwork/mem/pull/123
Label: system-memory

Next steps:
  • Wait for review from team
  • PR will be merged to main branch
  • Changes will be available in next template update
```

### 插件实现

```typescript
// plugins/memory-system/commands/system-add.ts

import { PluginCommand, PluginContext } from '../../../plugin/types.js';
import { i18n } from '../../../i18n/index.js';

export const systemAddCommand: PluginCommand = {
  name: 'system-add',
  description: 'Create system-level memory from project knowledge and submit PR',
  options: [
    {
      flags: '--local',
      description: 'Save locally only (no PR)'
    },
    {
      flags: '--template <file>',
      description: 'Use template file'
    }
  ],

  action: async (args, options, context) => {
    const { ui, logger, config } = context;

    // 1. 选择分类
    const category = await ui.radioList(
      'Category:',
      [
        { name: 'Tools & Guidelines', value: 'tools' },
        { name: 'Best Practices', value: 'best-practices' },
        { name: 'Code Patterns', value: 'code-patterns' },
        { name: 'Architecture Patterns', value: 'architecture' }
      ]
    );

    // 2. 输入标题
    const title = await ui.input(
      'Title:',
      undefined,
      (input) => input.length > 0 || 'Title is required'
    );

    // 3. 输入描述
    const description = await ui.input(
      'Description:',
      undefined,
      (input) => input.length > 0 || 'Description is required'
    );

    // 4. 输入内容（多行）
    logger.info('\n📝 Content Entry');
    logger.info('─'.repeat(60));
    logger.info('Please describe the memory content (Ctrl+D to finish):\n');

    const content = await readMultilineInput();

    logger.info('\n' + '─'.repeat(60));

    // 5. 输入标签
    const tagsInput = await ui.input('Add tags (comma-separated):');
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // 6. 生成记忆文件
    const memory = {
      title,
      category,
      tags,
      date: new Date().toISOString().split('T')[0],
      description,
      content
    };

    // 7. 显示预览
    const memoryMarkdown = generateMemoryMarkdown(memory);
    const filename = generateMemoryFilename(title, category);

    logger.info('\n✨ Preview');
    logger.info('─'.repeat(60));
    logger.info(`\nFile: memory/system/${category}/${filename}\n`);
    logger.info(memoryMarkdown);
    logger.info('\n' + '─'.repeat(60));

    // 8. 确认保存
    const shouldSave = await ui.confirm('Save this memory?', true);

    if (!shouldSave) {
      logger.info('\nCancelled.');
      return;
    }

    // 9. 保存到本地
    const localPath = path.join(
      context.projectRoot,
      'claude',
      'memory',
      'system',
      category,
      filename
    );

    await fs.ensureDir(path.dirname(localPath));
    await fs.writeFile(localPath, memoryMarkdown);

    logger.success('✅ Memory saved locally');

    // 10. 询问是否创建 PR
    if (options.local) {
      return;
    }

    const shouldCreatePR = await ui.confirm(
      'Create PR to mem repository?',
      true
    );

    if (!shouldCreatePR) {
      logger.info('\nMemory saved locally. You can create PR later with:');
      logger.info('  claude-init memory sync');
      return;
    }

    // 11. 创建 PR
    await createSystemMemoryPR(context, {
      category,
      filename,
      content: memoryMarkdown,
      title,
      description
    });
  }
};

/**
 * 创建 system 级记忆的 PR
 */
async function createSystemMemoryPR(
  context: PluginContext,
  memory: {
    category: string;
    filename: string;
    content: string;
    title: string;
    description: string;
  }
): Promise<void> {
  const { logger } = context;

  logger.info('\n🔄 Syncing with remote...');
  logger.info('─'.repeat(60));

  const progress = new ProgressIndicator([
    'Cloning mem repository',
    'Creating branch',
    'Copying memory file',
    'Committing changes',
    'Pushing to remote',
    'Creating PR'
  ]);

  progress.start();

  try {
    // 1. 克隆 mem 仓库到临时目录
    progress.nextStep();
    const tmpDir = await cloneMemRepoToTmp();

    // 2. 创建分支
    progress.nextStep();
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const hash = generateShortHash(memory.title);
    const branchName = `system-memory-${timestamp}-${hash}`;

    await gitCreateBranch(tmpDir, branchName);

    // 3. 复制记忆文件
    progress.nextStep();
    const targetPath = path.join(
      tmpDir,
      'memory',
      'system',
      memory.category,
      memory.filename
    );

    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, memory.content);

    // 4. 提交
    progress.nextStep();
    const commitMessage = `Add system memory: ${memory.title}

${memory.description}

Category: ${memory.category}
Auto-generated by claude-init memory add
`;

    await gitCommit(tmpDir, commitMessage);

    // 5. 推送
    progress.nextStep();
    await gitPush(tmpDir, branchName);

    // 6. 创建 PR
    progress.nextStep();
    const prUrl = await createGitHubPR({
      branch: branchName,
      title: `Add system memory: ${memory.title}`,
      body: `## Summary

${memory.description}

## Memory Details

- **Category**: ${memory.category}
- **File**: memory/system/${memory.category}/${memory.filename}
- **Date**: ${new Date().toISOString().split('T')[0]}

## Content Preview

\`\`\`markdown
${memory.content.split('\n').slice(0, 20).join('\n')}
${memory.content.split('\n').length > 20 ? '\n...(truncated)' : ''}
\`\`\`

---

🤖 Auto-generated by \`claude-init memory add\`
`,
      labels: ['system-memory']
    });

    progress.succeed('PR created successfully!');

    // 清理临时目录
    await cleanupTmpDir(tmpDir);

    // 显示 PR 信息
    logger.info('\n📋 PR Details');
    logger.info('─'.repeat(60));
    logger.info(`Title: Add system memory: ${memory.title}`);
    logger.info(`URL:   ${prUrl}`);
    logger.info(`Label: system-memory`);
    logger.info('\nNext steps:');
    logger.info('  • Wait for review from team');
    logger.info('  • PR will be merged to main branch');
    logger.info('  • Changes will be available in next template update');

  } catch (error) {
    progress.fail('Failed to create PR');
    throw error;
  }
}

/**
 * 生成记忆文件名
 */
function generateMemoryFilename(title: string, category: string): string {
  // code-reference-format.md
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${slug}.md`;
}

/**
 * 生成记忆 Markdown 内容
 */
function generateMemoryMarkdown(memory: {
  title: string;
  category: string;
  tags: string[];
  date: string;
  description: string;
  content: string;
}): string {
  return `---
title: ${memory.title}
category: ${memory.category}
tags: [${memory.tags.join(', ')}]
date: ${memory.date}
---

# ${memory.title}

${memory.description}

## Content

${memory.content}
`;
}

/**
 * 读取多行输入
 */
async function readMultilineInput(): Promise<string> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    const readline = require('readline');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', (line: string) => {
      lines.push(line);
    });

    rl.on('close', () => {
      resolve(lines.join('\n'));
    });
  });
}
```

### 为什么只有这一个命令？

其他功能不需要命令行工具：
- ❌ **不需要** `memory list` - 直接看文件系统就行
- ❌ **不需要** `memory sync` - 这是自动的，包含在 `system-add` 里
- ❌ **不需要** `preset add` - 初始化时已经选择了
- ❌ **不需要** `git commit` - 这是 git 功能，不是我们的
- ❌ **不需要** `status/reconfigure` - 需要的时候重新 `init --force` 就行

**保持简单！** 只做真正需要的功能。

---

## CLI 注册机制

### 架构设计

```
claude-init                        # 默认：执行 init
  ├── init [--force]              # 初始化
  ├── memory                       # 插件命令组（由 memory-system 插件注册）
  │   └── system-add [--local]    # 插件命令
  ├── preset                       # 插件命令组（由 prompt-presets 插件注册，如果有命令）
  │   └── ...                     # 插件命令
  └── ...                          # 其他插件命令组
```

### 实现

```typescript
// src/cli.ts

import { Command } from 'commander';
import { initI18n, i18n } from './i18n/index.js';
import { PluginRegistry } from './plugin/registry.js';
import { InteractiveInitializer } from './core/interactive-initializer.js';
import { builtinPlugins } from './plugins/index.js';

await initI18n();

const program = new Command();

program
  .name('claude-init')
  .description(i18n.t('cli:description'))
  .version('2.0.0');

// 🔥 默认行为：无参数时执行 init
program.action(async () => {
  await runInit();
});

// init 命令
program
  .command('init')
  .description(i18n.t('cli:commands.init.description'))
  .option('-f, --force', i18n.t('cli:commands.init.options.force'))
  .action(async (options) => {
    await runInit(options);
  });

// 🔥 插件注册和命令注册
const pluginRegistry = new PluginRegistry();

for (const plugin of builtinPlugins) {
  pluginRegistry.register(plugin);

  // 如果插件暴露命令，注册命令组
  if (plugin.commands && plugin.commands.length > 0) {
    registerPluginCommands(program, plugin, pluginRegistry);
  }
}

/**
 * 注册插件命令
 *
 * 为插件创建命令组，格式：claude-init <plugin-command-name> <command>
 */
function registerPluginCommands(
  program: Command,
  plugin: Plugin,
  pluginRegistry: PluginRegistry
): void {
  // 使用插件定义的 commandName
  const pluginCommandName = plugin.meta.commandName;

  // 创建插件命令组
  const pluginCmd = program
    .command(pluginCommandName)
    .description(plugin.meta.description);

  // 注册插件的每个命令
  for (const command of plugin.commands!) {
    const subCmd = pluginCmd
      .command(command.name)
      .description(command.description);

    // 添加命令选项
    if (command.options) {
      for (const opt of command.options) {
        subCmd.option(opt.flags, opt.description, opt.defaultValue);
      }
    }

    // 注册命令处理函数
    subCmd.action(async (options) => {
      // 创建插件上下文
      const context = await createPluginContext(pluginRegistry);

      // 调用插件命令的 action
      await command.action(options, context);
    });
  }
}

/**
 * 创建插件上下文
 */
async function createPluginContext(pluginRegistry: PluginRegistry): PluginContext {
  // 读取当前项目配置
  const config = await loadProjectConfig(process.cwd());

  return {
    projectRoot: process.cwd(),
    targetDir: process.cwd(),
    config,
    shared: new Map(),
    logger: createLogger(),
    fs: createFileOperations(),
    template: createTemplateEngine(),
    i18n: {
      t: i18n.t.bind(i18n),
      language: i18n.language
    },
    ui: {
      checkboxList,
      radioList,
      confirm,
      input
    }
  };
}

/**
 * 运行初始化
 */
async function runInit(options: { force?: boolean } = {}): Promise<void> {
  const initializer = new InteractiveInitializer(pluginRegistry);
  await initializer.run(process.cwd(), options);
}

program.parse();
```

---

## 插件命令注册示例

### Memory System 插件

```typescript
// plugins/memory-system/index.ts

import { Plugin } from '../../plugin/types.js';
import { systemAddCommand } from './commands/system-add.js';

export const memorySystemPlugin: Plugin = {
  meta: {
    name: 'memory-system',          // 插件完整名称
    commandName: 'memory',           // 🔥 CLI 命令名称
    version: '1.0.0',
    description: 'Full semantic memory system'
  },

  // 🔥 暴露的命令列表
  commands: [
    systemAddCommand  // 完整命令：claude-init memory system-add
  ],

  configuration: {
    // ... 配置流程
  },

  hooks: {
    // ... 生命周期钩子
  }
};
```

### 命令定义

```typescript
// plugins/memory-system/commands/system-add.ts

import { PluginCommand } from '../../../plugin/types.js';

export const systemAddCommand: PluginCommand = {
  name: 'system-add',  // 命令名（完整：claude-init memory system-add）
  description: 'Create system-level memory from project knowledge and submit PR',

  options: [
    {
      flags: '--local',
      description: 'Save locally only (no PR)'
    }
  ],

  action: async (options, context) => {
    // options: { local?: boolean }
    // context: PluginContext

    const { ui, logger } = context;

    // 实现逻辑...
    // 1. 交互式收集信息
    // 2. 生成记忆文件
    // 3. 保存到本地
    // 4. 创建 PR（如果不是 --local）
  }
};
```

### 其他插件示例

```typescript
// plugins/prompt-presets/index.ts

export const promptPresetsPlugin: Plugin = {
  meta: {
    name: 'prompt-presets',
    commandName: 'preset',  // 🔥 CLI 命令名称
    version: '1.0.0',
    description: 'Preset prompt templates'
  },

  // 这个插件不暴露命令（配置在 init 时完成）
  commands: [],

  configuration: {
    needsConfiguration: true,
    configure: async (context) => {
      // 交互式选择预设
    }
  }
};
```

```typescript
// plugins/git/index.ts

export const gitPlugin: Plugin = {
  meta: {
    name: 'git',
    commandName: 'git',  // CLI 命令名称
    version: '1.0.0',
    description: 'Git integration'
  },

  // 这个插件也不暴露命令（功能在 hooks 中自动执行）
  commands: [],

  configuration: {
    needsConfiguration: true,
    configure: async (context) => {
      // Git 配置
    }
  },

  hooks: {
    afterInit: async (context) => {
      // 自动提交（如果启用）
    }
  }
};
```

---

## 使用示例

### 完整工作流

```bash
# 1. 初始化项目（交互式）
claude-init

# 2. 工作一段时间后，发现可以贡献的 system 级知识
claude-init memory system-add

# 就这么简单！
```

---

## 帮助信息

```bash
$ claude-init --help

Usage: claude-init [command] [options]

Interactive CLI for setting up Claude in your projects

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  init [options]           Initialize Claude in your project (default)
  memory <command>         Memory system commands

Run 'claude-init <command> --help' for more information on a command.
```

```bash
$ claude-init memory --help

Usage: claude-init memory [command]

Full semantic memory system

Commands:
  system-add              Create system-level memory and submit PR

Options:
  -h, --help              display help for command
```

```bash
$ claude-init memory system-add --help

Usage: claude-init memory system-add [options]

Create system-level memory from project knowledge and submit PR

Options:
  --local                 Save locally only (no PR)
  -h, --help              display help for command
```

---

## 设计原则

### 1. 极简主义
- ✅ 只有必需的命令
- ✅ 默认行为直观（`claude-init` = 初始化）
- ✅ 不脑补功能

### 2. 聚焦核心价值
- ✅ `memory system-add` 解决真实痛点：如何贡献知识到团队
- ✅ 自动化繁琐的 PR 创建流程
- ✅ 不做文件管理（那是文件系统的事）

### 3. 可扩展但克制
- ✅ 插件可以注册子命令
- ✅ 但不意味着要注册很多命令
- ✅ 只在真正需要时才添加

### 4. 团队协作友好
- ✅ 轻松贡献 system 级记忆到 mem 仓库
- ✅ 统一的 PR 格式和标签
- ✅ 清晰的审查流程

---

**最后更新**: 2025-01-18
**状态**: ✅ 设计完成，待实施
