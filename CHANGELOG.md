# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0-alpha] - 2025-11-26

### Heavyweight Plugin Framework

**Major Feature**: Support for external plugins with their own initialization commands and file generation.

#### Added

- **Heavyweight Plugin Framework**:
  - `HeavyweightPluginManager` class for managing complex plugin initialization
  - File protection mechanism with automatic backup before external commands
  - Three merge strategies: `append`, `prepend`, and `custom`
  - Full rollback support on initialization failure
  - Command timeout handling (default 2 minutes, configurable)

- **Plugin Type Extensions**:
  - `meta.heavyweight: boolean` - Mark plugins as heavyweight
  - `meta.conflicts: string[]` - Declare plugin conflicts
  - `getHeavyweightConfig()` - Return protected files and init command
  - `mergeFile()` - Custom merge function for complex file types

- **Claude Flow Plugin** (first heavyweight plugin):
  - Integration with claude-flow for AI orchestration
  - Multiple initialization modes: standard, sparc, minimal, skip
  - Workflow selection (code-review, documentation, testing, etc.)
  - MCP server configuration support
  - Swarm mode for multi-agent orchestration

- **Conflict Detection and Resolution**:
  - Automatic detection of conflicting plugins during selection
  - Visual conflict indicators in plugin list
  - First-selected plugin wins resolution strategy
  - Warning messages for removed conflicting plugins

- **Helper Functions**:
  - `isHeavyweightPlugin()` - Check if plugin is heavyweight
  - `separatePluginsByWeight()` - Split plugins into lightweight/heavyweight groups

#### Changed

- **Initialization Order**:
  - Lightweight plugins execute first (standard lifecycle)
  - AGENT.md generated after lightweight plugins
  - Heavyweight plugins execute last (with file protection)

- **Interactive Initializer**:
  - Shows "[heavyweight]" indicator for heavyweight plugins
  - Displays conflict information in plugin descriptions
  - Shows warning when heavyweight plugins are selected
  - Progress indicator includes heavyweight plugin step

- **Plugin Selection UI**:
  - Conflict map built from all plugin metadata
  - Automatic conflict resolution during selection
  - Clear feedback on removed plugins

#### Technical Details

- **New Files**:
  - `src/core/heavyweight-plugin-manager.ts` - Core framework
  - `tests/unit/core/heavyweight-plugin-manager.test.ts` - Unit tests (40+ tests)
  - `tests/unit/plugins/claude-flow/configurator.test.ts` - Claude Flow tests
  - `tests/integration/plugins/claude-flow-integration.test.ts` - Integration tests
  - `tests/bdd/step-definitions/heavyweight-plugins.steps.ts` - BDD steps
  - `tests/bdd/features/heavyweight-plugins.feature` - BDD scenarios

- **Test Coverage**:
  - Unit tests: 329 passing
  - BDD scenarios: 49 passing
  - Full coverage of backup, execute, merge, and restore flows

#### Documentation

- `docs/HEAVYWEIGHT_PLUGINS.md` - Complete design document
- `docs/CLAUDE_FLOW_QUICK_START.md` - Claude Flow setup guide
- Updated `README.md` with heavyweight plugins section
- Updated `docs/PLUGIN_ARCHITECTURE_REFACTOR.md` with v2.2 section
- Updated `docs/USER_GUIDE.md` with heavyweight plugins usage

---

## [2.1.0-beta] - 2025-11-26

### 🎉 Two-Layer Memory Architecture

**Major Enhancement**: Separation of User Memory and Project Memory for better cross-project experience.

#### Added

- **Two-Layer Memory System**:
  - **User Memory** (`~/.claude/`): Stores user preferences across all projects
    - OS information (type, name, system package manager)
    - Preferred package managers (Python, Node.js)
    - Locale settings (timezone, language)
    - Created/updated timestamps
  - **Project Memory** (`.agent/`): Stores project-specific configuration
    - Actual package managers used in this project
    - Can differ from user preferences
    - Configured timestamp

