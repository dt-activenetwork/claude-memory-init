# 测试文档

本项目采用 **Vitest + Cucumber.js** 混合测试架构，严格区分单元测试和行为驱动测试（BDD）。

## 目录结构

```
tests/
├── unit/                           # Vitest 单元测试
│   ├── plugin/                     # 插件系统测试
│   │   ├── helpers.ts              # 测试辅助函数
│   │   ├── registry.test.ts        # PluginRegistry 测试
│   │   ├── loader.test.ts          # PluginLoader 测试
│   │   └── context.test.ts         # PluginContext 测试
│   ├── plugins/                    # 内置插件测试
│   │   └── prompt-presets.test.ts  # Prompt Presets 插件测试
│   └── utils/                      # 工具函数测试
│       ├── helpers.ts              # 测试辅助函数
│       ├── date-utils.test.ts      # 日期工具测试
│       ├── toon-utils.test.ts      # TOON 格式测试
│       ├── logger.test.ts          # 日志工具测试
│       └── auto-commit.test.ts     # 自动提交测试
├── bdd/                            # Cucumber BDD 测试
│   ├── features/                   # Gherkin Feature 文件
│   ├── step-definitions/           # Step 实现
│   ├── support/                    # 测试基础设施
│   └── README.md                   # BDD 测试文档
├── integration/                    # 集成测试（遗留）
└── tsconfig.json                   # 测试 TypeScript 配置
```

## 快速开始

```bash
# 运行所有单元测试
pnpm test

# 运行 BDD 测试
pnpm test:bdd

# 运行所有测试
pnpm test:all

# 单元测试覆盖率报告
pnpm test:coverage

# BDD 语法验证（不执行）
pnpm test:bdd:dry
```

## 测试分层策略

### 单元测试 (Vitest)

用于测试**纯函数、算法、数据结构**，特点：
- 快速执行（毫秒级）
- 无外部依赖
- 高覆盖率要求（>80%）

适用场景：
- 工具函数（date-utils, toon-utils, logger）
- 插件注册表逻辑（registry）
- 依赖排序算法（loader）
- 配置验证逻辑

### BDD 测试 (Cucumber)

用于测试**用户场景、业务流程**，特点：
- 使用 Gherkin 语法描述行为
- 支持中文关键字
- 关注"做什么"而非"怎么做"

适用场景：
- 项目初始化流程
- 插件配置交互
- 系统检测行为
- 文件生成验证

## 测试统计

| 类型 | 框架 | 测试文件 | 测试用例 |
|------|------|----------|----------|
| 单元测试 | Vitest | 8 | 154 |
| BDD 测试 | Cucumber | 6 features | 37 scenarios |

## 详细文档

- [单元测试指南](./unit/README.md)
- [BDD 测试指南](./bdd/README.md)

## 编写测试指南

### 何时使用单元测试

```typescript
// ✅ 纯函数 - 使用单元测试
function formatDate(date: Date): string { ... }

// ✅ 算法逻辑 - 使用单元测试
function sortByDependencies(plugins: Plugin[]): Plugin[] { ... }

// ✅ 数据转换 - 使用单元测试
function toToon(obj: object): string { ... }
```

### 何时使用 BDD 测试

```gherkin
# ✅ 用户交互流程 - 使用 BDD
场景: 首次初始化新项目
  假如 一个新的空项目目录
  当 用户运行初始化命令
  那么 应该创建 .agent 目录

# ✅ 业务规则验证 - 使用 BDD
场景: 检测循环依赖
  假如 插件 A 依赖插件 B
  并且 插件 B 依赖插件 A
  当 加载插件时
  那么 应该报告循环依赖错误
```

## CI/CD 集成

```yaml
# GitHub Actions 示例
- name: Run Unit Tests
  run: pnpm test

- name: Run BDD Tests
  run: pnpm test:bdd

- name: Coverage Report
  run: pnpm test:coverage
```
