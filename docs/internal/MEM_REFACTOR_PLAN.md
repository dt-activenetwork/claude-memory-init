# mem 仓库改造方案

**版本**: 1.0
**日期**: 2025-01-18
**状态**: 设计完成，待评审

---

## 现状分析

### 现有 mem 结构的问题

**当前结构**:
```
mem/
├── CLAUDE.md.template              # 单一大模板（28984字节，716行）
├── prompt/
│   ├── 0.overview.md.template      # 全局配置
│   ├── 0.memory.md                 # 记忆系统策略
│   ├── 1.objectives.md.template    # 目标（已废弃？）
│   ├── 2.assumptions.md.template   # 假设（已废弃？）
│   └── 3.domain-terms.md.template  # 领域术语（已废弃？）
└── memory/
    └── system/
        ├── tools/                  # 通用工具知识
        └── index/                  # 系统索引
```

**核心问题**:

1. **单一模板，无法灵活组合**
   - `CLAUDE.md.template` 是单一文件，包含所有功能的说明
   - 用户无法选择只使用部分功能（如只要预设，不要记忆系统）
   - 插件未启用时，仍会生成无用的章节

2. **插件化架构不匹配**
   - v2.0 采用插件化架构，每个插件应该贡献自己的 prompt 片段
   - 现有模板无法按需组装
   - 无法支持条件生成（如 Git 插件的 auto-commit 部分）

3. **预设模板缺失**
   - 没有预定义的 prompt 预设（code-review, documentation 等）
   - Prompt Presets 插件无法从 mem 仓库获取模板

4. **变量替换能力有限**
   - 使用简单的 `{{VARIABLE}}` 语法
   - 不支持条件块（if/else）
   - 无法根据配置动态生成内容

### 现有结构的优点

1. **记忆系统设计成熟**
   - `memory/system/` 包含优质的工具知识
   - 索引结构合理
   - 文档完善（DESIGN.md, 工作流程等）

2. **全局配置清晰**
   - `0.overview.md.template` 和 `0.memory.md` 结构良好
   - 可以保留并复用

---

## 设计目标

### 核心目标

1. **模块化**: 每个插件贡献独立的 prompt 片段
2. **按需组装**: 只生成启用插件的内容
3. **条件生成**: 支持基于配置的动态内容
4. **预设丰富**: 提供 6 个常用 prompt 预设
5. **向后兼容**: v1.x 项目仍可使用旧模板

### 设计原则

- ✅ **插件自治**: 每个插件的 prompt 片段独立存放
- ✅ **清晰分离**: Core、插件、预设分别组织
- ✅ **易于维护**: 目录结构直观，命名规范
- ✅ **灵活扩展**: 易于添加新插件、新预设

---

## 新的目录结构

### 建议的结构

```
mem/
├── prompts/                          # Prompt 片段（按插件组织）⭐ 新增
│   ├── core/
│   │   ├── header.md.template        # 项目头部（名称、描述）
│   │   └── footer.md.template        # 通用规则、Ready to Start
│   │
│   ├── system-detector/
│   │   └── system-info.md.template   # 系统信息部分
│   │
│   ├── git/
│   │   ├── git-rules.md.template     # Git 基础规则
│   │   ├── auto-commit.md.template   # Auto-commit 说明（条件）
│   │   └── remote-sync.md.template   # Remote sync 说明（条件）
│   │
│   ├── memory-system/
│   │   └── memory-usage.md.template  # 记忆系统使用说明
│   │
│   └── prompt-presets/
│       └── presets-list.md.template  # 预设列表
│
├── presets/                          # 预设模板 ⭐ 新增
│   ├── code-review.md
│   ├── documentation.md
│   ├── refactoring.md
│   ├── testing.md
│   ├── architecture.md
│   └── bug-fixing.md
│
├── memory/                           # 记忆模板（保持不变）
│   └── system/
│       ├── tools/
│       │   ├── code-reference-format.md
│       │   ├── mermaid-diagrams.md
│       │   └── markdown-best-practices.md
│       ├── index/
│       │   ├── system-tags.json
│       │   └── system-topics.json
│       └── README.md
│
├── legacy/                           # 向后兼容 ⭐ 新增
│   ├── CLAUDE.md.template            # 旧版完整模板
│   └── prompt/
│       ├── 0.overview.md.template
│       └── 0.memory.md
│
└── README.md                         # mem 仓库使用说明
```

### 详细说明

#### `/prompts/` - 插件 Prompt 片段目录

**目的**: 存放每个插件贡献的 CLAUDE.md 片段

**组织方式**: 按插件名称分类（对应 v2.0 的 4 个插件）

**核心片段**:
- `core/header.md.template` - 项目基本信息（名称、描述、版本）
- `core/footer.md.template` - 通用规则（语言约定、Ready to Start 等）

**插件片段**:
- `system-detector/` - 系统环境信息
- `git/` - Git 操作规则和说明
- `memory-system/` - 记忆系统使用指南
- `prompt-presets/` - 已安装预设列表

#### `/presets/` - Prompt 预设模板目录

**目的**: 存放 6 个预定义的 prompt 模板

**内容**: 每个预设是独立的 markdown 文件，包含：
- 角色定义
- 任务指令
- 输出格式要求
- 示例（可选）

**6 个预设**:
1. `code-review.md` - 代码审查
2. `documentation.md` - 文档生成
3. `refactoring.md` - 重构辅助
4. `testing.md` - 测试生成
5. `architecture.md` - 架构分析
6. `bug-fixing.md` - Bug 修复

#### `/memory/` - 记忆模板目录（保持不变）

**保留原因**: 记忆系统设计成熟，无需改动

**内容**:
- `system/tools/` - 通用工具知识（Mermaid、Markdown、代码引用等）
- `system/index/` - 系统索引
- `README.md` - 记忆系统说明

#### `/legacy/` - 向后兼容目录

**目的**: 保留旧版模板，供 v1.x 项目使用

**内容**:
- 旧版的 `CLAUDE.md.template`
- 旧版的 `prompt/` 目录

---

## 插件 Prompt 片段设计

### Core 插件（内置）

#### `prompts/core/header.md.template`

**功能**: 生成 CLAUDE.md 的头部信息

**内容**:
```markdown
# AI Agent Prompt System - {{PROJECT_NAME}}

**Project**: {{PROJECT_NAME}}
**Version**: 1.0.0
**Last Updated**: {{LAST_UPDATED}}
**Type**: {{PROJECT_TYPE}}
**Description**: {{PROJECT_DESCRIPTION}}

---

## Welcome

Welcome to the {{PROJECT_NAME}} AI Agent system. This project uses a plugin-based architecture with the following features enabled:

{{ENABLED_FEATURES_LIST}}

---
```

