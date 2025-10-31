# Claude Memory System - 初始化 CLI 工具完整工作计划

## 项目概述

**目标**: 创建一个独立的 TypeScript CLI 工具，用于初始化 Claude 记忆系统，通过 `pnpm dlx` 执行

**执行方式**: `pnpm dlx @claude-memory/init` (或本地开发时使用相对路径)

**隔离原则**:
- CLI 工具放在独立目录中
- 不污染主项目依赖
- 不干扰 claude/ 记忆系统
- 运行时只创建/修改配置文件和模板实例

---

## 目录结构设计

```
/home/dai/code/code-analysis-demo/
├── claude/                                 # 记忆系统（不动）
│   ├── CLAUDE.md.template
│   ├── config.example.yaml
│   └── ... (其他记忆系统文件)
├── packages/                               # 新建：CLI 工具独立目录
│   └── claude-memory-init/                 # CLI 包目录
│       ├── package.json                    # CLI 包配置
│       ├── tsconfig.json                   # TypeScript 配置
│       ├── src/                            # 源代码
│       │   ├── index.ts                    # CLI 入口
│       │   ├── cli.ts                      # 命令行接口
│       │   ├── core/                       # 核心逻辑
│       │   │   ├── config-loader.ts        # 配置加载
│       │   │   ├── template-engine.ts      # 模板引擎
│       │   │   ├── validator.ts            # 验证器
│       │   │   └── initializer.ts          # 初始化器
│       │   ├── prompts/                    # 交互式提示
│       │   │   ├── project-info.ts         # 项目信息提示
│       │   │   └── objectives.ts           # 目标配置提示
│       │   ├── utils/                      # 工具函数
│       │   │   ├── file-ops.ts             # 文件操作
│       │   │   ├── logger.ts               # 日志输出
│       │   │   └── date-utils.ts           # 日期处理
│       │   └── types/                      # 类型定义
│       │       └── config.ts               # 配置类型
│       ├── dist/                           # 编译输出（.gitignore）
│       └── README.md                       # CLI 工具文档
└── .gitignore                              # 更新：忽略 packages/**/dist

```

---

## 工作计划分解

### Phase 1: 项目结构搭建 (10 分钟)

#### 任务 1.1: 创建独立 CLI 目录结构
```bash
目标目录: /home/dai/code/code-analysis-demo/packages/claude-memory-init/

创建的目录:
- packages/claude-memory-init/src/core/
- packages/claude-memory-init/src/prompts/
- packages/claude-memory-init/src/utils/
- packages/claude-memory-init/src/types/
```

#### 任务 1.2: 创建 package.json
```json
位置: packages/claude-memory-init/package.json

内容结构:
{
  "name": "@claude-memory/init",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "claude-memory-init": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "commander": "^12.0.0",        // CLI 框架
    "inquirer": "^9.2.0",          // 交互式提示
    "chalk": "^5.3.0",             // 终端颜色
    "yaml": "^2.3.0",              // YAML 解析
    "ora": "^8.0.0",               // 加载动画
    "fs-extra": "^11.2.0"          // 文件操作增强
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/inquirer": "^9.0.0",
    "@types/fs-extra": "^11.0.0",
    "typescript": "^5.3.0"
  }
}
```

#### 任务 1.3: 创建 tsconfig.json
```json
位置: packages/claude-memory-init/tsconfig.json

内容:
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Phase 2: 类型定义 (5 分钟)

#### 任务 2.1: 创建配置类型定义
```typescript
位置: packages/claude-memory-init/src/types/config.ts

需要定义的类型:
- ProjectConfig (项目配置)
  - name: string
  - type: string
  - description: string
- LanguageConfig (语言配置)
  - user_language: string
  - think_language: string
- PathsConfig (路径配置)
  - base_dir: string
  - codebase: string
- Objective (目标)
  - objective: string
  - memory_check: string
  - memory_update: string
- FullConfig (完整配置)
  - project: ProjectConfig
  - language: LanguageConfig
  - paths: PathsConfig
  - objectives: Objective[]
  - assumptions: string[]
  - ...其他字段
```

---

### Phase 3: 核心功能实现 (30 分钟)

#### 任务 3.1: 配置加载器
```typescript
位置: packages/claude-memory-init/src/core/config-loader.ts

功能:
1. loadConfigFromYaml(path: string): Promise<FullConfig>
   - 读取 config.yaml 文件
   - 使用 yaml 库解析
   - 返回类型化配置对象

