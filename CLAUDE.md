# Claude Memory System Initializer

## Project Overview

A CLI tool for initializing the Claude Memory System in projects, enabling Claude to maintain context and knowledge across sessions through a structured memory architecture.

**Repository:** https://github.com/dt-activenetwork/claude-memory-init

## Core Purpose

This tool sets up a memory system that allows Claude to:
- Remember project-specific context across conversations
- Build semantic understanding of codebases
- Track episodic task history
- Follow project-specific objectives and assumptions

## Architecture

### Memory System Structure

```
project/
├── claude/                    # Memory system base directory
│   ├── CLAUDE.md             # Main instructions for Claude
│   ├── config.yaml           # Configuration
│   ├── prompt/               # Top-level prompts (generated)
│   │   ├── 0.overview.md
│   │   ├── 1.objectives.md
│   │   ├── 2.assumptions.md
│   │   └── 3.domain-terms.md
│   ├── memory/
│   │   ├── system/           # System memory (team-shared) ⭐
│   │   │   ├── tools/        # Tool usage guidelines
│   │   │   └── index/        # System indexes
│   │   ├── semantic/         # Project knowledge (local)
│   │   │   └── sem-001-*.md
│   │   ├── episodic/         # Task history (local)
│   │   │   └── ep-001-*.md
│   │   ├── procedural/       # Workflow procedures
│   │   └── index/
│   │       ├── tags.json
│   │       └── topics.json
│   └── temp/                 # Temporary files (gitignored)
└── CLAUDE.md                 # Symlink to claude/CLAUDE.md
```

### Template Source

**Submodule:** `mem/` → git@github.com:dt-activenetwork/mem.git

The tool uses a git submodule to maintain the memory system template:
- **Development:** `git clone --recurse-submodules` includes `mem/`
- **Production:** `pnpm dlx` auto-detects and clones from `.gitmodules`

## Key Features (2025-01-07 Update)

### 1. Automatic Submodule Detection

**Challenge:** `pnpm dlx` doesn't clone submodules

**Solution:** Auto-detection mechanism
```typescript
if (localMemHasContent) {
  // Use local mem/ (git clone scenario)
  useLocal();
} else {
  // Read .gitmodules and clone to tmp (pnpm dlx scenario)
  cloneToTmp();
}
```

### 2. Remote Sync & PR Creation

**Command:** `claude-memory-init sync --pr`

**Flow:**
1. Auto-reads submodule URL from `.gitmodules`
2. Clones to `/tmp/claude-memory-{hash}/`
3. Diffs local `claude/memory/` vs remote `memory/`
4. Filters to **system memory only** (excludes project-specific memories)
5. Creates branch: `sp-{hash}`
6. Commits with descriptive message
7. Displays push instructions

**Smart Filtering:**
- ✅ Include: `memory/system/` (system memory - team-shared templates and tools)
- ❌ Exclude: `memory/semantic/` (project-specific knowledge)
- ❌ Exclude: `memory/episodic/` (task history)
- ❌ Exclude: `memory/procedural/` (workflow documentation)

### 3. Hash-Based Branch Naming

**Format:** `sp-{hash}`

**Example:** `sp-a1b2c3d4`

**Generation:**
```
Input:  username + date + clean-filenames
        "john-smith-20250107-objectives-assumptions"
Hash:   MD5(input).substring(0, 8)
Output: sp-a1b2c3d4
```

**Advantages:**
- Short (12 chars vs 50+)
- Content-based (same changes = same branch)
- Clear prefix (`sp` = System Prompt)

### 4. Single PR Label

**Label:** `system-prompt-update`

All system prompt PRs use this single, consistent label for easy filtering and review.

### 5. Temporary Directory Management

**Location:** `os.tmpdir()` (e.g., `/tmp/`)

**Lifecycle:**
1. Generate unique path: `/tmp/claude-memory-{random-hex}/`
2. Clone repository
3. Perform operations
4. Auto-cleanup (unless `--no-cleanup` flag)

**Benefits:**
- No pollution of working directory
- Cross-platform support
- Automatic cleanup

### 6. Interactive Commit/Push/PR Workflow ⭐ NEW

**User Experience:**
1. **Preview First**: Shows complete commit message and file changes before creating commit
2. **Step-by-Step Confirmation**: Each step (commit, push, PR) requires explicit confirmation
3. **One-Command Flow**: From file changes to PR creation in a single command
4. **Error Handling**: Clear guidance when operations fail
5. **Flexibility**: Support interactive, non-interactive, and auto-confirm modes