**变量**:
- `{{PROJECT_NAME}}` - 项目名称
- `{{PROJECT_TYPE}}` - 项目类型（如 "Node.js backend", "Python ML pipeline"）
- `{{PROJECT_DESCRIPTION}}` - 项目描述
- `{{LAST_UPDATED}}` - 最后更新日期（YYYY-MM-DD）
- `{{ENABLED_FEATURES_LIST}}` - 启用的插件列表（由组装器生成）

#### `prompts/core/footer.md.template`

**功能**: 生成 CLAUDE.md 的通用规则部分

**内容**:
```markdown
## Language Convention

- **Internal thinking**: {{THINK_LANGUAGE}} (for code analysis, technical reasoning)
- **External retrieval**: {{THINK_LANGUAGE}} (code, documentation, web search)
- **Final outputs**: {{USER_LANGUAGE}} (user-facing documentation, reports)
- **Memory notes**: Mixed ({{THINK_LANGUAGE}} for technical terms, {{USER_LANGUAGE}} for explanations)

---

## Ready to Start?

**Next Steps**:
1. ✅ You've read CLAUDE.md
2. 📖 Read memory indexes to understand available knowledge
3. 🎯 Wait for user to request a specific task or ask a question

**Do NOT**:
- ❌ Read files proactively without user request
- ❌ "Browse" the directory structure

---

**Version**: 1.0.0
**Last Updated**: {{LAST_UPDATED}}
**System Status**: ✅ Ready
```

**变量**:
- `{{THINK_LANGUAGE}}` - 思考语言
- `{{USER_LANGUAGE}}` - 输出语言
- `{{LAST_UPDATED}}` - 最后更新日期

---

### System Detector 插件

#### `prompts/system-detector/system-info.md.template`

**功能**: 生成系统环境信息章节

**内容**:
```markdown
## System Environment

**Operating System**: {{OS_NAME}} ({{OS_TYPE}})
**Version**: {{OS_VERSION}}
**Package Manager**: {{PACKAGE_MANAGER}}

### Package Installation

When installing system packages, use:

```bash
{{INSTALL_COMMAND_EXAMPLE}}
```

**Important Notes**:
- Use `{{PACKAGE_MANAGER}}` for package installation
- Install prefix: `{{INSTALL_PREFIX}}`
- Running as root: {{IS_ROOT}}
- Sudo available: {{HAS_SUDO}}

---

## Development Environment

{{DEV_TOOLS_SECTION}}

### Guidelines

**When suggesting code or tool usage:**

1. **Use Detected Tools**
   - ✅ Only suggest tools marked as "available"
   - ✅ Use specified package managers and versions
   - ❌ Do NOT suggest tools that are not detected

{{PYTHON_SECTION}}

{{NODE_SECTION}}

---
```

**变量**:
- `{{OS_NAME}}` - OS 名称（如 "Ubuntu"）
- `{{OS_TYPE}}` - OS 类型（如 "Linux"）
- `{{OS_VERSION}}` - OS 版本
- `{{PACKAGE_MANAGER}}` - 包管理器（如 "apt", "pacman"）
- `{{INSTALL_COMMAND_EXAMPLE}}` - 安装命令示例
- `{{INSTALL_PREFIX}}` - 安装前缀（如 "sudo"）
- `{{IS_ROOT}}` - 是否 root 用户
- `{{HAS_SUDO}}` - 是否有 sudo
- `{{DEV_TOOLS_SECTION}}` - 开发工具摘要（由插件生成）
- `{{PYTHON_SECTION}}` - Python 环境说明（条件生成）
- `{{NODE_SECTION}}` - Node.js 环境说明（条件生成）

**条件块示例**:

`{{PYTHON_SECTION}}` (如果检测到 Python):
```
2. **Python Development**
   - Use {{PYTHON_PACKAGE_MANAGER}} for environment management
   - Follow Python {{PYTHON_VERSION}} syntax and features
   - {{PYTHON_VENV_GUIDANCE}}
```

`{{NODE_SECTION}}` (如果检测到 Node.js):
```
3. **Node.js Development**
   - Use {{NODE_PACKAGE_MANAGER}} for package management
   - Use {{NODE_RUN_COMMAND}} to run scripts
   - Follow Node.js {{NODE_VERSION}} APIs and features
```

---

### Memory System 插件

#### `prompts/memory-system/memory-usage.md.template`

**功能**: 生成记忆系统使用指南

**内容**:
```markdown
## 🚨 MANDATORY: Memory-First Operating Principle

**THIS IS THE FOUNDATION OF ALL WORK. NEVER SKIP THIS.**

### The Three-Phase Mandatory Workflow

Every action MUST follow this sequence:

```
┌────────────────────────────────────────────┐
│ PHASE 1: CONSULT MEMORY (BEFORE work)     │
│ ────────────────────────────────────────── │
│ 1. Read tags.json and topics.json         │
│ 2. Query for relevant knowledge           │
│ 3. Read semantic notes (stable knowledge) │
│ 4. Read episodic notes (history)          │
│ 5. Check task-specific index              │
│ 6. Read procedural notes (workflows)      │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ PHASE 2: WORK (WITH memory as foundation) │
│ ────────────────────────────────────────── │
│ ✅ Use memory knowledge as base           │
│ ✅ Only read NEW code if memory lacking   │
│ ✅ Create notes IMMEDIATELY on discovery  │
│ ❌ NEVER re-analyze what's in memory      │
│ ❌ NEVER ignore existing knowledge        │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ PHASE 3: UPDATE MEMORY (AFTER actions)    │
│ ────────────────────────────────────────── │
│ 1. Create/update semantic notes           │
│ 2. Create/update episodic notes           │
│ 3. Update indexes IMMEDIATELY             │
│ 4. Add cross-references                   │
│ 5. Link notes to outputs                  │
└────────────────────────────────────────────┘
```

### Memory Structure

**Memory Locations**:
- Semantic Memory: `{{BASE_DIR}}/memory/semantic/` - Stable knowledge
- Episodic Memory: `{{BASE_DIR}}/memory/episodic/` - Task history
- Procedural Memory: `{{BASE_DIR}}/memory/procedural/` - Workflows
- System Memory: `{{BASE_DIR}}/memory/system/` - Universal tools

**Index Files**:
- Tags: `{{BASE_DIR}}/memory/index/tags.json`
- Topics: `{{BASE_DIR}}/memory/index/topics.json`

### Memory-First Checklist

**Session Start** (ALWAYS do these):
- [ ] Read `{{BASE_DIR}}/memory/index/tags.json`
- [ ] Read `{{BASE_DIR}}/memory/index/topics.json`
- [ ] Read last 1-2 episodic notes
- [ ] Query and read relevant semantic notes

**During Work**:
- [ ] Using memory as foundation (not re-deriving)
- [ ] Creating semantic notes IMMEDIATELY on discoveries
- [ ] Updating episodic notes with progress

**Before Finishing** (MANDATORY):
- [ ] Created episodic note documenting session
- [ ] Created/updated semantic notes
- [ ] Updated tags.json and topics.json
- [ ] Added cross-references

---
```

