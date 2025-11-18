# v2.0 实施任务分配

本文档定义了 v2.0 重构的所有实施任务，每个任务都可以分配给 subagent 独立完成。

---

## 任务概览

### 核心开发任务（9 个阶段）

1. **Phase 1**: 插件系统核心框架
2. **Phase 2**: UI 组件库
3. **Phase 3**: 交互式初始化器
4. **Phase 4.1**: System Detector 插件
5. **Phase 4.2**: Prompt Presets 插件
6. **Phase 4.3**: Memory System 插件
7. **Phase 4.4**: Git 插件
8. **Phase 5**: CLI 重构
9. **Phase 6**: 配置迁移工具

### i18n 任务（1 个阶段）

10. **Phase 7**: 国际化实现

### 测试和文档任务（2 个阶段）

11. **Phase 8**: 测试
12. **Phase 9**: 文档更新

### 额外任务（2 个独立任务）

13. **Extra 1**: 插件 Prompt 规范设计
14. **Extra 2**: mem 目录 Prompt 改造

---

## Phase 1: 插件系统核心框架

### 任务目标

实现插件系统的核心接口和基础设施。

### 输入材料

- 设计文档: `docs/PLUGIN_ARCHITECTURE_REFACTOR.md`
- 参考章节: "插件系统接口"

### 任务清单

#### Task 1.1: 定义插件类型

**文件**: `src/plugin/types.ts`

**要求**:
1. 定义完整的插件接口类型
2. 包含所有必需的接口：
   - `Plugin`
   - `PluginContext`
   - `PluginHooks`
   - `PluginCommand`
   - `PluginConfigurationFlow`
   - `CommandOption`
3. 添加完整的 JSDoc 注释
4. 确保类型安全

**验收标准**:
- [ ] 所有接口定义完整
- [ ] TypeScript 编译无错误
- [ ] JSDoc 注释清晰完整

#### Task 1.2: 实现插件注册表

**文件**: `src/plugin/registry.ts`

**要求**:
1. 实现 `PluginRegistry` 类
2. 功能：
   - `register(plugin: Plugin)` - 注册插件
   - `get(name: string)` - 获取插件
   - `getAll()` - 获取所有插件
   - `has(name: string)` - 检查插件是否存在
   - `getEnabled(config)` - 获取已启用的插件
3. 添加插件验证逻辑
4. 处理插件名称冲突

**验收标准**:
- [ ] 所有方法实现完整
- [ ] 能够注册和查询插件
- [ ] 处理边界情况（重复注册、不存在等）
- [ ] 单元测试覆盖率 > 80%

#### Task 1.3: 实现插件加载器

**文件**: `src/plugin/loader.ts`

**要求**:
1. 实现 `PluginLoader` 类
2. 功能：
   - `load(config, context)` - 加载插件
   - `executeHook(hookName, context)` - 执行生命周期钩子
   - `sortByDependencies(plugins)` - 依赖排序
3. 实现拓扑排序算法（处理插件依赖）
4. 错误处理和日志

**验收标准**:
- [ ] 插件按依赖顺序加载
- [ ] 生命周期钩子正确执行
- [ ] 依赖循环检测
- [ ] 单元测试覆盖率 > 80%

#### Task 1.4: 实现插件上下文

**文件**: `src/plugin/context.ts`

**要求**:
1. 实现 `createPluginContext()` 函数
2. 提供给插件的工具：
   - `logger` - 日志工具
   - `fs` - 文件操作工具
   - `template` - 模板引擎
   - `ui` - UI 组件（后续集成）
   - `i18n` - 国际化（后续集成）
   - `shared` - 插件间共享数据
3. 确保上下文对象不可变（防止污染）

**验收标准**:
- [ ] 上下文对象包含所有必需工具
- [ ] 共享数据隔离正确
- [ ] 单元测试覆盖率 > 80%

### 预计时间: 2-3 天

### Subagent Prompt

```markdown
你的任务是实现 claude-init v2.0 的插件系统核心框架。

**背景**:
- 项目是一个 CLI 工具，使用 TypeScript 编写
- 我们正在将单体架构重构为插件化架构
- 目标是让每个功能都作为插件实现

**设计文档**:
请仔细阅读 `docs/PLUGIN_ARCHITECTURE_REFACTOR.md`，特别是"插件系统接口"章节。

**你需要完成**:
1. 定义插件类型系统 (`src/plugin/types.ts`)
2. 实现插件注册表 (`src/plugin/registry.ts`)
3. 实现插件加载器 (`src/plugin/loader.ts`)
4. 实现插件上下文 (`src/plugin/context.ts`)

**详细要求**:
见上面的 Task 1.1 - 1.4 清单

**验收标准**:
- 所有 TypeScript 类型定义正确
- 插件可以成功注册和加载
- 依赖排序算法正确（拓扑排序）
- 单元测试覆盖率 > 80%
- 代码有清晰的注释

**输出**:
1. 实现的代码文件
2. 单元测试文件
3. 简短的实现报告（说明你的设计决策）

**注意事项**:
- 使用现有的工具函数（logger, file-ops 等）
- 遵循项目的代码风格
- 确保类型安全
```

---

## Phase 2: UI 组件库

### 任务目标

封装交互式 UI 组件，基于 inquirer.js。

### 输入材料

- 设计文档: `docs/INTERACTIVE_CLI_DESIGN.md`
- 参考章节: "交互组件库"

### 任务清单

#### Task 2.1: Checkbox List 组件

**文件**: `src/prompts/components/checkbox-list.ts`

**要求**:
1. 封装 inquirer 的 checkbox 类型
2. 支持选项格式化（name + description）
3. 支持默认选中
4. 支持禁用选项
5. 返回选中的值数组