2. validateConfig(config: FullConfig): ValidationResult
   - 检查必填字段
   - 验证字段格式
   - 返回验证结果和错误列表

依赖:
- import yaml from 'yaml'
- import { readFile } from 'fs-extra'
- import type { FullConfig } from '../types/config'
```

#### 任务 3.2: 模板引擎
```typescript
位置: packages/claude-memory-init/src/core/template-engine.ts

功能:
1. loadTemplate(templatePath: string): Promise<string>
   - 读取模板文件内容
   - 返回模板字符串

2. renderTemplate(template: string, config: FullConfig): string
   - 替换所有 {{VARIABLE}} 标记
   - 处理特殊变量（如日期、objectives 列表等）
   - 返回渲染后的内容

3. renderObjectives(objectives: Objective[]): string
   - 将 objectives 数组格式化为 Markdown 列表
   - 包含 memory_check 和 memory_update

变量映射:
- {{PROJECT_NAME}} → config.project.name
- {{PROJECT_TYPE}} → config.project.type
- {{PROJECT_DESCRIPTION}} → config.project.description
- {{USER_LANGUAGE}} → config.language.user_language
- {{THINK_LANGUAGE}} → config.language.think_language
- {{BASE_DIR}} → config.paths.base_dir
- {{LAST_UPDATED}} → new Date().toISOString().split('T')[0]
- {{OBJECTIVES}} → 特殊处理，渲染成 Markdown 列表
- {{ASSUMPTIONS}} → 特殊处理，渲染成 Markdown 列表
```

#### 任务 3.3: 验证器
```typescript
位置: packages/claude-memory-init/src/core/validator.ts

功能:
1. validateRequiredFields(config: FullConfig): string[]
   - 检查所有必填字段
   - 返回缺失字段列表

2. validatePaths(config: FullConfig): boolean
   - 验证 paths.codebase 是否存在
   - 验证 paths.base_dir 是否合法

3. validateTemplateRendering(content: string): boolean
   - 检查是否还有未替换的 {{VARIABLE}}
   - 返回验证结果

4. validateMemorySystemStructure(baseDir: string): boolean
   - 检查记忆系统目录结构是否完整
   - 验证必需文件是否存在
```

#### 任务 3.4: 初始化器
```typescript
位置: packages/claude-memory-init/src/core/initializer.ts

功能:
1. initialize(config: FullConfig, targetDir: string): Promise<void>
   主流程:
   - Step 1: 验证配置
   - Step 2: 实例化 CLAUDE.md.template
   - Step 3: 实例化 prompt/0.overview.md.template
   - Step 4: 初始化 memory/index/tags.json
   - Step 5: 初始化 memory/index/topics.json
   - Step 6: 复制 CLAUDE.md 到根目录
   - Step 7: 更新 .gitignore
   - Step 8: 验证结果
   - Step 9: 输出成功报告

2. instantiateTemplate(templatePath: string, outputPath: string, config: FullConfig): Promise<void>
   - 加载模板
   - 渲染模板
   - 写入输出文件
   - 验证输出

3. updateIndexFiles(baseDir: string, date: string): Promise<void>
   - 更新 tags.json 的 updated 字段
   - 更新 topics.json 的 updated 字段

4. updateGitignore(projectRoot: string): Promise<void>
   - 检查 .gitignore 是否存在
   - 追加或创建 claude/temp/ 忽略规则
   - 避免重复添加
```

---

### Phase 4: 工具函数 (10 分钟)

#### 任务 4.1: 文件操作工具
```typescript
位置: packages/claude-memory-init/src/utils/file-ops.ts

功能:
1. ensureDir(path: string): Promise<void>
   - 确保目录存在，不存在则创建

2. copyFile(src: string, dest: string): Promise<void>
   - 复制文件

3. readFile(path: string): Promise<string>
   - 读取文件内容

4. writeFile(path: string, content: string): Promise<void>
   - 写入文件内容

5. fileExists(path: string): Promise<boolean>
   - 检查文件是否存在

6. findClaudeDir(startPath: string): string | null
   - 从指定路径向上查找 claude/ 目录
   - 返回 claude/ 目录的绝对路径
```

#### 任务 4.2: 日志工具
```typescript
位置: packages/claude-memory-init/src/utils/logger.ts

