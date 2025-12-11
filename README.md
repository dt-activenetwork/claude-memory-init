# Claude Init

Interactive CLI tool for setting up Claude in your projects with a plugin-based architecture.

[![Version](https://img.shields.io/badge/version-2.2.0--alpha-blue)](https://github.com/dt-activenetwork/claude-memory-init)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## ✨ What's New in v2.2

🎉 **Heavyweight Plugin Framework & I18N Support**

- **🔧 Heavyweight Plugins**: Support for external plugins with their own init commands (e.g., Claude Flow)
- **🔀 Smart File Merging**: Backup, merge, and rollback protected files during plugin initialization
- **⚠️ Conflict Detection**: Automatic detection and resolution of plugin conflicts
- **🌍 I18N Support**: Full internationalization with English and Chinese
- **📦 New Plugins**: Core, Claude Flow, PMA-GH (GitHub workflow)
- **🎯 Unified Resource Registration**: Declarative slash commands and skills

### Previous Updates

**v2.1** - Two-Layer Memory Architecture
- User Memory (`~/.claude/`) vs Project Memory (`.agent/`)
- Smart reuse across projects, append mode for existing files

**v2.0** - Plugin System
- Modular architecture with composable plugins
- Interactive CLI, TOON format, smart detection

> **Status**: v2.2.0-alpha. Testing: 543 unit tests + 49 BDD scenarios passing.

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

#### Lightweight Plugins

| Plugin | Description | Features |
|--------|-------------|----------|
| **Core** | Essential commands | Always enabled, provides `/session-init` |
| **System Detection** | Auto-detect environment | Two-layer memory (user/project), smart reuse |
| **Memory System** | Knowledge persistence | Knowledge, history memory with TOON indexes |
| **Git Integration** | Git automation | Auto-commit, remote sync, gitignore management |
| **Task System** | Task workflows | State tracking, output management, workflows |
| **Prompt Presets** | Custom prompts | User-defined templates |
| **PMA-GH** | GitHub workflow | Issue tracking, PR creation, `/pma-issue`, `/pma-pr` |

#### Heavyweight Plugins (v2.2+)

Heavyweight plugins have their own initialization commands and may generate files that need merging.

| Plugin | Description | Init Command |
|--------|-------------|--------------|
| **Claude Flow** | AI orchestration with multi-agent support | `pnpm dlx claude-flow@alpha init` |

**Key Features:**
- **File Protection**: Backs up protected files before plugin initialization
- **Smart Merging**: Three merge strategies (append, prepend, custom)
- **Conflict Detection**: Automatically detects and resolves plugin conflicts (e.g., Claude Flow conflicts with Task System)
- **Rollback Support**: Restores backups if initialization fails

See [Heavyweight Plugins Design](./docs/HEAVYWEIGHT_PLUGINS.md) for details.

---

### Plugin Configuration

You can configure which plugins are visible during initialization using a configuration file:

```json
// .claude-init.json (project-level) or ~/.claude-init/config.json (user-level)
{
  "plugins": {
    "disabled": ["claude-flow", "pma-gh"],
    "enabled": ["system-detector", "git"]
  }
}
```

**Configuration file search order** (priority from high to low):
1. Project: `.claude-init.json`
2. Project: `.claude-init/config.json`
3. User: `~/.claude-init/config.json`

**Notes:**
- `enabled` (whitelist) takes precedence over `disabled` (blacklist)
- The `core` plugin cannot be disabled
- This is useful for teams that want to standardize on specific plugins

---

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

Complete design documentation for v2.0+ refactor:

- **[Design Overview](./docs/README.md)** - Start here
- **[Refactor Summary](./docs/REFACTOR_SUMMARY.md)** - Complete refactor plan
- **[Plugin Architecture](./docs/PLUGIN_ARCHITECTURE_REFACTOR.md)** - Plugin system design
- **[Heavyweight Plugins](./docs/HEAVYWEIGHT_PLUGINS.md)** - Heavyweight plugin framework
- **[Claude Flow Quick Start](./docs/CLAUDE_FLOW_QUICK_START.md)** - Claude Flow integration guide
- **[Interactive CLI](./docs/INTERACTIVE_CLI_DESIGN.md)** - Interactive flow design
- **[CLI Commands](./docs/CLI_COMMANDS_DESIGN.md)** - Command structure
- **[i18n Design](./docs/I18N_DESIGN.md)** - Internationalization

### User Guides

- **[User Guide](./docs/USER_GUIDE.md)** - Complete usage documentation

---

## 🏗️ Project Structure

```
claude-memory-init/
├── src/
│   ├── core/                    # Core framework
│   │   ├── interactive-initializer.ts
│   │   ├── heavyweight-plugin-manager.ts
│   │   ├── output-router.ts
│   │   └── resource-writer.ts
│   ├── plugin/                  # Plugin system
│   │   ├── types.ts
│   │   ├── loader.ts
│   │   └── registry.ts
│   ├── plugins/                 # Built-in plugins
│   │   ├── core/                # Essential commands
│   │   ├── system-detector/
│   │   ├── memory-system/
│   │   ├── git/
│   │   ├── task-system/
│   │   ├── prompt-presets/
│   │   ├── claude-flow/         # Heavyweight
│   │   └── pma-gh/              # GitHub workflow
│   ├── i18n/                    # Internationalization
│   │   ├── en/
│   │   └── zh/
│   └── cli.ts                   # CLI entry point
├── templates/                   # Template files
│   ├── commands/                # Slash command templates
│   └── skills/                  # Skill templates
├── docs/                        # Documentation
├── mem/                         # Memory template (submodule)
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
- **Data Format**: TOON (@toon-format/toon)
- **i18n**: typesafe-i18n v5
- **Type System**: TypeScript v5

---

## 🗺️ Roadmap

### v2.2 (Current)

**Status**: Alpha - Heavyweight plugins and I18N implemented

**Key Features**:
- ✅ Heavyweight Plugin Framework
- ✅ I18N support (English, Chinese)
- ✅ Claude Flow integration
- ✅ PMA-GH plugin (GitHub workflow)
- ✅ Unified resource registration
- ✅ Dependency detection system (auto-install CLI tools)
- ✅ Plugin visibility configuration
- ✅ Enhanced completion messages
- ✅ 543 unit tests + 49 BDD scenarios

**Remaining**:
- ⏳ `memory system-add` command
- ⏳ Additional language support

### Previous Versions

- **v2.1**: Two-layer memory architecture
- **v2.0**: Plugin system, interactive CLI
- **v1.x**: Deprecated, no longer maintained

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

**Current Version**: 2.2.0-alpha
**Last Updated**: 2025-12-11