**验收标准**:
- [ ] 接口清晰易用
- [ ] 支持所有必需选项
- [ ] 有使用示例

#### Task 2.2: Radio List 组件

**文件**: `src/prompts/components/radio-list.ts`

**要求**:
1. 封装 inquirer 的 list 类型
2. 支持默认值
3. 支持选项格式化

**验收标准**:
- [ ] 接口清晰易用
- [ ] 支持默认值

#### Task 2.3: Confirm 组件

**文件**: `src/prompts/components/confirm.ts`

**要求**:
1. 封装 inquirer 的 confirm 类型
2. 支持默认值（true/false）

#### Task 2.4: Input 组件

**文件**: `src/prompts/components/input.ts`

**要求**:
1. 封装 inquirer 的 input 类型
2. 支持默认值
3. 支持验证函数

#### Task 2.5: Progress Indicator

**文件**: `src/prompts/components/progress.ts`

**要求**:
1. 基于 ora 实现进度指示器
2. 支持步骤列表
3. 支持 start/nextStep/succeed/fail 方法

#### Task 2.6: UI 组件索引

**文件**: `src/prompts/components/index.ts`

**要求**:
1. 导出所有 UI 组件
2. 提供统一的 `UIComponents` 接口

### 预计时间: 1-2 天

### Subagent Prompt

```markdown
你的任务是实现 claude-init v2.0 的交互式 UI 组件库。

**背景**:
- 我们使用 inquirer.js 进行命令行交互
- 需要封装常用的 UI 组件供插件使用
- 组件应该简单、一致、易用

**设计文档**:
请阅读 `docs/INTERACTIVE_CLI_DESIGN.md` 的"交互组件库"章节。

**你需要完成**:
1. Checkbox List 组件（多选）
2. Radio List 组件（单选）
3. Confirm 组件（确认）
4. Input 组件（文本输入）
5. Progress Indicator（进度显示）
6. 统一的导出接口

**详细要求**:
见上面的 Task 2.1 - 2.6 清单

**验收标准**:
- 所有组件封装完整
- 接口简单易用
- 有完整的 TypeScript 类型定义
- 每个组件有使用示例

**输出**:
1. 实现的组件文件
2. 使用示例代码
3. 简短的使用文档
```

---

## Phase 3: 交互式初始化器

### 任务目标

实现主初始化流程，支持动态步骤计算。

### 输入材料

- 设计文档: `docs/INTERACTIVE_CLI_DESIGN.md`
- 参考章节: "主初始化流程（动态步骤）"

### 任务清单

#### Task 3.1: 实现 InteractiveInitializer

**文件**: `src/core/interactive-initializer.ts`

**要求**:
1. 实现完整的初始化流程
2. 主要方法：
   - `run(targetDir, options)` - 主入口
   - `calculateTotalSteps(selectedPlugins)` - 动态计算总步骤数
   - `getPluginsNeedingConfiguration(selectedPlugins)` - 获取需要配置的插件
   - `promptProjectInfo(step, total)` - 项目信息收集
   - `promptPluginSelection(step, total)` - 插件选择
   - `configurePlugins(...)` - 配置插件（动态步骤）
   - `showSummaryAndConfirm(...)` - 显示摘要并确认
   - `executeInitialization(...)` - 执行初始化
   - `showCompletionMessage(...)` - 显示完成信息
3. 动态步骤逻辑：
   - 固定步骤：项目信息、插件选择、摘要
   - 动态步骤：只为需要配置的插件显示配置步骤
4. 已初始化检测：
   - 检测项目是否已初始化
   - 提供选项：保持、重新配置、重新初始化

**验收标准**:
- [ ] 步骤数动态计算正确
- [ ] 只配置需要配置的插件
- [ ] 已初始化项目处理正确
- [ ] 用户可以取消初始化
- [ ] 完整的错误处理
- [ ] 集成测试通过

### 预计时间: 2-3 天

### Subagent Prompt

```markdown
你的任务是实现 claude-init v2.0 的交互式初始化器。

**背景**:
- 这是整个工具的核心流程
- 需要支持动态步骤计算
- 用户体验要流畅

**设计文档**:
请仔细阅读 `docs/INTERACTIVE_CLI_DESIGN.md` 的"主初始化流程"章节。

**核心逻辑**:
1. 总步骤数 = 1 (项目信息) + 1 (选择插件) + 需要配置的插件数 + 1 (摘要)
2. 不需要配置的插件（如 system-detector）静默执行，不显示配置步骤
3. 在最终摘要中显示所有插件的结果

**你需要完成**:
实现 `InteractiveInitializer` 类及其所有方法（见 Task 3.1）

**依赖**:
- Phase 1: 插件系统
- Phase 2: UI 组件库

**验收标准**:
见上面的 Task 3.1 验收标准

**输出**:
1. 实现代码
2. 集成测试
3. 测试用例说明
```

---

## Phase 4: 插件实现

### Phase 4.1: System Detector 插件

**预计时间**: 1 天

#### 任务目标

实现系统检测插件，自动检测 OS 和开发工具。

#### 输入材料

- 现有代码: `src/utils/system-detector.ts`
- 设计文档: `docs/PLUGIN_ARCHITECTURE_REFACTOR.md`
- 参考章节: "系统检测插件"

#### 任务清单

**Task 4.1.1: 插件主文件**

**文件**: `src/plugins/system-detector/index.ts`

**要求**:
1. 定义插件元数据：
   ```typescript
   meta: {
     name: 'system-detector',
     commandName: 'system',
     version: '1.0.0',
     description: 'Detect OS and development tools',
     recommended: true
   }
   ```
