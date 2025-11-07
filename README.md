# Claude Memory System Initializer

A CLI tool for initializing the Claude Memory System in your projects. This tool helps you set up a structured memory system that enables Claude to maintain context and knowledge across sessions.

> **⚠️ 重要说明**: 本工具不发布到 npmjs.com，仅供本地使用。请参考下面的安装说明。

## Features

- 🚀 **Quick Setup**: Initialize memory system with a single command
- 🎯 **Three Modes**: Config-based, interactive, or quick mode
- ✅ **Validation**: Built-in config validation
- 📝 **Template Rendering**: Automatically generates customized documentation
- 🔧 **Flexible Configuration**: Extensive customization options
- 🔄 **Incremental Management**: Add and modify configuration as you work
- 📋 **CLI Management**: Manage config without editing YAML files directly
- 🧹 **Smart Filtering**: Automatically excludes framework meta-documentation
- 🎛️ **Customizable Exclusions**: Configure which files to exclude via `.claude-init-exclude`
- 🌐 **Remote Repository Support**: Clone memory templates from remote repositories
- 🔄 **Sync & Diff**: Compare local and remote memory systems, create PRs for updates
- 🗂️ **Temporary Directory**: Automatically handles repo cloning in OS temp directory

## Installation

**注意**: 本工具不会发布到 npmjs.com，使用 GitHub 仓库直接安装。

### 方式一：使用 pnpm dlx 从 GitHub（推荐）

最简单的方式，无需克隆仓库：

```bash
# 在你的项目目录中
cd /path/to/your/project

# 使用 GitHub 仓库
pnpm dlx github:dt-activenetwork/claude-memory-init init --quick

# 或指定分支/tag
pnpm dlx github:dt-activenetwork/claude-memory-init#main init --quick
pnpm dlx github:dt-activenetwork/claude-memory-init#v1.0.0 init --quick
```

### 方式二：克隆仓库后本地使用

```bash
# 1. 克隆仓库（包含 submodules）
git clone --recurse-submodules https://github.com/dt-activenetwork/claude-memory-init.git
cd claude-memory-init

# 2. 安装依赖并构建
pnpm install
pnpm run build

# 3. 使用方式 A: 直接执行
cd /path/to/your/project
node /path/to/claude-memory-init/dist/index.js init --quick

# 3. 使用方式 B: 创建全局链接
cd /path/to/claude-memory-init
pnpm link --global
# 然后在任何地方使用
claude-memory-init init --quick
```

### 方式三：通过 package.json 安装

在你的项目中添加依赖：

```json
{
  "devDependencies": {
    "@claude-memory/init": "github:dt-activenetwork/claude-memory-init"
  }
}
```

然后使用：

```bash
pnpm install
pnpx claude-memory-init init --quick
```

### 首次设置检查清单

在第一次使用前，确保：

```bash
cd /path/to/claude-memory-init

# 1. 检查 submodule 是否初始化
ls -la mem/
# 应该看到 mem/ 目录有内容

# 如果 mem/ 为空，运行：
git submodule update --init --recursive

# 2. 安装依赖
pnpm install

# 3. 构建项目
pnpm run build

# 4. 验证构建成功
ls -la dist/
# 应该看到编译后的 .js 文件

# 5. 测试运行
node dist/index.js --version
node dist/index.js --help
```

## 快速开始

最简单的方式是使用 `pnpm dlx` 从 GitHub：

```bash
cd /path/to/your/project

# 从 GitHub 仓库直接使用
pnpm dlx github:dt-activenetwork/claude-memory-init init --quick
```

更多使用方式和详细说明，请参考 [LOCAL_USAGE.md](./LOCAL_USAGE.md)。

## Usage

### Quick Mode (Fastest) - Recommended for Getting Started

Initialize with sensible defaults and add details later:

```bash
# 1. Quick init
claude-memory-init init --quick

# 2. View what was created
claude-memory-init show

# 3. Add objectives as you discover them
claude-memory-init add-objective "Document the API"
claude-memory-init add-objective "Identify performance bottlenecks"

# 4. Add assumptions as you learn about the project
claude-memory-init add-assumption "Uses Express.js"
claude-memory-init add-assumption "PostgreSQL database"

# 5. Update settings as needed
claude-memory-init set language.user_language Chinese
```

This creates:
- `claude/` directory with memory system structure
- `CLAUDE.md` in project root (rendered from template)
- Default configuration
- Initialized index files
- `.claude-memory-init` marker file (hidden)
- **No template files** (only rendered output)

**Why this approach is better:** You don't need to know everything upfront. Start simple and evolve your configuration as you work.