**Features:**
- 📋 **Commit Preview**: See exact commit message and file statistics
- ❓ **Interactive Prompts**: Confirm each step (commit, push, PR creation)
- 🚀 **Auto Push**: Automatically pushes to remote after commit confirmation
- 🎯 **Auto PR Creation**: Uses `gh` CLI to create PR directly
- ⚙️ **Multiple Modes**: Interactive (default), non-interactive, auto-confirm

**Requirements:**
- GitHub CLI (`gh`) for PR creation (optional, falls back to manual instructions)

## Usage

### Initialize Project

```bash
# Using pnpm dlx (recommended)
cd my-project
pnpm dlx github:dt-activenetwork/claude-memory-init init --simple

# Initialization Modes:
#   --quick         Fully automated (no prompts)
#   --simple        Essential settings only (recommended)
#   --interactive   Full interactive setup
#   --config FILE   Use specific config file
#
# Additional Options:
#   --force         Re-initialize existing project
#   --target PATH   Specify target directory
```

### Sync and Create PR

**Interactive Mode (Default):**
```bash
# Interactive workflow with commit preview and confirmations
pnpm dlx github:dt-activenetwork/claude-memory-init sync --pr

# Flow:
# 1. Shows commit preview with file changes
# 2. Asks: "Create this commit?" → Yes/No
# 3. Asks: "Push to remote?" → Yes/No
# 4. Asks: "Create PR now?" → Yes/No
# 5. Asks: "PR title?" → (with default)
# 6. Auto-creates PR and displays URL
```

**Other Modes:**
```bash
# Check differences only (no PR)
pnpm dlx ... sync

# Non-interactive (show manual instructions)
pnpm dlx ... sync --pr --no-interactive

# Auto-confirm all (CI/automation)
pnpm dlx ... sync --pr --auto-confirm

# Keep tmp directory (debugging)
pnpm dlx ... sync --pr --no-cleanup
```

### Configuration Management

```bash
# View current config
claude-memory-init show

# Add objectives incrementally
claude-memory-init add-objective "Document the API"

# Edit config file
claude-memory-init edit
```

## Implementation Details

### Key Functions

**git-ops.ts:**
- `getSubmoduleUrl()` - Parse `.gitmodules` for submodule URL
- `getTmpMemoryDir()` - Generate unique tmp path
- `cloneMemoryRepoToTmp()` - Clone repo to tmp
- `diffMemoryRepos()` - Recursively compare directories
- `syncMemoryRepo()` - High-level sync orchestration
- `filterSystemMemoryFiles()` - Filter to `memory/system/` only
- `extractCleanFilenames()` - Remove numbers and extensions
- `generateShortHash()` - Create 8-char MD5 hash
- `getGitUserInfo()` - Read git config user info
- `getPRLabel()` - Return `system-prompt-update`
- `createPRForMemoryUpdates()` - Create branch and commit

**initializer.ts:**
- `initialize()` - Main initialization orchestrator
- `copyMemorySystemTemplate()` - Auto-detect and copy template
- `instantiateTemplate()` - Render templates with config variables

### Workflow Scenarios

**Scenario A: First Time Init (pnpm dlx)**
```
User: pnpm dlx ... init --quick
Tool:
  1. Detect mem/ is empty
  2. Read .gitmodules → git@github.com:dt-activenetwork/mem.git
  3. Clone to /tmp/claude-memory-xxxxx/
  4. Copy templates to project/claude/
  5. Render CLAUDE.md with config
  6. Cleanup /tmp/claude-memory-xxxxx/
```

**Scenario B: Sync Changes (pnpm dlx)**
```
User: (edits project/claude/memory/system/tools/code-reference-format.md)
User: pnpm dlx ... sync --pr
Tool:
  1. Read .gitmodules → mem URL
  2. Clone to /tmp/claude-memory-yyyyy/
  3. Diff project/claude/ vs /tmp/
  4. Filter: only memory/system/ files
  5. Generate hash: sp-a1b2c3d4
  6. Create branch in /tmp repo
  7. Commit changes
  8. Display: cd /tmp/... && git push origin sp-a1b2c3d4
```

## Configuration

### Minimal Example

