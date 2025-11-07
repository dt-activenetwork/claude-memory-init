# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Remote Repository Support**: Initialize from remote git repositories
  - Added `--repo <url>` option to `init` command
  - Automatically clone to OS temp directory (e.g., `/tmp/claude-memory-xxxxx`)
  - Auto-cleanup of temporary directories after initialization
  - Fallback to local `mem/` directory when `--repo` not specified

- **Sync and PR Creation**: New `sync` command for team collaboration
  - Compare local memory system with remote repository
  - Smart filtering: only system prompts (`prompt/`) included in PRs
  - Semantic memories (`memory/semantic/`, `memory/episodic/`) excluded from PRs
  - Hash-based branch naming: `sp-{hash}` format
    - Hash generated from: username + date + clean filenames
    - Clean filenames: numbers and extensions removed (e.g., `1.objectives.md` → `objectives`)
    - Short 8-character MD5 hash for brevity
  - Uses git config user.name and user.email for commits
  - Single PR label: `system-prompt-update` for all system prompt PRs
  - Options: `--pr` to create branch, `--no-cleanup` to keep temp dir

- **Enhanced Commit Messages**: Descriptive PR-ready commits
  - Include author information from git config
  - List all modified system memory files
  - Clear separation of what's included vs excluded
  - Guidance for pushing and creating PR

### Changed

- `initialize()` function now accepts optional `memoryRepoUrl` parameter
- `copyMemorySystemTemplate()` supports both remote and local sources
- All init modes (`--quick`, `--interactive`, `--config`) support `--repo` option

### Documentation

- Added `REMOTE_SYNC.md` with detailed sync workflow documentation
- Updated `README.md` with remote repository and sync examples
- Added usage examples for team collaboration scenarios

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