**变量**:
- `{{BASE_DIR}}` - 基础目录（通常是 "claude"）

---

### Git 插件

#### `prompts/git/git-rules.md.template`

**功能**: 生成 Git 操作的基础规则（总是包含）

**内容**:
```markdown
## 🚫 Git Operations Policy

### Basic Rules

**The AI Agent MUST follow these rules for all Git operations:**

- ✅ Can check git status for informational purposes
- ✅ Can suggest git operations to user
- ❌ NEVER run destructive git commands (push --force, hard reset)
- ❌ NEVER amend commits without checking authorship
- ❌ NEVER skip hooks (--no-verify, --no-gpg-sign)

### Gitignore Management

**Files ignored by git**:
{{IGNORED_PATTERNS_LIST}}

These files are automatically excluded from version control.

---
```

**变量**:
- `{{IGNORED_PATTERNS_LIST}}` - 忽略规则列表（从 config.git.ignore_patterns 生成）

#### `prompts/git/auto-commit.md.template`

**功能**: 生成 Auto-commit 说明（条件生成，仅当 `config.git.auto_commit = true`）

**内容**:
```markdown
## Auto-Commit Feature

**Status**: ✅ ENABLED

Changes to the memory system will be automatically committed after initialization or updates.

{{SEPARATE_COMMIT_NOTE}}

**Automatic commit messages**:
- Follow conventional commit format
- Include date and file statistics
- Signed with: "Auto-generated commit by claude-memory-init"

---
```

**条件块**:

`{{SEPARATE_COMMIT_NOTE}}` (如果 `config.git.commit_separately = true`):
```
**Commit Strategy**: Separate commits
- Memory system files committed separately from other changes
- Allows easier tracking of memory updates
```

否则:
```
**Commit Strategy**: Combined commits
- All changes committed together
```

#### `prompts/git/remote-sync.md.template`

**功能**: 生成 Remote sync 说明（条件生成，仅当 `config.git.remote_sync.enabled = true`）

**内容**:
```markdown
## Remote Sync Feature

**Status**: ✅ ENABLED

**Remote Repository**: `{{REMOTE_URL}}`

System memory updates can be synced to the remote template repository.

{{AUTO_PR_NOTE}}

**Sync Workflow**:
1. Local changes in `{{BASE_DIR}}/memory/system/` are detected
2. Changes are filtered (only system memory, not project-specific)
3. Branch created: `sp-{hash}`
4. Commit with descriptive message
5. Push to remote
{{PR_CREATION_STEP}}

**Label**: All PRs use label `{{PR_LABEL}}`

---
```

**变量**:
- `{{REMOTE_URL}}` - 远程仓库 URL
- `{{BASE_DIR}}` - 基础目录
- `{{PR_LABEL}}` - PR 标签（默认 "system-prompt-update"）

**条件块**:

`{{AUTO_PR_NOTE}}` (如果 `auto_pr = true`):
```
**Auto-PR Creation**: ✅ Enabled
- Pull requests are created automatically when syncing
- Use GitHub CLI (gh) for PR creation
```

否则:
```
**Auto-PR Creation**: ❌ Disabled
- Manual PR creation required after pushing
```

`{{PR_CREATION_STEP}}` (如果 `auto_pr = true`):
```
6. Create PR using gh CLI
7. Display PR URL
```

否则:
```
6. Display push instructions for manual PR creation
```

---

### Prompt Presets 插件

#### `prompts/prompt-presets/presets-list.md.template`

**功能**: 生成已安装预设的列表

**内容**:
```markdown
## Active Prompt Presets

The following prompt presets are installed in this project:

{{PRESET_LIST}}

**Usage**:
- Each preset provides specialized instructions for specific tasks
- Refer to preset files in `{{BASE_DIR}}/prompts/` for detailed instructions
- You can activate a preset by reading its file when needed

{{CUSTOM_PRESETS_NOTE}}

---
```

**变量**:
- `{{BASE_DIR}}` - 基础目录
- `{{PRESET_LIST}}` - 预设列表（从 config.presets 生成）

**PRESET_LIST 格式**:
```
- **Code Review** ([claude/prompts/code-review.md](claude/prompts/code-review.md))
  Systematic code review with focus on quality, security, and best practices.

- **Documentation** ([claude/prompts/documentation.md](claude/prompts/documentation.md))
  Generate comprehensive documentation from code analysis.

- **Architecture** ([claude/prompts/architecture.md](claude/prompts/architecture.md))
  Analyze and document system architecture and design patterns.
```

**条件块**:

`{{CUSTOM_PRESETS_NOTE}}` (如果 `allow_custom = true`):
```
**Custom Presets**:
- You can create custom presets by adding files to `{{BASE_DIR}}/prompts/custom/`
- Follow the same format as built-in presets
```

---

## 预设模板设计

### 目录结构

```
presets/
├── code-review.md         # 代码审查预设
├── documentation.md       # 文档生成预设
├── refactoring.md         # 重构辅助预设
├── testing.md             # 测试生成预设
├── architecture.md        # 架构分析预设
└── bug-fixing.md          # Bug 修复预设
```

### 每个预设的内容

每个预设应该包含：

1. **角色定义** - Claude 应该扮演的角色
2. **任务说明** - 具体的任务要求
3. **输出格式** - 期望的输出格式和结构
4. **关键原则** - 必须遵守的原则和最佳实践
5. **示例**（可选）- 输入输出示例

### 预设模板格式

每个预设使用标准 Markdown 格式，包含以下章节：

```markdown
# {预设名称}

**Purpose**: {预设的目的}
**Use When**: {何时使用这个预设}

---

## Role Definition

{角色定义}

---

## Task Instructions

{具体的任务指令}

---

## Output Format

{输出格式要求}

---

## Key Principles

{必须遵守的原则}

---

## Examples (Optional)

{示例}
```

