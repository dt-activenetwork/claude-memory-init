# 单元测试文档

本目录包含使用 **Vitest** 编写的单元测试，用于测试项目中的纯函数、算法和数据结构。

## 目录结构

```
unit/
├── plugin/                     # 插件系统测试
│   ├── helpers.ts              # 测试辅助函数
│   ├── registry.test.ts        # PluginRegistry 测试 (29 用例)
│   ├── loader.test.ts          # PluginLoader 测试 (22 用例)
│   └── context.test.ts         # PluginContext 测试 (14 用例)
├── plugins/                    # 内置插件测试
│   └── prompt-presets.test.ts  # Prompt Presets 插件测试 (8 用例)
└── utils/                      # 工具函数测试
    ├── helpers.ts              # 测试辅助函数
    ├── date-utils.test.ts      # 日期工具测试 (10 用例)
    ├── toon-utils.test.ts      # TOON 格式测试 (28 用例)
    ├── logger.test.ts          # 日志工具测试 (16 用例)
    └── auto-commit.test.ts     # 自动提交测试 (27 用例)
```

## 运行测试

```bash
# 运行所有单元测试
pnpm test

# 运行特定目录的测试
pnpm test tests/unit/plugin/
pnpm test tests/unit/utils/

# 运行单个测试文件
pnpm test tests/unit/utils/date-utils.test.ts

# 监听模式（开发时使用）
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

## 测试模块详情

### Plugin 系统测试

#### registry.test.ts (29 用例)

测试 `PluginRegistry` 类的功能：

| 测试组 | 用例数 | 描述 |
|--------|--------|------|
| `register` | 12 | 插件注册、验证、重复检测 |
| `get` | 2 | 按名称获取插件 |
| `getByCommandName` | 2 | 按命令名获取插件 |
| `getAll` | 2 | 获取所有插件 |
| `has` | 2 | 检查插件是否存在 |
| `getEnabled` | 3 | 获取已启用的插件 |
| `count` | 2 | 统计插件数量 |
| `clear` | 2 | 清空注册表 |
| `edge cases` | 2 | 边界条件测试 |

#### loader.test.ts (22 用例)

测试 `PluginLoader` 类的功能：

| 测试组 | 用例数 | 描述 |
|--------|--------|------|
| `sortByDependencies` | 8 | 依赖排序、循环检测 |
| `load` | 3 | 插件加载顺序 |
| `executeHook` | 4 | 钩子执行逻辑 |
| `getLoadedPlugins` | 2 | 获取已加载插件 |
| `clear` | 1 | 清空加载器 |
| `dependency resolution edge cases` | 2 | 菱形依赖等边界情况 |
| `hook execution` | 2 | 钩子上下文传递 |

#### context.test.ts (14 用例)

测试 `PluginContext` 创建函数：

| 测试组 | 用例数 | 描述 |
|--------|--------|------|
| `createPluginContext` | 9 | 上下文创建、字段验证 |
| `createMockPluginContext` | 5 | Mock 上下文创建 |

### Utils 工具测试

#### date-utils.test.ts (10 用例)

测试日期工具函数：

```typescript
// 被测函数
getCurrentDate(): string       // 获取当前日期 YYYY-MM-DD
formatDate(date: Date): string // 格式化日期对象
```

| 测试点 | 描述 |
|--------|------|
| 格式验证 | 确保返回 YYYY-MM-DD 格式 |
| 日期正确性 | 返回今天的日期 |
| 月份补零 | 1-9 月补零为 01-09 |
| 日期补零 | 1-9 日补零为 01-09 |
| 闰年处理 | 2 月 29 日正确处理 |

#### toon-utils.test.ts (28 用例)

测试 TOON 格式序列化：

```typescript
// 被测函数
toToon(obj: object): string              // 对象转 TOON
fromToon<T>(str: string): T              // TOON 转对象
createToonFile(obj, desc?): string       // 创建 TOON 文件
formatSystemInfoAsToon(info): string     // 系统信息转 TOON
formatPluginConfigAsToon(config): string // 插件配置转 TOON
```

| 测试组 | 用例数 | 描述 |
|--------|--------|------|
| `toToon` | 8 | 基本序列化、嵌套对象、数组 |
| `fromToon` | 6 | 基本解析、类型恢复 |
| `roundtrip` | 4 | 序列化往返一致性 |
| `createToonFile` | 4 | 文件头部、描述信息 |
| `formatSystemInfoAsToon` | 3 | 系统信息格式化 |
| `formatPluginConfigAsToon` | 3 | 插件配置格式化 |

#### logger.test.ts (16 用例)

测试日志工具函数：

```typescript
// 被测函数
info(message: string): void
success(message: string): void
error(message: string): void
warning(message: string): void
step(num: number, message: string): void
blank(): void
```

| 测试点 | 描述 |
|--------|------|
| 函数调用 | 确保 console.log 被调用 |
| 颜色输出 | 使用 chalk 进行颜色化 |
| 步骤格式 | step() 正确显示步骤编号 |

#### auto-commit.test.ts (27 用例)

测试自动提交相关的纯函数：

```typescript
// 被测函数（纯函数部分）
separateMemoryFiles(files, baseDir): { memoryFiles, otherFiles }
generateMemoryCommitMessage(files): string
```

| 测试组 | 用例数 | 描述 |
|--------|--------|------|
| `separateMemoryFiles` | 15 | 文件分离、路径处理、Windows 兼容 |
| `generateMemoryCommitMessage` | 12 | 提交信息生成、格式验证 |

## 测试辅助函数

### plugin/helpers.ts

```typescript
// 创建模拟插件
createMockPlugin(name, options?): Plugin

// 创建模拟配置
createMockCoreConfig(enabledPlugins?, disabledPlugins?): CoreConfig
createMockSharedConfig(): SharedConfig

// 创建模拟依赖
createMockLogger(): Logger
createMockFileOps(): FileOperations
createMockUI(): UIComponents
```

### utils/helpers.ts

```typescript
// 临时目录操作
createTempDir(): Promise<string>
cleanupTempDir(dir): Promise<void>

// 测试文件操作
createTestFile(baseDir, relativePath, content): Promise<string>
readTestFile(baseDir, relativePath): Promise<string>
fileExists(filePath): Promise<boolean>

// 目录结构
createDirStructure(baseDir, structure): Promise<void>
listFilesRecursive(dir): Promise<string[]>
```

## 编写测试指南

### 命名约定

- 测试文件：`<模块名>.test.ts`
- 辅助函数：`helpers.ts`
- 描述使用中文或英文均可

### 测试结构

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('模块名', () => {
  describe('函数名', () => {
    beforeEach(() => {
      // 每个测试前的设置
    });

    afterEach(() => {
      // 每个测试后的清理
    });

    it('should do something', () => {
      // 测试逻辑
      expect(result).toBe(expected);
    });
  });
});
```

### Mock 使用

```typescript
// Mock 模块
vi.mock('../../../src/utils/logger.js', () => ({
  info: vi.fn(),
  error: vi.fn(),
}));

// Mock 函数
const mockFn = vi.fn().mockReturnValue('value');
const asyncMockFn = vi.fn().mockResolvedValue('value');

// 重置 Mock
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 导入路径

由于项目使用 ESM 模块，导入时需要使用 `.js` 后缀：

```typescript
// ✅ 正确
import { something } from '../../../src/utils/file-ops.js';

// ❌ 错误
import { something } from '../../../src/utils/file-ops';
```

## 覆盖率要求

| 指标 | 阈值 |
|------|------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

配置位于 `vitest.config.ts`。