2. 不需要配置：`configuration.needsConfiguration = false`
3. 实现 `configure()` 方法（静默检测）
4. 实现 `getSummary()` 方法（显示检测结果）
5. 不暴露命令：`commands: []`

**Task 4.1.2: 检测器实现**

**文件**: `src/plugins/system-detector/detectors/*.ts`

**要求**:
1. 迁移现有的 `system-detector.ts` 代码
2. 拆分为独立的检测器：
   - `os.ts` - OS 检测
   - `python.ts` - Python 环境检测
   - `node.ts` - Node.js 环境检测
3. 保持现有功能不变

#### Subagent Prompt

```markdown
实现 System Detector 插件。

**任务**:
将现有的系统检测功能 (`src/utils/system-detector.ts`) 重构为插件。

**要求**:
1. 创建插件主文件 `src/plugins/system-detector/index.ts`
2. 插件配置：
   - needsConfiguration: false (静默执行)
   - commands: [] (不暴露命令)
3. 实现检测逻辑：
   - OS 检测（Linux/macOS/Windows/MSYS2）
   - Python 环境（版本、包管理器）
   - Node.js 环境（版本、包管理器）
4. 在摘要中显示检测结果

**现有代码**:
`src/utils/system-detector.ts` 包含完整的检测逻辑，请复用。

**输出**:
1. 插件代码
2. 迁移后的检测器代码
3. 单元测试
```

---

### Phase 4.2: Prompt Presets 插件

**预计时间**: 2 天

#### 任务目标

实现预设提示词插件。

#### 输入材料

- 设计文档: `docs/PLUGIN_ARCHITECTURE_REFACTOR.md`
- 参考章节: "Prompt Presets 插件"

#### 任务清单

**Task 4.2.1: 预设模板创建**

**目录**: `src/plugins/prompt-presets/presets/`

**要求**:
1. 创建 6 个预设模板（markdown 格式）：
   - `code-review.md` - 代码审查
   - `documentation.md` - 文档生成
   - `refactoring.md` - 重构辅助
   - `testing.md` - 测试生成
   - `architecture.md` - 架构分析
   - `bug-fixing.md` - Bug 修复
2. 每个模板包含：
   - 标题和描述
   - 使用场景
   - 具体指令
   - 示例（如果适用）
3. 支持变量替换（使用模板引擎）

**Task 4.2.2: 配置流程实现**

**文件**: `src/plugins/prompt-presets/configure.ts`

**要求**:
1. 实现 `PluginConfigurationFlow`
2. `needsConfiguration: true`
3. 交互流程：
   - 多选列表选择预设（默认勾选部分预设）
   - 询问是否允许自定义模板
4. 实现 `getSummary()` 显示选择的预设

**Task 4.2.3: 插件主文件**

**文件**: `src/plugins/prompt-presets/index.ts`

**要求**:
1. 实现插件接口
2. `execute` 钩子：
   - 复制选中的预设到 `claude/prompts/`
   - 使用模板引擎渲染预设
3. 不暴露命令：`commands: []`

#### Subagent Prompt

```markdown
实现 Prompt Presets 插件。

**任务**:
创建一个插件，让用户可以选择和安装预设的提示词模板。

**要求**:
1. 创建 6 个预设模板（markdown）
   - Code Review, Documentation, Refactoring, Testing, Architecture, Bug Fixing
2. 实现交互式配置流程
   - 多选列表选择预设
   - 询问是否允许自定义
3. 实现插件执行逻辑
   - 复制选中的预设到项目
   - 使用模板引擎渲染

**设计参考**:
`docs/PLUGIN_ARCHITECTURE_REFACTOR.md` 中的 Prompt Presets 插件示例

**预设模板内容**:
每个预设应该包含：
- 清晰的角色定义
- 具体的任务指令
- 输出格式要求
- 示例（如果有）

参考现有的 CLAUDE.md 结构。

**输出**:
1. 6 个预设模板文件
2. 配置流程代码
3. 插件主文件
4. 集成测试
```

---

### Phase 4.3: Memory System 插件

**预计时间**: 2 天

#### 任务目标

实现记忆系统插件，包括 `memory system-add` 命令。

#### 输入材料

- 现有代码: `src/core/initializer.ts` (copyMemorySystemTemplate, updateIndexFiles)
- 设计文档: `docs/CLI_COMMANDS_DESIGN.md`
- 参考章节: "Memory System 插件子命令"

#### 任务清单

**Task 4.3.1: 模板复制功能**

**文件**: `src/plugins/memory-system/template-copier.ts`

**要求**:
1. 迁移 `copyMemorySystemTemplate()` 逻辑
2. 支持三种模板来源：
   - 默认（从 mem submodule）
   - Git 仓库（克隆到临时目录）
   - 本地目录
3. 应用排除规则（exclusion config）

**Task 4.3.2: 索引管理**

**文件**: `src/plugins/memory-system/index-manager.ts`

**要求**:
1. 迁移 `updateIndexFiles()` 逻辑
2. 初始化 tags.json 和 topics.json
3. 支持增量更新

**Task 4.3.3: system-add 命令**

**文件**: `src/plugins/memory-system/commands/system-add.ts`

**要求**:
1. 实现完整的交互流程（参考设计文档）：
   - 选择分类（tools/best-practices/code-patterns/architecture）
   - 输入标题
   - 输入描述
   - 输入内容（多行，Ctrl+D 结束）
   - 输入标签（逗号分隔）
2. 生成记忆 markdown 文件（带 frontmatter）
3. 预览生成的内容
4. 确认保存
5. 创建 PR 到 mem 仓库：
   - 克隆 mem 仓库到临时目录
   - 创建分支 `system-memory-YYYYMMDD-{hash}`
   - 提交并推送
   - 使用 gh CLI 创建 PR
   - 添加标签 `system-memory`
