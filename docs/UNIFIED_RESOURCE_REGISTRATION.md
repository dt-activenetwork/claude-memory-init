# Unified Resource Registration System

> Design Document v1.0
> Date: 2025-11-26
> **Status**: ✅ **已实现** (v2.2.0-alpha)
>
> 代码位于 `src/core/output-router.ts` 和 `src/core/resource-writer.ts`

## 1. Overview

### 1.1 Problem Statement

当前 CLI 存在以下问题：

1. **Slash Commands 双重注册**：`slashCommands` 属性仅用于显示帮助，实际文件写入需要在 `outputs.generate` 中重复处理
2. **写入路径硬编码**：插件直接知道 `.agent/commands/` 等目录结构，与 CLI 耦合
3. **缺少 Skills 支持**：没有 `.claude/skills/` 的注册机制
4. **目录结构混乱**：`.agent/` vs `.claude/` 职责不清

### 1.2 Solution

实现"声明即生成"模式：
- 插件只负责**声明**资源（slashCommands, skills）
- CLI 统一负责**读取模板**和**写入文件**
- 通过 `OutputRouter` 集中控制输出位置

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Plugin Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ memory-sys  │  │ task-system │  │  pma-gh     │  ...         │
│  │             │  │             │  │             │              │
│  │ slashCmds[] │  │ slashCmds[] │  │ slashCmds[] │              │
│  │ skills[]    │  │ outputs{}   │  │ skills[]    │              │
│  │ outputs{}   │  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Resource Writer                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ writeAllResources(plugins, configs, context)                ││
│  │   ├── writeSlashCommands()  → OutputRouter.getSlashCmdPath  ││
│  │   ├── writeSkills()         → OutputRouter.getSkillPath     ││
│  │   └── writeDataFiles()      → OutputRouter.getDataPath      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Output Router                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ routes: {                                                   ││
│  │   slashCommands: '.claude/commands',                        ││
│  │   skills: '.claude/skills',                                 ││
│  │   projectData: '.agent',                                    ││
│  │   userData: '~/.claude',                                    ││
│  │ }                                                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       File System                                │
│  project/                                                        │
│  ├── .claude/                                                    │
│  │   ├── commands/           ← slashCommands                    │
│  │   │   ├── memory-search.md                                   │
│  │   │   └── pma-issue.md                                       │
│  │   └── skills/             ← skills                           │
│  │       └── gh-issue/                                          │
│  │           └── SKILL.md                                       │
│  ├── .agent/                 ← projectData                      │
│  │   ├── memory/                                                │
│  │   ├── tasks/                                                 │
│  │   └── system/                                                │
│  └── AGENT.md                                                    │
│                                                                  │
│  ~/.claude/                  ← userData                         │
│  └── system/preferences.toon                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. Plugin 声明资源
   slashCommands: [{ name, description, templatePath }]
   skills: [{ name, description, version, templatePath }]

2. CLI 收集资源
   ResourceWriter.writeAllResources(plugins, configs, context)

3. 模板加载
   TemplateLoader.load(templatePath) → content

4. 路径解析
   OutputRouter.getSlashCommandPath(name) → absolute path
   OutputRouter.getSkillPath(name) → absolute path

5. 文件写入
   writeFile(targetPath, content)
```

## 3. Type Definitions

### 3.1 SlashCommand (Updated)

```typescript
/**
 * Slash Command 声明
 *
 * 插件声明后，CLI 自动：
 * 1. 读取 templatePath 指定的模板
 * 2. 写入到 OutputRouter 配置的目标路径
 */
export interface SlashCommand {
  /** 命令名称，不含前缀 (如 "memory-search") */
  name: string;

  /** 命令描述，用于帮助信息 */
  description: string;

  /** 参数提示 (如 "[tag-name]", "<url>") */
  argumentHint?: string;