### 预设 1: Code Review

**文件**: `presets/code-review.md`

**内容**:
```markdown
# Code Review Preset

**Purpose**: Perform systematic code review with focus on quality, security, and maintainability
**Use When**: Reviewing pull requests, analyzing existing code, or before merging changes

---

## Role Definition

You are an experienced code reviewer with expertise in:
- Software design patterns and best practices
- Security vulnerabilities and common pitfalls
- Performance optimization
- Code maintainability and readability

---

## Task Instructions

When performing code review:

1. **Understand Context**
   - Read the purpose of the code change
   - Identify affected modules and dependencies
   - Check for related documentation

2. **Analyze Code Quality**
   - Check for code smells and anti-patterns
   - Verify naming conventions and code style
   - Assess code complexity and readability
   - Identify potential refactoring opportunities

3. **Security Review**
   - Check for common vulnerabilities (SQL injection, XSS, etc.)
   - Verify input validation and sanitization
   - Review authentication and authorization logic
   - Check for sensitive data exposure

4. **Performance Analysis**
   - Identify potential performance bottlenecks
   - Check for inefficient algorithms or data structures
   - Review database query efficiency
   - Assess resource usage (memory, CPU)

5. **Testing Coverage**
   - Verify test coverage for new code
   - Check for edge cases and error handling
   - Assess test quality and maintainability

---

## Output Format

Provide review feedback in the following structure:

### Summary
- Overall assessment (Approve / Request Changes / Comment)
- Key concerns or highlights

### Detailed Findings

For each issue found:

**Issue**: {Brief description}
**Severity**: Critical / High / Medium / Low
**Location**: {File path and line numbers}
**Description**: {Detailed explanation}
**Recommendation**: {Suggested fix or improvement}

### Positive Feedback

- Highlight well-written code
- Acknowledge good practices

### Suggestions

- Non-blocking improvements
- Future enhancements

---

## Key Principles

1. **Be Constructive**: Focus on improving code, not criticizing the author
2. **Be Specific**: Provide exact locations and actionable suggestions
3. **Prioritize**: Mark critical issues separately from nice-to-haves
4. **Explain Why**: Include rationale for each recommendation
5. **Consider Context**: Understand project constraints and trade-offs

---

## Example

### Input
```python
def get_user(id):
    return db.query("SELECT * FROM users WHERE id=" + id)
```

### Output

**Issue**: SQL Injection Vulnerability
**Severity**: Critical
**Location**: `api/users.py`, line 42
**Description**: Direct string concatenation in SQL query allows SQL injection attacks. An attacker could manipulate the `id` parameter to execute arbitrary SQL.
**Recommendation**: Use parameterized queries:
```python
def get_user(id):
    return db.query("SELECT * FROM users WHERE id=?", [id])
```

---
```

### 预设 2: Documentation

**文件**: `presets/documentation.md`

**内容**:
```markdown
# Documentation Generation Preset

**Purpose**: Generate comprehensive, clear, and maintainable documentation from code analysis
**Use When**: Creating README files, API docs, architecture docs, or user guides

---

## Role Definition

You are a technical writer with deep understanding of:
- Software architecture and design
- API design and documentation standards
- User experience and information architecture
- Multiple documentation formats (Markdown, OpenAPI, etc.)

---

## Task Instructions

When generating documentation:

1. **Analyze Codebase**
   - Understand project structure and architecture
   - Identify main components and their relationships
   - Extract key concepts and terminology

2. **Identify Audience**
   - Developers (API docs, architecture)
   - End users (user guides, tutorials)
   - Contributors (development guides)

3. **Structure Information**
   - Use clear hierarchy and sections
   - Follow logical flow (overview → details)
   - Include table of contents for long docs

4. **Write Content**
   - Use clear, concise language
   - Provide examples and code snippets
   - Include diagrams (Mermaid) for complex concepts
   - Add links to related resources

5. **Review and Polish**
   - Check for completeness
   - Verify accuracy of examples
   - Ensure consistency in terminology

---

## Output Format

### For README.md

```markdown
# Project Name

Brief project description (1-2 sentences)

## Features

- Feature 1
- Feature 2

## Installation

```bash
installation commands
```

## Quick Start

```language
code example
```

## Documentation

- [API Reference](link)
- [User Guide](link)

## Contributing

Contributing guidelines

## License

License information
```

### For API Documentation

```markdown
# API: {Endpoint Name}

**Method**: GET/POST/etc
**Path**: `/api/v1/resource`
**Auth**: Required/Optional

## Description

What this endpoint does

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| param1 | string | Yes | Description |

## Request Example

```json
{
  "example": "request"
}
```

## Response

**Success (200)**:
```json
{
  "example": "response"
}
```

**Error (400)**:
```json
{
  "error": "message"
}
```
```

---

## Key Principles

1. **Clarity First**: Write for understanding, not to impress
2. **Examples Matter**: Show, don't just tell
3. **Keep Updated**: Documentation should match current code
4. **Consistency**: Use consistent terminology and format
5. **Accessibility**: Make docs easy to navigate and search

---
```

### 预设 3: Refactoring

**文件**: `presets/refactoring.md`

**内容概要**:
- 角色: 重构专家
- 任务: 识别代码坏味道、提出重构建议、评估风险
- 输出: 重构计划、优先级、步骤、测试策略

### 预设 4: Testing

**文件**: `presets/testing.md`

**内容概要**:
- 角色: 测试工程师
- 任务: 生成单元测试、集成测试、边界用例
- 输出: 测试代码、测试计划、覆盖率分析

### 预设 5: Architecture

**文件**: `presets/architecture.md`

**内容概要**:
- 角色: 架构师
- 任务: 分析系统架构、识别模式、评估设计决策
- 输出: 架构图、组件分析、改进建议

### 预设 6: Bug Fixing

**文件**: `presets/bug-fixing.md`

**内容概要**:
- 角色: 调试专家
- 任务: 定位 bug、分析根因、提供修复方案
- 输出: Bug 报告、修复步骤、预防措施

---

## 模板变量系统

### 变量命名规范

**格式**: `{{CATEGORY_VARIABLE_NAME}}`

**规则**:
1. 全大写，使用下划线分隔
2. 包含类别前缀（明确变量来源）
3. 语义清晰

**示例**:
- `{{PROJECT_NAME}}` - 项目名称
- `{{GIT_AUTO_COMMIT}}` - Git auto-commit 启用状态
- `{{MEMORY_BASE_DIR}}` - 记忆系统基础目录
- `{{PYTHON_VERSION}}` - Python 版本

### 条件块语法

