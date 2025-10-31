# Claude Memory System Initializer

A CLI tool for initializing the Claude Memory System in your projects. This tool helps you set up a structured memory system that enables Claude to maintain context and knowledge across sessions.

> **⚠️ 重要说明**: 本工具不发布到 npmjs.com，仅供本地使用。请参考下面的安装说明。

## Features

- 🚀 **Quick Setup**: Initialize memory system with a single command
- 🎯 **Three Modes**: Config-based, interactive, or quick mode
- ✅ **Validation**: Built-in config validation
- 📝 **Template Rendering**: Automatically generates customized documentation
- 🔧 **Flexible Configuration**: Extensive customization options

## Installation

**注意**: 本工具不会发布到 npmjs.com，使用 GitHub 仓库直接安装。

### 方式一：使用 pnpm dlx 从 GitHub（推荐）

最简单的方式，无需克隆仓库：

```bash
# 在你的项目目录中
cd /path/to/your/project

# 使用 GitHub 仓库
pnpm dlx github:yourusername/claude-memory-init init --quick

# 或指定分支/tag
pnpm dlx github:yourusername/claude-memory-init#main init --quick
pnpm dlx github:yourusername/claude-memory-init#v1.0.0 init --quick
```

### 方式二：克隆仓库后本地使用

```bash
# 1. 克隆仓库（包含 submodules）
git clone --recurse-submodules https://github.com/yourusername/claude-memory-init.git
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
    "@claude-memory/init": "github:yourusername/claude-memory-init"
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
pnpm dlx github:yourusername/claude-memory-init init --quick
```

更多使用方式和详细说明，请参考 [LOCAL_USAGE.md](./LOCAL_USAGE.md)。

## Usage

### Quick Mode (Fastest)

Initialize with sensible defaults:

```bash
claude-memory-init init --quick
```

This creates:
- `claude/` directory with memory system structure
- `CLAUDE.md` in project root
- Default configuration
- Initialized index files

### Config File Mode (Recommended)

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
- `-t, --target <path>` - Target directory (default: current directory)

**Examples:**

```bash
# From config file
claude-memory-init init --config ./claude/config.yaml

# Interactive mode
claude-memory-init init --interactive

# Quick mode in specific directory
claude-memory-init init --quick --target /path/to/project

# Default (looks for claude/config.yaml)
claude-memory-init init
```

### `validate`

Validate configuration file.

**Options:**
- `-c, --config <path>` - Path to config.yaml file (required)

**Example:**

```bash
claude-memory-init validate --config ./claude/config.yaml
```

## What Gets Created

After initialization, your project will have:

```
your-project/
├── CLAUDE.md                          # Main prompt file (copy of claude/CLAUDE.md)
├── .gitignore                         # Updated with claude/temp/
└── claude/                            # Memory system directory
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
- GitHub Issues: [Report an issue](https://github.com/yourusername/claude-memory-init/issues)
- Documentation: See `mem/` directory for memory system docs

## Related

- [Claude Memory System](https://github.com/yourusername/claude-memory) - The core memory system
- [Claude Code](https://claude.com/claude-code) - Claude's official CLI

---

Made with ❤️ for better AI-assisted development
