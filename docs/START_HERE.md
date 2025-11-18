# 🚀 开始实施 v2.0 重构

本文档是实施入口，提供启动 subagent 的完整 prompt。

---

## 📋 准备检查

在开始前确认：

- ✅ 所有设计文档已阅读并理解
- ✅ Git 仓库状态干净
- ✅ 依赖已安装（pnpm install）
- ✅ 构建成功（pnpm build）
- ✅ 测试通过（pnpm test）

---

## 🎯 推荐的启动顺序

### Day 1: 启动第一批（4 个并行任务）

这 4 个任务完全独立，可以同时启动：

1. **Subagent 1**: Phase 1 - 插件系统核心 (2-3天)
2. **Subagent 2**: Phase 2 - UI 组件库 (1-2天)
3. **Subagent 3**: Extra 1 - 插件 Prompt 规范 (1天)
4. **Subagent 4**: Extra 2 - mem 改造方案 (1天)

### Day 3-4: 第二批（等待 Phase 1-2 完成）

5. **Subagent 5**: Phase 3 - 交互式初始化器 (2-3天)

### Day 5-9: 第三批（并行实现插件）

6. **Subagent 6**: Phase 4.1 - System Detector (1天)
7. **Subagent 7**: Phase 4.2 - Prompt Presets (2天)
8. **Subagent 8**: Phase 4.3 - Memory System (2天)
9. **Subagent 9**: Phase 4.4 - Git 插件 (2天)

### Day 10-11: 第四批（等待插件完成）

10. **Subagent 10**: Phase 5 - CLI 重构 (1天)
11. **Subagent 11**: Phase 6 - 配置迁移 (1-2天)

### Day 12-17: 第五批（i18n）

12. **Subagent 12**: Phase 7 - 国际化 (6-7天)

### Day 18-21: 第六批（测试和文档）

13. **Subagent 13**: Phase 8 - 测试 (2-3天)
14. **Subagent 14**: Phase 9 - 文档 (1天)

---

## 📝 启动 Prompt 模板

### Subagent 1: 插件系统核心 (Phase 1)

```markdown
# Phase 1: 插件系统核心框架

你的任务是实现 claude-init v2.0 的插件系统核心框架。

## 项目信息

**仓库路径**: /home/dai/code/claude-memory-init
**当前版本**: v1.0.0 (稳定)
**目标版本**: v2.0.0-alpha
**包管理器**: pnpm (必须使用 pnpm)
**Node 版本**: >= 18.0.0
**模块系统**: ESM (type: "module")
**TypeScript**: 严格模式 (strict: true)

## 重要准则 🔥

### 1. 充分利用 1M Context 窗口

**我们有 1M context 窗口，不要省 token！**

**必须完整阅读**:

设计文档（按顺序阅读）:
1. `docs/README.md` - 文档索引
2. `docs/REFACTOR_SUMMARY.md` - 重构总览
3. `docs/PLUGIN_ARCHITECTURE_REFACTOR.md` - **核心**，完整阅读
4. `docs/INTERACTIVE_CLI_DESIGN.md` - 了解插件如何被使用
5. `docs/CLI_COMMANDS_DESIGN.md` - 了解命令注册
6. `docs/IMPLEMENTATION_TASKS.md` - Phase 1 详细要求

现有代码（完整阅读，不要只读一部分）:
- `src/utils/logger.ts` - 日志工具（你会用到）
- `src/utils/file-ops.ts` - 文件操作（你会用到）
- `src/core/template-engine.ts` - 模板引擎（你会用到）
- `src/types/config.ts` - 现有的类型定义（参考）

**为什么要完整阅读？**
- 理解完整的架构和设计意图
- 避免遗漏关键信息
- 确保实现与设计一致
- 我们有 1M context，充分利用！

### 2. 检索库文档

**在编码前，必须检索以下内容**:

1. **TypeScript 最佳实践**
   - 检索: TypeScript 官方文档
   - 关注: 泛型、类型推断、严格模式
   - 工具: WebSearch "TypeScript best practices 2024"

2. 了解拓扑排序算法（用于插件依赖排序）
   - 检索: Topological sort algorithm
   - 工具: WebSearch "topological sort typescript"

**记录你检索的资源链接，在汇报中说明。**

### 3. 编码规范

**TypeScript + 函数式 + 类型完备**

- ✅ **使用 TypeScript**（不要用 JavaScript）
- ✅ **函数式优先**（纯函数、const、map/filter/reduce）
- ✅ **类型完备**（所有函数都有完整类型签名）
- ✅ **避免 any**（除非确实无法避免）
- ✅ **导出所有公开类型**

**函数式风格示例**:

```typescript
// ✅ 推荐
export const getEnabledPlugins = (
  plugins: Plugin[],
  config: CoreConfig
): Plugin[] => {
  return plugins.filter(plugin =>
    config.plugins[plugin.meta.name]?.enabled !== false
  );
};