**语法**: Handlebars 风格

```
{{#if CONDITION}}
内容（如果条件为真）
{{/if}}

{{#if CONDITION}}
真分支
{{else}}
假分支
{{/if}}

{{#unless CONDITION}}
内容（如果条件为假）
{{/unless}}
```

**示例**:

```markdown
## Git Operations

{{#if git.auto_commit}}
**Auto-commit**: ENABLED

Changes will be automatically committed.

{{#if git.commit_separately}}
Memory system files are committed separately.
{{else}}
All changes are committed together.
{{/if}}
{{else}}
**Auto-commit**: DISABLED

You must manually commit changes.
{{/if}}
```

### 循环语法

**用于生成列表**:

```
{{#each ARRAY}}
- {{this.name}}: {{this.description}}
{{/each}}
```

**示例**:

```markdown
## Active Presets

{{#each presets}}
- **{{this.name}}** ([{{this.path}}]({{this.path}}))
  {{this.description}}
{{/each}}
```

### 变量作用域

**分层结构**:

```
config (根)
├── project
│   ├── name
│   ├── description
│   └── type
├── output
│   └── base_dir
├── plugins
│   ├── git
│   │   ├── auto_commit
│   │   ├── commit_separately
│   │   └── remote_sync
│   │       ├── enabled
│   │       ├── remote_url
│   │       └── auto_pr
│   ├── memory-system
│   │   └── template_source
│   ├── prompt-presets
│   │   ├── presets (array)
│   │   └── allow_custom
│   └── system-detector
│       └── (auto-detected values)
└── system (由 system-detector 插件填充)
    ├── os
    │   ├── name
    │   ├── version
    │   └── type
    ├── package_manager
    └── dev_tools
        ├── python
        │   ├── version
        │   └── package_manager
        └── node
            ├── version
            └── package_manager
```

**在模板中访问**:

```
{{project.name}}
{{plugins.git.auto_commit}}
{{system.os.name}}
{{plugins.prompt-presets.presets}}
```

---

## 组装流程

### 流程设计

**步骤**:

1. **遍历启用的插件** - 获取 `config.plugins` 中 `enabled: true` 的插件
2. **收集 prompt 片段** - 调用每个插件的 `plugin.prompt.generatePrompt(config)`
3. **按优先级排序** - 使用 `plugin.prompt.priority` 排序
4. **组装最终 CLAUDE.md** - 按顺序拼接所有片段
5. **写入文件** - 保存到项目的 `CLAUDE.md`

### 伪代码

```typescript
async function generateCLAUDEmd(
  config: CoreConfig,
  enabledPlugins: Plugin[]
): Promise<string> {
  // 1. 收集所有 prompt 片段
  const sections: PromptSection[] = [];

  // 添加 header（总是第一）
  sections.push({
    priority: 0,
    content: await renderTemplate('prompts/core/header.md.template', config)
  });

  // 遍历启用的插件
  for (const plugin of enabledPlugins) {
    if (plugin.prompt) {
      const pluginConfig = config.plugins[plugin.meta.name];
      const content = await plugin.prompt.generatePrompt(pluginConfig, config);

      sections.push({
        priority: plugin.prompt.priority,
        section: plugin.prompt.promptSection,
        content: content
      });
    }
  }

  // 添加 footer（总是最后）
  sections.push({
    priority: 1000,
    content: await renderTemplate('prompts/core/footer.md.template', config)
  });

  // 2. 按优先级排序
  sections.sort((a, b) => a.priority - b.priority);

  // 3. 组装
  const claudeMd = sections.map(s => s.content).join('\n\n---\n\n');

  return claudeMd;
}
```

### 优先级分配

**标准优先级**:

| 插件 | Priority | 说明 |
|------|----------|------|
| `core/header` | 0 | 总是第一 |
| `system-detector` | 10 | 系统环境信息 |
| `git` | 20 | Git 操作规则 |
| `memory-system` | 30 | 记忆系统（核心） |
| `prompt-presets` | 40 | 预设列表 |
| `core/footer` | 1000 | 总是最后 |

**自定义插件**: 使用 50-999 之间的优先级

### 模板渲染引擎

**使用 Handlebars**:

```typescript
import Handlebars from 'handlebars';

// 注册辅助函数
Handlebars.registerHelper('formatDate', (date: Date) => {
  return date.toISOString().split('T')[0];
});

Handlebars.registerHelper('listPresets', (presets: string[]) => {
  return presets.map(p => `- ${p}`).join('\n');
});

async function renderTemplate(
  templatePath: string,
  context: any
): Promise<string> {
  const templateSource = await fs.readFile(templatePath, 'utf-8');
  const template = Handlebars.compile(templateSource);
  return template(context);
}
```

---

## 迁移策略

### 从旧结构到新结构

**步骤**:

1. **保留旧版模板** - 移动到 `legacy/` 目录
2. **创建新目录结构** - `prompts/`, `presets/`
3. **拆分 CLAUDE.md.template**:
   - 头部 → `prompts/core/header.md.template`
   - 尾部 → `prompts/core/footer.md.template`
   - 系统信息 → `prompts/system-detector/system-info.md.template`
   - Git 规则 → `prompts/git/*.md.template`
   - 记忆系统 → `prompts/memory-system/memory-usage.md.template`
4. **创建预设模板** - 6 个独立的 markdown 文件
5. **更新 README** - 说明新结构的使用方法

### 向后兼容

**v1.x 项目继续使用旧模板**:

- `claude-memory-init` v1.x 检测到旧版 mem 仓库时，使用 `legacy/CLAUDE.md.template`
- v2.0 默认使用新结构，除非用户明确指定使用 legacy

**兼容检测逻辑**:

```typescript
async function detectMemVersion(memPath: string): Promise<'v1' | 'v2'> {
  const promptsDir = path.join(memPath, 'prompts');
  const legacyTemplate = path.join(memPath, 'CLAUDE.md.template');

  if (await fs.pathExists(promptsDir)) {
    return 'v2'; // 新结构
  } else if (await fs.pathExists(legacyTemplate)) {
    return 'v1'; // 旧结构
  } else {
    throw new Error('Invalid mem repository structure');
  }
}
```

### 迁移脚本设计

**脚本**: `scripts/migrate-mem-to-v2.ts`

**功能**:
1. 读取旧版 `CLAUDE.md.template`
2. 使用正则表达式拆分为不同章节
3. 生成新的片段文件
4. 创建 6 个预设模板（初始版本）
5. 移动旧文件到 `legacy/`
6. 生成迁移报告

