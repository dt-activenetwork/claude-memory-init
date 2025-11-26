# Claude Init

Interactive CLI tool for setting up Claude in your projects with a plugin-based architecture.

[![Version](https://img.shields.io/badge/version-2.1.0--beta-blue)](https://github.com/dt-activenetwork/claude-memory-init)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## ✨ What's New in v2.1

🎉 **Two-Layer Memory Architecture**: User Memory vs Project Memory

- **👤 User Memory**: Store preferences in `~/.claude/` (shared across projects)
- **📁 Project Memory**: Project-specific config in `.agent/`
- **🔄 Smart Reuse**: Skip re-configuration when initializing new projects
- **➕ Append Mode**: Preserve existing AGENT.md/CLAUDE.md content
- **🧪 UI Facade Pattern**: Solved Cucumber BDD testing mock issues

### Previous Updates (v2.0)

- **🔌 Plugin System**: Modular architecture with 5 composable plugins
- **💬 Interactive CLI**: Conversational setup flow (no parameters to remember)
- **📊 TOON Format**: Token-efficient data format (30-60% fewer tokens than JSON)
- **🎯 Minimal Commands**: Clean, simple CLI with dynamic plugin commands
- **🔍 Smart Detection**: Multi-package-manager support with user preferences
- **💾 Persistent Config**: One-time setup, saved preferences

> **Status**: v2.1 beta. Testing: 196 unit tests + 32 BDD scenarios passing.

---

## 🚀 Quick Start

### Installation

```bash
# Using pnpm dlx (recommended)
cd your-project
pnpm dlx github:dt-activenetwork/claude-memory-init

# Or clone and use locally
git clone --recurse-submodules https://github.com/dt-activenetwork/claude-memory-init.git
cd claude-memory-init
pnpm install
pnpm build
pnpm link --global
```

### Initialize Your Project

```bash
# Just run it - no parameters needed!
claude-init

# Follow the interactive prompts
📋 Step 1/5: Project Information
? Project name: › my-project

📦 Step 2/5: Select Features
What features do you want to enable?
  ◉ Prompt Presets
  ◉ Memory System
  ◯ Git Integration
  ◉ System Detection

[Continue through the setup...]

🎉 Initialization complete!
```

---

## 🔌 Plugin System

Claude Init uses a plugin-based architecture. Choose the features you need:

### Available Plugins

| Plugin | Description | Features |
|--------|-------------|----------|
| **System Detection** | Auto-detect environment | Two-layer memory (user/project), smart reuse across projects |
| **Memory System** | Knowledge persistence | Semantic, episodic, procedural memory with TOON indexes |
| **Git Integration** | Git automation | Auto-commit, remote sync, gitignore management |
| **Task System** | Task workflows | State tracking, output management, workflows |
| **Prompt Presets** | Custom prompts directory | User-defined templates |

### Key Features

#### 🔍 Smart System Detection
- Detects all available package managers (Python: uv/pip/poetry/conda, Node: pnpm/npm/yarn/bun)
- Interactive selection if multiple found
- Lock file priority (auto-suggests project's current package manager)
- **One-time configuration** saved to `.agent/system/info.toon`
- Static info cached (timezone, locale) - no repeated detection

#### 💾 Memory System
- **Knowledge** (semantic): Stable architectural knowledge
- **History** (episodic): Task history records
- **Workflows**: Reusable procedures
- **TOON indexes**: Efficient tag/topic-based lookup

#### 🔧 Git Integration
- Auto-commit option
- Separate commits for agent files
- Remote sync capability
- Smart gitignore management

#### 📋 Task System
- Current task state tracking (`current.toon`)
- Task output organization
- Workflow templates
- Auto-create PRs

#### System Detection
Auto-detect and configure:
- Operating system (Linux/macOS/Windows)
- Python environment (version, package manager)
- Node.js environment (version, package manager)

---

## 📝 Commands

### Core Command

```bash
# Initialize project (interactive)
claude-init
```

That's it! The interactive flow will guide you through everything.

### Plugin Commands

Only one additional command is needed:

```bash
# Contribute system-level knowledge to team memory template
claude-init memory system-add
```

**What it does**:
1. Interactively create a system-level memory
2. Save locally to your project
3. Clone the memory template repository
4. Create a branch and commit
5. Push and create PR automatically
6. Display PR URL

**Example flow**:
```bash
$ claude-init memory system-add

📝 Add System Memory

? Category: › Tools & Guidelines
? Title: › Code Reference Format Best Practice
? Description: › Guidelines for referencing code locations
? Content: (Ctrl+D to finish)
[Enter content...]
? Tags: › code-reference, guidelines

✨ Preview
File: memory/system/tools/code-reference-format.md
[Preview content...]

? Save this memory? (Y/n) › Yes
✅ Memory saved locally

? Create PR to mem repository? (Y/n) › Yes

🔄 Syncing with remote...
✅ PR created: https://github.com/dt-activenetwork/mem/pull/123

Next steps:
  • Wait for review from team
  • PR will be merged to main branch
```

---

## 🌍 Language Support

Claude Init supports multiple languages:

- **English** (default)
- **简体中文**

### Change Language

```bash
# Use Chinese
export CLAUDE_INIT_LANG=zh
claude-init

# Use English
export CLAUDE_INIT_LANG=en
claude-init
```

Language is automatically detected from your system locale (`LANG`, `LANGUAGE`, etc.).

---

## 📖 Documentation

### Design Documents

Complete design documentation for v2.0 refactor:

- **[Design Overview](./docs/README.md)** - Start here
- **[Refactor Summary](./docs/REFACTOR_SUMMARY.md)** - Complete refactor plan
- **[Plugin Architecture](./docs/PLUGIN_ARCHITECTURE_REFACTOR.md)** - Plugin system design
- **[Interactive CLI](./docs/INTERACTIVE_CLI_DESIGN.md)** - Interactive flow design
- **[CLI Commands](./docs/CLI_COMMANDS_DESIGN.md)** - Command structure
- **[i18n Design](./docs/I18N_DESIGN.md)** - Internationalization

### User Guides

> **Note**: User guides will be updated after v2.0 implementation

---

## 🏗️ Project Structure

```
claude-memory-init/
├── src/
│   ├── core/              # Core framework
│   │   ├── initializer.ts
│   │   └── interactive-initializer.ts
│   ├── plugin/            # Plugin system
│   │   ├── types.ts
│   │   ├── loader.ts
│   │   └── registry.ts
│   ├── plugins/           # Built-in plugins
│   │   ├── memory-system/
│   │   ├── prompt-presets/
│   │   ├── git/
│   │   └── system-detector/
│   ├── i18n/              # Internationalization
│   │   └── locales/
│   │       ├── en/
│   │       └── zh/
│   └── cli.ts             # CLI entry point
├── docs/                  # Design documentation
├── mem/                   # Memory template (submodule)
└── package.json
```

---

## 🛠️ Development

### Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/dt-activenetwork/claude-memory-init.git
cd claude-memory-init

# Install dependencies
pnpm install

# Build
pnpm build

# Run in development mode
pnpm dev

# Test
pnpm test
```

### Tech Stack

- **CLI Framework**: Commander.js v12
- **Interactive UI**: Inquirer.js v9
- **Progress Display**: Ora v8
- **Colors**: Chalk v5
- **Git Operations**: Simple-git v3
- **Config Format**: YAML v2
- **i18n**: i18next v23
- **Type System**: TypeScript v5

---

## 🗺️ Roadmap

### v2.0 (Current)

**Status**: Core features implemented, testing complete

**Key Features**:
- ✅ Plugin-based architecture
- ✅ Interactive CLI
- ✅ TOON format support
- ✅ 5 built-in plugins
- ✅ Comprehensive test suite (100/100 passed)

**Remaining**:
- ⏳ i18n support (planned)
- ⏳ `memory system-add` command (planned)

See [Design Documents](./docs/) for complete details.

### v1.x (Deprecated)

**Status**: No longer maintained

The v1.x codebase has been replaced by v2.0. See CHANGELOG.md for migration notes.

---

## 💡 Design Philosophy

### 1. Plugin-First
Every feature is a plugin. Choose what you need.

### 2. Interactive-First
No parameters to remember. Just conversation.

### 3. Minimal by Default
Only essential commands. No bloat.

### 4. Team-Friendly
Easy to contribute knowledge back to the team.

---

## 🤝 Contributing

### Contributing Knowledge

Use the `memory system-add` command to contribute to the team memory template:

```bash
claude-init memory system-add
```

This will create a PR to the [mem repository](https://github.com/dt-activenetwork/mem).

### Contributing Code

1. Read the [Design Documents](./docs/)
2. Create a feature branch
3. Implement your changes
4. Write tests
5. Submit a PR

### Adding Plugins

See [Plugin Architecture Design](./docs/PLUGIN_ARCHITECTURE_REFACTOR.md) for details on creating plugins.

### Adding Translations

See [i18n Design](./docs/I18N_DESIGN.md) for details on adding new languages.

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

---

## 🔗 Links

- **Repository**: https://github.com/dt-activenetwork/claude-memory-init
- **Memory Template**: https://github.com/dt-activenetwork/mem
- **Design Docs**: [./docs/](./docs/)
- **Issues**: https://github.com/dt-activenetwork/claude-memory-init/issues

---

**Current Version**: 2.0.0-alpha
**Last Updated**: 2025-11-26