**Duplicate Protection:** The tool automatically detects if a project is already initialized and prevents accidental re-initialization. Use `--force` to override if needed.

### Config File Mode

For projects where you already know the requirements:

1. Create a `claude/config.yaml` file (you can copy from `claude/config.example.yaml`)
2. Customize the configuration
3. Run initialization:

```bash
claude-memory-init init --config ./claude/config.yaml
```

### Interactive Mode

Get guided through the setup process:

```bash
claude-memory-init init --interactive
```

The tool will prompt you for:
- Project information (name, type, description)
- Language preferences
- Project objectives
- Assumptions and scope
- Domain-specific terms (optional)

### Using Remote Memory Repository

Initialize from a remote memory repository (automatically cloned to temp directory):

```bash
# Initialize from remote repository
claude-memory-init init --quick --repo https://github.com/your-org/memory-repo.git

# Or with config file
claude-memory-init init --config config.yaml --repo https://github.com/your-org/memory-repo.git
```

The tool will:
1. Automatically clone the remote repository to OS temp directory (e.g., `/tmp/claude-memory-xxxxx`)
2. Copy the memory system template from temp to your project
3. Clean up the temp directory after initialization

### Sync and Create Pull Requests

Compare your local memory system with a remote repository and create PRs for updates:

```bash
# Check differences between local and remote
claude-memory-init sync --repo https://github.com/your-org/memory-repo.git

# Compare and create a branch with your local changes (ONLY system prompts)
claude-memory-init sync --repo https://github.com/your-org/memory-repo.git --pr

# Keep temp directory for debugging (default: auto-cleanup)
claude-memory-init sync --repo https://github.com/your-org/memory-repo.git --pr --no-cleanup
```

**Smart Filtering:**
- Only files in `prompt/` directory (system memory) are included in PR
- Your project-specific memories (`memory/semantic/`, `memory/episodic/`) are excluded
- Branch name format: `sp-{hash}` (hash from username + date + filenames)
- Example branch: `sp-a1b2c3d4`

**Automatic PR Label:**
- Single label: `system-prompt-update`
- Clearly identifies all system prompt PRs
- Easy to filter and review

**Why this matters:**
- System prompts are team-wide templates → should be reviewed and merged
- Semantic memories are project-specific knowledge → stay local
- Single label simplifies PR management and filtering
- This separation ensures PRs contain only curated, reusable content

This is useful when:
- You have a shared memory system repository across projects
- You want to contribute system prompt improvements back to the team
- You need to detect if there are new system memories in the remote repo

## Documentation

### Quick Links
- **Getting Started:** See [Quickstart Guide](./QUICKSTART.md)
- **Usage Examples:** See [Usage Examples](./USAGE_EXAMPLES.md)
- **Command Reference:** See [Command Reference](./COMMAND_REFERENCE.md)
- **Project Overview:** See [CLAUDE.md](./CLAUDE.md)

### Design Documentation
- [Remote Sync Feature](./docs/REMOTE_SYNC.md) - Detailed sync and PR workflow
- [Feature Summary](./docs/FEATURE_SUMMARY.md) - Technical implementation (中文)
- [Quick Reference](./docs/QUICK_REFERENCE.md) - Command quick reference

### Recent Updates
- **2025-01-07:** Added remote sync, PR creation, and auto-submodule detection
- See [WORK_SUMMARY_2025-01-07.md](./WORK_SUMMARY_2025-01-07.md) for details
- See [CHANGELOG.md](./CHANGELOG.md) for full history

### Incremental Workflow Example

```bash
# Day 1: Just start
cd my-project
claude-memory-init init --quick

# Day 2: After exploring the codebase
claude-memory-init add-assumption "Uses microservices architecture"
claude-memory-init add-objective "Map service dependencies"

# Day 3: Need to change output language
claude-memory-init set language.user_language Chinese

# Week 2: Review current config
claude-memory-init show

# Week 3: Sync with team's memory repo
claude-memory-init sync --repo https://github.com/team/memory-repo.git --pr

# Anytime: Quick edit
claude-memory-init edit
```

### Validate Configuration

Check if your config file is valid:

```bash
claude-memory-init validate --config ./claude/config.yaml
```

## Configuration

### Minimal Config Example

```yaml
project:
  name: "My Project"
  type: "Node.js backend"
  description: "A backend service"

language:
  user_language: "English"
  think_language: "English"

paths:
  base_dir: "claude"
  codebase: "/path/to/project"

objectives:
  - objective: "Analyze architecture"
    memory_check: "Query semantic notes for architecture"
    memory_update: "Create semantic notes for discoveries"

assumptions:
  - "Uses npm as package manager"
```

### Full Config Options

