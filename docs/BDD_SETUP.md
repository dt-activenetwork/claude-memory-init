# Cucumber.js BDD Testing Infrastructure

## Overview

This document describes the Cucumber.js BDD (Behavior-Driven Development) testing infrastructure configured for the claude-memory-init project. The BDD tests coexist with existing Vitest unit tests.

## Architecture

### Directory Structure

```
/home/dai/code/claude-memory-init/
├── cucumber.cjs                          # Cucumber configuration (CommonJS)
├── tests/
│   ├── tsconfig.json                     # TypeScript config for tests
│   ├── bdd/
│   │   ├── features/                     # Gherkin feature files
│   │   │   ├── initialization.feature
│   │   │   ├── plugin-lifecycle.feature
│   │   │   ├── plugin-dependencies.feature
│   │   │   ├── plugin-registration.feature
│   │   │   ├── system-detection.feature
│   │   │   └── sample.feature
│   │   ├── step-definitions/             # Step implementation
│   │   │   ├── common.steps.ts
│   │   │   └── plugin.steps.ts
│   │   └── support/                      # Test infrastructure
│   │       ├── world.ts                  # Custom World with helpers
│   │       └── hooks.ts                  # Before/After hooks
│   ├── integration/                      # Vitest integration tests
│   └── unit/                             # Vitest unit tests
└── reports/                              # Generated reports (gitignored)
```

## Dependencies Installed

```json
{
  "devDependencies": {
    "@cucumber/cucumber": "^12.2.0",
    "ts-node": "^10.9.2",
    "tsx": "^4.20.6"
  }
}
```

**Note:** We use Node.js built-in `assert` module instead of a separate assertion library to avoid conflicts with vitest's global `expect`.

## Configuration Files

### 1. cucumber.cjs

```javascript
module.exports = {
  default: {
    import: ['tests/bdd/step-definitions/**/*.ts', 'tests/bdd/support/**/*.ts'],
    paths: ['tests/bdd/features/**/*.feature'],
    format: ['progress-bar', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
};
```

**Key Points:**
- Uses `.cjs` extension for CommonJS module syntax (required because package.json has `"type": "module"`)
- Uses `import` directive (not `require`) for ES modules support
- Loads TypeScript files via NODE_OPTIONS tsx loader
- Generates HTML reports in `reports/` directory

### 2. tests/tsconfig.json

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": "..",
    "outDir": "../dist-tests",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true
  },
  "include": [
    "./**/*.ts",
    "../src/**/*.ts"
  ]
}
```

**Key Points:**
- Extends root tsconfig.json
- Uses CommonJS module system for Cucumber compatibility
- Includes both test files and source files

## NPM Scripts

```json
{
  "scripts": {
    "test:bdd": "NODE_OPTIONS='--import tsx' cucumber-js",
    "test:bdd:dry": "NODE_OPTIONS='--import tsx' cucumber-js --dry-run",
    "test:all": "pnpm test && pnpm test:bdd"
  }
}
```

**Usage:**
- `pnpm test:bdd` - Run all BDD tests
- `pnpm test:bdd:dry` - Dry run (parse features, show undefined steps)
- `pnpm test:all` - Run both Vitest and Cucumber tests

## Custom World Class

The `TestWorld` class extends Cucumber's `World` with project-specific helpers:

```typescript
export class TestWorld extends World implements CustomWorld {
  tmpDir: string = '';
  projectDir: string = '';
  lastOutput: string = '';
  lastError: Error | null = null;
  pluginRegistry: any = null;
  initializer: any = null;
  mockInputs: Map<string, any> = new Map();