功能:
1. info(message: string): void
   - 输出信息（蓝色）

2. success(message: string): void
   - 输出成功消息（绿色）

3. error(message: string): void
   - 输出错误消息（红色）

4. warning(message: string): void
   - 输出警告消息（黄色）

5. step(stepNumber: number, message: string): void
   - 输出步骤信息

使用 chalk 库实现颜色输出
```

#### 任务 4.3: 日期工具
```typescript
位置: packages/claude-memory-init/src/utils/date-utils.ts

功能:
1. getCurrentDate(): string
   - 返回 YYYY-MM-DD 格式的当前日期

2. formatDate(date: Date): string
   - 格式化日期为 YYYY-MM-DD
```

---

### Phase 5: 交互式提示 (15 分钟)

#### 任务 5.1: 项目信息提示
```typescript
位置: packages/claude-memory-init/src/prompts/project-info.ts

功能:
1. promptProjectInfo(): Promise<ProjectConfig>
   使用 inquirer 提示用户输入:
   - 项目名称 (text input, required)
   - 项目类型 (list: 提供常见选项 + Other)
   - 项目描述 (text input, required)

2. promptLanguageConfig(): Promise<LanguageConfig>
   使用 inquirer 提示用户输入:
   - 用户语言 (list: Chinese, English, Japanese, Korean, Other)
   - 思考语言 (list: English (推荐), Chinese, Other, default: English)

3. promptPathsConfig(projectRoot: string): Promise<PathsConfig>
   使用 inquirer 提示用户输入:
   - base_dir (default: "claude")
   - codebase (default: projectRoot, 自动检测)
```

#### 任务 5.2: 目标配置提示
```typescript
位置: packages/claude-memory-init/src/prompts/objectives.ts

功能:
1. promptObjectives(): Promise<Objective[]>
   循环提示用户添加目标:
   - objective (text input)
   - memory_check (text input)
   - memory_update (text input)
   - 询问是否继续添加（至少 1 个，最多 5 个）

2. promptAssumptions(): Promise<string[]>
   循环提示用户添加假设:
   - assumption (text input)
   - 询问是否继续添加（至少 1 个）

3. promptDomainTerms(): Promise<string[]>
   可选：提示用户添加领域术语
```

---

### Phase 6: CLI 接口 (10 分钟)

#### 任务 6.1: 命令行接口
```typescript
位置: packages/claude-memory-init/src/cli.ts

功能:
使用 commander 定义 CLI 接口:

命令:
1. init [options]
   选项:
   --config <path>     从指定配置文件初始化
   --interactive       交互式模式
   --quick             快速模式（使用默认值）
   --target <path>     目标目录（默认：当前目录）

2. validate [options]
   选项:
   --config <path>     验证配置文件

3. --version
   显示版本

4. --help
   显示帮助

示例用法:
# 从 config.yaml 初始化
pnpm dlx @claude-memory/init init --config ./claude/config.yaml

# 交互式初始化
pnpm dlx @claude-memory/init init --interactive

# 快速初始化（使用默认值）
pnpm dlx @claude-memory/init init --quick

# 验证配置
pnpm dlx @claude-memory/init validate --config ./claude/config.yaml
```

#### 任务 6.2: 主入口
```typescript
位置: packages/claude-memory-init/src/index.ts

功能:
1. #!/usr/bin/env node (shebang)
2. 导入 cli
3. 执行 cli.parse(process.argv)
4. 全局错误处理
```

---

### Phase 7: 主流程实现 (15 分钟)

#### 任务 7.1: 配置模式流程
```typescript
在 src/cli.ts 中实现:

async function initFromConfig(configPath: string, targetDir: string) {
  // 1. 显示欢迎信息
  logger.info('🚀 Claude Memory System Initializer')

  // 2. 加载配置
  const spinner = ora('Loading configuration...').start()
  const config = await loadConfigFromYaml(configPath)
  spinner.succeed('Configuration loaded')

  // 3. 验证配置
  spinner.start('Validating configuration...')
  const validation = validateConfig(config)
  if (!validation.valid) {
    spinner.fail('Configuration validation failed')
    logger.error(validation.errors.join('\n'))
    process.exit(1)
  }
  spinner.succeed('Configuration validated')

  // 4. 执行初始化
  spinner.start('Initializing memory system...')
  await initialize(config, targetDir)
  spinner.succeed('Memory system initialized')

  // 5. 显示成功信息
  logger.success('✅ Initialization complete!')
  logger.info('Next steps:')
  logger.info('  1. Review the generated CLAUDE.md')
  logger.info('  2. Start using the memory system')
}
```

#### 任务 7.2: 交互式模式流程
```typescript
在 src/cli.ts 中实现:

async function initInteractive(targetDir: string) {
  logger.info('🚀 Claude Memory System Initializer (Interactive Mode)')

  // 1. 提示用户输入项目信息
  const projectInfo = await promptProjectInfo()
  const languageConfig = await promptLanguageConfig()
  const pathsConfig = await promptPathsConfig(targetDir)

  // 2. 提示用户输入目标
  const objectives = await promptObjectives()
  const assumptions = await promptAssumptions()

  // 3. 组装配置
  const config: FullConfig = {
    project: projectInfo,
    language: languageConfig,
    paths: pathsConfig,
    objectives,
    assumptions,
    // ... 其他默认配置
  }

  // 4. 保存配置到 config.yaml
  const configPath = path.join(targetDir, 'claude', 'config.yaml')
  await writeFile(configPath, yaml.stringify(config))
  logger.success('Configuration saved to config.yaml')

  // 5. 执行初始化
  await initialize(config, targetDir)

  logger.success('✅ Initialization complete!')
}
```

#### 任务 7.3: 快速模式流程
```typescript
在 src/cli.ts 中实现:

async function initQuick(targetDir: string) {
  logger.info('🚀 Claude Memory System Initializer (Quick Mode)')

  // 1. 使用默认配置
  const config: FullConfig = {
    project: {
      name: path.basename(targetDir),
      type: 'Multi-language Repository',
      description: 'Code analysis and documentation project'
    },
    language: {
      user_language: 'English',
      think_language: 'English'
    },
    paths: {
      base_dir: 'claude',
      codebase: targetDir
    },
    objectives: [
      {
        objective: 'Analyze and document the codebase architecture',
        memory_check: 'Query semantic notes for architecture patterns',
        memory_update: 'Create semantic notes for architectural discoveries'
      }
    ],
    assumptions: [
      'The codebase structure will be analyzed incrementally'
    ],
    // ... 其他默认配置
  }

  // 2. 执行初始化
  await initialize(config, targetDir)

  logger.success('✅ Quick initialization complete!')
  logger.info('You can customize config.yaml and re-run init if needed.')
}
```

---

### Phase 8: 构建和测试 (10 分钟)

#### 任务 8.1: 构建 CLI
```bash
在 packages/claude-memory-init/ 目录下执行:

# 安装依赖
pnpm install

# 编译 TypeScript
pnpm run build

# 验证构建产物
ls -la dist/
# 应该看到: index.js, cli.js, core/, prompts/, utils/, types/
```

#### 任务 8.2: 本地测试
```bash
# 方式 1: 使用 pnpm link（推荐用于开发）
cd packages/claude-memory-init
pnpm link --global

cd /home/dai/code/code-analysis-demo
pnpm dlx @claude-memory/init init --config ./claude/config.yaml

# 方式 2: 直接执行（用于快速测试）
cd /home/dai/code/code-analysis-demo
node packages/claude-memory-init/dist/index.js init --config ./claude/config.yaml

# 方式 3: 使用 pnpm --filter（monorepo 场景）
pnpm --filter @claude-memory/init start -- init --config ./claude/config.yaml
```

#### 任务 8.3: 验证输出
```bash
检查以下文件是否正确生成:

1. claude/CLAUDE.md
   - 检查是否没有 {{VARIABLE}} 残留
   - 检查项目名称是否正确

2. claude/prompt/0.overview.md
   - 检查变量是否全部替换
   - 检查 objectives 是否正确渲染

3. claude/memory/index/tags.json
   - 检查 updated 字段是否为今天日期

4. claude/memory/index/topics.json
   - 检查 updated 字段是否为今天日期

5. CLAUDE.md (项目根目录)
   - 检查是否成功复制

6. .gitignore
   - 检查是否包含 claude/temp/
```

---

### Phase 9: 文档和收尾 (10 分钟)

#### 任务 9.1: 创建 CLI README
```markdown
位置: packages/claude-memory-init/README.md

内容:
# Claude Memory System Initializer

## Installation

pnpm dlx @claude-memory/init init --config ./claude/config.yaml

## Usage