// ❌ 避免
export function getEnabledPlugins(plugins: any, config: any) {
  let result = [];
  for (let i = 0; i < plugins.length; i++) {
    if (config.plugins[plugins[i].meta.name]?.enabled !== false) {
      result.push(plugins[i]);
    }
  }
  return result;
}
```

**何时使用类**:
- 当需要维护内部状态时（如 PluginRegistry, PluginLoader）
- 当需要多个相关方法时
- 类的方法内部仍应使用函数式风格

## 你的任务

### Task 1.1: 定义插件类型系统

**文件**: `src/plugin/types.ts`

**创建以下类型**（按顺序）:

```typescript
/**
 * 插件上下文
 *
 * 插件运行时可访问的环境和工具
 */
export interface PluginContext {
  /** 项目根目录 */
  projectRoot: string;

  /** 目标目录（通常与 projectRoot 相同） */
  targetDir: string;

  /** 共享配置 */
  config: SharedConfig;

  /** 插件间共享数据 */
  shared: Map<string, any>;

  /** 日志工具 */
  logger: Logger;

  /** 文件操作工具 */
  fs: FileOperations;

  /** 模板引擎 */
  template: TemplateEngine;

  /** UI 组件（Phase 2 后集成） */
  ui: UIComponents;

  /** 国际化（Phase 7 后集成） */
  i18n: I18nAPI;
}

/**
 * 插件生命周期钩子
 */
export interface PluginHooks {
  /** 初始化前执行 */
  beforeInit?: (context: PluginContext) => Promise<void> | void;

  /** 配置阶段（收集插件配置） */
  configure?: (context: ConfigurationContext) => Promise<PluginConfig> | PluginConfig;

  /** 执行阶段（主要功能） */
  execute?: (context: PluginContext) => Promise<void> | void;

  /** 初始化后执行 */
  afterInit?: (context: PluginContext) => Promise<void> | void;

  /** 清理阶段 */
  cleanup?: (context: PluginContext) => Promise<void> | void;
}

/**
 * 插件命令定义
 */
export interface PluginCommand {
  /** 命令名称（不含插件前缀，如 'system-add'） */
  name: string;

  /** 命令描述 */
  description: string;

  /** 命令选项 */
  options?: CommandOption[];

  /** 命令处理函数 */
  action: (options: CommandOptions, context: PluginContext) => Promise<void>;
}

/**
 * 命令选项
 */
export interface CommandOption {
  /** 选项标志，如 '-f, --force' */
  flags: string;

  /** 选项描述 */
  description: string;

  /** 默认值 */
  defaultValue?: any;
}

/**
 * 命令选项（运行时）
 */
export interface CommandOptions {
  [key: string]: any;
}

/**
 * 插件配置流程
 */
export interface PluginConfigurationFlow {
  /** 是否需要交互式配置 */
  needsConfiguration: boolean;

  /** 配置函数 */
  configure: (context: ConfigurationContext) => Promise<PluginConfig> | PluginConfig;

  /** 生成配置摘要（用于最终确认） */
  getSummary: (config: PluginConfig) => string[];
}

/**
 * 配置上下文（用于插件配置阶段）
 */
export interface ConfigurationContext {
  /** 项目名称 */
  projectName: string;

  /** 项目根目录 */
  projectRoot: string;

  /** 其他已配置的插件 */
  otherPlugins: Map<string, PluginConfig>;

  /** UI 组件 */
  ui: UIComponents;

  /** 日志 */
  logger: Logger;

  /** 国际化 */
  i18n: I18nAPI;
}

/**
 * 插件定义
 */