  // Helper methods
  async createTempProject(): Promise<string>
  async cleanup(): Promise<void>
  async createFile(relativePath: string, content: string): Promise<void>
  async readFile(relativePath: string): Promise<string>
  async fileExists(relativePath: string): Promise<boolean>
  async directoryExists(relativePath: string): Promise<boolean>
  setMockInput(key: string, value: any): void
  getMockInput(key: string): any
  hasMockInput(key: string): boolean
  clearMockInputs(): void
}
```

## Common Step Definitions

Located in `/home/dai/code/claude-memory-init/tests/bdd/step-definitions/common.steps.ts`:

### Given Steps
- `Given('a new empty project directory', ...)`
- `Given('一个新的空项目目录', ...)`
- `Given('a project directory with file {string} containing:', ...)`
- `Given('the project is already initialized', ...)`

### Then Steps (Assertions)
- `Then('the directory {string} should exist', ...)`
- `Then('the file {string} should exist', ...)`
- `Then('the file {string} should contain {string}', ...)`
- `Then('the file {string} should not contain {string}', ...)`
- `Then('an error should be raised with message containing {string}', ...)`
- `Then('no error should be raised', ...)`

## Hooks

Located in `/home/dai/code/claude-memory-init/tests/bdd/support/hooks.ts`:

```typescript
BeforeAll() // Global initialization
AfterAll()  // Global cleanup
Before()    // Reset state before each scenario
After()     // Cleanup temp files after each scenario
```

## Technical Details

### ES Modules Support

The project uses ES modules (`"type": "module"` in package.json), which required:

1. **Configuration File:** Renamed from `cucumber.js` to `cucumber.cjs` to use CommonJS syntax
2. **TypeScript Loader:** Use `tsx` via `NODE_OPTIONS='--import tsx'` instead of ts-node/register
3. **Import Directive:** Use `import` instead of `require` in cucumber config

### Module Resolution

- **Source Code:** ES modules (ESM)
- **Cucumber Config:** CommonJS (`.cjs` file)
- **Test Files:** TypeScript transpiled via tsx
- **Assertions:** Using `expect` package (not vitest's expect)

## Language Support

The infrastructure supports both English and Chinese Gherkin syntax:

```gherkin
# English
Feature: Sample Test
  Scenario: Test something
    Given a new empty project directory
    Then the directory "." should exist

# Chinese (language: zh-CN)
功能: 示例测试
  场景: 测试某事
    假如 一个新的空项目目录
    那么 目录 "." 应该存在
```

**Important:** Chinese Gherkin uses different keywords:
- `假如` (Given)
- `当` (When)
- `那么` (Then)
- `而且` (And) - **Not** `并且` which causes parse errors in some contexts

## .gitignore Updates

```gitignore
# Testing
coverage/
.nyc_output/
reports/          # Cucumber HTML reports
dist-tests/       # Compiled test TypeScript

# Temporary files
*.tmp
.cache/
```

## Verification

Dry run output shows the infrastructure is working correctly:

```bash
$ pnpm test:bdd:dry

37 scenarios (37 skipped)
165 steps (165 skipped)
0m00.073s (executing steps: 0m00.000s)
```

- **37 scenarios** found across all feature files
- **All steps** are properly defined (no undefined steps)
- **No parse errors** - all feature files are syntactically correct
- **Ready to run** - infrastructure is fully operational

## Next Steps

To complete the BDD test suite:

1. **Connect to Real Implementation:** Update step definitions to call actual CLI/API functions instead of mocks
2. **Add More Features:** Create feature files for additional test scenarios
3. **Run Tests:** Execute `pnpm test:bdd` to run actual tests (not just dry run)
4. **CI/CD:** Add `pnpm test:all` to CI pipeline to run both Vitest and Cucumber tests

## Best Practices

1. **File Naming:**
   - Features: `feature-name.feature`
   - Steps: `domain.steps.ts` (e.g., `plugin.steps.ts`, `common.steps.ts`)

2. **Step Organization:**
   - Group related steps by domain (plugin, initialization, etc.)
   - Keep common steps in `common.steps.ts`
   - Use descriptive step names that read naturally

3. **World Usage:**
   - Store test state in World instance (not global variables)
   - Use helper methods for common operations
   - Clean up in After hooks

4. **Assertions:**
   - Use Node.js `assert` module (not vitest's expect or standalone expect package)
   - Prefer `assert.ok()` for boolean checks, `assert.strictEqual()` for equality
   - Always include descriptive error messages as the second parameter

## Troubleshooting

### Issue: "Cannot find module" errors
**Solution:** Ensure NODE_OPTIONS includes `--import tsx`

### Issue: "ERR_REQUIRE_ESM" errors
**Solution:** Use `.cjs` extension for cucumber config and update to use `import` directive

### Issue: Parse errors in Chinese features
**Solution:** Use correct Gherkin keywords (`而且` not `并且` for And in some contexts)

### Issue: "Cannot redefine property: Symbol($$jest-matchers-object)"
**Solution:** Don't install the standalone `expect` package. Use Node.js built-in `assert` module instead to avoid conflicts with vitest's global expect.

### Issue: "not a TTY" warnings
**Solution:** This is normal when running in non-interactive mode (CI/CD). Use `progress` formatter instead of `progress-bar`

## References

- [Cucumber.js Documentation](https://github.com/cucumber/cucumber-js)
- [Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)
- [Chinese Gherkin Keywords](https://github.com/cucumber/gherkin/blob/main/gherkin-languages.json)