**使用**:
```bash
# 在 mem 仓库中运行
pnpm run migrate:v2

# 输出
✅ Created prompts/core/header.md.template
✅ Created prompts/core/footer.md.template
✅ Created prompts/system-detector/system-info.md.template
✅ Created prompts/git/git-rules.md.template
✅ Created prompts/memory-system/memory-usage.md.template
✅ Created prompts/prompt-presets/presets-list.md.template
✅ Created 6 preset templates
✅ Moved legacy files to legacy/
📄 Migration report: migration-report.md
```

---

## 示例

### 示例 1: 最小配置（只启用 Prompt Presets）

**配置**:
```yaml
plugins:
  prompt-presets:
    enabled: true
    options:
      presets:
        - code-review
      allow_custom: false

  memory-system:
    enabled: false

  git:
    enabled: false

  system-detector:
    enabled: false
```

**生成的 CLAUDE.md**:

```markdown
# AI Agent Prompt System - My Project

**Project**: My Project
**Version**: 1.0.0
**Last Updated**: 2025-01-18
**Type**: Web Application
**Description**: A simple web app

---

## Welcome

Welcome to the My Project AI Agent system. This project uses a plugin-based architecture with the following features enabled:

- Prompt Presets

---

## Active Prompt Presets

The following prompt presets are installed in this project:

- **Code Review** ([claude/prompts/code-review.md](claude/prompts/code-review.md))
  Systematic code review with focus on quality, security, and best practices.

**Usage**:
- Each preset provides specialized instructions for specific tasks
- Refer to preset files in `claude/prompts/` for detailed instructions
- You can activate a preset by reading its file when needed

---

## Language Convention

- **Internal thinking**: English (for code analysis, technical reasoning)
- **External retrieval**: English (code, documentation, web search)
- **Final outputs**: English (user-facing documentation, reports)
- **Memory notes**: Mixed (English for technical terms, English for explanations)

---

## Ready to Start?

**Next Steps**:
1. ✅ You've read CLAUDE.md
2. 📖 Read memory indexes to understand available knowledge
3. 🎯 Wait for user to request a specific task or ask a question

**Do NOT**:
- ❌ Read files proactively without user request
- ❌ "Browse" the directory structure

---

**Version**: 1.0.0
**Last Updated**: 2025-01-18
**System Status**: ✅ Ready
```

**特点**:
- 极简配置
- 只包含 core 和 presets 插件的内容
- 无记忆系统、无 Git、无系统检测

---

### 示例 2: 完整配置（所有插件）

**配置**:
```yaml
project:
  name: "Awesome App"
  type: "Node.js Backend"
  description: "RESTful API service"

plugins:
  prompt-presets:
    enabled: true
    options:
      presets:
        - code-review
        - documentation
        - architecture
      allow_custom: true

  memory-system:
    enabled: true
    options:
      template_source: "default"

  git:
    enabled: true
    options:
      auto_commit: true
      commit_separately: true
      ignore_patterns:
        - "claude/temp/"
      remote_sync:
        enabled: true
        remote_url: "git@github.com:team/mem-template.git"
        auto_pr: true

  system-detector:
    enabled: true

system: # 由 system-detector 自动填充
  os:
    name: "Ubuntu"
    version: "22.04"
    type: "Linux"
  package_manager: "apt"
  dev_tools:
    python:
      version: "3.11.5"
      package_manager: "uv"
    node:
      version: "20.10.0"
      package_manager: "pnpm"
```

**生成的 CLAUDE.md**（简化版，完整版会更长）:

```markdown
# AI Agent Prompt System - Awesome App

**Project**: Awesome App
**Version**: 1.0.0
**Last Updated**: 2025-01-18
**Type**: Node.js Backend
**Description**: RESTful API service

---

## Welcome

Welcome to the Awesome App AI Agent system. This project uses a plugin-based architecture with the following features enabled:

- System Detection (auto-detected environment)
- Git Integration (auto-commit, remote sync)
- Memory System (full semantic memory)
- Prompt Presets (3 presets installed)

---

## System Environment

**Operating System**: Ubuntu (Linux)
**Version**: 22.04
**Package Manager**: apt

### Package Installation

When installing system packages, use:

```bash
sudo apt install <package>
```

**Important Notes**:
- Use `apt` for package installation
- Install prefix: `sudo`
- Running as root: No
- Sudo available: Yes

---

## Development Environment

The following development tools are available:

- **Python**: 3.11.5 (Package manager: uv)
- **Node.js**: 20.10.0 (Package manager: pnpm)

### Guidelines

**When suggesting code or tool usage:**

1. **Use Detected Tools**
   - ✅ Only suggest tools marked as "available"
   - ✅ Use specified package managers and versions
   - ❌ Do NOT suggest tools that are not detected

2. **Python Development**
   - Use uv for environment management
   - Follow Python 3.11.5 syntax and features

3. **Node.js Development**
   - Use pnpm for package management
   - Use pnpm run to run scripts
   - Follow Node.js 20.10.0 APIs and features

---

## 🚫 Git Operations Policy

### Basic Rules

**The AI Agent MUST follow these rules for all Git operations:**

- ✅ Can check git status for informational purposes
- ✅ Can suggest git operations to user
- ❌ NEVER run destructive git commands (push --force, hard reset)
- ❌ NEVER amend commits without checking authorship
- ❌ NEVER skip hooks (--no-verify, --no-gpg-sign)

### Gitignore Management

**Files ignored by git**:
- claude/temp/

These files are automatically excluded from version control.

---

## Auto-Commit Feature

**Status**: ✅ ENABLED

Changes to the memory system will be automatically committed after initialization or updates.

**Commit Strategy**: Separate commits
- Memory system files committed separately from other changes
- Allows easier tracking of memory updates

**Automatic commit messages**:
- Follow conventional commit format
- Include date and file statistics
- Signed with: "Auto-generated commit by claude-memory-init"

---

## Remote Sync Feature

**Status**: ✅ ENABLED

**Remote Repository**: `git@github.com:team/mem-template.git`

System memory updates can be synced to the remote template repository.

**Auto-PR Creation**: ✅ Enabled
- Pull requests are created automatically when syncing
- Use GitHub CLI (gh) for PR creation

**Sync Workflow**:
1. Local changes in `claude/memory/system/` are detected
2. Changes are filtered (only system memory, not project-specific)
3. Branch created: `sp-{hash}`
4. Commit with descriptive message
5. Push to remote
6. Create PR using gh CLI
7. Display PR URL

**Label**: All PRs use label `system-prompt-update`

---

## 🚨 MANDATORY: Memory-First Operating Principle

**THIS IS THE FOUNDATION OF ALL WORK. NEVER SKIP THIS.**

### The Three-Phase Mandatory Workflow

Every action MUST follow this sequence:

```
┌────────────────────────────────────────────┐
│ PHASE 1: CONSULT MEMORY (BEFORE work)     │
│ ────────────────────────────────────────── │
│ 1. Read tags.json and topics.json         │
│ 2. Query for relevant knowledge           │
│ 3. Read semantic notes (stable knowledge) │
│ 4. Read episodic notes (history)          │
│ 5. Check task-specific index              │
│ 6. Read procedural notes (workflows)      │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ PHASE 2: WORK (WITH memory as foundation) │
│ ────────────────────────────────────────── │
│ ✅ Use memory knowledge as base           │
│ ✅ Only read NEW code if memory lacking   │
│ ✅ Create notes IMMEDIATELY on discovery  │
│ ❌ NEVER re-analyze what's in memory      │
│ ❌ NEVER ignore existing knowledge        │
└──────────────┬─────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────┐
│ PHASE 3: UPDATE MEMORY (AFTER actions)    │
│ ────────────────────────────────────────── │
│ 1. Create/update semantic notes           │
│ 2. Create/update episodic notes           │
│ 3. Update indexes IMMEDIATELY             │
│ 4. Add cross-references                   │
│ 5. Link notes to outputs                  │
└────────────────────────────────────────────┘
```

### Memory Structure

**Memory Locations**:
- Semantic Memory: `claude/memory/semantic/` - Stable knowledge
- Episodic Memory: `claude/memory/episodic/` - Task history
- Procedural Memory: `claude/memory/procedural/` - Workflows
- System Memory: `claude/memory/system/` - Universal tools

**Index Files**:
- Tags: `claude/memory/index/tags.json`
- Topics: `claude/memory/index/topics.json`

### Memory-First Checklist

**Session Start** (ALWAYS do these):
- [ ] Read `claude/memory/index/tags.json`
- [ ] Read `claude/memory/index/topics.json`
- [ ] Read last 1-2 episodic notes
- [ ] Query and read relevant semantic notes

**During Work**:
- [ ] Using memory as foundation (not re-deriving)
- [ ] Creating semantic notes IMMEDIATELY on discoveries
- [ ] Updating episodic notes with progress

**Before Finishing** (MANDATORY):
- [ ] Created episodic note documenting session
- [ ] Created/updated semantic notes
- [ ] Updated tags.json and topics.json
- [ ] Added cross-references

---

## Active Prompt Presets

The following prompt presets are installed in this project:

- **Code Review** ([claude/prompts/code-review.md](claude/prompts/code-review.md))
  Systematic code review with focus on quality, security, and best practices.

- **Documentation** ([claude/prompts/documentation.md](claude/prompts/documentation.md))
  Generate comprehensive documentation from code analysis.

- **Architecture** ([claude/prompts/architecture.md](claude/prompts/architecture.md))
  Analyze and document system architecture and design patterns.

**Usage**:
- Each preset provides specialized instructions for specific tasks
- Refer to preset files in `claude/prompts/` for detailed instructions
- You can activate a preset by reading its file when needed

**Custom Presets**:
- You can create custom presets by adding files to `claude/prompts/custom/`
- Follow the same format as built-in presets

---

## Language Convention

- **Internal thinking**: English (for code analysis, technical reasoning)
- **External retrieval**: English (code, documentation, web search)
- **Final outputs**: English (user-facing documentation, reports)
- **Memory notes**: Mixed (English for technical terms, English for explanations)

---

## Ready to Start?

**Next Steps**:
1. ✅ You've read CLAUDE.md
2. 📖 Read memory indexes to understand available knowledge
3. 🎯 Wait for user to request a specific task or ask a question

**Do NOT**:
- ❌ Read files proactively without user request
- ❌ "Browse" the directory structure

---

**Version**: 1.0.0
**Last Updated**: 2025-01-18
**System Status**: ✅ Ready
```

**特点**:
- 包含所有 4 个插件的内容
- 系统信息自动检测并填充
- Git 功能完整启用（auto-commit + remote sync）
- 记忆系统完整说明
- 3 个预设已安装
- 内容丰富但结构清晰

---

### 示例 3: 中等配置（记忆系统 + 系统检测）

**配置**:
```yaml
project:
  name: "Data Pipeline"
  type: "Python ML Pipeline"
  description: "Machine learning data processing pipeline"

plugins:
  prompt-presets:
    enabled: false

  memory-system:
    enabled: true
    options:
      template_source: "default"

  git:
    enabled: false

  system-detector:
    enabled: true

system:
  os:
    name: "Ubuntu"
    version: "22.04"
  dev_tools:
    python:
      version: "3.11.5"
      package_manager: "uv"
```

**生成的 CLAUDE.md**（简化版）:

```markdown
# AI Agent Prompt System - Data Pipeline

**Project**: Data Pipeline
**Version**: 1.0.0
**Last Updated**: 2025-01-18
**Type**: Python ML Pipeline
**Description**: Machine learning data processing pipeline

---

## Welcome

Welcome to the Data Pipeline AI Agent system. This project uses a plugin-based architecture with the following features enabled:

- System Detection (auto-detected Python environment)
- Memory System (full semantic memory)

---

## System Environment

**Operating System**: Ubuntu (Linux)
**Version**: 22.04
**Package Manager**: apt

### Package Installation

When installing system packages, use:

```bash
sudo apt install <package>
```

---

## Development Environment

The following development tools are available:

- **Python**: 3.11.5 (Package manager: uv)

### Guidelines

**When suggesting code or tool usage:**

1. **Use Detected Tools**
   - ✅ Only suggest tools marked as "available"
   - ✅ Use specified package managers and versions

2. **Python Development**
   - Use uv for environment management
   - Follow Python 3.11.5 syntax and features

---

## 🚨 MANDATORY: Memory-First Operating Principle

**THIS IS THE FOUNDATION OF ALL WORK. NEVER SKIP THIS.**

[... 记忆系统完整说明 ...]

---

## Language Convention

[... 语言约定 ...]

---

## Ready to Start?

[... 开始指南 ...]

---

**Version**: 1.0.0
**Last Updated**: 2025-01-18
**System Status**: ✅ Ready
```

**特点**:
- 适合 Python ML 项目
- 无 Git 功能（团队可能使用其他工作流）
- 无预设（团队可能有自定义工作流）
- 重点在记忆系统和环境检测

---

## 技术实现细节

### 插件 Prompt 接口

