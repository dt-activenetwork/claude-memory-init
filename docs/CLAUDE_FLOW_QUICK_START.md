# Claude Flow Quick Start Guide

A quick reference for integrating Claude Flow with claude-init.

**Version**: 2.2.0-alpha
**Last Updated**: 2025-11-26

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Initialization Modes](#initialization-modes)
5. [Workflow Selection](#workflow-selection)
6. [MCP Configuration](#mcp-configuration)
7. [Common Commands](#common-commands)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Claude Flow is an advanced AI orchestration tool that provides:
- Multi-agent coordination (Swarm mode)
- Structured workflows (SPARC methodology)
- MCP (Model Context Protocol) integration
- Task management and tracking

When integrated via claude-init, Claude Flow is set up as a **heavyweight plugin** that:
- Runs its own initialization command
- Automatically merges with existing CLAUDE.md content
- Handles configuration file conflicts

---

## Installation

### Option 1: With claude-init (Recommended)

```bash
# Initialize project with Claude Flow
cd your-project
claude-init

# Select Claude Flow in the feature list
📦 Select Features
  ◉ System Detection
  ◉ Memory System
  ◉ Claude Flow        [heavyweight]
  ◯ Task System        (conflicts with Claude Flow)
```

### Option 2: Standalone Installation

```bash
# Install Claude Flow directly
pnpm dlx claude-flow@alpha init

# Or globally
pnpm add -g claude-flow
claude-flow init
```

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Git (for version control)

---

## Configuration

### Interactive Configuration

When selecting Claude Flow during `claude-init`, you will be prompted for:

```
📝 Configure Claude Flow

? Select initialization mode:
  ● Standard   Full initialization with common workflows
  ○ SPARC      SPARC methodology with specialized workflows
  ○ Minimal    Minimal setup with only essential files
  ○ Skip       Skip Claude Flow initialization

? Select workflows:
  ◉ Code Review
  ◉ Documentation
  ◯ Testing
  ◯ Refactoring

? Select MCP servers:
  ◉ Filesystem    File operations
  ◉ Memory        Persistent memory
  ◯ GitHub        GitHub integration
  ◯ Database      Database operations

? Select additional options:
  ◯ Enable Swarm Mode    Multi-agent orchestration
  ◉ Enable MCP           Model Context Protocol
  ◉ Create Slash Cmds    Custom slash commands
```

### Configuration Summary

After configuration, you will see:

```
✨ Summary

Project: my-project
Location: /path/to/project

Features:
  ✓ system-detector
  ✓ memory-system
  ✓ claude-flow
    Mode: standard
    Workflows: code-review, documentation
    MCP Servers: filesystem, memory

? Proceed with initialization? Yes
```

---

## Initialization Modes

### Standard Mode

Full setup with common development workflows.

```bash
# Generated command
pnpm dlx claude-flow@alpha init
```

**Includes:**
- Common workflows (code-review, documentation)
- MCP integration
- Slash commands
- Basic agent configuration

**Best for:** Most projects, general development

### SPARC Mode

SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology.

```bash
# Generated command
pnpm dlx claude-flow@alpha init --mode=sparc
```

**Includes:**
- 5-phase SPARC workflow
- Specification templates
- Architecture documentation
- Refinement checklists
- Completion criteria

**Best for:** Complex projects, structured development, team projects

### Minimal Mode

Essential files only, for projects that need basic Claude Flow support.

```bash
# Generated command
pnpm dlx claude-flow@alpha init --mode=minimal
```

**Includes:**
- Basic configuration
- Core agent setup
- No workflows

**Best for:** Simple projects, quick setup, testing

### Skip Mode

Do not initialize Claude Flow (plugin disabled).

**Best for:** Projects that don't need AI orchestration

---

## Workflow Selection

### Available Workflows

| Workflow | Description | Recommended For |
|----------|-------------|-----------------|
| **Code Review** | Automated code review with AI | All projects |
| **Documentation** | Generate and maintain docs | API projects |
| **Testing** | Test generation and execution | TDD projects |
| **Refactoring** | Code improvement suggestions | Legacy code |
| **Architecture** | System design analysis | Large projects |

### Standard Mode Workflows

```
? Select workflows:
  ◉ Code Review         Automated PR reviews
  ◉ Documentation       Doc generation
  ◯ Testing             Test automation
  ◯ Refactoring         Code improvements
```

### SPARC Mode Workflows

All SPARC phases are enabled by default:

```
? Select SPARC workflows:
  ◉ Specification       Define requirements
  ◉ Pseudocode          Algorithm design
  ◉ Architecture        System structure
  ◉ Refinement          Iterate and improve
  ◉ Completion          Final validation
```

---

## MCP Configuration

### What is MCP?

Model Context Protocol (MCP) provides Claude with access to external tools and services.

### Available MCP Servers

| Server | Description | Use Case |
|--------|-------------|----------|
| **Filesystem** | Read/write files | All projects |
| **Memory** | Persistent storage | Session data |
| **GitHub** | GitHub API access | PR automation |
| **Database** | Database queries | Data projects |

### Configuration Example

```
? Select MCP servers:
  ◉ Filesystem    Read and write project files
  ◉ Memory        Store session data persistently
  ◯ GitHub        Access GitHub API
  ◯ Database      Query databases
```

### Generated Configuration

The selected servers are configured in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "claude-flow-mcp-filesystem",
      "args": ["--root", "."]
    },
    "memory": {
      "command": "claude-flow-mcp-memory",
      "args": ["--path", ".agent/memory"]
    }
  }
}
```

---

## Common Commands

### After Initialization

```bash
# Start Claude Flow orchestration
claude-flow start

# Check status
claude-flow status

# Run specific workflow
claude-flow workflow code-review

# Start SPARC session
claude-flow sparc start

# View agents
claude-flow agent list
```

### Claude Code Integration

With Claude Code, you can use slash commands:

```
/flow-status          # Check Claude Flow status
/flow-workflow        # List available workflows
/flow-agent list      # List configured agents
/sparc start          # Start SPARC session
```

### Common Workflows

```bash
# Code review workflow
claude-flow workflow code-review --target ./src

# Documentation generation
claude-flow workflow documentation --output ./docs

# Test generation
claude-flow workflow testing --coverage 80
```

---

## Best Practices

### 1. Start with Standard Mode

For new projects, start with Standard mode and add more as needed.

```bash
# Recommended initial setup
claude-init
# Select: System Detection, Memory System, Claude Flow (Standard)
```

### 2. Use SPARC for Complex Projects

SPARC mode is ideal for:
- Projects with clear phases
- Team collaboration
- Documentation-heavy work

### 3. Enable Only Needed MCP Servers

Each MCP server adds overhead. Enable only what you need:

```
# For most projects:
◉ Filesystem
◉ Memory

# For GitHub automation:
◉ Filesystem
◉ GitHub

# For data projects:
◉ Filesystem
◉ Database
```

### 4. Avoid Conflicting Plugins

Claude Flow conflicts with Task System. Choose one:

- **Claude Flow**: For AI orchestration, multi-agent work
- **Task System**: For simple task tracking

### 5. Review Merged Files

After initialization, review:
- `CLAUDE.md` - Check merged content is correct
- `.agent/config.toon` - Verify configuration merge

---

## Troubleshooting

### Issue: Initialization Timeout

**Symptom:** "Command timed out after 120000ms"

**Solutions:**
1. Check network connectivity
2. Retry initialization
3. Use `--timeout` flag if available

### Issue: Merge Conflicts

**Symptom:** CLAUDE.md has duplicated or misformatted content

**Solutions:**
1. Edit CLAUDE.md manually to fix formatting
2. Re-run with `--force` to regenerate

### Issue: MCP Server Not Found

**Symptom:** MCP server fails to start

**Solutions:**
1. Verify claude-flow is installed globally
2. Check `.claude/settings.json` paths
3. Restart Claude Code

### Issue: Workflows Not Available

**Symptom:** Workflow commands fail

**Solutions:**
1. Verify initialization completed successfully
2. Check `.claude-flow/workflows/` directory exists
3. Re-run `claude-flow init`

### Getting Help

```bash
# Claude Flow help
claude-flow --help
claude-flow workflow --help

# Check version
claude-flow --version
```

---

## File Structure

After initialization with Claude Flow:

```
your-project/
├── CLAUDE.md                  # Merged with Claude Flow instructions
├── .agent/
│   ├── config.toon            # Merged configuration
│   ├── system/
│   ├── memory/
│   └── ...
├── .claude/
│   ├── settings.json          # MCP server configuration
│   └── commands/              # Slash commands
└── .claude-flow/
    ├── config.yaml            # Claude Flow configuration
    ├── agents/                # Agent definitions
    └── workflows/             # Workflow templates
```

---

## Related Documentation

- [Heavyweight Plugins](./HEAVYWEIGHT_PLUGINS.md) - Technical details
- [User Guide](./USER_GUIDE.md) - Complete claude-init guide
- [Plugin Architecture](./PLUGIN_ARCHITECTURE_REFACTOR.md) - Plugin system design

---

## Links

- Claude Flow Repository: (link to claude-flow repo)
- Claude Code Documentation: https://docs.anthropic.com/claude-code
- MCP Specification: https://github.com/anthropics/mcp

---

**Version**: 2.2.0-alpha
**Last Updated**: 2025-11-26