  /**
   * 模板路径，相对于项目 templates/ 目录
   *
   * @example 'commands/memory/search.md'
   * @example 'commands/pma/issue.md'
   */
  templatePath: string;
}
```

### 3.2 Skill (New)

```typescript
/**
 * Skill 声明
 *
 * 插件声明后，CLI 自动：
 * 1. 读取 templatePath 指定的模板
 * 2. 写入到 .claude/skills/<name>/SKILL.md
 */
export interface Skill {
  /** 技能名称，用作目录名 (如 "gh-issue") */
  name: string;

  /** 技能描述 */
  description: string;

  /** 技能版本 (如 "1.0.0") */
  version: string;

  /**
   * 模板路径，相对于项目 templates/ 目录
   *
   * @example 'skills/gh-issue.md'
   * @example 'skills/memory-indexer.md'
   */
  templatePath: string;
}
```

### 3.3 OutputRoutes

```typescript
/**
 * 输出路由配置
 *
 * 集中定义所有资源的输出位置，便于统一管理和修改
 */
export interface OutputRoutes {
  /** Slash commands 输出目录，相对于项目根目录 */
  slashCommands: string;

  /** Skills 输出目录，相对于项目根目录 */
  skills: string;

  /** 项目数据目录，相对于项目根目录 */
  projectData: string;

  /** 用户数据目录，绝对路径或 ~ 开头 */
  userData: string;
}

/**
 * 默认路由配置
 */
export const DEFAULT_OUTPUT_ROUTES: OutputRoutes = {
  slashCommands: '.claude/commands',
  skills: '.claude/skills',
  projectData: '.agent',
  userData: '~/.claude',
};
```

### 3.4 Plugin Interface (Updated)

```typescript
export interface Plugin {
  /** 插件元数据 */
  meta: PluginMeta;

  /** 配置流程 */
  configuration?: PluginConfigurationFlow;

  /** 生命周期钩子 */
  hooks?: PluginHooks;

  /** CLI 子命令 */
  commands?: PluginCommand[];

  /**
   * Slash commands 声明
   *
   * CLI 自动读取模板并写入到配置的目标路径
   * 插件不需要在 outputs 中处理 commands 写入
   */
  slashCommands?: SlashCommand[];

  /**
   * Skills 声明 (新增)
   *
   * CLI 自动读取模板并写入到 .claude/skills/<name>/SKILL.md
   */
  skills?: Skill[];

  /** AGENT.md 内容贡献 */
  prompt?: PluginPromptContribution;

  /**
   * 文件输出
   *
   * 注意：不应再包含 commands/ 或 skills/ 的写入
   * 这些由 slashCommands 和 skills 声明自动处理
   */
  outputs?: PluginOutputs;

  /** Gitignore 贡献 */
  gitignore?: PluginGitignoreContribution;

  // Heavyweight plugin methods...
  getHeavyweightConfig?: (...) => ...;
  mergeFile?: (...) => ...;
}
```

## 4. Implementation

### 4.1 OutputRouter Class

**File**: `src/core/output-router.ts`

```typescript
import * as path from 'path';
import * as os from 'os';

export interface OutputRoutes {
  slashCommands: string;
  skills: string;
  projectData: string;
  userData: string;
}

export const DEFAULT_OUTPUT_ROUTES: OutputRoutes = {
  slashCommands: '.claude/commands',
  skills: '.claude/skills',
  projectData: '.agent',
  userData: '~/.claude',
};

/**
 * 输出路由器
 *
 * 负责将资源类型映射到实际的文件系统路径
 */
export class OutputRouter {
  constructor(
    private projectRoot: string,
    private routes: OutputRoutes = DEFAULT_OUTPUT_ROUTES
  ) {}

  /** 获取路由配置 */
  getRoutes(): OutputRoutes {
    return { ...this.routes };
  }

  /** 获取 slash command 文件路径 */
  getSlashCommandPath(name: string): string {
    return path.join(this.projectRoot, this.routes.slashCommands, `${name}.md`);
  }