- **Smart Configuration Reuse**:
  - First-time setup: Detect system and save to User Memory
  - Subsequent projects: Reuse preferences from User Memory
  - One confirmation instead of multiple selections
  - Dramatically improved UX for multi-project users

- **AGENT.md/CLAUDE.md Append Mode**:
  - Detects existing AGENT.md or CLAUDE.md files
  - Appends new content after blank line instead of overwriting
  - Preserves user customizations
  - Prefers AGENT.md over CLAUDE.md when both exist

- **UI Facade Pattern** (`src/core/ui.ts`):
  - Solves ESM module mocking in Cucumber BDD tests
  - Uses object property mutability to bypass ESM readonly exports
  - Enables sinon.stub() in non-Vitest environments
  - Zero runtime overhead

- **Dynamic System Detection Hook** (`templates/hooks/system-detect.sh`):
  - Runtime detection of Python/Node.js versions
  - Outputs JSON for Claude Code integration
  - Separates static (stored) from dynamic (detected) info

#### Changed

- **System Detector Plugin** (v2.0 → v2.1):
  - Removed lockfile detection logic (moved to agent runtime)
  - Simplified to two-file output (user preferences + project config)
  - Removed `memory_scope` user selection (fixed locations now)
  - File structure:
    - OLD: `.agent/system/info.toon` (all-in-one)
    - NEW: `~/.claude/system/preferences.toon` (user preferences)
    - NEW: `.agent/system/config.toon` (project config)

- **File Operations** (`src/utils/file-ops.ts`):
  - Added scoped file operations (User vs Project)
  - Added `appendOrCreateFile()` for content preservation
  - Added `findFirstExistingFile()` utility

- **Interactive Initializer**:
  - Uses UI Facade instead of direct imports
  - Supports dual-scope file writing
  - Automatically creates User Memory structure when needed

#### Fixed

- **BDD Test Mocking**: Solved `vi.mocked()` incompatibility with Cucumber
  - Improved from 24/33 passing → 32/33 passing
  - All system-detection scenarios now pass
  - Implemented test isolation for User Memory files

- **Test File Paths**: Updated all integration tests to use new file paths
  - `info.toon` → `config.toon`
  - Updated content assertions for new TOON format

#### Testing

- **Unit Tests**: 196/196 passing ✅
- **Integration Tests**: 196/196 passing ✅
- **BDD Tests**: 32/33 passing ✅ (1 non-critical failure in plugin-lifecycle)

## [2.0.0-alpha] - 2025-11-20

### 🎉 Major Refactor - Plugin-Based Architecture

**Breaking Changes**: Complete rewrite with TOON format and plugin architecture.

#### Added

- **Plugin System**: Modular plugin-based architecture
  - 5 plugins: system-detector, memory-system, git, task-system, prompt-presets
  - Plugin interface with lifecycle hooks
  - Plugin configuration flow with user preferences
  - Dynamic plugin command registration

- **Interactive CLI**: Conversational setup experience
  - No parameters to remember
  - Dynamic step calculation based on selected plugins
  - Visual selection with checkboxes/radio buttons
  - Intelligent defaults
  - Real-time feedback

- **TOON Format**: Token-efficient data format
  - 30-60% fewer tokens than JSON
  - Human-readable like YAML
  - Native Claude support
  - Used for all config files (`.agent/**/*.toon`)

- **System Detector Plugin**: Smart environment detection
  - OS detection with package manager (pacman/apt/dnf/brew/etc)
  - Python detection with ALL available package managers (uv/pip/poetry/pipenv/conda)
  - Node.js detection with lock file priority (pnpm/npm/yarn/bun)
  - **Interactive selection** when multiple package managers found
  - **Persistent configuration** - only asks once, saves to `.agent/system/info.toon`
  - Static info cached (timezone, locale)

- **Memory System Plugin**: Knowledge persistence
  - Knowledge memory (semantic, stable knowledge)
  - History memory (episodic, task records)
  - Workflow procedures
  - TOON-based indexes for efficient lookup

