# Claude Init 设计文档

本目录包含 `claude-init` 的设计和用户文档。

**版本**: 2.2.0-alpha
**状态**: Heavyweight plugins + I18N 已实现

## 📚 文档索引

### 用户文档

- **[USER_GUIDE.md](./USER_GUIDE.md)** - 完整用户指南
- **[EXAMPLES.md](./EXAMPLES.md)** - 使用示例

### 设计文档

1. **[PLUGIN_ARCHITECTURE_REFACTOR.md](./PLUGIN_ARCHITECTURE_REFACTOR.md)** - 插件化架构设计
   - 插件系统接口定义
   - 插件生命周期钩子
   - 配置文件格式

2. **[HEAVYWEIGHT_PLUGINS.md](./HEAVYWEIGHT_PLUGINS.md)** - 重量级插件框架 (v2.2+)
   - Heavyweight 插件概念
   - 文件保护和合并策略
   - Claude Flow 集成

3. **[CLAUDE_FLOW_QUICK_START.md](./CLAUDE_FLOW_QUICK_START.md)** - Claude Flow 快速入门
   - Claude Flow 安装和配置
   - 初始化模式
   - MCP 配置

4. **[UNIFIED_RESOURCE_REGISTRATION.md](./UNIFIED_RESOURCE_REGISTRATION.md)** - 统一资源注册 (v2.2+)
   - OutputRouter 设计
   - ResourceWriter 实现
   - Slash Commands 和 Skills 支持

5. **[I18N_DESIGN.md](./I18N_DESIGN.md)** - 国际化（i18n）设计
   - typesafe-i18n 集成
   - 英语 + 中文支持
   - 语言检测策略

6. **[INTERACTIVE_CLI_DESIGN.md](./INTERACTIVE_CLI_DESIGN.md)** - 交互式 CLI 设计
   - 对话式交互流程
   - UI 组件库

7. **[CLI_COMMANDS_DESIGN.md](./CLI_COMMANDS_DESIGN.md)** - 命令结构设计
   - 命令架构
   - 插件命令注册机制

8. **[PLUGIN_PROMPT_SPECIFICATION.md](./PLUGIN_PROMPT_SPECIFICATION.md)** - 插件 Prompt 规范
   - CLAUDE.md 生成规范
   - 插件 Prompt 贡献接口

### 测试文档

- **[BDD_SETUP.md](./BDD_SETUP.md)** - Cucumber BDD 测试配置

---

## 🏗️ 架构概览

### 插件系统

```
claude-init (核心)
├── core/                # 核心框架
│   ├── interactive-initializer.ts
│   ├── heavyweight-plugin-manager.ts
│   ├── output-router.ts
│   └── resource-writer.ts
│
├── plugin/              # 插件系统
│   ├── types.ts         # 接口定义
│   ├── loader.ts        # 插件加载器
│   └── registry.ts      # 插件注册表
│
├── plugins/             # 内置插件
│   ├── core/            # 基础命令
│   ├── system-detector/ # 环境检测
│   ├── language-settings/ # AI 语言偏好
│   ├── memory-system/   # 记忆系统
│   ├── git/             # Git 集成
│   ├── task-system/     # 任务系统
│   ├── prompt-presets/  # 预设模板
│   ├── claude-flow/     # AI 编排 (heavyweight)
│   └── pma-gh/          # GitHub 工作流
│
└── i18n/                # 国际化
    ├── en/
    └── zh/
```

### 插件分类

| 类型 | 插件 | 说明 |
|------|------|------|
| **Lightweight** | core, system-detector, language-settings, memory-system, git, task-system, prompt-presets, pma-gh | 直接执行 |
| **Heavyweight** | claude-flow | 有外部初始化命令，需要文件保护 |

---

## 🤝 贡献指南

### 添加新插件

1. 在 `src/plugins/` 创建插件目录
2. 实现插件接口（参考 `PLUGIN_ARCHITECTURE_REFACTOR.md`）
3. 注册到 `src/plugins/index.ts`
4. 更新文档

### 添加翻译

1. 在 `src/i18n/<lang>/` 添加翻译
2. 遵循现有结构
3. 运行测试验证

---

**版本**: 2.2.0-alpha
**最后更新**: 2025-12-11