See `mem/config.example.yaml` for complete configuration options including:

- **Project**: Name, type, description
- **Language**: User and thinking languages
- **Paths**: Directory structure
- **Objectives**: Project goals with memory strategies
- **Assumptions**: Project scope and facts
- **Domain**: Terminology, evidence requirements, external sources
- **Tasks**: Context budgets, incremental work settings
- **Output**: Format, diagrams, code references
- **Git**: Integration settings
- **Advanced**: Performance tuning

## Git Submodule Management

This project uses a git submodule for the `mem/` template directory. The submodule is automatically initialized during `pnpm install`, but you can also manage it manually:

```bash
# Check submodule status
claude-memory-init submodule --status

# Initialize submodule
claude-memory-init submodule --init

# Update submodule to latest version
claude-memory-init submodule --update
```

For more details, see [SUBMODULE.md](./SUBMODULE.md).

## CLI Commands

### `init`

Initialize Claude Memory System.

**Options:**
- `-c, --config <path>` - Path to config.yaml file
- `-i, --interactive` - Interactive mode
- `-q, --quick` - Quick mode with defaults
- `-f, --force` - Force re-initialization (overwrite existing)
- `-t, --target <path>` - Target directory (default: current directory)

**Examples:**

```bash
# From config file
claude-memory-init init --config ./claude/config.yaml

# Interactive mode
claude-memory-init init --interactive

# Quick mode in specific directory
claude-memory-init init --quick --target /path/to/project

# Force re-initialization (overwrites existing)
claude-memory-init init --quick --force

# Default (looks for claude/config.yaml)
claude-memory-init init
```

**Duplicate Protection:**
The tool creates a hidden `.claude-memory-init` marker file to track initialization. If you try to initialize an already-initialized project, you'll see:

```
⚠️  This project is already initialized!

  Project: my-project
  Initialized: 2025-11-06

Use --force to re-initialize
Or manage configuration with:
  claude-memory-init show
  claude-memory-init add-objective "..."
```

### `validate`

Validate configuration file.

**Options:**
- `-c, --config <path>` - Path to config.yaml file (required)

**Example:**

```bash
claude-memory-init validate --config ./claude/config.yaml
```

### Configuration Management Commands

After initialization, you can manage your configuration without editing YAML files directly:

#### `show`

Display current configuration.

```bash
# In project directory
claude-memory-init show

# Or specify directory
claude-memory-init show --target /path/to/project
```

#### `add-objective <objective>`

Add a new objective to your project.

```bash
# Simple objective (auto-generates memory_check and memory_update)
claude-memory-init add-objective "Document the API"

# With custom memory operations
claude-memory-init add-objective "Fix authentication bugs" \
  --check "Search episodic notes for auth issues" \
  --update "Create semantic notes for auth patterns"
```

#### `add-assumption <assumption>`

Add a project assumption.

```bash
claude-memory-init add-assumption "Uses Express.js framework"
claude-memory-init add-assumption "Deployed on AWS Lambda"
```

#### `set <key> <value>`

Update a configuration value using dot notation.

```bash
# Change language settings
claude-memory-init set language.user_language Chinese
claude-memory-init set language.think_language English

# Update project info
claude-memory-init set project.type "React Application"
claude-memory-init set project.name "MyApp"
```

#### `remove-objective <index>`

Remove an objective by index (use `show` to see indexes).

```bash
claude-memory-init remove-objective 2
```

#### `remove-assumption <index>`

Remove an assumption by index (use `show` to see indexes).

```bash
claude-memory-init remove-assumption 0
```

#### `edit`

Open the configuration file in your default editor.

```bash
# Uses $EDITOR, $VISUAL, or falls back to vi
claude-memory-init edit
```

## What Gets Created

After initialization, your project will have:

```
your-project/
├── CLAUDE.md                          # Main prompt file (copy of claude/CLAUDE.md)
├── .gitignore                         # Updated with claude/temp/
└── claude/                            # Memory system directory
    ├── .claude-memory-init            # Hidden marker file (tracks initialization)
    ├── CLAUDE.md                      # Generated from template
    ├── CLAUDE.md.template             # Original template
    ├── config.yaml                    # Your configuration (if interactive)
    ├── config.example.yaml            # Example configuration
    ├── memory/                        # Memory storage
    │   ├── semantic/                  # Timeless knowledge
    │   ├── episodic/                  # Session records
    │   ├── procedural/                # How-to guides
    │   ├── system/                    # System knowledge
    │   └── index/                     # Indexes
    │       ├── tags.json              # Tag index
    │       └── topics.json            # Topic index
    ├── prompt/                        # System prompts
    ├── result/                        # Analysis outputs
    ├── temp/                          # Temporary files (gitignored)
    └── docs/                          # Documentation
```