6. 支持 `--local` 选项（只保存本地，不创建 PR）

**Task 4.3.4: 插件主文件**

**文件**: `src/plugins/memory-system/index.ts`

**要求**:
1. 定义插件元数据
2. 注册 `system-add` 命令
3. 实现配置流程（选择模板来源、记忆类型）
4. 实现 `execute` 钩子（复制模板、初始化索引）

#### Subagent Prompt

```markdown
实现 Memory System 插件。

**任务**:
1. 将现有记忆系统功能重构为插件
2. 实现 `memory system-add` 命令

**核心功能**:
1. 初始化时：
   - 复制记忆模板（支持 default/git/local 三种来源）
   - 初始化索引文件

2. `memory system-add` 命令：
   - 交互式创建 system 级记忆
   - 自动创建 PR 到 mem 仓库

**详细要求**:
见上面的 Task 4.3.1 - 4.3.4 清单

**现有代码复用**:
- `src/core/initializer.ts` - copyMemorySystemTemplate, updateIndexFiles
- `src/utils/git-ops.ts` - Git 操作工具

**PR 创建流程**:
1. Clone mem repo to /tmp/claude-memory-xxx
2. Create branch: system-memory-YYYYMMDD-{hash}
3. Copy memory file to memory/system/{category}/
4. Commit with descriptive message
5. Push to remote
6. Create PR using gh CLI
7. Add label: system-memory
8. Cleanup tmp directory

**输出**:
1. 插件代码
2. system-add 命令实现
3. 集成测试（包含 PR 创建测试）
4. 使用文档
```

---

### Phase 4.4: Git 插件

**预计时间**: 2 天

#### 任务目标

整合所有 Git 功能到一个插件。

#### 输入材料

- 现有代码:
  - `src/utils/auto-commit.ts`
  - `src/utils/git-ops.ts`
  - `src/core/initializer.ts` (updateGitignore)

#### 任务清单

**Task 4.4.1: Auto-commit 功能**

**文件**: `src/plugins/git/auto-commit.ts`

**要求**:
1. 迁移 `auto-commit.ts` 的所有功能
2. 功能：
   - 检测 Git 仓库
   - 获取修改的文件
   - 分离记忆系统文件和其他文件
   - 生成提交信息
   - 创建提交（分开或合并）

**Task 4.4.2: Remote sync 功能**

**文件**: `src/plugins/git/remote-sync.ts`

**要求**:
1. 迁移现有的 sync 逻辑
2. 功能：
   - 克隆远程仓库
   - 比较本地和远程
   - 过滤 system memory 文件
   - 创建 PR

**Task 4.4.3: Gitignore 管理**

**文件**: `src/plugins/git/gitignore.ts`

**要求**:
1. 迁移 `updateGitignore()` 功能
2. 添加忽略规则到 .gitignore

**Task 4.4.4: 配置流程**

**文件**: `src/plugins/git/configure.ts`

**要求**:
1. 实现配置流程（参考设计文档）：
   - 检测是否为 Git 仓库
   - 询问是否 auto-commit
   - 询问是否分开提交
   - 询问是否启用 remote sync
   - 如果启用 sync，询问 remote URL 和 auto-PR
2. `needsConfiguration: true`

**Task 4.4.5: 插件主文件**

**文件**: `src/plugins/git/index.ts`

**要求**:
1. 定义插件元数据
2. 整合所有子功能
3. 实现 `afterInit` 钩子（执行 auto-commit 和 gitignore）
4. 不暴露命令（功能在 hooks 中）

#### Subagent Prompt

```markdown
实现 Git 插件。

**任务**:
整合所有 Git 相关功能到一个插件：
- Auto-commit
- Remote sync
- Gitignore 管理

**要求**:
1. 迁移现有代码到插件结构
2. 实现交互式配置流程
3. 在 afterInit 钩子中执行功能

**现有代码复用**:
- `src/utils/auto-commit.ts` - 完整的 auto-commit 逻辑
- `src/utils/git-ops.ts` - Git 操作工具
- `src/core/initializer.ts` - updateGitignore 函数

**配置流程**:
1. 检测 Git 仓库
2. Auto-commit 配置（是否启用、是否分开提交）
3. Remote sync 配置（是否启用、remote URL、auto-PR）

**输出**:
1. 插件代码（5个文件）
2. 单元测试
3. 集成测试
```

---

## Phase 5: CLI 重构

**预计时间**: 1 天

### 任务目标

简化 CLI 入口，实现插件命令动态注册。

### 输入材料

- 现有代码: `src/cli.ts`
- 设计文档: `docs/CLI_COMMANDS_DESIGN.md`
- 参考章节: "CLI 注册机制"

### 任务清单

**Task 5.1: 重构 CLI 入口**

**文件**: `src/cli.ts`

**要求**:
1. 简化为极简入口
2. 实现默认行为（无参数执行 init）
3. 只保留 `init` 命令
4. 实现插件命令动态注册：
   - 读取插件的 `meta.commandName`
   - 创建命令组
   - 注册插件的所有命令
5. 移除所有旧的命令（status, add-objective, sync 等）

**Task 5.2: 插件上下文创建**

**文件**: `src/cli.ts` (createPluginContext 函数)

**要求**:
1. 读取当前项目配置
2. 创建完整的 PluginContext
3. 包含所有工具（logger, fs, template, ui, i18n）

**验收标准**:
- [ ] `claude-init` 默认执行 init
- [ ] `claude-init memory system-add` 正确路由到插件
- [ ] 帮助信息正确显示
- [ ] 所有旧命令已移除

### Subagent Prompt