- **Git Plugin**: Integrated Git operations
  - Auto-commit configuration
  - Separate commits for agent files
  - Gitignore management
  - AI git operations control

- **Task System Plugin**: Task management
  - Current task state (`current.toon`)
  - Task output organization
  - Workflow templates
  - Temporary workspace

- **Comprehensive Testing**: 100 tests covering all functionality
  - Unit tests (59): Plugin system, registry, loader
  - Integration tests (4): Full initialization scenarios
  - Smoke tests (37): Complete system validation

#### Changed

- **Directory**: `claude/` → `.agent/`
- **Entry file**: `CLAUDE.md` → `AGENT.md`
- **Config format**: YAML → TOON
- **Architecture**: Monolithic → Plugin-based with placeholder system

- **CLI Commands**: Drastically simplified (950 lines → 166 lines, 84% reduction)
  - `claude-init` or `claude-init init` (interactive setup)
  - Plugin commands dynamically registered

#### Removed

- All parameter-based modes (--quick, --interactive, --simple, --config)
- Management commands (status, show, add-objective, add-assumption, set, remove-*, edit)
- validate, sync commands (integrated into plugins)
- Configuration migration tool (v1.x → v2.0 migration requires manual setup)

#### Technical Improvements

- Tool chain: Jest → Vitest (build speed 5-6x faster)
- Build: TSC → Vite (365ms vs 2-3s)
- Module system: Pure ESM
- Type safety: 0 `any` types, strict mode
- Test coverage: 100% of critical paths

### Migration from v1.x

**Manual migration required** (auto-migration deemed too complex):
1. Backup your `claude/` directory
2. Review and save your custom configurations
3. Run `claude-init init` to create new `.agent/` structure
4. Manually transfer custom content as needed

**Note**: v1.x and v2.0 can coexist (different directories)

---

## [1.0.0] - 2025-01-07 (Legacy)

## [1.0.0] - 2025-10-30

### Added

- Initial release of Claude Memory System Initializer
- Three initialization modes:
  - **Quick mode**: Initialize with sensible defaults (`--quick`)
  - **Config mode**: Initialize from YAML config file (`--config`)
  - **Interactive mode**: Guided setup with prompts (`--interactive`)
- Configuration validation command (`validate`)
- Comprehensive template rendering system
  - Support for all config variables
  - Automatic date stamping
  - Validation of rendered templates
- Memory system structure initialization:
  - Copy template files from `mem/` directory
  - Generate `CLAUDE.md` from template
  - Initialize index files (`tags.json`, `topics.json`)
  - Create directory structure
  - Update `.gitignore`
- Interactive prompts for:
  - Project information
  - Language configuration
  - Paths configuration
  - Objectives definition
  - Assumptions and scope
  - Domain-specific terms (optional)
- CLI interface with Commander.js:
  - `init` command with multiple options
  - `validate` command for config checking
  - Help and version commands
- Colored console output with Ora spinners
- Comprehensive error handling
- Full TypeScript support with type definitions
- Complete documentation:
  - README with installation and usage
  - USAGE_EXAMPLES with 10+ practical examples
  - Inline code documentation

### Features

- **Template Variables**: Support for 20+ configuration variables including:
  - Project metadata (name, type, description)
  - Language preferences
  - Paths configuration
  - Objectives and assumptions
  - Domain configuration
  - Task settings
  - Output preferences
  - Git integration
  - Advanced tuning
- **Validation**: Pre-flight checks for:
  - Required fields presence
  - Configuration structure
  - Path existence
  - Template variable replacement
- **Flexible Paths**: Support for custom target directories
- **Idempotent**: Safe to re-run initialization
- **No Pollution**: Doesn't modify existing project dependencies

### Technical Details

- TypeScript 5.3+ with strict mode
- ES2022 modules
- Node.js 18+ required
- Dependencies:
  - `commander` for CLI interface
  - `inquirer` for interactive prompts
  - `chalk` for colored output
  - `ora` for loading spinners
  - `yaml` for config parsing
  - `fs-extra` for file operations