  /** 获取 slash commands 目录 */
  getSlashCommandsDir(): string {
    return path.join(this.projectRoot, this.routes.slashCommands);
  }

  /** 获取 skill 文件路径 (SKILL.md) */
  getSkillPath(name: string): string {
    return path.join(this.projectRoot, this.routes.skills, name, 'SKILL.md');
  }

  /** 获取 skill 目录 */
  getSkillDir(name: string): string {
    return path.join(this.projectRoot, this.routes.skills, name);
  }

  /** 获取 skills 根目录 */
  getSkillsDir(): string {
    return path.join(this.projectRoot, this.routes.skills);
  }

  /** 获取项目数据文件路径 */
  getProjectDataPath(relativePath: string): string {
    return path.join(this.projectRoot, this.routes.projectData, relativePath);
  }

  /** 获取项目数据目录 */
  getProjectDataDir(): string {
    return path.join(this.projectRoot, this.routes.projectData);
  }

  /** 获取用户数据文件路径 */
  getUserDataPath(relativePath: string): string {
    const baseDir = this.routes.userData.startsWith('~')
      ? path.join(os.homedir(), this.routes.userData.slice(1))
      : this.routes.userData;
    return path.join(baseDir, relativePath);
  }

  /** 获取用户数据目录 */
  getUserDataDir(): string {
    return this.routes.userData.startsWith('~')
      ? path.join(os.homedir(), this.routes.userData.slice(1))
      : this.routes.userData;
  }

  /** 获取相对于项目根目录的显示路径 */
  getDisplayPath(absolutePath: string): string {
    if (absolutePath.startsWith(this.projectRoot)) {
      return path.relative(this.projectRoot, absolutePath);
    }
    if (absolutePath.startsWith(os.homedir())) {
      return '~' + absolutePath.slice(os.homedir().length);
    }
    return absolutePath;
  }
}
```

### 4.2 ResourceWriter Class

**File**: `src/core/resource-writer.ts`

```typescript
import * as path from 'path';
import type {
  Plugin,
  PluginConfig,
  PluginContext,
  SlashCommand,
  Skill,
  FileOutput,
  Logger,
} from '../plugin/types.js';
import { OutputRouter } from './output-router.js';
import { ensureDir, writeFile, readFile } from '../utils/file-ops.js';

/**
 * 模板加载器接口
 */
export interface TemplateLoader {
  load(templatePath: string): Promise<string>;
}

/**
 * 默认模板加载器
 * 从 templates/ 目录加载模板文件
 */
export class DefaultTemplateLoader implements TemplateLoader {
  constructor(private templatesDir: string) {}

  async load(templatePath: string): Promise<string> {
    const fullPath = path.join(this.templatesDir, templatePath);
    return readFile(fullPath);
  }
}

/**
 * 资源写入结果
 */
export interface WriteResult {
  type: 'slash-command' | 'skill' | 'data-file';
  name: string;
  path: string;
  success: boolean;
  error?: string;
}

/**
 * 统一资源写入器
 *
 * 负责将插件声明的资源写入到文件系统
 */
export class ResourceWriter {
  constructor(
    private router: OutputRouter,
    private templateLoader: TemplateLoader,
    private logger: Logger
  ) {}

  /**
   * 写入所有插件资源
   */
  async writeAllResources(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>,
    context: PluginContext
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    // 1. 写入 slash commands
    const cmdResults = await this.writeSlashCommands(plugins, configs);
    results.push(...cmdResults);

    // 2. 写入 skills
    const skillResults = await this.writeSkills(plugins, configs);
    results.push(...skillResults);

    // 3. 写入数据文件
    const dataResults = await this.writeDataFiles(plugins, configs, context);
    results.push(...dataResults);

    return results;
  }

  /**
   * 写入 slash commands
   */
  async writeSlashCommands(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.slashCommands?.length) continue;

