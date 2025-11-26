# BDD Tests for Claude Memory Init

This directory contains Behavior-Driven Development (BDD) tests for the claude-memory-init project using Cucumber.

## Overview

The BDD tests use Gherkin syntax (supporting both English and Chinese) to describe the behavior of the system in a human-readable format. Tests cover the plugin system, initialization flow, and system detection.

## Structure

```
tests/bdd/
├── features/                         # Gherkin feature files
│   ├── initialization.feature        # Project initialization tests (zh-CN)
│   ├── system-detection.feature      # System detection tests (zh-CN)
│   ├── plugin-registration.feature   # Plugin registry tests
│   ├── plugin-dependencies.feature   # Dependency resolution tests
│   └── plugin-lifecycle.feature      # Lifecycle hooks tests
├── step-definitions/                 # Step implementation
│   ├── common.steps.ts               # Common reusable steps (English + Chinese)
│   ├── initialization.steps.ts       # Initialization flow steps
│   ├── system-detection.steps.ts     # System detection steps
│   └── plugin.steps.ts               # Plugin system step definitions
└── support/                          # Test support files
    ├── world.ts                      # Test world/context
    └── hooks.ts                      # Global hooks (Before/After)
```

## Feature Files

### 1. Initialization (`initialization.feature`) ⭐ NEW

Tests for project initialization flow (Chinese):

- ✅ First-time initialization
- ✅ Minimal setup (system detector only)
- ✅ Re-initialization detection and options
- ✅ Force re-initialization
- ✅ Directory structure creation
- ✅ Template placeholder replacement
- ✅ Appending to existing AGENT.md

**Scenarios:** 7

### 2. System Detection (`system-detection.feature`) ⭐ NEW

Tests for system environment detection (Chinese):

- ✅ OS information detection (type, name, package manager)
- ✅ Package manager inference from lock files
  - `pnpm-lock.yaml` → pnpm
  - `package-lock.json` → npm
  - `yarn.lock` → yarn
  - `bun.lockb` → bun
- ✅ Python environment detection
- ✅ Node.js environment detection
- ✅ Timezone and locale detection
- ✅ Configuration persistence (TOON format)
- ✅ User/Project memory scope selection

**Scenarios:** 10

### 3. Plugin Registration (`plugin-registration.feature`)

Tests for the `PluginRegistry` class:

- ✅ Register valid plugins
- ✅ Reject plugins missing required fields (name, commandName)
- ✅ Reject duplicate plugin names
- ✅ Reject duplicate command names
- ✅ Retrieve all registered plugins

**Scenarios:** 6

### 4. Plugin Dependencies (`plugin-dependencies.feature`)

Tests for the `PluginLoader` dependency resolution:

- ✅ Sort plugins with no dependencies
- ✅ Resolve linear dependency chains
- ✅ Handle multiple dependencies
- ✅ Handle diamond dependency patterns
- ✅ Detect circular dependencies (2-way, 3-way)
- ✅ Detect self-dependencies
- ✅ Detect missing dependencies

**Scenarios:** 8

### 5. Plugin Lifecycle (`plugin-lifecycle.feature`)

Tests for plugin lifecycle hook execution:

- ✅ Execute hooks in correct order (beforeInit → execute → afterInit)
- ✅ Execute hooks respecting dependency order
- ✅ Skip plugins without hooks
- ✅ Handle hook execution errors
- ✅ Pass correct context to hooks

**Scenarios:** 5

**Total:** 37 scenarios across 5 feature files

## Running Tests

### Run all BDD tests

```bash
pnpm test:bdd
```

### Dry-run (syntax validation)

```bash
pnpm test:bdd:dry
```

### Run with Node.js import loader

```bash
NODE_OPTIONS='--import tsx' pnpm test:bdd
```

### Run only plugin system tests

Since Cucumber loads all `.feature` files from the features directory, to run only plugin tests, you can:

```bash
# Option 1: Filter by file pattern
NODE_OPTIONS='--import tsx' pnpm exec cucumber-js tests/bdd/features/plugin-*.feature

# Option 2: Filter by scenario name (Chinese keywords)
NODE_OPTIONS='--import tsx' pnpm exec cucumber-js --name "插件"
```

## Step Definitions

### Common Steps (`common.steps.ts`) ⭐ NEW

Reusable steps supporting both English and Chinese:

**English:**
- `Given a new empty project directory`
- `Given the project is already initialized`
- `Then the directory {string} should exist`
- `Then the file {string} should exist`
- `Then the file {string} should contain {string}`
- `Then the file {string} should not contain {string}`

**Chinese (中文):**
- `假如 一个新的空项目目录`
- `假如 项目已经初始化过`
- `那么 目录 {string} 应该存在`
- `那么 文件 {string} 应该存在`
- `那么 文件 {string} 应该包含 {string}`
- `那么 文件 {string} 不应该包含 {string}`

### Initialization Steps (`initialization.steps.ts`) ⭐ NEW

Steps specific to initialization flow (Chinese):

- `当 用户输入项目名称 {string}`
- `当 用户输入项目描述 {string}`
- `当 用户选择所有推荐的功能`
- `当 用户只选择 {string} 功能`
- `当 用户确认初始化`
- `当 用户尝试再次初始化`
- `当 用户使用 force 选项初始化`
- `那么 应该创建以下目录结构:` (with DataTable)
- `那么 旧的配置应该被覆盖`

### System Detection Steps (`system-detection.steps.ts`) ⭐ NEW

Steps for system environment detection (Chinese):

- `假如 system-detector 插件已启用`
- `假如 项目中存在 {string} 文件`
- `假如 系统安装了 Python`
- `当 系统检测器运行`
- `当 系统检测器检测 Node.js 环境`
- `当 系统检测器检测 Python 环境`
- `当 系统检测器检测静态信息`
- `当 用户选择 {string} 作为 Node.js 包管理器`
- `当 用户完成系统检测配置`
- `那么 默认包管理器应该是 {string}`
- `那么 应该检测到操作系统类型`
- `那么 应该检测到操作系统名称`
- `那么 应该检测到系统包管理器`
- `那么 应该检测到 Python 版本`
- `那么 应该检测到时区信息`

### Plugin System Steps (`plugin.steps.ts`)

The `plugin.steps.ts` file implements 36 steps covering:

### Given Steps (13 steps)
- Plugin definition with specific attributes
- Missing required fields scenarios
- Pre-registered plugins
- Multiple plugin registration

### When Steps (11 steps)
- Plugin registration attempts
- Dependency sorting
- Hook execution
- Lifecycle management

### Then Steps (12 steps)
- Success/error assertions
- Plugin presence verification
- Execution order verification
- Context validation

## Test World (Context Management) ⭐ UPDATED

The `TestWorld` class manages shared state across scenarios:

```typescript
class TestWorld extends World {
  // Test environment
  projectDir: string;              // Temporary test directory
  tmpDir: string;                  // Temp directory base

  // State management
  mockInputs: Map<string, any>;    // Mock user inputs
  lastError: Error | null;         // Last error (if any)
  lastOutput: string;              // Last command output

  // Plugin-specific (for plugin tests)
  pluginRegistry: PluginRegistry;
  initializer: InteractiveInitializer;

  // Helper methods
  createTempProject(): Promise<string>
  createFile(path, content): Promise<void>
  readFile(path): Promise<string>
  fileExists(path): Promise<boolean>
  directoryExists(path): Promise<boolean>
  setMockInput(key, value): void
  getMockInput(key): any
  hasMockInput(key): boolean
  clearMockInputs(): void
  cleanup(): Promise<void>
}
```

## Test Utilities

### `createTestPlugin()` Helper (Plugin Tests)