```markdown
重构 CLI 入口。

**任务**:
简化 `src/cli.ts`，实现插件命令动态注册。

**要求**:
1. 默认行为：`claude-init` 执行 init
2. 移除所有旧命令（status, reconfigure, add-objective 等）
3. 实现插件命令注册：
   - 遍历插件
   - 如果插件有 commands，创建命令组
   - 使用 plugin.meta.commandName 作为命令组名
   - 注册插件的每个命令

**参考设计**:
`docs/CLI_COMMANDS_DESIGN.md` 的"CLI 注册机制"章节

**当前 CLI**:
`src/cli.ts` 有很多旧的命令定义，需要大幅简化。

**输出**:
1. 简化的 cli.ts
2. 集成测试（测试命令路由）
```

---

## Phase 6: 配置迁移工具

**预计时间**: 1-2 天

### 任务目标

实现从 v1.x 配置自动迁移到 v2.0 的工具。

### 任务清单

**Task 6.1: 配置迁移器**

**文件**: `src/core/config-migrator.ts`

**要求**:
1. 检测旧配置格式（v1.x）
2. 自动转换为新格式：
   - 项目信息 → 保持
   - 旧的功能开关 → 插件配置
   - Git 配置 → Git 插件配置
   - System 配置 → System Detector 插件配置
3. 生成迁移报告
4. 备份旧配置

**Task 6.2: 在初始化器中集成**

**要求**:
1. 在初始化前检测旧配置
2. 如果存在，自动迁移
3. 显示迁移信息给用户

### Subagent Prompt

```markdown
实现配置迁移工具。

**任务**:
创建工具自动将 v1.x 配置迁移到 v2.0 格式。

**旧配置格式**:
参考 `src/types/config.ts` 中的 `FullConfig` 接口

**新配置格式**:
参考 `docs/PLUGIN_ARCHITECTURE_REFACTOR.md` 中的配置示例

**迁移映射**:
- project → 保持
- language → 保持
- paths → output.base_dir
- system → system-detector 插件配置
- git.ai_git_operations → git 插件配置
- git.auto_commit_memory_updates → git 插件 auto_commit
- 等等...

**输出**:
1. 迁移器代码
2. 迁移测试用例
3. 迁移报告格式
```

---

## Phase 7: 国际化实现

**预计时间**: 6-7 天

### 任务目标

实现完整的多语言支持。

### 输入材料

- 设计文档: `docs/I18N_DESIGN.md`

### 任务清单

**Task 7.1: i18n 基础设施**

**要求**:
1. 安装 i18next 依赖
2. 实现语言检测 (`src/i18n/detector.ts`)
3. 实现 i18n 初始化 (`src/i18n/index.ts`)

**Task 7.2: 翻译文件创建**

**目录**: `src/i18n/locales/{en,zh}/`

**要求**:
1. 创建 5 个命名空间的英文翻译：
   - common.json
   - cli.json
   - prompts.json
   - plugins.json
   - errors.json
2. 创建对应的中文翻译
3. 确保所有 key 一致

**Task 7.3: 代码集成**

**要求**:
1. CLI 入口集成 i18n
2. InteractiveInitializer 集成 i18n
3. 所有插件集成 i18n
4. 插件上下文添加 i18n 支持

**Task 7.4: 模板多语言**

**要求**:
1. 创建 CLAUDE.md.en.template
2. 创建 CLAUDE.md.zh.template
3. 模板引擎支持语言选择

**Task 7.5: 测试**

**要求**:
1. 翻译完整性测试
2. 语言检测测试
3. 手动测试两种语言

### Subagent Prompt

```markdown
实现国际化支持。

**任务**:
为 claude-init 添加多语言支持（英语 + 中文）。

**要求**:
1. 实现 i18n 基础设施（detector, initializer）
2. 创建所有翻译文件（5个命名空间 x 2种语言）
3. 集成到 CLI、初始化器、所有插件
4. 创建多语言模板文件

**设计文档**:
`docs/I18N_DESIGN.md` 包含完整的翻译文件示例

**翻译内容**:
设计文档中已提供所有翻译内容的示例，请完整实现。

**语言检测**:
1. CLAUDE_INIT_LANG 环境变量
2. 系统语言（LANG, LANGUAGE, LC_ALL）
3. 默认英语

**验收标准**:
- 所有 UI 文本已翻译
- 两种语言切换正常
- 翻译完整性测试通过

**输出**:
1. i18n 代码
2. 翻译文件（10个 JSON 文件）
3. 多语言模板
4. 测试
```

---

## Phase 8: 测试

**预计时间**: 2-3 天

### 任务清单

**Task 8.1: 单元测试**

**要求**:
1. 插件系统测试（registry, loader, context）
2. UI 组件测试
3. 每个插件的测试
4. i18n 测试
5. 覆盖率 > 80%

**Task 8.2: 集成测试**

**要求**:
1. 完整初始化流程测试
2. 插件命令测试（memory system-add）
3. 配置迁移测试
4. 多语言测试

**Task 8.3: E2E 测试**

**要求**:
1. 在真实项目中测试初始化
2. 测试 memory system-add 创建 PR
3. 测试两种语言

### Subagent Prompt

```markdown
为 v2.0 编写完整的测试套件。

**任务**:
1. 单元测试（所有模块）
2. 集成测试（完整流程）
3. E2E 测试（真实场景）

**要求**:
- 使用 Jest 测试框架
- 覆盖率 > 80%
- 包含边界情况测试
- Mock 外部依赖（Git, GitHub API）

**测试重点**:
1. 插件系统（注册、加载、依赖排序）
2. 动态步骤计算
3. 配置迁移
4. memory system-add 命令
5. 多语言切换

**输出**:
1. 测试文件
2. 测试覆盖率报告
3. 测试文档
```

