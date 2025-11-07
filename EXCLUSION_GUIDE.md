# File Exclusion System Guide

The `claude-memory-init` tool includes a **two-stage file handling system** that gives you full transparency and control over which files end up in your project.

## Why Exclusions?

The memory system template (`mem/`) contains two types of files:

1. **User-Facing Files** - What your project needs:
   - Templates (`CLAUDE.md.template`, etc.)
   - Configuration examples (`config.example.yaml`)
   - System tools documentation (`memory/system/tools/`)
   - Directory structure and READMEs

2. **Framework Meta-Files** - Internal documentation:
   - How the framework was built
   - Framework architecture and design
   - Deployment checklists for manual setup
   - Framework-specific workflows

The exclusion system handles both categories transparently through a **two-stage approach**.

## Two-Stage File Handling

### Stage 1: `exclude_on_copy`

**Files that are NEVER copied** - skipped entirely during initialization.

- **When**: During the template copy phase
- **Why**: Performance and cleanliness (don't copy what you don't need)
- **Example**: Framework documentation files

```
mem/README.md
  ↓ (SKIPPED - never copied)
  ✗ (does not appear in user project)
```

### Stage 2: `delete_after_init`

**Files that are temporarily needed** - copied, used, then deleted.

- **When**: After initialization completes
- **Why**: Needed during setup but not in final project
- **Example**: Template files (`.template`)

```
mem/CLAUDE.md.template
  ↓ (copied for rendering)
claude/CLAUDE.md.template
  ↓ (rendered with your config)
claude/CLAUDE.md  (output)
  ↓ (template source deleted)
claude/CLAUDE.md  (only this remains)
```

**Why two stages?**
1. **Transparency**: You can see and control what happens to each file
2. **Flexibility**: Different files need different handling
3. **No black boxes**: Everything is explicit in `.claude-init-exclude`

## Default Exclusions

### Framework Documentation Files

These files describe the memory system framework itself:

```
README.md                          # Framework overview
FRAMEWORK_OVERVIEW.md              # Complete architecture
FILE_MANIFEST.md                   # File listing
CHECKLIST.md                       # Manual deployment checklist
MEMORY_DRIVEN_CONTEXT_OPTIMIZATION.md  # Theory & implementation
```

### Internal Design Documentation

```
memory/DESIGN.md                   # System architecture
memory/procedural/memory-first-workflow.md
memory/procedural/memory-system-operations.md
```

### Setup Guides

```
docs/QUICKSTART.md                 # Replaced by this CLI tool
docs/                              # Entire docs directory
```

### Git Files

```
.git/
.gitignore
.gitmodules
```

## What Gets Kept

Essential files are always included:

✅ **Templates**: `CLAUDE.md.template`, `0.overview.md.template`
✅ **Config Examples**: `config.example.yaml`
✅ **System Tools**: `memory/system/tools/*.md` (Mermaid, Markdown, Code references)
✅ **Directory READMEs**: Guide users on how to use each directory
✅ **Memory Structure**: All `memory/` subdirectories and indexes
✅ **Prompt System**: `prompt/0.memory.md`

## Customizing Exclusions

### Location

The exclusion config is at the tool's root:

```
claude-memory-init/
  .claude-init-exclude          # Edit this file
  mem/                          # Template source
  src/                          # Tool source code
```

### Format

The config file uses a simple INI-like format:

```ini
# Comments start with #

[patterns]
*.git          # Glob patterns (supports * and ?)
*.tmp
backup-*

[files]
README.md      # Exact file names
TODO.md
NOTES.md

[directories]
docs           # Directory names (excludes entire directory)
examples
test-data
```

### Rule Types

#### 1. Patterns (Glob)

```ini
[patterns]
*.git          # Matches: .git, .gitignore, .gitmodules
temp-*         # Matches: temp-file, temp-backup
*.bak          # Matches: file.bak, config.bak
```

Supports:
- `*` - Matches any characters
- `?` - Matches single character

#### 2. Exact File Names

```ini
[files]
README.md      # Only excludes files named exactly "README.md"
DESIGN.md      # Matches in any directory
```

Note: Matches the base filename, not the full path.

#### 3. Directories

```ini
[directories]
docs           # Excludes entire "docs" directory anywhere
.git           # Excludes .git directory
temp           # Excludes any "temp" directory
```

Note: Matches directory name anywhere in the path.

## Examples

### Example 1: Exclude Additional Documentation

Add your own documentation files:

```ini
[files]
README.md
FRAMEWORK_OVERVIEW.md
CHANGELOG.md        # Add this
AUTHORS.md          # Add this
```

### Example 2: Exclude Test/Example Data

```ini
[directories]
docs
examples            # Add this
test-data          # Add this
```

### Example 3: Exclude Backup Files

```ini
[patterns]
*.git
*.bak              # Add this
*~                 # Add this
.DS_Store          # Add this
```

### Example 4: Keep Previously Excluded Files

To keep a file that's excluded by default, comment it out:

```ini
[files]
# README.md        # Now README.md will be included
FRAMEWORK_OVERVIEW.md
FILE_MANIFEST.md
```

## Testing Your Exclusions

After modifying `.claude-init-exclude`:

1. **Rebuild the tool**:
   ```bash
   cd /path/to/claude-memory-init
   pnpm run build
   ```

2. **Test in a clean directory**:
   ```bash
   cd /tmp/test-project
   claude-memory-init init --quick
   ```

3. **Check what got copied**:
   ```bash
   ls -la claude/
   find claude/ -type f | sort
   ```

4. **Verify exclusions**:
   ```bash
   # Should not exist:
   test -f claude/README.md && echo "ERROR: README.md not excluded"
   test -d claude/docs && echo "ERROR: docs/ not excluded"

   # Should exist:
   test -f claude/CLAUDE.md.template || echo "ERROR: Template missing"
   test -f claude/config.example.yaml || echo "ERROR: Config example missing"
   ```

## How It Works

### Processing Order

1. Load `.claude-init-exclude` from tool root
2. During template copy, for each file:
   - Check if filename matches any pattern
   - Check if filename matches any exact name
   - Check if path contains any excluded directory
   - If any match: skip file
   - Otherwise: copy file

### Pattern Matching

Simple glob matching:
- `*` → `.*` (regex: any characters)
- `?` → `.` (regex: single character)
- Literal characters are escaped

Example:
```
Pattern: *.git
Regex: ^.*\.git$
Matches: .git, .gitignore, .gitmodules
```

## Best Practices

### 1. Be Specific

Instead of:
```ini
[patterns]
*README*          # Too broad, might exclude user READMEs
```

Use:
```ini
[files]
README.md         # Exact match
FRAMEWORK_README.md
```

### 2. Document Your Changes

```ini
# Custom exclusions for our project
# Added by: @username on 2025-11-06
# Reason: Exclude internal planning docs

[files]
PLANNING.md
ARCHITECTURE_DRAFT.md
```

### 3. Test After Changes

Always test your exclusions in a clean directory to ensure:
- Unwanted files are excluded
- Essential files are kept
- No unexpected exclusions

### 4. Version Control

Commit your customized `.claude-init-exclude`:

```bash
git add .claude-init-exclude
git commit -m "chore: customize exclusion rules for our setup"
```

## Troubleshooting

### Problem: Essential File Was Excluded

**Symptom**: A file you need is missing after initialization.

**Solution**:
1. Check if it's in `.claude-init-exclude`
2. Comment out the rule or remove it
3. Rebuild and re-initialize

### Problem: Unwanted Files Still Copied

**Symptom**: Framework documentation still appears in initialized projects.

**Solution**:
1. Verify `.claude-init-exclude` exists in tool root
2. Check rule syntax (no typos)
3. Rebuild the tool: `pnpm run build`
4. Re-initialize with `--force` flag

### Problem: All Files Excluded

**Symptom**: Initialized directory is nearly empty.

**Solution**:
1. Check for overly broad patterns: `*` or `*.*`
2. Review directory exclusions
3. Restore defaults from this guide

## Default Configuration Reference

The complete default `.claude-init-exclude`:

```ini
# Claude Memory System - Exclusion Configuration
# Framework meta-documentation and internal files

[patterns]
*.git
.git*
*.gitignore
*.gitmodules

[files]
# Framework meta-documentation
README.md
FRAMEWORK_OVERVIEW.md
FILE_MANIFEST.md
CHECKLIST.md
MEMORY_DRIVEN_CONTEXT_OPTIMIZATION.md

# Internal design docs
DESIGN.md

# Setup guides (replaced by CLI)
QUICKSTART.md

# Framework workflow docs
memory-first-workflow.md
memory-system-operations.md

[directories]
# Framework documentation
docs
```

## See Also

- [README.md](./README.md) - Main documentation
- [COMMAND_REFERENCE.md](./COMMAND_REFERENCE.md) - CLI command reference
- [CHANGELOG.md](./CHANGELOG.md) - Version history