Creates mock plugins for testing:

```typescript
createTestPlugin('plugin-name', {
  commandName: 'cmd',
  dependencies: ['dep1', 'dep2'],
  hasHooks: true,
  hookBehavior: 'normal' | 'error',
  hasExecuteHook: true
});
```

### `PluginTestWorld` Interface

Extends `TestWorld` with plugin-specific properties:

- `registry: PluginRegistry` - Plugin registry instance
- `loader: PluginLoader` - Plugin loader instance
- `context: PluginContext` - Plugin execution context
- `sortedPlugins: Plugin[]` - Result of dependency sorting
- `executionOrder: string[]` - Track hook execution order
- `currentPlugin: Partial<Plugin>` - Current plugin under test
- `hookContext: PluginContext | null` - Context passed to hooks

## Configuration

### Cucumber Configuration

See `cucumber.config.js` for:
- TypeScript support via `tsx` loader
- Path configurations
- Format options (HTML, JSON reports)
- Parallel execution settings

### Package Scripts

```json
{
  "test:bdd": "cucumber-js",
  "test:bdd:dry": "cucumber-js --dry-run",
  "test:all": "pnpm test && pnpm test:bdd"
}
```

## Example Scenario

```gherkin
# language: zh-CN
场景: 注册有效的插件
  假如 一个有效的插件定义:
    | 属性         | 值                |
    | name         | test-plugin       |
    | commandName  | test              |
    | version      | 1.0.0             |
    | description  | A test plugin     |
  当 将该插件注册到 Registry
  那么 注册应该成功
  并且 Registry 应该包含 "test-plugin" 插件
```

## Verification Checklist

- [x] Feature files created with correct Gherkin syntax
- [x] All scenarios use Chinese keywords (假如/当/那么/并且)
- [x] Step definitions implement all 36 steps
- [x] Helper functions for test plugin creation
- [x] Test world extended with plugin-specific properties
- [x] DataTable handling implemented correctly
- [x] Async/await properly used in step definitions
- [x] Error assertions working
- [x] Execution order tracking functional
- [x] Context validation implemented

## Best Practices ⭐ NEW

### 1. Use Node.js Assert

Use `node:assert` instead of external libraries for better compatibility:

```typescript
import assert from 'node:assert';

// ✅ Good
assert.strictEqual(actual, expected);
assert.ok(condition, 'message');
assert.match(string, regex);

// ❌ Avoid
expect(actual).toBe(expected);  // Requires 'expect' package
```

### 2. Test Isolation

Each scenario runs in complete isolation:

```typescript
Before(async function (this: TestWorld) {
  // Fresh state for each scenario
  this.lastError = null;
  this.mockInputs.clear();
});

After(async function (this: TestWorld) {
  // Automatic cleanup of temp files
  await this.cleanup();
});
```

### 3. Mock UI Components

Always mock UI components to avoid interactive prompts:

```typescript
import { vi } from 'vitest';

const { confirm } = await import('../../../src/prompts/components/confirm.js');
vi.mocked(confirm).mockResolvedValue(true);
```

## Next Steps

To run the tests:

1. Ensure dependencies are installed: `pnpm install`
2. Build the project: `pnpm build`
3. Run dry-run to verify syntax: `pnpm test:bdd:dry`
4. Run full BDD tests: `pnpm test:bdd`
5. Run all tests: `pnpm test:all`

## Troubleshooting

### "tsx must be loaded with --import"

Use the `NODE_OPTIONS` environment variable:

```bash
NODE_OPTIONS='--import tsx' pnpm test:bdd
```

### "Cannot use 'progress-bar' formatter for output to 'stdout'"

This is expected when running in non-TTY environments (CI/CD). Cucumber automatically switches to 'progress' formatter.

### TypeScript compilation errors

The BDD tests use `tsx` runtime, so they don't require pre-compilation. TypeScript errors in the main codebase won't affect BDD test execution.