### From Config File (Recommended)
1. Edit claude/config.yaml
2. Run: pnpm dlx @claude-memory/init init

### Interactive Mode
pnpm dlx @claude-memory/init init --interactive

### Quick Mode
pnpm dlx @claude-memory/init init --quick

## Commands

- init: Initialize memory system
- validate: Validate config file

## Options

--config <path>: Path to config.yaml
--interactive: Interactive mode
--quick: Quick mode with defaults
--target <path>: Target directory
```

#### 任务 9.2: 更新项目 .gitignore
```bash
位置: /home/dai/code/code-analysis-demo/.gitignore

添加:
# CLI tool build output
packages/**/dist/
packages/**/node_modules/
```

#### 任务 9.3: 创建 CLI 使用说明
```markdown
位置: claude/docs/CLI-USAGE.md

内容: CLI 工具的详细使用说明
```

---

## 执行清单（用于沙箱执行）

### 步骤 1: 创建目录结构
```bash
mkdir -p packages/claude-memory-init/src/{core,prompts,utils,types}
```

### 步骤 2: 创建配置文件
- [ ] packages/claude-memory-init/package.json
- [ ] packages/claude-memory-init/tsconfig.json

### 步骤 3: 创建类型定义
- [ ] src/types/config.ts

### 步骤 4: 实现核心功能
- [ ] src/core/config-loader.ts
- [ ] src/core/template-engine.ts
- [ ] src/core/validator.ts
- [ ] src/core/initializer.ts

### 步骤 5: 实现工具函数
- [ ] src/utils/file-ops.ts
- [ ] src/utils/logger.ts
- [ ] src/utils/date-utils.ts

### 步骤 6: 实现交互式提示
- [ ] src/prompts/project-info.ts
- [ ] src/prompts/objectives.ts

### 步骤 7: 实现 CLI 接口
- [ ] src/cli.ts
- [ ] src/index.ts

### 步骤 8: 构建和测试
- [ ] pnpm install
- [ ] pnpm run build
- [ ] 本地测试

### 步骤 9: 文档
- [ ] packages/claude-memory-init/README.md
- [ ] 更新项目 .gitignore

---

## 关键设计决策

### 1. 隔离性保证
- ✅ CLI 工具放在 `packages/` 独立目录
- ✅ 不修改 `claude/` 记忆系统的任何文件（除了生成配置和实例）
- ✅ 使用相对路径查找 `claude/` 目录
- ✅ 所有依赖仅在 CLI 包内

### 2. 可执行方式
- ✅ `pnpm dlx @claude-memory/init` (发布后)
- ✅ `node packages/claude-memory-init/dist/index.js` (本地开发)
- ✅ `pnpm link` 用于本地调试

### 3. 模板变量处理
- ✅ 简单变量：直接字符串替换
- ✅ 复杂变量（objectives, assumptions）：格式化为 Markdown 列表
- ✅ 日期变量：自动生成当前日期

### 4. 错误处理
- ✅ 配置验证失败：显示详细错误并退出
- ✅ 文件操作失败：显示错误并回滚（如可能）
- ✅ 模板渲染失败：显示未替换的变量并退出

---

## 预期时间

- Phase 1: 10 分钟（结构搭建）
- Phase 2: 5 分钟（类型定义）
- Phase 3: 30 分钟（核心功能）
- Phase 4: 10 分钟（工具函数）
- Phase 5: 15 分钟（交互式提示）
- Phase 6: 10 分钟（CLI 接口）
- Phase 7: 15 分钟（主流程）
- Phase 8: 10 分钟（构建测试）
- Phase 9: 10 分钟（文档）

**总计**: 约 115 分钟（~2 小时）

---

## 成功标准

- [ ] CLI 可以通过 `pnpm dlx` 或 `node dist/index.js` 执行
- [ ] 从 `config.yaml` 读取配置并正确初始化
- [ ] 交互式模式可以引导用户完成配置
- [ ] 所有模板变量正确替换（无 `{{VARIABLE}}` 残留）
- [ ] 索引文件日期正确更新
- [ ] CLAUDE.md 正确复制到根目录
- [ ] .gitignore 正确更新
- [ ] 不干扰 claude/ 记忆系统现有文件
- [ ] 不污染主项目依赖

---

## 附录：详细代码示例

### A. 类型定义示例 (config.ts)

```typescript
export interface ProjectConfig {
  name: string;
  type: string;
  description: string;
}

