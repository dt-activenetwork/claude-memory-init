# Claude Init - Project Instructions

A CLI tool for initializing Claude Agent systems in projects with a plugin-based architecture.

**Repository:** https://github.com/dt-activenetwork/claude-memory-init
**Version:** 2.2.0-alpha

## Quick Reference

```bash
# Initialize a project (interactive)
claude-init

# Force re-initialization
claude-init init --force

# Plugin commands (dynamically registered)
claude-init <plugin-command> <subcommand>
```

## Architecture

### Plugin-Based System

The tool uses a modular plugin architecture with built-in plugins:

#### Lightweight Plugins

| Plugin | Command Name | Purpose |
|--------|--------------|---------|
| core | core | Essential commands (always enabled) |
| system-detector | system | Auto-detect OS, Python, Node.js environments |
| language-settings | language | Configure AI language preferences (think/output) |
| memory-system | memory | Knowledge persistence with TOON indexes |
| git | git | Git automation and rules |
| task-system | task | Task state tracking and workflows |
| prompt-presets | presets | Custom prompt templates |
| pma-gh | pma | GitHub workflow (issue, PR, close) |

#### Heavyweight Plugins (v2.2+)

Heavyweight plugins have their own initialization commands and require file protection/merging.

| Plugin | Command Name | Purpose |
|--------|--------------|---------|
| claude-flow | flow | AI orchestration with multi-agent support |

**Heavyweight Plugin Features:**
- Runs external init commands (e.g., `pnpm dlx claude-flow@alpha init`)
- Backs up protected files before initialization
- Merges file changes using configurable strategies (append, prepend, custom)
- Supports plugin conflict detection

### Generated Structure

```
project/
├── AGENT.md                    # Main instructions for Claude
└── .agent/
    ├── config.toon             # Main configuration
    ├── system/
    │   └── config.toon         # Project system configuration
    ├── git/
    │   ├── rules.md            # Git operation rules
    │   └── config.toon         # Git configuration
    ├── memory/
    │   ├── index/
    │   │   ├── tags.toon       # Tag-based index
    │   │   └── topics.toon     # Topic hierarchy
    │   ├── knowledge/          # Semantic memory (stable knowledge)
    │   ├── history/            # Episodic memory (task records)
    │   └── workflows/          # Procedural memory
    ├── tasks/
    │   ├── current.toon        # Current task state
    │   ├── output/             # Task deliverables
    │   └── tmp/                # Temporary files (gitignored)
    └── presets/                # Custom prompts

~/.claude/                      # User Memory (cross-project)
├── system/
│   └── preferences.toon        # User system preferences
├── preferences/                # User preferences
└── cache/                      # Cache directory
```

**Note**: User Memory (`~/.claude/`) stores cross-project preferences like OS info and preferred package managers, reducing re-configuration when initializing new projects.

## Project Structure

