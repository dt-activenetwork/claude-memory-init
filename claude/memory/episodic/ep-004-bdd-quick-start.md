# BDD Quick Start Guide

## Running Tests

```bash
# Validate syntax only (fast)
pnpm test:bdd:dry

# Run all BDD tests
pnpm test:bdd

# Run unit tests + BDD tests
pnpm test:all
```

## Current Status

✅ **37 scenarios** across **5 feature files**
✅ **165 steps** defined
✅ **Syntax validated** - ready to run

## Feature Files Overview

| Feature | Scenarios | Language |
|---------|-----------|----------|
| `initialization.feature` | 7 | zh-CN |
| `system-detection.feature` | 10 | zh-CN |
| `plugin-registration.feature` | 6 | zh-CN |
| `plugin-dependencies.feature` | 8 | zh-CN |
| `plugin-lifecycle.feature` | 5 | zh-CN |
| **Total** | **37** | - |

## Writing New Tests

### 1. Create Feature File

Create `tests/bdd/features/my-feature.feature`:

```gherkin
# language: zh-CN
功能: 我的新功能
  作为一个开发者
  我希望测试新功能
  以便确保功能正常工作

  背景:
    假如 一个新的空项目目录

  场景: 测试场景
    当 执行某个操作
    那么 应该看到预期结果
```

### 2. Create Step Definitions

Create `tests/bdd/step-definitions/my-feature.steps.ts`:

```typescript
import { When, Then } from '@cucumber/cucumber';
import { TestWorld } from '../support/world.js';
import assert from 'node:assert';

When('执行某个操作', async function (this: TestWorld) {
  // Implementation
  this.setMockInput('result', 'success');
});

Then('应该看到预期结果', async function (this: TestWorld) {
  const result = this.getMockInput('result');
  assert.strictEqual(result, 'success');
});
```

### 3. Validate and Run

```bash
# Validate syntax
pnpm test:bdd:dry

# Run tests
pnpm test:bdd
```

## Common Step Patterns

### File/Directory Assertions (Bilingual)

```gherkin
# Chinese
那么 目录 ".agent" 应该存在
那么 文件 "AGENT.md" 应该存在
那么 文件 "AGENT.md" 应该包含 "test-project"
那么 文件 "AGENT.md" 不应该包含 "{{"

# English
Then the directory ".agent" should exist
Then the file "AGENT.md" should exist
Then the file "AGENT.md" should contain "test-project"
Then the file "AGENT.md" should not contain "{{"
```

### Setup (Bilingual)

```gherkin
# Chinese
假如 一个新的空项目目录
假如 项目已经初始化过
假如 项目中存在 "pnpm-lock.yaml" 文件

# English
Given a new empty project directory
Given the project is already initialized
```

## Reusable Step Definitions

All in `common.steps.ts`:

- ✅ Project setup
- ✅ File/directory checks
- ✅ Content assertions
- ✅ Error handling

## Test World Helpers

```typescript
// In your step definitions
async function myStep(this: TestWorld) {
  // Create temp project
  await this.createTempProject();

  // Create files
  await this.createFile('test.txt', 'content');

  // Check existence
  const exists = await this.fileExists('test.txt');

  // Read files
  const content = await this.readFile('test.txt');

  // Store state
  this.setMockInput('key', 'value');
  const value = this.getMockInput('key');

  // Cleanup happens automatically in After hook
}
```

## Debugging

### Check Undefined Steps

```bash
pnpm test:bdd:dry
```

Look for output like:
```
Undefined. Implement with the following snippet:

  When('新的步骤', async function () {
    // Write code here
  });
```

### View Test Output

```bash
# Verbose output
NODE_OPTIONS='--import tsx' cucumber-js --format=progress

# Generate HTML report
pnpm test:bdd
# Opens cucumber-report.html
```

## Best Practices

1. **Use node:assert** for assertions
2. **Always use TestWorld helpers** for file operations
3. **Mock UI components** to avoid interactive prompts
4. **Test in isolation** - each scenario gets fresh temp directory
5. **Use descriptive step names** in Chinese or English

## File Structure

```
tests/bdd/
├── features/              # *.feature files (Gherkin)
├── step-definitions/      # *.steps.ts files
└── support/
    ├── world.ts          # Test context
    └── hooks.ts          # Before/After
```

## Quick Reference

| Task | Command |
|------|---------|
| Validate syntax | `pnpm test:bdd:dry` |
| Run BDD tests | `pnpm test:bdd` |
| Run all tests | `pnpm test:all` |
| Run single feature | `cucumber-js tests/bdd/features/initialization.feature` |
| Filter by name | `cucumber-js --name "初始化"` |

## Resources

- Full documentation: `tests/bdd/README.md`
- Implementation summary: `BDD_IMPLEMENTATION_SUMMARY.md`
- Cucumber.js docs: https://github.com/cucumber/cucumber-js
- Gherkin reference: https://cucumber.io/docs/gherkin/reference/

---

**Last Updated:** 2025-11-26
**Status:** ✅ Ready to use
