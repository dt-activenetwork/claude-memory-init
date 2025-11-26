# Claude Init v2.0 设计文档

本目录包含 `claude-init` v2.0 重构的完整设计文档。

## 📚 文档索引

### 设计文档（阅读顺序）

1. **[REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md)** - 重构方案总览 ⭐ 从这里开始
   - 重构目标和核心改进
   - 实施计划（9 个阶段，4-5 周）
   - 风险评估和成功指标

2. **[PLUGIN_ARCHITECTURE_REFACTOR.md](./PLUGIN_ARCHITECTURE_REFACTOR.md)** - 插件化架构设计
   - 插件系统接口定义
   - 插件生命周期钩子
   - 4 个核心插件详细设计
   - 配置文件格式

3. **[INTERACTIVE_CLI_DESIGN.md](./INTERACTIVE_CLI_DESIGN.md)** - 交互式 CLI 设计
   - 对话式交互流程
   - 动态步骤计算
   - UI 组件库（5 个组件）
   - 插件配置流程

4. **[CLI_COMMANDS_DESIGN.md](./CLI_COMMANDS_DESIGN.md)** - 命令结构设计
   - 命令架构（极简设计）
   - 插件命令注册机制
   - `memory system-add` 详细设计
   - 自动创建 PR 流程

5. **[I18N_DESIGN.md](./I18N_DESIGN.md)** - 国际化（i18n）设计
   - 多语言支持（英语 + 中文）
   - 翻译文件结构（5 个命名空间）
   - 语言检测策略
   - 完整的翻译示例

### 实施文档（开发者必读）

6. **[START_HERE.md](./START_HERE.md)** - 实施启动指南 ⭐⭐ 开始实施从这里
   - 准备检查清单
   - 推荐的启动顺序
   - 完整的 Subagent 1 启动 prompt
   - 详细的代码示例和要求
   - 进度跟踪方法

7. **[IMPLEMENTATION_TASKS.md](./IMPLEMENTATION_TASKS.md)** - 实施任务分配 ⭐ 开发必读
   - 9 个开发阶段详细任务清单
   - 每个任务的输入、输出、验收标准
   - 14 个 Subagent prompt 模板
   - 2 个额外任务（Prompt 规范、mem 改造）

8. **[SUBAGENT_ORCHESTRATION.md](./SUBAGENT_ORCHESTRATION.md)** - Subagent 编排指南 ⭐ 主控必读
   - 任务并行策略
   - Subagent 通用指令（1M context + 函数式 + 类型完备）
   - 汇报模板和审查清单
   - 进度跟踪表
   - 编码规范和示例

---

## 🎯 快速导航

### 按角色阅读

#### 项目经理 / 产品经理
- 阅读顺序：`REFACTOR_SUMMARY.md` → `INTERACTIVE_CLI_DESIGN.md`
- 关注点：功能特性、用户体验、实施计划

#### 架构师 / 技术负责人
- 阅读顺序：`REFACTOR_SUMMARY.md` → `PLUGIN_ARCHITECTURE_REFACTOR.md` → `CLI_COMMANDS_DESIGN.md`
- 关注点：插件系统设计、命令架构、可扩展性

#### 主控 Agent（任务编排）⭐ 开始实施
- **第一步**: `START_HERE.md` - 启动第一批任务
- 阅读顺序：`START_HERE.md` → `SUBAGENT_ORCHESTRATION.md` → `IMPLEMENTATION_TASKS.md`
- 关注点：启动顺序、任务分配、并行策略、进度跟踪、质量审查

#### Subagent（执行开发）⭐ 接收任务
- **第一步**: 完整阅读所有设计文档（利用 1M context）
- 阅读顺序：收到的 prompt → 所有设计文档 → 现有代码 → 检索库文档
- 关注点：任务要求、验收标准、编码规范、测试要求

#### 前端开发 / CLI 开发
- 阅读顺序：`INTERACTIVE_CLI_DESIGN.md` → `CLI_COMMANDS_DESIGN.md` → `I18N_DESIGN.md` → `IMPLEMENTATION_TASKS.md`
- 关注点：交互流程、UI 组件、命令实现、具体任务清单

#### 插件开发者
- 阅读顺序：`PLUGIN_ARCHITECTURE_REFACTOR.md` → `CLI_COMMANDS_DESIGN.md` → `IMPLEMENTATION_TASKS.md`
- 关注点：插件接口、命令注册、生命周期钩子、实现任务

#### 国际化贡献者
- 阅读顺序：`I18N_DESIGN.md` → `IMPLEMENTATION_TASKS.md` (Phase 7)
- 关注点：翻译文件格式、命名空间、翻译流程、实施任务

---

## 📖 设计概览

### 核心改进

#### 1. 插件化架构

```
❌ 之前：单体耦合
✅ 重构后：插件化

4 个核心插件：
- memory-system (记忆系统)
- prompt-presets (预设提示词)
- git (Git 集成：auto-commit + remote-sync)
- system-detector (环境检测)
```

#### 2. 交互式 CLI

```
❌ 之前：参数式命令
claude-init init --plugins memory,preset --config config.yaml

✅ 重构后：对话式交互
$ claude-init

📦 Select Features
  ◉ Prompt Presets
  ◉ Memory System
  ◯ Git Integration

[Space 选择, Enter 确认]
```

#### 3. 极简命令

```bash
# 只有 2 个命令
claude-init                  # 默认：初始化
claude-init memory system-add  # 创建 system 级记忆并提交 PR
```

