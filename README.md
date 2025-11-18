# Claude Init

Interactive CLI tool for setting up Claude in your projects with a plugin-based architecture.

[![Version](https://img.shields.io/badge/version-2.0.0--alpha-blue)](https://github.com/dt-activenetwork/claude-memory-init)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## ✨ What's New in v2.0

🎉 **Major Refactor**: Plugin-based architecture with interactive CLI

- **🔌 Plugin System**: Modular architecture with composable plugins
- **💬 Interactive CLI**: Conversational setup flow (no parameters to remember)
- **🌍 i18n Support**: English and Simplified Chinese
- **🎯 Minimal Commands**: Only essential commands
- **📝 Memory System**: Advanced `memory system-add` command for contributing knowledge

> **Status**: v2.0 is currently in design phase. See [Design Documents](./docs/) for details.

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

| Plugin | Description | Commands |
|--------|-------------|----------|
| **Prompt Presets** | Pre-configured prompt templates | - |
| **Memory System** | Full semantic memory system | `memory system-add` |
| **Git Integration** | Auto-commit and remote sync | - |
| **System Detection** | Auto-detect OS and dev tools | - |

### Plugin Features

#### Prompt Presets
Generate CLAUDE.md with pre-configured templates:
- Code Review
- Documentation
- Refactoring
- Testing
- Architecture Analysis
- Bug Fixing

#### Memory System
Complete memory system with:
- Semantic Memory (knowledge and concepts)
- Episodic Memory (task history)
- Procedural Memory (workflows)
- System Memory (team-shared templates)

#### Git Integration
Automated Git operations:
- Auto-commit after initialization
- Separate commits for Claude files
- Remote sync to memory template repository
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

### v2.0 (In Design)

**Status**: Design phase complete, implementation starting

**Timeline**: 4-5 weeks

**Key Features**:
- ✅ Plugin-based architecture (designed)
- ✅ Interactive CLI (designed)
- ✅ i18n support (designed)
- ✅ `memory system-add` command (designed)
- ⏳ Implementation (pending)

**Phases**:
1. Core framework (Week 1)
2. Plugin implementation (Week 2-3)
3. Internationalization (Week 4)
4. Testing & Documentation (Week 5)

See [Design Documents](./docs/) for complete details.

### v1.x (Current - Deprecated)

**Status**: Maintenance mode only

The current v1.x codebase is functional but will be replaced by v2.0.

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

**Current Version**: 1.0.0 (stable)
**Next Version**: 2.0.0-alpha (in design)
**Last Updated**: 2025-01-18