```yaml
project:
  name: "My Project"
  type: "Node.js backend"
  description: "Backend service"

language:
  user_language: "English"
  think_language: "English"

paths:
  base_dir: "claude"
  codebase: "/path/to/project"

objectives:
  - objective: "Analyze architecture"
    memory_check: "Query semantic notes"
    memory_update: "Create semantic notes"

assumptions:
  - "Uses npm as package manager"
```

## Documentation

### Core Docs (Root)
- `README.md` - User-facing documentation
- `CHANGELOG.md` - Version history
- `WORK_SUMMARY_2025-01-07.md` - Today's work summary

### Design Docs (docs/)
- `docs/REMOTE_SYNC.md` - Detailed sync/PR documentation
- `docs/FEATURE_SUMMARY.md` - Technical implementation (Chinese)
- `docs/QUICK_REFERENCE.md` - Quick reference guide

### Usage Guides
- `USAGE_EXAMPLES.md` - Practical examples
- `QUICKSTART.md` - Getting started
- `COMMAND_REFERENCE.md` - All CLI commands
- `INCREMENTAL_USAGE.md` - Incremental workflow
- `EXCLUSION_GUIDE.md` - File exclusion configuration

## Development

### Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/dt-activenetwork/claude-memory-init.git
cd claude-memory-init

# Install dependencies
pnpm install

# Build
pnpm build

# Verify
node dist/index.js --version
```

### Project Structure

```
claude-memory-init/
├── src/
│   ├── cli.ts                # CLI entry point
│   ├── core/
│   │   ├── initializer.ts    # Main initialization logic
│   │   ├── config-loader.ts  # Config management
│   │   ├── validator.ts      # Validation
│   │   ├── marker.ts         # Project marker
│   │   └── exclusion.ts      # File exclusion rules
│   ├── utils/
│   │   ├── git-ops.ts        # Git/submodule operations ⭐
│   │   ├── file-ops.ts       # File system utilities
│   │   ├── logger.ts         # Console output
│   │   └── date-utils.ts     # Date formatting
│   └── types/
│       └── config.ts         # TypeScript types
├── mem/                      # Submodule (template source)
├── dist/                     # Compiled output
├── docs/                     # Design documentation ⭐
└── .gitmodules               # Submodule configuration
```

## Testing

### Manual Test Scenarios

**Test 1: Init with pnpm dlx**
```bash
cd /tmp/test-project
pnpm dlx github:dt-activenetwork/claude-memory-init init --quick
# Verify: claude/ directory created
# Verify: CLAUDE.md exists
```

**Test 2: Sync without changes**
```bash
pnpm dlx github:dt-activenetwork/claude-memory-init sync
# Expected: "No differences found"
```

**Test 3: Sync with changes**
```bash
echo "test" >> claude/memory/system/tools/code-reference-format.md
pnpm dlx github:dt-activenetwork/claude-memory-init sync --pr
# Expected: Branch sp-{hash} created
# Expected: Only memory/system/tools/code-reference-format.md in diff
```

## Troubleshooting

### Issue: "Cannot find memory template source"

**Cause:** Both local `mem/` and `.gitmodules` missing

**Solution:** Verify `.gitmodules` exists and contains:
```
[submodule "mem"]
  path = mem
  url = git@github.com:dt-activenetwork/mem.git
```

### Issue: "No system memory files found"

**Cause:** Only modified files outside `memory/system/`

**Solution:** System memory files must be in `claude/memory/system/` directory. Project-specific semantic and episodic memories are not synced to the template repository.

## Future Enhancements

1. **Bidirectional Sync** - Pull remote updates to local
2. **Auto PR Creation** - Use GitHub API directly
3. **Conflict Resolution** - Handle concurrent modifications
4. **Branch Selection** - Specify target branch
5. **Partial Sync** - Sync specific subdirectories

## Status

**Version:** 1.0.0 (with 2025-01-07 enhancements)

**Status:** Production-ready

**Last Updated:** 2025-01-07

## Key Decisions

1. **Why tmp directory?**
   - pnpm dlx doesn't clone submodules
   - Avoid polluting user's working directory

2. **Why filter to memory/system/ only?**
   - System memory = team-shared templates and tools
   - Semantic memories = project-specific knowledge
   - Episodic memories = task history (local only)
   - Only curated system content should be in PRs

3. **Why hash-based branches?**
   - Short and readable (12 chars)
   - Content-based uniqueness
   - Avoid long branch names

4. **Why single label?**
   - Simplify PR management
   - Easy filtering and tracking
   - Consistent team workflow