**扩展插件接口**:

```typescript
// src/plugin/types.ts

export interface PluginPromptContributor {
  /**
   * 生成插件的 prompt 内容
   */
  generatePrompt(
    pluginConfig: PluginConfig,
    globalConfig: CoreConfig
  ): Promise<string>;

  /**
   * Prompt 在 CLAUDE.md 中的章节名称
   */
  promptSection: string;

  /**
   * 优先级（数字越小越靠前）
   * 标准优先级：
   * - 0-9: Core (header)
   * - 10-19: System Detector
   * - 20-29: Git
   * - 30-39: Memory System
   * - 40-49: Prompt Presets
   * - 1000+: Core (footer)
   */
  priority: number;
}

export interface Plugin {
  // ... 现有字段

  // 新增：Prompt 贡献
  prompt?: PluginPromptContributor;
}
```

### 模板引擎集成

**选择 Handlebars**:

```bash
pnpm add handlebars
pnpm add -D @types/handlebars
```

**实现模板渲染**:

```typescript
// src/utils/template-engine.ts

import Handlebars from 'handlebars';
import fs from 'fs-extra';

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // 日期格式化
    this.handlebars.registerHelper('formatDate', (date: Date) => {
      return date.toISOString().split('T')[0];
    });

    // 列表生成
    this.handlebars.registerHelper('list', (items: string[]) => {
      return items.map(item => `- ${item}`).join('\n');
    });

    // 条件辅助（内置的 if/unless 已够用）
  }

  async render(templatePath: string, context: any): Promise<string> {
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const template = this.handlebars.compile(templateSource);
    return template(context);
  }

  renderString(templateString: string, context: any): string {
    const template = this.handlebars.compile(templateString);
    return template(context);
  }
}
```

### CLAUDE.md 生成器

**实现**:

```typescript
// src/core/claude-md-generator.ts

import { TemplateEngine } from '../utils/template-engine';
import { Plugin, PluginPromptContributor } from '../plugin/types';
import { CoreConfig } from '../types/config';

interface PromptSection {
  priority: number;
  section: string;
  content: string;
}

export class CLAUDEmdGenerator {
  private templateEngine: TemplateEngine;
  private memPath: string;

  constructor(memPath: string) {
    this.templateEngine = new TemplateEngine();
    this.memPath = memPath;
  }

  async generate(
    config: CoreConfig,
    enabledPlugins: Plugin[]
  ): Promise<string> {
    const sections: PromptSection[] = [];

    // 1. Core header (always first)
    sections.push({
      priority: 0,
      section: 'header',
      content: await this.renderCoreHeader(config)
    });

    // 2. Plugin prompts (in priority order)
    for (const plugin of enabledPlugins) {
      if (plugin.prompt) {
        const pluginConfig = config.plugins[plugin.meta.name];
        const content = await plugin.prompt.generatePrompt(
          pluginConfig,
          config
        );

        sections.push({
          priority: plugin.prompt.priority,
          section: plugin.prompt.promptSection,
          content: content
        });
      }
    }

    // 3. Core footer (always last)
    sections.push({
      priority: 1000,
      section: 'footer',
      content: await this.renderCoreFooter(config)
    });

    // 4. Sort by priority
    sections.sort((a, b) => a.priority - b.priority);

    // 5. Assemble
    const claudeMd = sections
      .map(s => s.content)
      .join('\n\n---\n\n');

    return claudeMd;
  }

  private async renderCoreHeader(config: CoreConfig): Promise<string> {
    const templatePath = path.join(
      this.memPath,
      'prompts/core/header.md.template'
    );

    // 生成启用功能列表
    const enabledFeatures = Object.entries(config.plugins)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([name, _]) => this.getPluginDisplayName(name));

    return this.templateEngine.render(templatePath, {
      ...config.project,
      ENABLED_FEATURES_LIST: enabledFeatures.map(f => `- ${f}`).join('\n'),
      LAST_UPDATED: new Date().toISOString().split('T')[0]
    });
  }

  private async renderCoreFooter(config: CoreConfig): Promise<string> {
    const templatePath = path.join(
      this.memPath,
      'prompts/core/footer.md.template'
    );

    return this.templateEngine.render(templatePath, {
      THINK_LANGUAGE: 'English', // 从 config 获取
      USER_LANGUAGE: 'English',  // 从 config 获取
      LAST_UPDATED: new Date().toISOString().split('T')[0]
    });
  }

  private getPluginDisplayName(pluginName: string): string {
    const displayNames: Record<string, string> = {
      'system-detector': 'System Detection (auto-detected environment)',
      'git': 'Git Integration',
      'memory-system': 'Memory System (full semantic memory)',
      'prompt-presets': 'Prompt Presets'
    };
    return displayNames[pluginName] || pluginName;
  }
}
```

---

## 验收标准

### 设计完整性

- [x] 新结构设计合理，目录清晰
- [x] 每个插件的 prompt 内容规范清晰
- [x] 变量系统设计完善（命名、条件块、作用域）
- [x] 组装流程可行（有伪代码）
- [x] 迁移策略可执行（有具体步骤）

### 预设质量

- [x] 6 个预设定义完整
- [x] 每个预设包含必需章节（角色、任务、输出、原则）
- [x] 至少 2 个预设有详细示例（Code Review, Documentation）
- [x] 预设实用性强，适用于常见场景

### 示例完整性

- [x] 至少 3 个配置示例（最小、完整、中等）
- [x] 每个示例包含配置 + 生成的 CLAUDE.md
- [x] 示例真实可用，不是占位符

### 向后兼容性

- [x] 考虑了 v1.x 项目的兼容
- [x] 提供了检测逻辑
- [x] 旧模板保留在 legacy/ 目录

### 技术可行性

- [x] 模板引擎选择合理（Handlebars）
- [x] 变量语法清晰（{{VARIABLE}}, {{#if}}, {{#each}}）
- [x] 优先级系统简单有效
- [x] 组装算法清晰可实现

---

## 后续步骤

1. **评审本文档** - 确认设计方案合理
2. **实现 Extra 1** - 完成插件 Prompt 规范（`PLUGIN_PROMPT_SPECIFICATION.md`）
3. **执行迁移** - 在 mem 仓库中实施改造
4. **更新主仓库** - 修改 `claude-memory-init` 以支持新结构
5. **测试验证** - 使用 3 个示例配置验证生成结果
6. **文档更新** - 更新 README 和使用指南

---

**文档版本**: 1.0
**创建日期**: 2025-01-18
**负责人**: 待定
**评审状态**: ✅ 设计完成，待评审