#### 4. 多语言支持

```bash
# 支持英语和中文
export CLAUDE_INIT_LANG=zh
claude-init

# 自动检测系统语言
```

---

## 🏗️ 架构图

### 插件系统架构

```
claude-init (核心)
├── plugin/              # 插件系统
│   ├── types.ts         # 接口定义
│   ├── loader.ts        # 插件加载器
│   ├── registry.ts      # 插件注册表
│   └── context.ts       # 插件上下文
│
├── plugins/             # 内置插件
│   ├── memory-system/
│   │   ├── index.ts
│   │   ├── configure.ts
│   │   └── commands/
│   │       └── system-add.ts  # claude-init memory system-add
│   │
│   ├── prompt-presets/
│   │   ├── index.ts
│   │   └── presets/
│   │       ├── code-review.md
│   │       └── ...
│   │
│   ├── git/
│   │   ├── index.ts
│   │   ├── auto-commit.ts
│   │   └── remote-sync.ts
│   │
│   └── system-detector/
│       └── index.ts
│
└── i18n/                # 国际化
    └── locales/
        ├── en/
        └── zh/
```

### CLI 命令结构

```
claude-init                        # 默认：执行 init
  ├── init [--force]              # 初始化（交互式）
  └── memory                       # Memory System 插件命令组
      └── system-add [--local]    # 创建 system 级记忆并提交 PR
```

---

## 🎨 设计原则

### 1. 极简主义
- 只做必需的功能
- 默认行为直观
- 不过度设计

### 2. 对话式交互
- 无需记忆参数
- 可视化选择
- 智能默认值

### 3. 插件化
- 功能模块化
- 可选组合
- 易于扩展

### 4. 国际化
- 多语言支持
- 自动检测
- 统一的翻译管理

---

## 📊 实施计划

### 时间线（4-5 周）

```
Week 1:   核心框架 + UI 组件 + 交互式初始化器
Week 2-3: 4 个插件实现
Week 4:   国际化（i18n）支持
Week 5:   测试 + 文档 + 发布
```

### 9 个实施阶段

1. **核心框架**（2-3 天）- 插件系统接口
2. **UI 组件库**（1-2 天）- 交互式组件
3. **交互式初始化器**（2-3 天）- 动态步骤流程
4. **插件实现**（5-7 天）- 4 个核心插件
5. **CLI 重构**（1 天）- 命令注册
6. **配置迁移**（1-2 天）- 向后兼容
7. **国际化**（6-7 天）- 多语言支持
8. **测试和文档**（2-3 天）- 质量保证
9. **发布**（1 天）- v2.0 正式发布

详见：[REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md#实施计划)

---

## 🔍 关键设计决策

### 为什么插件化？

- ✅ 功能解耦，职责清晰
- ✅ 用户可按需选择功能
- ✅ 易于添加新插件
- ✅ 团队可独立开发插件

### 为什么纯交互式？

- ✅ 这是开发者本地工具，不是 CI 工具
- ✅ 交互式更直观，无需记忆参数
- ✅ 智能默认值让操作更快
- ✅ 实时反馈，用户知道在做什么

### 为什么极简命令？

- ✅ 只做真正需要的功能
- ✅ `memory system-add` 解决真实痛点
- ✅ 不做文件管理（那是文件系统的事）
- ✅ 保持工具简单易用

### 为什么 Git 插件整合？

- ✅ Auto-commit + Remote-sync + Gitignore 都是 Git 操作
- ✅ 统一配置和管理
- ✅ 避免功能分散

### 为什么 `commandName` 显式定义？

- ✅ 清晰明确，没有魔法映射
- ✅ 插件控制自己的 CLI 名称
- ✅ 避免命名冲突

---

## 📝 术语表

| 术语 | 说明 |
|------|------|
| **Plugin** | 插件：独立的功能模块 |
| **commandName** | CLI 命令名称：插件在 CLI 中的名称（如 `memory`）|
| **Plugin Command** | 插件命令：插件暴露的子命令（如 `system-add`）|
| **Configuration Flow** | 配置流程：插件的交互式配置逻辑 |
| **Lifecycle Hook** | 生命周期钩子：插件在特定时机执行的函数 |
| **Plugin Context** | 插件上下文：插件运行时可访问的环境和工具 |
| **System Memory** | 系统级记忆：团队共享的记忆模板 |
| **Project Memory** | 项目级记忆：项目本地的记忆 |

---

## 🤝 贡献指南

### 添加新插件

1. 在 `src/plugins/` 创建插件目录
2. 实现插件接口（参考 `PLUGIN_ARCHITECTURE_REFACTOR.md`）
3. 注册到 `src/plugins/index.ts`
4. 更新文档

### 添加翻译

1. 在 `src/i18n/locales/<lang>/` 添加翻译文件
2. 遵循现有的命名空间结构
3. 运行翻译完整性测试
4. 更新 `I18N_DESIGN.md`

### 添加命令

1. 在插件的 `commands/` 目录创建命令文件
2. 实现 `PluginCommand` 接口
3. 注册到插件的 `commands` 数组
4. 更新 `CLI_COMMANDS_DESIGN.md`

---

## 📞 支持

- **设计问题**: 查阅相应的设计文档
- **实现问题**: 参考代码注释和示例
- **Bug 报告**: 创建 GitHub Issue
- **功能建议**: 提交 GitHub Discussion

---

**版本**: 2.0.0-alpha
**最后更新**: 2025-11-26
**状态**: 核心功能已实现，测试完成 (100/100 passed)