export interface Plugin {
  /** 插件元信息 */
  meta: {
    /** 插件完整名称，如 'memory-system' */
    name: string;

    /** CLI 命令名称，如 'memory' */
    commandName: string;

    /** 版本号 */
    version: string;

    /** 描述 */
    description: string;

    /** 作者 */
    author?: string;

    /** 是否推荐（初始化时默认勾选） */
    recommended?: boolean;

    /** 依赖的其他插件 */
    dependencies?: string[];

    /** 优先级（越小越靠前） */
    priority?: number;
  };

  /** 插件命令（可选） */
  commands?: PluginCommand[];

  /** 配置流程（可选） */
  configuration?: PluginConfigurationFlow;

  /** 生命周期钩子（可选） */
  hooks?: PluginHooks;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  /** 是否启用 */
  enabled: boolean;

  /** 插件选项 */
  options: Record<string, any>;
}

/**
 * 共享配置
 */
export interface SharedConfig {
  /** 核心配置 */
  core: CoreConfig;

  /** 插件配置 */
  plugins: Map<string, PluginConfig>;
}

/**
 * 核心配置
 */
export interface CoreConfig {
  /** 项目信息 */
  project: {
    name: string;
    description: string;
  };

  /** 输出配置 */
  output: {
    base_dir: string;
  };

  /** 插件配置 */
  plugins: {
    [pluginName: string]: PluginConfig;
  };
}

// 其他辅助类型（根据需要添加）
export interface Logger {
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  blank: () => void;
}

export interface FileOperations {
  ensureDir: (path: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  fileExists: (path: string) => Promise<boolean>;
  copyFile: (src: string, dest: string) => Promise<void>;
  // 等等...
}

export interface TemplateEngine {
  render: (template: string, data: any) => Promise<string>;
  renderFile: (templatePath: string, data: any) => Promise<string>;
}

export interface UIComponents {
  checkboxList: (message: string, options: CheckboxOption[]) => Promise<string[]>;
  radioList: (message: string, options: RadioOption[], defaultValue?: string) => Promise<string>;
  confirm: (message: string, defaultValue?: boolean) => Promise<boolean>;
  input: (message: string, defaultValue?: string, validate?: Function) => Promise<string>;
}

export interface I18nAPI {
  t: (key: string, options?: any) => string;
  language: string;
}

// UI 组件的选项类型
export interface CheckboxOption {
  name: string;
  value: string;
  description?: string;
  checked?: boolean;
}

export interface RadioOption {
  name: string;
  value: string;
  description?: string;
}
```

**要求**:
- 所有接口都要有完整的 JSDoc 注释
- 导出所有类型（export）
- 使用 TypeScript 严格模式

### Task 1.2: 实现插件注册表

**文件**: `src/plugin/registry.ts`

**实现 PluginRegistry 类**:

```typescript
import type { Plugin, CoreConfig } from './types.js';

/**
 * 插件注册表
 *
 * 管理所有已注册的插件
 */
export class PluginRegistry {
  private plugins: Map<string, Plugin>;

  constructor() {
    this.plugins = new Map();
  }

  /**
   * 注册插件
   */
  register(plugin: Plugin): void {
    // 1. 验证插件
    this.validatePlugin(plugin);

    // 2. 检查名称冲突
    if (this.plugins.has(plugin.meta.name)) {
      throw new Error(`Plugin '${plugin.meta.name}' is already registered`);
    }

    // 3. 检查 commandName 冲突
    const existingCommandName = Array.from(this.plugins.values()).find(
      p => p.meta.commandName === plugin.meta.commandName
    );
    if (existingCommandName) {
      throw new Error(
        `Command name '${plugin.meta.commandName}' is already used by plugin '${existingCommandName.meta.name}'`
      );
    }

    // 4. 注册
    this.plugins.set(plugin.meta.name, plugin);
  }

  /**
   * 获取插件
   */
  get(name: string): Plugin {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }
    return plugin;
  }

  /**
   * 获取所有插件
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 检查插件是否存在
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * 获取已启用的插件
   */
  getEnabled(config: CoreConfig): Plugin[] {
    return this.getAll().filter(plugin =>
      config.plugins[plugin.meta.name]?.enabled !== false
    );
  }