---

## Phase 9: 文档更新

**预计时间**: 1 天

### 任务清单

**Task 9.1: 用户文档**

**要求**:
1. 更新主 README.md（已完成）
2. 创建用户指南
3. 创建 FAQ

**Task 9.2: 开发者文档**

**要求**:
1. 插件开发指南
2. 贡献指南
3. API 文档

**Task 9.3: CHANGELOG**

**要求**:
1. 完善 v2.0.0 条目（已完成）
2. 添加迁移指南

---

## Extra 1: 插件 Prompt 规范设计

### 任务目标

为每个插件设计期望的 prompt 内容规范。

### 背景

不同的插件在生成 CLAUDE.md 时需要不同的 prompt 内容：
- **Prompt Presets**: 用户选择的预设模板
- **Memory System**: 记忆系统使用指南
- **Git**: Git 操作权限和规则
- **System Detector**: 系统环境信息

### 任务清单

**Task E1.1: 定义 Prompt 规范**

**文件**: `docs/PLUGIN_PROMPT_SPECIFICATION.md`

**要求**:
1. 定义 CLAUDE.md 的整体结构
2. 定义每个插件贡献的 prompt 部分
3. 定义插件 prompt 的优先级和顺序
4. 定义变量替换规则
5. 提供每个插件的 prompt 示例

**内容结构**:

```markdown
# 插件 Prompt 规范

## CLAUDE.md 整体结构

\```
# Project: {project_name}

## Overview
{project_description}

## System Information
[由 system-detector 插件生成]

## Git Operations
[由 git 插件生成]

## Memory System
[由 memory-system 插件生成]

## Prompt Presets
[由 prompt-presets 插件生成]

## Custom Instructions
[用户自定义部分]
\```

## 插件 Prompt 规范

### System Detector 插件

**Prompt 部分**: System Information

**内容**:
\```markdown
## System Information

**Operating System**: {os_name} ({os_version})

**Development Tools**:
- Python: {python_version} (Package manager: {python_manager})
- Node.js: {node_version} (Package manager: {node_manager})

**Package Manager**:
Use `{install_command}` to install system packages.
\```

**变量**:
- `{os_name}` - OS 名称
- `{os_version}` - OS 版本
- `{python_version}` - Python 版本
- `{python_manager}` - Python 包管理器
- `{node_version}` - Node.js 版本
- `{node_manager}` - Node.js 包管理器
- `{install_command}` - 系统包安装命令

---

### Memory System 插件

**Prompt 部分**: Memory System

**内容**:
\```markdown
## Memory System

This project uses Claude's memory system to maintain context across sessions.

**Memory Types Enabled**:
{memory_types_list}

**Memory Locations**:
- Semantic Memory: `claude/memory/semantic/`
- Episodic Memory: `claude/memory/episodic/`
- Procedural Memory: `claude/memory/procedural/`
- System Memory: `claude/memory/system/` (team-shared templates)

**Usage**:
- Before starting tasks, query relevant memories
- After completing tasks, update memories with new knowledge
- Use tags and topics for organization

**Index Files**:
- Tags: `claude/memory/index/tags.json`
- Topics: `claude/memory/index/topics.json`

Update indexes immediately after creating or modifying memories.
\```

**变量**:
- `{memory_types_list}` - 启用的记忆类型列表

---

### Git 插件

**Prompt 部分**: Git Operations

**内容** (如果启用):
\```markdown
## Git Operations

{auto_commit_section}

{remote_sync_section}

**Git Rules**:
- NEVER run destructive git commands (push --force, hard reset)
- ALWAYS check authorship before amending commits
- Files in `claude/temp/` are gitignored
\```

**条件块**:

`{auto_commit_section}` (如果启用 auto_commit):
\```
**Auto-commit**: ENABLED

Changes to Claude memory system will be automatically committed.
{separate_commit_note}
\```

`{separate_commit_note}` (如果 commit_separately):
\```
Memory system files are committed separately from other changes.
\```

`{remote_sync_section}` (如果启用 remote_sync):
\```
**Remote Sync**: ENABLED

Repository: {remote_url}
{auto_pr_note}
\```

---

### Prompt Presets 插件

**Prompt 部分**: Prompt Presets

**内容**:
\```markdown
## Active Presets

The following prompt presets are installed:

{preset_list}

Each preset provides specialized instructions for specific tasks.
Refer to the preset files in `claude/prompts/` for detailed instructions.
\```

**变量**:
- `{preset_list}` - 已安装的预设列表（带链接）

示例：
\```
- [Code Review](claude/prompts/code-review.md)
- [Documentation](claude/prompts/documentation.md)
- [Architecture Analysis](claude/prompts/architecture.md)
\```

---

## 插件 Prompt API

### 接口定义

\```typescript
export interface PluginPromptContributor {
  /**
   * 生成插件的 prompt 内容
   */
  generatePrompt(config: PluginConfig): Promise<string>;

  /**
   * Prompt 在 CLAUDE.md 中的位置
   */
  promptSection: string;  // 'system-info' | 'git-operations' | 'memory-system' | 'presets'

  /**
   * 优先级（数字越小越靠前）
   */
  priority: number;
}
\```

### 集成到插件

\```typescript
export interface Plugin {
  // ... 现有字段

  // 新增：Prompt 贡献
  prompt?: PluginPromptContributor;
}
\```

---

## CLAUDE.md 生成流程

\```typescript
async function generateCLAUDEmd(
  projectInfo: ProjectInfo,
  enabledPlugins: Plugin[],
  pluginConfigs: Map<string, PluginConfig>
): Promise<string> {
  // 1. 收集所有插件的 prompt 内容
  const sections: Array<{ section: string; content: string; priority: number }> = [];

  for (const plugin of enabledPlugins) {
    if (plugin.prompt) {
      const config = pluginConfigs.get(plugin.meta.name);
      const content = await plugin.prompt.generatePrompt(config);
      sections.push({
        section: plugin.prompt.promptSection,
        content,
        priority: plugin.prompt.priority
      });
    }
  }

  // 2. 按优先级排序
  sections.sort((a, b) => a.priority - b.priority);

  // 3. 组装最终 CLAUDE.md
  let claudeMd = `# Project: ${projectInfo.name}