export interface LanguageConfig {
  user_language: string;
  think_language: string;
}

export interface PathsConfig {
  base_dir: string;
  codebase: string;
}

export interface Objective {
  objective: string;
  memory_check: string;
  memory_update: string;
}

export interface DomainConfig {
  terms: string[];
  evidence: string[];
  external_sources: string[];
}

export interface TasksConfig {
  use_task_specific_indexes: boolean;
  use_incremental_work: boolean;
  max_context_per_step: number;
  max_task_context: number;
  hygiene_cycle_frequency: number;
}

export interface OutputConfig {
  format: string;
  include_diagrams: boolean;
  diagram_types: string[];
  code_reference_format: string;
}

export interface GitConfig {
  ai_git_operations: boolean;
  ignore_patterns: string[];
}

export interface AdvancedConfig {
  max_tags: number;
  max_topics: number;
  max_cross_refs: number;
  target_context_reduction: number;
  target_index_lookup_time: number;
}

export interface FullConfig {
  project: ProjectConfig;
  language: LanguageConfig;
  paths: PathsConfig;
  objectives: Objective[];
  assumptions: string[];
  domain: DomainConfig;
  tasks: TasksConfig;
  output: OutputConfig;
  git: GitConfig;
  advanced: AdvancedConfig;
  custom?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### B. 模板引擎核心逻辑示例

```typescript
export function renderTemplate(template: string, config: FullConfig): string {
  let result = template;

  // 简单变量替换
  const simpleVars: Record<string, string> = {
    '{{PROJECT_NAME}}': config.project.name,
    '{{PROJECT_TYPE}}': config.project.type,
    '{{PROJECT_DESCRIPTION}}': config.project.description,
    '{{USER_LANGUAGE}}': config.language.user_language,
    '{{THINK_LANGUAGE}}': config.language.think_language,
    '{{BASE_DIR}}': config.paths.base_dir,
    '{{LAST_UPDATED}}': new Date().toISOString().split('T')[0],
  };

  for (const [key, value] of Object.entries(simpleVars)) {
    result = result.replaceAll(key, value);
  }

  // 复杂变量：objectives
  if (result.includes('{{OBJECTIVES}}')) {
    const objectivesMarkdown = renderObjectives(config.objectives);
    result = result.replaceAll('{{OBJECTIVES}}', objectivesMarkdown);
  }

  // 复杂变量：assumptions
  if (result.includes('{{ASSUMPTIONS}}')) {
    const assumptionsMarkdown = config.assumptions
      .map(a => `- ${a}`)
      .join('\n');
    result = result.replaceAll('{{ASSUMPTIONS}}', assumptionsMarkdown);
  }

  return result;
}

function renderObjectives(objectives: Objective[]): string {
  return objectives.map(obj => `
- ${obj.objective}
  - ⚠️ **Memory check required**: ${obj.memory_check}
  - ⚠️ **Memory update required**: ${obj.memory_update}
  `.trim()).join('\n\n');
}
```

### C. 初始化器主流程示例

```typescript
export async function initialize(config: FullConfig, targetDir: string): Promise<void> {
  const baseDir = path.join(targetDir, config.paths.base_dir);
  const currentDate = getCurrentDate();

  // Step 1: 验证配置
  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
  }

  // Step 2: 实例化 CLAUDE.md.template
  await instantiateTemplate(
    path.join(baseDir, 'CLAUDE.md.template'),
    path.join(baseDir, 'CLAUDE.md'),
    config
  );

  // Step 3: 实例化 prompt/0.overview.md.template
  await instantiateTemplate(
    path.join(baseDir, 'prompt', '0.overview.md.template'),
    path.join(baseDir, 'prompt', '0.overview.md'),
    config
  );

  // Step 4-5: 初始化索引文件
  await updateIndexFiles(baseDir, currentDate);

  // Step 6: 复制 CLAUDE.md 到根目录
  await copyFile(
    path.join(baseDir, 'CLAUDE.md'),
    path.join(targetDir, 'CLAUDE.md')
  );

  // Step 7: 更新 .gitignore
  await updateGitignore(targetDir);

  // Step 8: 验证结果
  await validateResult(baseDir, targetDir);
}
```

---

**工作计划版本**: 1.0.0
**创建日期**: 2025-10-30
**预计执行时间**: 2 小时
**难度等级**: 中等
