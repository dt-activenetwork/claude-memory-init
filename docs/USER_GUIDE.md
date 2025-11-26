# Claude Init - User Guide

Complete guide for using Claude Init v2.0 to set up AI agent systems in your projects.

**Version**: 2.0.0-alpha
**Last Updated**: 2025-11-20

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Plugin Guide](#plugin-guide)
3. [Configuration](#configuration)
4. [TOON Format](#toon-format)
5. [Common Workflows](#common-workflows)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Quick Start

### Installation

```bash
# Using pnpm dlx (no installation required)
cd your-project
pnpm dlx github:dt-activenetwork/claude-memory-init

# Or install globally
pnpm add -g github:dt-activenetwork/claude-memory-init
claude-init
```

### First-Time Setup

```bash
# Run the interactive initializer
claude-init

# Or explicitly use init command
claude-init init
```

### What Happens During Initialization

```
┌─────────────────────────────────────────────────────────────┐
│  🚀 Claude Init - Interactive Setup                        │
└─────────────────────────────────────────────────────────────┘

Step 1: Project Information
  → Enter project name and description

Step 2: Select Features
  → Choose which plugins to enable (checkbox selection)

Step 3-N: Configure Plugins (dynamic)
  → Only plugins that need configuration
  → System Detector: Select package managers (if multiple found)
  → Memory System: Choose memory types
  → Git: Configure auto-commit and sync
  → Task System: Enable tracking and output

Final Step: Summary and Confirmation
  → Review selections
  → Confirm to proceed

Execution:
  → Creates .agent/ directory structure
  → Generates AGENT.md with plugin contributions
  → Saves configurations in TOON format
  → Creates memory indexes
  → Sets up gitignore rules
```

### Generated Structure

```
your-project/
├── AGENT.md                    # Main instructions for Claude
└── .agent/
    ├── system/
    │   └── info.toon          # System detection results (cached)
    ├── git/
    │   ├── rules.md           # Git operation rules
    │   └── config.toon        # Git configuration
    ├── memory/
    │   ├── index/
    │   │   ├── tags.toon      # Tag-based index
    │   │   └── topics.toon    # Topic hierarchy
    │   ├── knowledge/         # Stable knowledge (semantic)
    │   ├── history/           # Task records (episodic)
    │   └── workflows/         # Procedures
    ├── tasks/
    │   ├── current.toon       # Current task state
    │   ├── output/            # Task deliverables
    │   └── tmp/               # Temporary files (gitignored)
    └── presets/               # Custom prompts (optional)
```

---

## Plugin Guide

### System Detector Plugin

**Purpose**: Auto-detect system environment and save preferences

**What It Detects**:
- Operating System (name, version, package manager)
- Python environment (version, all available package managers)
- Node.js environment (version, all available package managers)
- Locale (timezone, language)

**Interactive Features**:

When multiple package managers are found, you'll be asked to choose:

```
✓ Python: 3.13.7
  Available managers: uv, pip, poetry

? Multiple Python package managers detected. Which do you prefer?
  ◉ uv          ⚡ Ultra-fast Python package installer (recommended)
  ○ pip         Standard Python package installer
  ○ poetry      📦 Dependency management and packaging

  → Selected: uv
```

**Configuration Persistence**:

Your selection is saved to `.agent/system/info.toon`:

```toon
plugin: system-detector
detected_at: 2025-11-20T10:00:00Z
last_updated: 2025-11-20T10:00:00Z

python:
  version: 3.13.7
  path: python3
  available_managers[3]: uv,pip,poetry
  selected_manager: uv
```

**On Subsequent Runs**:
- System asks: "Use existing system configuration?"
- If Yes → Reuses saved preferences (no re-detection)
- If No → Re-detects and asks for new selections

**Benefits**:
- ✅ Only asks once
- ✅ Static info cached (timezone doesn't change)
- ✅ Lock file priority (suggests what you're already using)

---

### Memory System Plugin

**Purpose**: Knowledge persistence across sessions

**Memory Types**:

| Type | Directory | Purpose | Example |
|------|-----------|---------|---------|
| **Knowledge** | `memory/knowledge/` | Stable architectural knowledge | API designs, patterns |
| **History** | `memory/history/` | Task history records | Session logs, decisions |
| **Workflows** | `memory/workflows/` | Reusable procedures | Test workflows, deployment |

**Indexes** (TOON format):

```toon
# tags.toon
tags:
  authentication[2]: know-001,know-005
  api-design[3]: know-002,know-003,know-007

updated: "2025-11-20T10:00:00Z"
```

**Usage Pattern**:

1. **Before work**: Read indexes → Find relevant notes by ID
2. **During work**: Use knowledge from notes
3. **After work**: Create/update notes → Update indexes

**Example**:

```bash
# AI reads memory before answering
Read .agent/memory/index/tags.toon
Find tag "auth" → [know-001, know-005]
Read .agent/memory/knowledge/know-001-oauth-flow.md
Use knowledge to answer question
```

---

### Git Plugin

**Purpose**: Automate git operations for agent files

**Configuration Options**:

```
? Auto-commit changes after initialization? › No
? Enable remote sync for memory templates? › No
? AI git operations allowed? › No (recommended)
```

**Generated Files**:
- `.agent/git/rules.md` - Git operation rules for AI
- `.agent/git/config.toon` - Git configuration
- `.gitignore` updates - Auto-add `.agent/tasks/tmp/`

**AI Git Rules**:

When `ai_git_operations: false` (recommended):
- ❌ AI cannot perform any git operations
- ✅ AI can only suggest git commands to user
- ✅ User has full control over version control

---

### Task System Plugin

**Purpose**: Organize task workflows and outputs

**Features**:

1. **Current Task Tracking**: `.agent/tasks/current.toon`
   ```toon
   task:
     id: "task-001"
     name: "Implement authentication"
     status: in_progress
     started_at: "2025-11-20T10:00:00Z"
   ```

2. **Task Outputs**: `.agent/tasks/output/`
   - Organized by task or category
   - Link from history notes
   - Persistent deliverables

3. **Workflows**: `.agent/tasks/workflows/`
   - Reusable procedures
   - Step-by-step guides
   - Best practices

4. **Temporary Workspace**: `.agent/tasks/tmp/`
   - Auto-gitignored
   - For scratch work
   - Auto-cleanup

---

### Prompt Presets Plugin

**Purpose**: Custom prompt templates directory

**What It Creates**:
- `.agent/presets/` directory
- `README.md` with usage instructions

**Usage**:

Create custom prompts as needed:

```
.agent/presets/
├── code-review-checklist.md
├── api-documentation-template.md
└── security-audit-guide.md
```

AI can read these when needed for specialized tasks.

---

## Configuration

### Main Config File

**Location**: `.agent/config.toon`

**Example**:

```toon
project:
  name: my-awesome-project
  version: 1.0.0

output:
  base_dir: .agent

plugins:
  system-detector:
    enabled: true
  memory-system:
    enabled: true
  git:
    enabled: false
  task-system:
    enabled: true
  prompt-presets:
    enabled: false
```

### Plugin-Specific Configs

Each plugin saves its config in its own directory:

```
.agent/system/info.toon       # System detection results
.agent/git/config.toon         # Git settings
.agent/tasks/current.toon      # Current task state
```

### Modifying Configuration

**Option 1**: Re-run initialization
```bash
claude-init init --force
```

**Option 2**: Edit files directly
```bash
# Edit main config
vim .agent/config.toon

# Edit plugin config
vim .agent/system/info.toon
```

---

## TOON Format

### What is TOON?

**TOON** (Token-Oriented Object Notation) is a data format optimized for AI:
- 30-60% fewer tokens than JSON
- Human-readable (similar to YAML)
- Native Claude support (no parsing needed)

### Basic Syntax

```toon
# Simple values
name: value
count: 42
flag: true

# Nested objects (use indentation)
parent:
  child: value
  nested:
    deep: value

# Arrays (inline with length)
tags[3]: tag1,tag2,tag3
managers[2]: npm,pnpm

# Multi-line strings
description: |
  First line
  Second line
```

### Reading TOON Files

**In AGENT.md prompts**:
```markdown
Read `.agent/system/info.toon` for system environment details.
```

**AI automatically understands TOON** - no special parsing needed.

### Why TOON?

| Format | Tokens | Readability | AI Support |
|--------|--------|-------------|------------|
| JSON | 100% | Medium | ✅ |
| YAML | 70% | High | ✅ |
| **TOON** | **40-50%** | **High** | **✅ Native** |

**Example Comparison**:

```json
// JSON (verbose)
{
  "python": {
    "version": "3.13.7",
    "available_managers": ["uv", "pip"],
    "selected_manager": "uv"
  }
}
```

```toon
# TOON (compact)
python:
  version: 3.13.7
  available_managers[2]: uv,pip
  selected_manager: uv
```

Tokens: JSON ~45, TOON ~22 (51% reduction)

---

## Common Workflows

### Workflow 1: First-Time Setup

```bash
# 1. Navigate to your project
cd ~/projects/my-app

# 2. Run initializer
claude-init

# 3. Follow prompts
📋 Project Information
  → my-app
  → A web application

📦 Select Features
  → ✓ System Detection
  → ✓ Memory System
  → ✓ Task System

# 4. Configure plugins (if needed)
[System Detection]
✓ OS: Ubuntu 22.04
✓ Python: 3.11.5
  Available managers: uv, pip, poetry
? Which do you prefer? › uv

# 5. Confirm and complete
✨ Summary
  → Review selections
? Proceed? › Yes

🎉 Done!
```

### Workflow 2: Adding to Existing Project

```bash
# If project already has claude/ from v1.x
cd existing-project

# Run init (creates .agent/ alongside claude/)
claude-init init

# Both can coexist:
existing-project/
├── claude/      # v1.x (keep for now)
└── .agent/      # v2.0 (new)
```

### Workflow 3: Re-configuration

```bash
# Force re-initialization
claude-init init --force

# System Detector will detect existing config
✓ Found existing system configuration
  Detected: 2025-11-20
  Python: 3.13.7 (uv)

? Use existing system configuration? ›
  → Yes: Keep preferences
  → No: Re-detect and reconfigure
```

### Workflow 4: Using in Claude Code

```bash
# In Claude Code, AI can run:
pnpm dlx github:dt-activenetwork/claude-memory-init init

# Interactive prompts work in Claude Code terminal
# AI sees the questions and can respond via stdin
```

---

## Troubleshooting

### Issue: "Project already initialized"

**Cause**: `.agent/.claude-memory-init` marker file exists

**Solution**:
```bash
# Re-initialize with --force
claude-init init --force
```

### Issue: Package manager not detected

**Cause**: Package manager not in PATH

**Solution**:
```bash
# Install package manager
# For Python:
pip install uv          # Fast installer
pip install poetry      # Dependency manager

# For Node.js:
npm install -g pnpm     # Fast package manager
```

### Issue: Wrong package manager selected

**Cause**: Auto-selected default may not be preferred

**Solution**:
```bash
# Re-run initialization
claude-init init --force

# When asked "Use existing config?", select No
# System will re-detect and ask for your preference
```

### Issue: AGENT.md has placeholders

**Cause**: Plugin failed to generate content

**Solution**:
```bash
# Check if plugin is enabled
cat .agent/config.toon | grep "enabled: true"

# Re-run with --force
claude-init init --force
```

### Issue: Tests failing after changes

**Cause**: Code changes broke functionality

**Solution**:
```bash
# Run tests to see what broke
pnpm test

# Run specific test
pnpm test smoke-test   # Full system test
pnpm test init-flow    # Initialization scenarios

# Check build
pnpm build
```

---

## FAQ

### General Questions

**Q: What's the difference between v1.x and v2.0?**

A: Major architectural changes:
- v1.x: Monolithic, `claude/` directory, YAML configs
- v2.0: Plugin-based, `.agent/` directory, TOON configs

**Q: Can I use both v1.x and v2.0 together?**

A: Yes! They use different directories (`claude/` vs `.agent/`), so they can coexist.

**Q: Do I need to migrate from v1.x?**

A: No. Keep using v1.x if it works. Or run `claude-init init` to create v2.0 setup alongside it.

**Q: How do I uninstall?**

A: Simply delete the `.agent/` directory and `AGENT.md` file.

---

### Plugin Questions

**Q: Which plugins should I enable?**

A: Recommended for most projects:
- ✅ System Detection (always useful)
- ✅ Memory System (if using Claude for extended work)
- ✅ Task System (if tracking multiple tasks)
- ⚠️ Git (only if you want automation)
- ⚠️ Presets (only if you need custom prompts)

**Q: Can I add my own plugins?**

A: Not yet. Custom plugin API is planned for future release.

**Q: Can I disable a plugin after initialization?**

A: Yes, edit `.agent/config.toon`:
```toon
plugins:
  system-detector:
    enabled: false  # Change to false
```

Then re-run `claude-init init --force` to regenerate AGENT.md without that plugin's content.

---

### Configuration Questions

**Q: Where are my preferences saved?**

A:
- Main config: `.agent/config.toon`
- System detection: `.agent/system/info.toon`
- Git settings: `.agent/git/config.toon`
- Task state: `.agent/tasks/current.toon`

**Q: Why TOON format instead of JSON/YAML?**

A: TOON uses 30-60% fewer tokens than JSON, which means:
- Faster Claude responses
- Lower API costs
- More context available for actual work

**Q: Do I need to learn TOON syntax?**

A: No! Claude understands TOON natively. You can:
- Read TOON files like YAML
- Edit them like YAML
- Claude parses them automatically

---

### System Detection Questions

**Q: Why does it ask me to choose package manager?**

A: If you have multiple (e.g., both `pip` and `uv`), the tool asks your preference so AGENT.md can recommend the right one to Claude.

**Q: Can I change my package manager selection?**

A: Yes:
1. Run `claude-init init --force`
2. When asked "Use existing config?", choose **No**
3. System re-detects and asks for new preference

**Q: Why does it cache timezone?**

A: Timezone rarely changes, so we detect it once and save it. This makes subsequent runs faster.

**Q: What if I don't have Python or Node.js?**

A: No problem! System Detector gracefully handles missing runtimes. AGENT.md simply won't have sections for languages you don't use.

---

### Memory System Questions

**Q: What's the difference between knowledge and history?**

A:
- **Knowledge** (semantic): Timeless facts about your code (e.g., "Auth uses OAuth 2.0")
- **History** (episodic): Time-bound task records (e.g., "On 2025-11-20, implemented login")

**Q: How do I add a memory note?**

A: Create markdown files in the appropriate directory:

```bash
# Add knowledge note
vim .agent/memory/knowledge/know-001-auth-architecture.md

# Add history note
vim .agent/memory/history/hist-001-login-implementation.md

# Update indexes
vim .agent/memory/index/tags.toon
vim .agent/memory/index/topics.toon
```

**Q: What's the index for?**

A: Claude uses indexes to find notes efficiently without grepping:
```toon
tags:
  auth[2]: know-001,know-005   # Tag → Note IDs
```

Claude reads this, finds IDs, then reads specific notes. Much faster than searching.

---

### Git Plugin Questions

**Q: Should I enable auto-commit?**

A: Depends on your workflow:
- ✅ Enable if: You want hands-free setup
- ❌ Disable if: You prefer manual git control (recommended)

**Q: What's "separate commits"?**

A: When enabled, creates 2 commits:
1. Commit #1: `.agent/` files only
2. Commit #2: Other changes

This keeps agent updates isolated and easy to review.

**Q: Should I allow AI git operations?**

A: **No** (recommended). Let AI suggest commands, but you execute them. This gives you full control.

---

## Advanced Usage

### Custom Prompts

Create specialized prompts in `.agent/presets/`:

```markdown
# .agent/presets/api-review.md

# API Review Checklist

When reviewing API changes:

1. Check endpoint naming (RESTful conventions)
2. Verify authentication requirements
3. Review request/response schemas
4. Check error handling
5. Validate rate limiting

...
```

### Workflow Templates

Create reusable procedures in `.agent/tasks/workflows/`:

```markdown
# .agent/tasks/workflows/workflow-release.md

# Release Workflow

## Pre-release Checklist

- [ ] All tests pass
- [ ] Version bumped in package.json
- [ ] CHANGELOG updated
- [ ] Documentation reviewed

## Release Steps

1. Create release branch
2. Run build
3. Tag release
4. Push to main

...
```

### Task State Tracking

Update current task in `.agent/tasks/current.toon`:

```toon
task:
  id: "task-003"
  name: "Implement user authentication"
  status: in_progress
  started_at: "2025-11-20T10:00:00Z"
  phase: implementation

progress:
  completed[2]: design,planning
  current: coding
  remaining[2]: testing,documentation
```

---

## Best Practices

### 1. Start Minimal

Enable only what you need:
```
First project: System Detection + Memory System
Later: Add Git or Task System as needed
```

### 2. Use Persistent Config

Don't re-detect every time:
- Let system cache static info
- Reuse package manager preferences
- Only re-configure when environment actually changes

### 3. Keep AGENT.md Clean

Don't embed large documents:
- Keep AGENT.md < 50KB
- Use references to external files
- Let plugins contribute concise sections

### 4. Leverage Indexes

Use memory indexes instead of grep:
```
❌ Slow: Search all files for "auth"
✅ Fast: tags.toon → auth → [know-001] → Read know-001
```

### 5. Test After Changes

Always run tests after modifying code:
```bash
pnpm build && pnpm test
```

---

## Next Steps

After initialization:

1. **Review AGENT.md**
   - Understand what Claude will see
   - Customize if needed

2. **Set Up Memory**
   - Create first knowledge note
   - Add tags to index

3. **Start Working**
   - Ask Claude to help with your project
   - Claude will use AGENT.md for instructions

4. **Iterate**
   - Add memory notes as you learn
   - Update indexes
   - Refine prompts

---

## Getting Help

- **Documentation**: [docs/](../docs/) folder
- **Issues**: [GitHub Issues](https://github.com/dt-activenetwork/claude-memory-init/issues)
- **Design Docs**: See [docs/README.md](./README.md)

---

**Version**: 2.0.0-alpha
**Last Updated**: 2025-11-20
**Status**: Production-ready core features