      for (const cmd of plugin.slashCommands) {
        const result = await this.writeSlashCommand(cmd);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 写入单个 slash command
   */
  private async writeSlashCommand(cmd: SlashCommand): Promise<WriteResult> {
    const targetPath = this.router.getSlashCommandPath(cmd.name);

    try {
      const content = await this.templateLoader.load(cmd.templatePath);
      await ensureDir(path.dirname(targetPath));
      await writeFile(targetPath, content);

      const displayPath = this.router.getDisplayPath(targetPath);
      this.logger.info(`Created: ${displayPath}`);

      return {
        type: 'slash-command',
        name: cmd.name,
        path: targetPath,
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warning(`Failed to create slash command ${cmd.name}: ${errorMsg}`);

      return {
        type: 'slash-command',
        name: cmd.name,
        path: targetPath,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 写入 skills
   */
  async writeSkills(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.skills?.length) continue;

      for (const skill of plugin.skills) {
        const result = await this.writeSkill(skill);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 写入单个 skill
   */
  private async writeSkill(skill: Skill): Promise<WriteResult> {
    const targetPath = this.router.getSkillPath(skill.name);

    try {
      const content = await this.templateLoader.load(skill.templatePath);
      await ensureDir(path.dirname(targetPath));
      await writeFile(targetPath, content);

      const displayPath = this.router.getDisplayPath(targetPath);
      this.logger.info(`Created: ${displayPath}`);

      return {
        type: 'skill',
        name: skill.name,
        path: targetPath,
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warning(`Failed to create skill ${skill.name}: ${errorMsg}`);

      return {
        type: 'skill',
        name: skill.name,
        path: targetPath,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 写入数据文件 (原 outputs.generate 逻辑)
   */
  async writeDataFiles(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>,
    context: PluginContext
  ): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.outputs) continue;

      try {
        const outputs = await plugin.outputs.generate(config, context);

        for (const output of outputs) {
          const result = await this.writeDataFile(output);
          results.push(result);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warning(`Failed to generate outputs for ${plugin.meta.name}: ${errorMsg}`);
      }
    }

    return results;
  }

  /**
   * 写入单个数据文件
   */
  private async writeDataFile(output: FileOutput): Promise<WriteResult> {
    const isUserScope = output.scope === 'user';
    const targetPath = isUserScope
      ? this.router.getUserDataPath(output.path)
      : this.router.getProjectDataPath(output.path);

    try {
      await ensureDir(path.dirname(targetPath));
      await writeFile(targetPath, output.content);

      const displayPath = this.router.getDisplayPath(targetPath);
      this.logger.info(`Created: ${displayPath}`);

      return {
        type: 'data-file',
        name: output.path,
        path: targetPath,
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warning(`Failed to create ${output.path}: ${errorMsg}`);

      return {
        type: 'data-file',
        name: output.path,
        path: targetPath,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 收集所有 slash commands 元数据 (用于帮助信息)
   */
  collectSlashCommands(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): SlashCommand[] {
    const commands: SlashCommand[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.slashCommands?.length) continue;

      commands.push(...plugin.slashCommands);
    }

    return commands;
  }

  /**
   * 收集所有 skills 元数据 (用于帮助信息)
   */
  collectSkills(
    plugins: Plugin[],
    configs: Map<string, PluginConfig>
  ): Skill[] {
    const skills: Skill[] = [];

    for (const plugin of plugins) {
      const config = configs.get(plugin.meta.name);
      if (!config?.enabled || !plugin.skills?.length) continue;

      skills.push(...plugin.skills);
    }

    return skills;
  }
}
```

### 4.3 Updated Constants

**File**: `src/constants.ts` (additions)

```typescript
// ... existing exports ...

/**
 * Claude 标准目录 (用于 commands, skills, settings)
 */
export const CLAUDE_DIR = '.claude';

/**
 * Claude 子目录
 */
export const CLAUDE_SUBDIRS = {
  COMMANDS: 'commands',
  SKILLS: 'skills',
} as const;

/**
 * 默认输出路由
 */
export const DEFAULT_OUTPUT_ROUTES = {
  slashCommands: `${CLAUDE_DIR}/${CLAUDE_SUBDIRS.COMMANDS}`,
  skills: `${CLAUDE_DIR}/${CLAUDE_SUBDIRS.SKILLS}`,
  projectData: DEFAULT_AGENT_DIR,
  userData: USER_MEMORY_DIR,
} as const;
```

## 5. Migration Guide

### 5.1 Plugin Migration

#### Before (双重注册)

```typescript
export const memorySystemPlugin: Plugin = {
  slashCommands: [
    {
      name: 'memory-search',
      description: 'Find notes by tag',
      argumentHint: '[tag-name]',
      templateFile: 'memory/search.md',  // 旧字段名
    },
  ],

  outputs: {
    generate: async (config, context) => {
      const outputs = [];

      // 数据文件
      outputs.push({
        path: 'memory/index/tags.toon',
        content: tagsContent,
      });

      // ⚠️ 重复！手动写入 commands
      const cmdCommands = ['search', 'query', 'index', 'recent'];
      for (const cmd of cmdCommands) {
        const cmdPath = path.join(process.cwd(), `templates/commands/memory/${cmd}.md`);
        const cmdContent = await readFile(cmdPath);
        outputs.push({
          path: `commands/memory-${cmd}.md`,
          content: cmdContent,
        });
      }

      return outputs;
    },
  },
};
```

#### After (声明即生成)

```typescript
export const memorySystemPlugin: Plugin = {
  slashCommands: [
    {
      name: 'memory-search',
      description: 'Find notes by tag',
      argumentHint: '[tag-name]',
      templatePath: 'commands/memory/search.md',  // 新字段名，CLI 自动处理
    },
    {
      name: 'memory-query',
      description: 'Query notes by topic',
      argumentHint: '[topic-path]',
      templatePath: 'commands/memory/query.md',
    },
    {
      name: 'memory-index',
      description: 'Show complete memory index',
      templatePath: 'commands/memory/index.md',
    },
    {
      name: 'memory-recent',
      description: 'Show N recent notes',
      argumentHint: '[count]',
      templatePath: 'commands/memory/recent.md',
    },
  ],

  outputs: {
    generate: async (config, context) => {
      // 只有数据文件，不再写 commands
      return [
        {
          path: 'memory/index/tags.toon',
          content: tagsContent,
        },
        {
          path: 'memory/workflow.md',
          content: workflowContent,
        },
      ];
    },
  },
};
```

### 5.2 Type Migration

| Old | New | Notes |
|-----|-----|-------|
| `templateFile` | `templatePath` | 更明确的命名 |
| - | `skills` | 新增属性 |
| `outputs` 写 commands | 删除 | CLI 自动处理 |

## 6. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/plugin/types.ts` | Modify | 更新 SlashCommand, 新增 Skill |
| `src/core/output-router.ts` | Create | 输出路由器 |
| `src/core/resource-writer.ts` | Create | 资源写入器 |
| `src/constants.ts` | Modify | 新增 CLAUDE_DIR 等常量 |
| `src/core/interactive-initializer.ts` | Modify | 使用 ResourceWriter |
| `src/plugins/memory-system/index.ts` | Modify | 迁移到新模式 |
| `src/plugins/task-system/index.ts` | Modify | 迁移到新模式 |
| `src/plugin/index.ts` | Modify | 导出新类型 |

## 7. Testing

### 7.1 Unit Tests

- `tests/unit/core/output-router.test.ts`
- `tests/unit/core/resource-writer.test.ts`

### 7.2 Integration Tests

- 验证 slash commands 写入 `.claude/commands/`
- 验证 skills 写入 `.claude/skills/<name>/SKILL.md`
- 验证数据文件写入 `.agent/`
- 验证用户数据写入 `~/.claude/`

## 8. Appendix: Full Type Definitions

见 `src/plugin/types.ts` 中的完整定义。