  /**
   * 验证插件
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.meta?.name) {
      throw new Error('Plugin must have meta.name');
    }
    if (!plugin.meta?.commandName) {
      throw new Error('Plugin must have meta.commandName');
    }
    if (!plugin.meta?.version) {
      throw new Error('Plugin must have meta.version');
    }
    if (!plugin.meta?.description) {
      throw new Error('Plugin must have meta.description');
    }
  }
}
```

**测试**: `tests/plugin/registry.test.ts`

### Task 1.3: 实现插件加载器

**文件**: `src/plugin/loader.ts`

**实现 PluginLoader 类和拓扑排序**:

```typescript
import type { Plugin, PluginContext, PluginHooks, CoreConfig } from './types.js';
import type { PluginRegistry } from './registry.js';

/**
 * 插件加载器
 */
export class PluginLoader {
  private registry: PluginRegistry;
  private loadedPlugins: Map<string, Plugin>;

  constructor(registry: PluginRegistry) {
    this.registry = registry;
    this.loadedPlugins = new Map();
  }

  /**
   * 加载插件
   */
  async load(config: CoreConfig, context: PluginContext): Promise<void> {
    // 1. 获取已启用的插件
    const enabledPlugins = this.registry.getEnabled(config);

    // 2. 拓扑排序（处理依赖）
    const sortedPlugins = this.sortByDependencies(enabledPlugins);

    // 3. 加载插件
    for (const plugin of sortedPlugins) {
      this.loadedPlugins.set(plugin.meta.name, plugin);
    }
  }

  /**
   * 执行生命周期钩子
   */
  async executeHook(
    hookName: keyof PluginHooks,
    context: PluginContext
  ): Promise<void> {
    for (const plugin of this.loadedPlugins.values()) {
      const hook = plugin.hooks?.[hookName];
      if (hook) {
        await hook(context);
      }
    }
  }