### The `.claude-memory-init` Marker File

This hidden file contains metadata about the initialization:

```json
{
  "initialized": true,
  "version": "1.0.0",
  "date": "2025-11-06",
  "base_dir": "claude",
  "project_name": "your-project"
}
```

The marker file:
- Prevents accidental re-initialization
- Tracks when the project was set up
- Records the CLI version used
- Helps the `status` command identify initialized projects

## File Exclusion System

The tool automatically excludes framework meta-documentation and removes template source files to keep your project clean.

### Template Files

**Template source files** (`.template` extension) are automatically removed after rendering:
- `CLAUDE.md.template` → renders to `CLAUDE.md`, then template is deleted
- `prompt/0.overview.md.template` → renders to `prompt/0.overview.md`, then template is deleted

Users only see the rendered output, not the template source.

### Excluded Files

**Framework Documentation** (about the memory system itself):
- `README.md` - Framework overview
- `FRAMEWORK_OVERVIEW.md` - Architecture details
- `FILE_MANIFEST.md` - File listing
- `CHECKLIST.md` - Deployment checklist
- `MEMORY_DRIVEN_CONTEXT_OPTIMIZATION.md` - Implementation theory

**Internal Design Docs**:
- `memory/DESIGN.md` - System architecture
- `memory/procedural/memory-first-workflow.md` - Framework workflow
- `memory/procedural/memory-system-operations.md` - Framework operations

**Setup Guides** (replaced by this tool):
- `docs/QUICKSTART.md` - Manual setup guide

### Customizing Exclusions

You can customize file handling by editing `.claude-init-exclude` in the tool's root directory.

The config has **two modes**:

#### 1. `exclude_on_copy` - Never Copied
Files that are skipped entirely during initialization:

```ini
[exclude_on_copy]

[patterns]
*.git

[files]
README.md
FRAMEWORK_OVERVIEW.md

[directories]
docs
```

#### 2. `delete_after_init` - Temporary Files
Files that are copied, used during initialization, then deleted:

```ini
[delete_after_init]

[patterns]
*.template    # Template files are rendered, then deleted

[files]
# Add specific temporary files

[directories]
# Add temporary directories
```

**Why two modes?**
- `exclude_on_copy`: Performance (never copy what you don't need)
- `delete_after_init`: Transparency (templates are needed for rendering, then cleaned up)

Each mode supports:
- **patterns**: Glob patterns (supports `*` and `?`)
- **files**: Exact file names
- **directories**: Directory names

## How It Works

1. **Copy Template**: Copies memory system template from `mem/` directory
2. **Render Templates**: Replaces variables in templates with your config values
3. **Initialize Indexes**: Creates empty index files with current date
4. **Update .gitignore**: Adds claude/temp/ to gitignore
5. **Validate**: Ensures no unreplaced variables remain

## Development

### Building

```bash
pnpm install
pnpm run build
```

### Testing Locally

```bash
# Build first
pnpm run build

# Test validation
node dist/index.js validate --config ./mem/config.example.yaml

# Test initialization
node dist/index.js init --quick --target /tmp/test-project
```

### Project Structure

```
claude-memory-init/
├── src/                    # TypeScript source
│   ├── core/              # Core functionality
│   ├── prompts/           # Interactive prompts
│   ├── utils/             # Utilities
│   ├── types/             # Type definitions
│   ├── cli.ts             # CLI interface
│   └── index.ts           # Entry point
├── mem/                   # Memory system template
├── dist/                  # Compiled output
├── package.json
└── tsconfig.json
```

## Requirements

- Node.js >= 18
- pnpm (recommended) or npm

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit issues or pull requests.

## Support

For issues and questions:
- GitHub Issues: [Report an issue](https://github.com/dt-activenetwork/claude-memory-init/issues)
- Documentation: See `mem/` directory for memory system docs

## Documentation

- [COMMAND_REFERENCE.md](./COMMAND_REFERENCE.md) - Quick reference for all commands
- [INCREMENTAL_USAGE.md](./INCREMENTAL_USAGE.md) - Incremental workflow guide
- [EXCLUSION_GUIDE.md](./EXCLUSION_GUIDE.md) - File exclusion system guide
- [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) - Detailed usage examples
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [LOCAL_USAGE.md](./LOCAL_USAGE.md) - Local installation and usage

## Related

- [Claude Memory System](https://github.com/dt-activenetwork/claude-memory) - The core memory system
- [Claude Code](https://claude.com/claude-code) - Claude's official CLI

---

Made with ❤️ for better AI-assisted development