## [Unreleased]

### Added - 2025-11-06

#### File Exclusion System (Two-Stage Architecture)
- **Two-Stage File Handling**: Transparent, config-driven approach with no black boxes
  1. **`exclude_on_copy`**: Files never copied (skipped during template copy)
  2. **`delete_after_init`**: Files copied, used, then deleted (e.g., templates)
- **New Config Format**: `.claude-init-exclude` with explicit sections for each stage
- **Full Transparency**: Users can see and control what happens to every file
- **Three Rule Types per Stage**: Supports patterns (glob), exact file names, and directory exclusions
- **Smart Defaults**:
  - `exclude_on_copy`: Framework docs, design files, setup guides, git files
  - `delete_after_init`: Template files (`.template`)
- **Config-Driven Template Cleanup**: Template deletion moved from hard-coded logic to configuration
- **No Hidden Behavior**: Everything is explicit and customizable

#### Initialization Detection & Protection
- **Marker File System**: Added `.claude-memory-init` hidden marker file to track project initialization status
- **Duplicate Detection**: Automatic detection of already-initialized projects to prevent accidental overwrites
- **Force Flag**: Added `--force` flag (`-f`) to `init` command for intentional re-initialization
- **Status Command**: New `status` command to check if a project is initialized and view initialization metadata

#### Incremental Configuration Management
The tool is now a full configuration manager, not just an initializer:
- **show**: Display current configuration without editing files
- **add-objective <text>**: Add new objectives on the fly with optional custom memory operations
- **add-assumption <text>**: Add new assumptions as you discover them
- **set <key> <value>**: Update any configuration value using dot notation (e.g., `language.user_language`)
- **remove-objective <index>**: Remove objectives by index
- **remove-assumption <index>**: Remove assumptions by index
- **edit**: Open config file in your preferred editor ($EDITOR, $VISUAL, or vi)

#### Developer Experience Improvements
- Better error messages when trying to initialize an existing project
- Clear guidance on using config management vs re-initialization
- Marker file tracks initialization metadata (date, version, project name, base directory)
- All management commands work from any project directory with `--target` option
- Helpful suggestions after failed duplicate initialization attempt
- Quick mode now saves config.yaml for future management

### Changed
- `init --quick` now saves config.yaml file (previously only created in-memory config)
- Enhanced CLI output with helpful next steps after initialization
- Better user guidance throughout all commands
- Improved documentation with incremental workflow examples

### Technical Details
- **New module**: `src/core/exclusion.ts` - File exclusion system with pattern matching
- **New module**: `src/core/marker.ts` - Marker file management and metadata tracking
- **New module**: `src/core/config-manager.ts` - Configuration management utilities
- **Enhanced**: `src/cli.ts` - Added 7 new commands and initialization checks
- **Updated**: `src/core/initializer.ts` - Creates marker file and applies exclusions during copy
- **New config**: `.claude-init-exclude` - Default exclusion rules for framework files
- **New docs**: `INCREMENTAL_USAGE.md` - Guide for incremental workflow
- **New docs**: `COMMAND_REFERENCE.md` - Quick reference for all commands

### Migration Guide for Existing Projects

If you initialized a project before the marker file feature, you can either:

**Option 1: Add marker file manually (recommended)**
```bash
cd your-project/claude
echo '{
  "initialized": true,
  "version": "1.0.0",
  "date": "2025-11-06",
  "base_dir": "claude",
  "project_name": "your-project-name"
}' > .claude-memory-init
```

**Option 2: Re-initialize with --force**
```bash
claude-memory-init init --quick --force
```

### Planned

- GitHub Action for automated initialization
- Config file generation wizard
- Support for project templates (presets)
- Integration with popular frameworks (Next.js, Express, etc.)
- Multi-project workspace support
- Config migration tools
- VS Code extension integration
- Custom template support
- Backup/restore functionality

---

[1.0.0]: https://github.com/dt-activenetwork/claude-memory-init/releases/tag/v1.0.0
