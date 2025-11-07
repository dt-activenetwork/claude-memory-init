# Command Reference

Quick reference for all `claude-memory-init` commands.

## Initialization Commands

| Command | Description | Example |
|---------|-------------|---------|
| `init --quick` | Initialize with defaults | `claude-memory-init init --quick` |
| `init --interactive` | Interactive setup wizard | `claude-memory-init init --interactive` |
| `init --config <path>` | Initialize from config file | `claude-memory-init init --config ./my-config.yaml` |
| `init --force` | Force re-initialization | `claude-memory-init init --quick --force` |
| `validate --config <path>` | Validate config file | `claude-memory-init validate --config ./claude/config.yaml` |

**Note:** The tool automatically detects if a project is already initialized using a hidden `.claude-memory-init` marker file. Use `--force` to override.

## Configuration Management Commands

| Command | Description | Example |
|---------|-------------|---------|
| `status` | Check if project is initialized | `claude-memory-init status` |
| `show` | Display current configuration | `claude-memory-init show` |
| `edit` | Open config in editor | `claude-memory-init edit` |
| `add-objective <text>` | Add new objective | `claude-memory-init add-objective "Document API"` |
| `add-assumption <text>` | Add new assumption | `claude-memory-init add-assumption "Uses React"` |
| `set <key> <value>` | Update config value | `claude-memory-init set language.user_language Chinese` |
| `remove-objective <index>` | Remove objective by index | `claude-memory-init remove-objective 0` |
| `remove-assumption <index>` | Remove assumption by index | `claude-memory-init remove-assumption 1` |

## Common Options

All commands support these options:

- `-t, --target <path>` - Specify target directory (default: current directory)
- `-h, --help` - Show help for command
- `-V, --version` - Show version

## Quick Workflow

```bash
# 1. Check if already initialized
claude-memory-init status

# 2. Initialize (if not already)
claude-memory-init init --quick

# 3. Check what was created
claude-memory-init show

# 4. Add objectives as you work
claude-memory-init add-objective "Your objective here"

# 5. Add assumptions as you learn
claude-memory-init add-assumption "Your assumption here"

# 6. Update settings
claude-memory-init set key.subkey value

# 7. Review and edit
claude-memory-init show
claude-memory-init edit
```

## Advanced add-objective Options

```bash
# Simple (auto-generates memory operations)
claude-memory-init add-objective "Document the API"

# Custom memory operations
claude-memory-init add-objective "Fix auth bugs" \
  --check "Search for previous auth issues" \
  --update "Document auth bug patterns"
```

## Common set Commands

```bash
# Language
claude-memory-init set language.user_language Chinese
claude-memory-init set language.think_language English

# Project info
claude-memory-init set project.name "MyApp"
claude-memory-init set project.type "Web Application"
claude-memory-init set project.description "My awesome app"

# Paths
claude-memory-init set paths.base_dir ".claude"
```

## Configuration Keys (for `set` command)

### Project
- `project.name` - Project name
- `project.type` - Project type
- `project.description` - Project description

### Language
- `language.user_language` - Output language (English, Chinese, Japanese, etc.)
- `language.think_language` - Reasoning language (usually English)

### Paths
- `paths.base_dir` - Base directory name (default: claude)
- `paths.codebase` - Codebase path

### Tasks
- `tasks.use_task_specific_indexes` - Boolean
- `tasks.use_incremental_work` - Boolean
- `tasks.max_context_per_step` - Number
- `tasks.max_task_context` - Number
- `tasks.hygiene_cycle_frequency` - Number

### Output
- `output.format` - Output format (markdown)
- `output.include_diagrams` - Boolean
- `output.code_reference_format` - Code reference style (file:line)

### Advanced
- `advanced.max_tags` - Number
- `advanced.max_topics` - Number
- `advanced.max_cross_refs` - Number
- `advanced.target_context_reduction` - Float (0.0-1.0)
- `advanced.target_index_lookup_time` - Float (seconds)

## Submodule Management

| Command | Description |
|---------|-------------|
| `submodule --status` | Check submodule status |
| `submodule --init` | Initialize submodule |
| `submodule --update` | Update submodule to latest |

## Environment Variables

- `EDITOR` or `VISUAL` - Editor for `edit` command (default: vi)

Example:
```bash
EDITOR=code claude-memory-init edit
```

## Examples by Use Case

### Starting a New Project
```bash
claude-memory-init init --quick
claude-memory-init show
```

### Adding Context After Discovery
```bash
claude-memory-init add-objective "Document database schema"
claude-memory-init add-assumption "PostgreSQL 15"
claude-memory-init add-assumption "Prisma ORM"
```

### Changing Languages
```bash
claude-memory-init set language.user_language Chinese
claude-memory-init show  # Verify change
```

### Cleanup After Completing Work
```bash
claude-memory-init show  # See indexes
claude-memory-init remove-objective 2  # Remove completed objective
claude-memory-init show  # Verify
```

### Working in Different Directory
```bash
claude-memory-init show --target /path/to/project
claude-memory-init add-objective "New task" --target /path/to/project
```

## Exit Codes

- `0` - Success
- `1` - Error (see error message for details)

## Getting Help

```bash
# General help
claude-memory-init --help

# Command-specific help
claude-memory-init init --help
claude-memory-init add-objective --help
```

## See Also

- [README.md](./README.md) - Main documentation
- [INCREMENTAL_USAGE.md](./INCREMENTAL_USAGE.md) - Incremental workflow guide
- [mem/config.example.yaml](./mem/config.example.yaml) - Full config reference