```
claude-memory-init/
├── src/
│   ├── cli.ts                  # CLI entry point
│   ├── index.ts                # Main module export
│   ├── constants.ts            # Global constants
│   ├── core/                   # Core framework
│   │   ├── initializer.ts      # Main initialization
│   │   ├── interactive-initializer.ts  # Interactive flow
│   │   ├── heavyweight-plugin-manager.ts  # Heavyweight plugin handling
│   │   ├── output-router.ts    # Output path routing
│   │   ├── resource-writer.ts  # Resource file writing
│   │   ├── ui.ts               # UI Facade (for testability)
│   │   ├── template-engine.ts  # Template rendering
│   │   ├── agent-assembler.ts  # AGENT.md assembly
│   │   ├── config-loader.ts    # Config loading
│   │   ├── config-manager.ts   # Config management
│   │   ├── marker.ts           # Project marker
│   │   ├── validator.ts        # Validation
│   │   └── exclusion.ts        # File exclusion rules
│   ├── plugin/                 # Plugin system
│   │   ├── types.ts            # Plugin interfaces (incl. heavyweight types)
│   │   ├── registry.ts         # Plugin registry
│   │   ├── loader.ts           # Plugin loader
│   │   ├── context.ts          # Plugin context
│   │   └── index.ts            # Exports
│   ├── plugins/                # Built-in plugins
│   │   ├── core/               # Essential commands (always enabled)
│   │   ├── system-detector/    # Environment detection
│   │   │   ├── index.ts
│   │   │   └── detectors/
│   │   │       ├── os.ts
│   │   │       ├── python.ts
│   │   │       └── node.ts
│   │   ├── language-settings/  # AI language preferences
│   │   ├── memory-system/      # Memory persistence
│   │   ├── git/                # Git integration
│   │   ├── task-system/        # Task management
│   │   ├── prompt-presets/     # Prompt templates
│   │   ├── claude-flow/        # Heavyweight: AI orchestration
│   │   ├── pma-gh/             # GitHub workflow
│   │   └── index.ts            # Plugin registry
│   ├── prompts/                # Interactive UI
│   │   ├── components/         # UI components
│   │   │   ├── input.ts
│   │   │   ├── confirm.ts
│   │   │   ├── checkbox-list.ts
│   │   │   ├── radio-list.ts
│   │   │   └── progress.ts
│   │   ├── project-info.ts
│   │   ├── system-info.ts
│   │   ├── objectives.ts
│   │   └── simple-prompts.ts
│   ├── i18n/                   # Internationalization
│   │   ├── en/                 # English translations
│   │   ├── zh/                 # Chinese translations
│   │   └── index.ts            # i18n entry point
│   ├── utils/                  # Utilities
│   │   ├── file-ops.ts         # File operations
│   │   ├── git-ops.ts          # Git operations
│   │   ├── gitignore-manager.ts
│   │   ├── auto-commit.ts
│   │   ├── merge-utils.ts      # File merge utilities
│   │   ├── toon-utils.ts       # TOON format utilities
│   │   ├── logger.ts           # Console output
│   │   └── date-utils.ts
│   └── types/
│       └── config.ts           # Configuration types
├── templates/                  # Template files
│   ├── agent/
│   │   └── AGENT.md.template
│   ├── commands/
│   │   ├── core/               # Core slash commands
│   │   ├── memory/             # Memory slash commands
│   │   ├── task/               # Task slash commands
│   │   └── pma/                # PMA-GH slash commands
│   ├── skills/                 # Skill templates
│   │   └── gh-issue.md         # GitHub issue skill
│   ├── memory/
│   │   ├── memory-workflow.md
│   │   ├── tags.toon.template
│   │   ├── topics.toon.template
│   │   └── system/tools/
│   ├── presets/
│   │   ├── bases/              # Base mode presets
│   │   └── enhancements/       # Enhancement presets
│   └── hooks/
├── tests/
│   ├── unit/                   # Unit tests (Vitest)
│   ├── bdd/                    # BDD tests (Cucumber)
│   └── integration/            # Integration tests
├── docs/                       # Design documentation
├── mem/                        # Git submodule (template source)
└── dist/                       # Compiled output
```

## Key Concepts

### TOON Format

Token-Oriented Object Notation - 30-60% fewer tokens than JSON:

```toon
project:
  name: my-project
  version: 1.0.0

plugins:
  system-detector:
    enabled: true
  memory-system:
    enabled: true

tags[3]: api,auth,database
```

### Plugin Interface

```typescript
interface Plugin {
  meta: {
    name: string;
    version: string;
    description: string;
    commandName?: string;      // CLI command name
    recommended?: boolean;     // Show as recommended
    heavyweight?: boolean;     // Has external init command
    conflicts?: string[];      // Conflicting plugins
  };

  // Configuration flow (structured)
  configuration?: {
    needsConfiguration: boolean;
    configure(context: ConfigurationContext): Promise<PluginConfig>;
    getSummary(config: PluginConfig): string[];
  };

  // Lifecycle hooks
  hooks?: {
    beforeInit?(context: PluginContext): Promise<void>;
    execute?(context: PluginContext): Promise<void>;
    afterInit?(context: PluginContext): Promise<void>;
    cleanup?(context: PluginContext): Promise<void>;
  };

  // CLI commands
  commands?: PluginCommand[];

  // Slash commands (auto-written to .claude/commands/)
  slashCommands?: SlashCommand[];

  // Skills (auto-written to .claude/skills/<name>/SKILL.md)
  skills?: Skill[];

  // Prompt contribution to AGENT.md
  prompt?: {
    placeholder: string;
    generate(config: PluginConfig): string;
  };

  // File outputs to .agent/
  outputs?: {
    generate(context: PluginContext, config: PluginConfig): Promise<OutputFile[]>;
  };

  // Heavyweight plugin methods
  getHeavyweightConfig?(context: PluginContext): HeavyweightPluginConfig;
  mergeFile?(filePath: string, ourContent: string | null, theirContent: string): string;
}
```