  /**
   * 拓扑排序（处理插件依赖）
   *
   * 使用 Kahn 算法实现拓扑排序
   */
  private sortByDependencies(plugins: Plugin[]): Plugin[] {
    // TODO: 实现拓扑排序算法
    // 1. 构建依赖图
    // 2. 使用 Kahn 算法排序
    // 3. 检测循环依赖
    // 4. 返回排序后的列表

    // 提示：先检索 "topological sort typescript" 了解算法
    // 如果没有依赖，直接返回原列表
    const hasDependencies = plugins.some(p => p.meta.dependencies?.length);
    if (!hasDependencies) {
      return plugins;
    }

    // 实现拓扑排序...
  }
}
```

**测试**: `tests/plugin/loader.test.ts`

### Task 1.4: 实现插件上下文

**文件**: `src/plugin/context.ts`

**实现上下文创建函数**:

```typescript
import type { PluginContext, CoreConfig } from './types.js';
import * as logger from '../utils/logger.js';
import * as fileOps from '../utils/file-ops.js';
import { loadAndRenderTemplate } from '../core/template-engine.js';

/**
 * 创建插件上下文
 */
export const createPluginContext = async (
  projectRoot: string,
  config: CoreConfig
): Promise<PluginContext> => {
  return {
    projectRoot,
    targetDir: projectRoot,
    config: {
      core: config,
      plugins: new Map()
    },
    shared: new Map(),
    logger: createLogger(),
    fs: createFileOperations(),
    template: createTemplateEngine(),
    // UI 和 i18n 在后续阶段集成
    ui: {} as any,  // Phase 2 后替换
    i18n: {} as any  // Phase 7 后替换
  };
};

/**
 * 创建日志工具
 */
const createLogger = () => ({
  info: logger.info,
  success: logger.success,
  warning: logger.warning,
  error: logger.error,
  blank: logger.blank
});

/**
 * 创建文件操作工具
 */
const createFileOperations = () => ({
  ensureDir: fileOps.ensureDir,
  readFile: fileOps.readFile,
  writeFile: fileOps.writeFile,
  fileExists: fileOps.fileExists,
  copyFile: fileOps.copyFile,
  writeJsonFile: fileOps.writeJsonFile,
  readJsonFile: fileOps.readJsonFile
});

/**
 * 创建模板引擎
 */
const createTemplateEngine = () => ({
  render: async (template: string, data: any) => {
    // 简单的变量替换实现
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] ?? match;
    });
  },
  renderFile: async (templatePath: string, data: any) => {
    return loadAndRenderTemplate(templatePath, data);
  }
});
```

**测试**: `tests/plugin/context.test.ts`

## 验收标准

- [ ] 所有 TypeScript 类型定义正确且完整
- [ ] PluginRegistry 可以注册、查询、过滤插件
- [ ] PluginLoader 可以按依赖顺序加载插件
- [ ] 拓扑排序算法正确（包含循环依赖检测）
- [ ] PluginContext 包含所有必需工具
- [ ] 单元测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 代码有完整的 JSDoc 注释
- [ ] 遵循函数式编程风格
- [ ] 避免使用 any 类型（UI 和 i18n 除外，后续集成）

## 输出清单

1. **代码文件**:
   - [ ] src/plugin/types.ts
   - [ ] src/plugin/registry.ts
   - [ ] src/plugin/loader.ts
   - [ ] src/plugin/context.ts

2. **测试文件**:
   - [ ] tests/plugin/registry.test.ts
   - [ ] tests/plugin/loader.test.ts
   - [ ] tests/plugin/context.test.ts

3. **实现报告**（使用以下模板）:

\```markdown
# Phase 1 实现报告

## 任务摘要
实现了插件系统的核心框架，包括类型定义、注册表、加载器和上下文。

## 实现的文件
- src/plugin/types.ts (XXX 行)
- src/plugin/registry.ts (XXX 行)
- src/plugin/loader.ts (XXX 行)
- src/plugin/context.ts (XXX 行)
- tests/plugin/*.test.ts (XXX 行)

## 关键设计决策

### 1. 拓扑排序算法选择
使用 Kahn 算法实现拓扑排序，因为：
- 简单易懂
- 可以检测循环依赖
- 时间复杂度 O(V + E)

### 2. 插件验证时机
在注册时验证插件元数据，而非加载时，因为：
- 早期发现问题
- 避免运行时错误

### 3. [其他决策...]

## 测试结果
- 单元测试: 15/15 passed
- 覆盖率: 87%
- 所有边界情况已测试

## 检索的文档资源
1. TypeScript 官方文档: [链接]
2. Topological Sort 算法: [链接]
3. [其他资源...]

## 遇到的问题

### 问题 1: 循环依赖检测
[描述和解决方案...]

### 问题 2: [...]

## 下一步建议
- Phase 2 (UI 组件库) 可以立即开始
- 建议 Phase 3 等待 Phase 1-2 都完成后再开始

## 代码示例

### 插件注册
\```typescript
const registry = new PluginRegistry();
registry.register(myPlugin);
\```

### 插件加载
\```typescript
const loader = new PluginLoader(registry);
await loader.load(config, context);
await loader.executeHook('beforeInit', context);
\```
\```

## 注意事项

- 使用 pnpm 安装依赖
- 遵循 Subagent 通用指令（见 SUBAGENT_ORCHESTRATION.md）
- 完整阅读所有设计文档
- 优先检索库文档
- 函数式 + 类型完备

开始工作，完成后向我详细汇报。
```

---

## 其他 Subagent Prompt

其他 13 个 subagent 的完整 prompt 请参考 `docs/IMPLEMENTATION_TASKS.md`，每个 Phase 都有详细的 Subagent Prompt 章节。

### 启动方式

复制对应的 prompt，粘贴给 subagent 即可。例如：

```markdown
我需要你完成 Phase 2 - UI 组件库的实现。

[复制 IMPLEMENTATION_TASKS.md 中 Phase 2 的 Subagent Prompt]

开始工作，完成后向我汇报。
```

---

## 📊 进度跟踪

使用 `SUBAGENT_ORCHESTRATION.md` 中的进度表跟踪状态：

| Phase | 任务 | Subagent | 状态 | 开始 | 完成 |
|-------|------|----------|------|------|------|
| 1 | 插件系统核心 | SA-1 | 🔵 | - | - |
| 2 | UI 组件库 | SA-2 | 🔵 | - | - |
| ... | ... | ... | ... | ... | ... |

---

**创建日期**: 2025-01-18
**状态**: Ready to start
**第一批**: Subagent 1-4 (并行)