## Overview
${projectInfo.description}

`;

  for (const section of sections) {
    claudeMd += section.content + '\n\n';
  }

  return claudeMd;
}
\```

---

## 示例：完整的 CLAUDE.md

\```markdown
# Project: My Awesome Project

## Overview
A web application for task management

## System Information

**Operating System**: Ubuntu 22.04

**Development Tools**:
- Python: 3.11.5 (Package manager: uv)
- Node.js: 20.10.0 (Package manager: pnpm)

**Package Manager**:
Use `sudo apt install <package>` to install system packages.

## Git Operations

**Auto-commit**: DISABLED

**Remote Sync**: DISABLED

**Git Rules**:
- NEVER run destructive git commands (push --force, hard reset)
- ALWAYS check authorship before amending commits
- Files in `claude/temp/` are gitignored

## Memory System

This project uses Claude's memory system to maintain context across sessions.

**Memory Types Enabled**:
- Semantic Memory (knowledge and concepts)
- Episodic Memory (task history)
- Procedural Memory (workflows and processes)

**Memory Locations**:
- Semantic Memory: `claude/memory/semantic/`
- Episodic Memory: `claude/memory/episodic/`
- Procedural Memory: `claude/memory/procedural/`
- System Memory: `claude/memory/system/` (team-shared templates)

**Usage**:
- Before starting tasks, query relevant memories
- After completing tasks, update memories with new knowledge
- Use tags and topics for organization

**Index Files**:
- Tags: `claude/memory/index/tags.json`
- Topics: `claude/memory/index/topics.json`

Update indexes immediately after creating or modifying memories.

## Active Presets

The following prompt presets are installed:

- [Code Review](claude/prompts/code-review.md)
- [Documentation](claude/prompts/documentation.md)
- [Architecture Analysis](claude/prompts/architecture.md)

Each preset provides specialized instructions for specific tasks.
Refer to the preset files in `claude/prompts/` for detailed instructions.

## Custom Instructions

[User can add custom instructions here]
\```
```

### Subagent Prompt

```markdown
设计插件 Prompt 规范。

**任务**:
定义每个插件如何贡献 CLAUDE.md 的内容。

**要求**:
1. 定义 CLAUDE.md 的整体结构
2. 定义每个插件的 prompt 部分（System Info, Git, Memory, Presets）
3. 定义变量替换规则
4. 定义插件 Prompt API
5. 提供完整的 CLAUDE.md 示例

**设计考虑**:
- 每个插件贡献独立的章节
- 章节有固定的顺序（优先级）
- 支持条件生成（插件未启用则不生成）
- 支持变量替换
- 内容清晰、简洁、实用

**输出**:
创建 `docs/PLUGIN_PROMPT_SPECIFICATION.md`，包含：
1. CLAUDE.md 结构定义
2. 每个插件的 prompt 规范
3. PluginPromptContributor 接口定义
4. 生成流程说明
5. 完整示例
```

---

## Extra 2: mem 目录 Prompt 改造方案

### 任务目标

设计如何改造现有 mem 仓库的 prompt 结构，以适配新的插件化架构。

### 背景

**现有 mem 结构**:
```
mem/
├── CLAUDE.md.template
├── prompt/
│   ├── 0.overview.md.template
│   ├── 1.objectives.md.template
│   ├── 2.assumptions.md.template
│   └── 3.domain-terms.md.template
└── memory/
    ├── system/
    ├── semantic/
    ├── episodic/
    └── procedural/
```

**问题**:
- CLAUDE.md.template 是单一模板
- 无法灵活组合（用户可能只想要部分功能）
- 插件化后，每个插件应该提供自己的 prompt 片段

### 任务清单

**Task E2.1: 设计新的 mem 结构**

**文件**: `docs/MEM_REFACTOR_PLAN.md`

**要求**:
1. 设计新的目录结构
2. 定义插件 prompt 片段的存放位置
3. 定义模板组装规则
4. 向后兼容考虑

**建议的新结构**:

```
mem/
├── prompts/                    # Prompt 片段（按插件组织）
│   ├── core/
│   │   └── header.md.template  # 项目头部（名称、描述）
│   │
│   ├── system-detector/
│   │   └── system-info.md.template  # 系统信息部分
│   │
│   ├── git/
│   │   ├── git-rules.md.template    # Git 规则（基础）
│   │   ├── auto-commit.md.template  # Auto-commit 说明（可选）
│   │   └── remote-sync.md.template  # Remote sync 说明（可选）
│   │
│   ├── memory-system/
│   │   └── memory-usage.md.template # 记忆系统使用说明
│   │
│   └── prompt-presets/
│       └── presets-list.md.template # 预设列表
│
├── presets/                    # 预设模板（完整的 prompt 预设）
│   ├── code-review.md
│   ├── documentation.md
│   ├── refactoring.md
│   ├── testing.md
│   ├── architecture.md
│   └── bug-fixing.md
│
└── memory/                     # 记忆模板（保持不变）
    └── system/
        ├── tools/
        └── index/
```

**Task E2.2: 迁移策略**

