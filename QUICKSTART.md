# Quick Start Guide

Get up and running with Claude Memory System Initializer in 60 seconds.

## Installation

```bash
# Global installation
npm install -g @claude-memory/init

# Or use directly with pnpm
pnpm dlx @claude-memory/init init --quick
```

## Quick Start (30 seconds)

Initialize with defaults in any project:

```bash
cd your-project
claude-memory-init init --quick
```

That's it! Your project now has:
- ✅ `claude/` directory with memory system
- ✅ `CLAUDE.md` in your project root
- ✅ Initialized indexes
- ✅ Updated `.gitignore`

## Using the Memory System

After initialization, use Claude with the memory system:

1. **Open Claude** in your project
2. Claude will automatically read `CLAUDE.md`
3. Start working - Claude will maintain context across sessions

## Custom Configuration (2 minutes)

Want to customize? Use config mode:

### 1. Create config file

```bash
cp claude/config.example.yaml claude/config.yaml
```

### 2. Edit configuration

```yaml
project:
  name: "My Project"
  type: "Node.js backend"
  description: "My awesome project"

objectives:
  - objective: "Document the API"
    memory_check: "Search for API docs"
    memory_update: "Create API documentation"

assumptions:
  - "Uses Express.js"
```

### 3. Initialize

```bash
claude-memory-init init --config claude/config.yaml
```

## Interactive Mode (5 minutes)

Prefer guided setup?

```bash
claude-memory-init init --interactive
```

Answer the prompts:
- Project name, type, description
- Languages
- Objectives
- Assumptions

## Validation

Check your config before initializing:

```bash
claude-memory-init validate --config claude/config.yaml
```

## What's Next?

- Read [README.md](./README.md) for full documentation
- See [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) for 10+ practical examples
- Check `claude/` directory for memory system structure

## Common Commands

```bash
# Quick init
claude-memory-init init --quick

# From config
claude-memory-init init --config ./claude/config.yaml

# Interactive
claude-memory-init init --interactive

# Validate
claude-memory-init validate --config ./claude/config.yaml

# Help
claude-memory-init --help
```

## Troubleshooting

**Config not found?**
```bash
# Specify full path
claude-memory-init init --config /full/path/to/config.yaml
```

**Permission errors?**
```bash
# Check directory permissions
ls -la
chmod u+w .
```

**Want to start over?**
```bash
# Remove and re-initialize
rm -rf claude CLAUDE.md .gitignore
claude-memory-init init --quick
```

## Need Help?

- 📖 [Full Documentation](./README.md)
- 💡 [Examples](./USAGE_EXAMPLES.md)
- 🐛 [Report Issues](https://github.com/yourusername/claude-memory-init/issues)

---

**Pro tip**: Start with `--quick` mode, then customize `claude/config.yaml` and re-run if needed!