### Interactive Flow

1. Project Information - name, description
2. Feature Selection - choose plugins (checkbox)
3. Plugin Configuration - per-plugin settings (dynamic)
4. Summary & Confirmation - review and confirm
5. Execution - create files and directories

## Development

### Setup

```bash
git clone --recurse-submodules https://github.com/dt-activenetwork/claude-memory-init.git
cd claude-memory-init
pnpm install
pnpm build
```

### Commands

```bash
pnpm build          # Build with Vite + TypeScript
pnpm dev            # Watch mode
pnpm test           # Run unit tests (Vitest)
pnpm test:bdd       # Run BDD tests (Cucumber)
pnpm test:all       # Run all tests
pnpm start          # Run built CLI
```

### Tech Stack

- **Build**: Vite + TypeScript 5
- **CLI**: Commander.js v12
- **Interactive**: Inquirer.js v9
- **Testing**: Vitest + Cucumber
- **Data Format**: TOON (@toon-format/toon)
- **I18N**: typesafe-i18n v5

## Documentation

### Reading Guide

**For major refactoring**: This file (`CLAUDE.md`) + `src/plugin/types.ts` is sufficient. Code is the source of truth.

**For specific subsystems** (read only when needed):

| Task | Read |
|------|------|
| Modify plugin system | `src/plugin/types.ts` (code) |
| Modify heavyweight plugin mechanism | docs/HEAVYWEIGHT_PLUGINS.md |
| Modify OutputRouter/ResourceWriter | docs/UNIFIED_RESOURCE_REGISTRATION.md |
| Modify i18n system | docs/I18N_DESIGN.md |
| Modify interactive flow | docs/INTERACTIVE_CLI_DESIGN.md |
| Modify CLI commands | docs/CLI_COMMANDS_DESIGN.md |
| Modify AGENT.md generation | docs/PLUGIN_PROMPT_SPECIFICATION.md |

**Skip these** (user docs, not design docs):
- USER_GUIDE.md, EXAMPLES.md, CLAUDE_FLOW_QUICK_START.md, BDD_SETUP.md

### Design Docs (docs/)

| Document | Content |
|----------|---------|
| PLUGIN_ARCHITECTURE_REFACTOR.md | Plugin system design (historical reference) |
| HEAVYWEIGHT_PLUGINS.md | Heavyweight plugin framework (v2.2+) |
| UNIFIED_RESOURCE_REGISTRATION.md | OutputRouter and ResourceWriter |
| I18N_DESIGN.md | Internationalization |
| INTERACTIVE_CLI_DESIGN.md | Interactive flow design |
| CLI_COMMANDS_DESIGN.md | Command structure |
| PLUGIN_PROMPT_SPECIFICATION.md | AGENT.md generation rules |

### User Docs

- README.md - Quick start and overview
- CHANGELOG.md - Version history
- docs/USER_GUIDE.md - Comprehensive user guide
- docs/EXAMPLES.md - Usage examples

## Testing

### Test Structure

```
tests/
├── unit/                    # Fast, isolated tests
│   ├── plugin/              # Plugin system tests
│   ├── plugins/             # Individual plugin tests
│   └── utils/               # Utility tests
├── bdd/                     # Behavior-driven tests
│   ├── features/            # .feature files
│   └── step-definitions/    # Step implementations
└── integration/             # End-to-end tests
```

### Running Tests

```bash
# Unit tests
pnpm test

# BDD tests
pnpm test:bdd

# All tests
pnpm test:all

# Coverage
pnpm test:coverage
```

## Status

**Version**: 2.2.0-alpha
**Status**: Heavyweight plugin framework + I18N implemented (399 unit tests + 49 BDD scenarios passed)
**Last Updated**: 2025-12-10