**要求**:
1. 如何从旧结构迁移到新结构
2. 向后兼容方案（v1.x 项目仍可使用）
3. 迁移脚本设计

**Task E2.3: 模板变量规范**

**要求**:
1. 定义所有可用的模板变量
2. 按插件分类变量
3. 变量命名规范
4. 条件块语法

**示例**:
```
## Git Operations

{{#if git.auto_commit}}
**Auto-commit**: ENABLED

Changes to Claude memory system will be automatically committed.
{{#if git.commit_separately}}
Memory system files are committed separately from other changes.
{{/if}}
{{/if}}

{{#if git.remote_sync.enabled}}
**Remote Sync**: ENABLED

Repository: {{git.remote_sync.remote_url}}
{{#if git.remote_sync.auto_pr}}
PRs are created automatically when syncing changes.
{{/if}}
{{/if}}
```

### Subagent Prompt

```markdown
设计 mem 仓库的 prompt 改造方案。

**任务**:
将现有的单体 CLAUDE.md.template 改造为模块化的插件 prompt 片段。

**现有问题**:
- CLAUDE.md.template 是单一大文件
- 无法灵活组合
- 用户可能只想要部分功能

**设计目标**:
1. 每个插件提供自己的 prompt 片段
2. 按需组装最终的 CLAUDE.md
3. 支持条件生成（插件未启用则不生成）
4. 向后兼容 v1.x

**你需要设计**:
1. 新的 mem 目录结构
2. 每个插件的 prompt 片段内容
3. 模板变量规范（支持条件块）
4. 从旧结构到新结构的迁移策略
5. 模板组装算法

**输出**:
创建 `docs/MEM_REFACTOR_PLAN.md`，包含：
1. 新的目录结构设计
2. 每个 prompt 片段的内容规范
3. 模板变量完整列表
4. 条件块语法规范
5. 迁移策略和脚本设计
6. 示例：组装后的完整 CLAUDE.md
```

---

## 任务分配建议

### 并行任务组

**Group 1** (可并行):
- Phase 1: 插件系统核心
- Phase 2: UI 组件库

**Group 2** (依赖 Group 1):
- Phase 3: 交互式初始化器

**Group 3** (可并行，依赖 Phase 1-3):
- Phase 4.1: System Detector 插件
- Phase 4.2: Prompt Presets 插件
- Phase 4.3: Memory System 插件
- Phase 4.4: Git 插件

**Group 4** (依赖所有插件完成):
- Phase 5: CLI 重构
- Phase 6: 配置迁移

**Group 5** (并行):
- Phase 7: i18n 实现（可以与 Group 3 并行）

**Group 6** (依赖所有开发完成):
- Phase 8: 测试
- Phase 9: 文档

**Group 7** (独立任务，可随时进行):
- Extra 1: 插件 Prompt 规范
- Extra 2: mem 目录改造

---

## Subagent 协作流程

### 流程图

```
1. 你分配任务给 Subagent
   ↓
2. Subagent 阅读设计文档和现有代码
   ↓
3. Subagent 实现功能
   ↓
4. Subagent 编写测试
   ↓
5. Subagent 向你汇报
   ├── 实现代码
   ├── 测试结果
   ├── 遇到的问题
   └── 设计决策说明
   ↓
6. 你审查并决定
   ├── 通过 → 进入下一个任务
   ├── 需要修改 → Subagent 修改
   └── 阻塞问题 → 你介入解决
```

### 汇报模板

要求 Subagent 使用以下模板汇报：

```markdown
# Phase X.Y 实现报告

## 任务摘要
[简述完成的任务]

## 实现的文件
- src/xxx/yyy.ts
- tests/xxx/yyy.test.ts

## 关键设计决策
1. [决策1及原因]
2. [决策2及原因]

## 测试结果
- 单元测试: X/Y passed
- 集成测试: X/Y passed
- 覆盖率: XX%

## 遇到的问题
1. [问题1]
   - 解决方案: [...]
2. [问题2]
   - 需要讨论: [...]

## 下一步建议
[对后续任务的建议]

## 代码示例
[关键代码片段]
```

---

## 质量标准

### 所有任务必须满足

1. **代码质量**:
   - [ ] TypeScript 编译无错误
   - [ ] ESLint 检查通过
   - [ ] 代码有适当注释
   - [ ] 遵循项目代码风格

2. **测试质量**:
   - [ ] 单元测试覆盖率 > 80%
   - [ ] 边界情况有测试
   - [ ] Mock 使用合理

3. **文档质量**:
   - [ ] JSDoc 注释完整
   - [ ] 复杂逻辑有解释
   - [ ] 使用示例清晰

4. **用户体验**:
   - [ ] 错误信息清晰
   - [ ] 交互流程流畅
   - [ ] 进度反馈及时

---

## 里程碑

### Milestone 1: 核心框架完成
- Phase 1 + Phase 2 + Phase 3 完成
- 能够运行基本的交互式初始化（无实际功能）

### Milestone 2: 插件系统完成
- Phase 4.1 - 4.4 完成
- 4 个核心插件全部实现
- 能够完整初始化项目

### Milestone 3: CLI 和迁移完成
- Phase 5 + Phase 6 完成
- CLI 简化完成
- v1.x 配置可以自动迁移

### Milestone 4: i18n 完成
- Phase 7 完成
- 支持英语和中文

### Milestone 5: 发布就绪
- Phase 8 + Phase 9 完成
- 所有测试通过
- 文档完整

### Milestone 6: 额外功能完成
- Extra 1 + Extra 2 完成
- Prompt 规范明确
- mem 仓库改造方案就绪

---

**创建日期**: 2025-01-18
**状态**: Ready for implementation
