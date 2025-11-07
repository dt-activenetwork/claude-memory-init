# Remote Memory Repository Sync

This document describes the remote repository synchronization feature added to claude-memory-init.

## Overview

The tool now supports working with remote memory repositories through two main features:

1. **Remote Repository Initialization**: Initialize from a remote repository instead of local `mem/` directory
2. **Sync & Diff**: Compare local and remote memory systems and create PRs for updates

## Key Features

### Automatic Temporary Directory Management

- Memory repositories are cloned to OS-specific temp directories (e.g., `/tmp/claude-memory-xxxxx` on Linux/macOS)
- Temp directories are automatically cleaned up after operations
- No pollution of your current working directory
- Uses Node.js `os.tmpdir()` for cross-platform compatibility

### Intelligent Diffing

- Compares local memory system with remote repository
- Identifies new or modified files
- Ignores `.git` directories automatically
- Recursive directory comparison

### PR Creation Support

- Creates a new branch with your local changes
- Commits with descriptive messages
- Ready to push and create a pull request

## Usage

### 1. Initialize from Remote Repository

Instead of using the local `mem/` submodule, clone from a remote repository:

```bash
# Quick mode with remote repo
claude-memory-init init --quick --repo https://github.com/your-org/memory-repo.git

# Interactive mode with remote repo
claude-memory-init init --interactive --repo https://github.com/your-org/memory-repo.git

# Config mode with remote repo
claude-memory-init init --config config.yaml --repo https://github.com/your-org/memory-repo.git
```

**What happens:**
1. Tool clones the repository to `/tmp/claude-memory-xxxxx/`
2. Copies template files to your project's `claude/` directory
3. Performs normal initialization (template rendering, etc.)
4. Automatically deletes the temp directory

### 2. Sync Local with Remote

Check if your local memory system has changes compared to remote:

```bash
claude-memory-init sync --repo https://github.com/your-org/memory-repo.git
```

**Output:**
- List of files that differ between local and remote
- Comparison is done on file content, not just names

### 3. Create PR for Local Changes

After making local improvements to your memory system, contribute back:

```bash
claude-memory-init sync --repo https://github.com/your-org/memory-repo.git --pr
```

**What happens:**
1. Clones remote repo to temp directory
2. Compares local and remote
3. **Filters to only system memory files** (files in `prompt/` directory)
4. If system memory files found:
   - Gets your git user info (name and email)
   - Extracts topics from filenames (e.g., `1.objectives.md` → `objectives`)
   - Creates branch: `{username}-{YYYYMMDD}-{topic1}-{topic2}`
   - Commits **only system memory files** with descriptive message
   - Provides push instructions

**Branch Naming:**
- Format: `sp-{hash}`
- Example: `sp-a1b2c3d4`
- Hash is generated from: `username + date + clean-filenames`
- Clean filenames: numbers and extensions removed
  - `1.objectives.md` → `objectives`
  - `2.assumptions.md` → `assumptions`
- Short 8-character MD5 hash for uniqueness and brevity
- "sp" = System Prompt

**What Gets Included:**
- ✅ Files in `prompt/` directory (system memory)
- ❌ Files in `memory/semantic/` (user-generated semantic notes)
- ❌ Files in `memory/episodic/` (conversation history)
- ❌ Other directories

This ensures only curated system prompts are submitted for team review, not your local project memories.

**Example output:**
```
🔄 Syncing memory repository...

✔ Found 5 difference(s)

All changed files:
  ✓ prompt/0.overview.md (system memory - will be included in PR)
  ✓ prompt/1.objectives.md (system memory - will be included in PR)
  ✓ prompt/2.assumptions.md (system memory - will be included in PR)
  - memory/semantic/sem-001-api-design.md (skipped - not system memory)
  - memory/episodic/ep-005.md (skipped - not system memory)

Creating branch: sp-a1b2c3d4
✅ Branch 'sp-a1b2c3d4' created with 3 system memory file(s)

📝 Files included in this PR:
   - prompt/0.overview.md
   - prompt/1.objectives.md
   - prompt/2.assumptions.md

🏷️  PR label: system-prompt-update

🚀 Next steps:
   cd /tmp/claude-memory-a1b2c3d4
   git push origin sp-a1b2c3d4

   # Create PR with label:
   gh pr create --title "System memory: overview-objectives-assumptions" \
     --body "See commit message for details" \
     --label "system-prompt-update"

   # Or create PR without label:
   gh pr create --title "System memory: overview-objectives-assumptions" --body "See commit message for details"

📁 Temporary directory: /tmp/claude-memory-a1b2c3d4
```

### PR Label

All system prompt PRs use a single, consistent label:

**Label:** `system-prompt-update`

This simple label clearly identifies all PRs containing system prompt updates, making them easy to filter and review.

### 4. Debug Mode

Keep the temp directory for inspection:

```bash
claude-memory-init sync --repo https://github.com/your-org/memory-repo.git --pr --no-cleanup
```

The tool will print the temp directory path. You can then:
- Inspect the cloned repository
- Manually push the branch
- Debug any issues

## Workflow Examples

### Scenario 1: Team Memory Repository

Your team maintains a shared memory repository with best practices:

```bash
# Initialize new project from team's memory repo
cd ~/projects/new-service
claude-memory-init init --quick --repo https://github.com/acme/memory-templates.git

# Work with Claude, it creates semantic memories in memory/semantic/
# You may also update system prompts in prompt/ directory
# For example, Claude might create: memory/semantic/sem-001-auth-flow.md

# Later, contribute ONLY system prompt improvements back (not semantic memories):
claude-memory-init sync --repo https://github.com/acme/memory-templates.git --pr

# This will:
# 1. Show all differences (both prompt/ and memory/)
# 2. Only include prompt/ files in the PR
# 3. Semantic memories stay local to your project
```

**Why separate system prompts from semantic memories?**
- System prompts (`prompt/`) = reusable templates for all projects
- Semantic memories (`memory/semantic/`) = project-specific knowledge
- Only system prompts should be shared across team
- Semantic memories contain your project's domain knowledge (not for PR)

### Scenario 2: Personal Memory Templates

Maintain your own memory templates across projects:

```bash
# Create a new project using your templates
claude-memory-init init --quick --repo https://github.com/yourname/claude-memories.git

# After using Claude and improving the memory system:
claude-memory-init sync --repo https://github.com/yourname/claude-memories.git --pr

# Push and create PR to update your templates
cd /tmp/claude-memory-xxxxx
git push origin memory-update-xxxxx
gh pr create --title "Update memory templates"
```

### Scenario 3: Check for Updates

Periodically check if the team has added new memories:

```bash
# This compares your local memories with the latest remote
claude-memory-init sync --repo https://github.com/acme/memory-templates.git

# If remote has new memories you want, you can:
# 1. Manually copy files from temp directory
# 2. Or re-initialize (use with caution)
```

## Architecture Details

### Functions Added

#### `git-ops.ts`

- `getTmpMemoryDir()`: Generates unique temp directory path
- `cloneMemoryRepoToTmp(repoUrl)`: Clones repo to temp with `--depth 1`
- `diffMemoryRepos(sourceDir, targetDir)`: Recursively compares directories
- `cleanupTmpDir(tmpDir)`: Removes temp directory
- `syncMemoryRepo(repoUrl, localDir, createPR)`: High-level sync function
- `createPRForMemoryUpdates(tmpRepo, localDir, diffs)`: Creates branch and commit

#### `initializer.ts`

- `copyMemorySystemTemplate(targetDir, repoUrl?)`: Modified to support remote repos
  - If `repoUrl` provided: clones to temp, copies from temp
  - If no `repoUrl`: uses local `mem/` directory (fallback)
  - Always cleans up temp directory

#### `cli.ts`

- Added `--repo` option to `init` command
- Added new `sync` command with `--pr` and `--no-cleanup` options
- Updated all init functions to accept `repoUrl` parameter

### Temp Directory Structure

```
/tmp/
└── claude-memory-a1b2c3d4/     # Random 8-byte hex suffix
    ├── .git/
    ├── CLAUDE.md.template
    ├── memory/
    │   ├── semantic/
    │   ├── episodic/
    │   └── index/
    └── prompt/
```

### Cleanup Behavior

- **Default**: Temp directories are automatically deleted after operations
- **With `--no-cleanup`**: Directory is preserved for debugging
- **Error cases**: Best-effort cleanup in `finally` blocks

## Security Considerations

1. **Git Credentials**: Uses your local git credentials for cloning
2. **Temp Directory**: Uses OS-standard temp locations with random names
3. **No Secrets**: Never commits secrets or local project code
4. **Read-only Clone**: Uses `--depth 1` for fast, shallow clones

## Troubleshooting

### "Failed to clone repository"

Check:
- Repository URL is accessible
- Git credentials are configured
- Network connection is working

### "No differences found" but files are different

The diff compares file content. Check:
- Line endings (CRLF vs LF)
- Trailing whitespace
- File permissions (not compared)

### Temp directory not cleaned up

- Use `--no-cleanup` intentionally or
- Check disk space
- Manually remove: `rm -rf /tmp/claude-memory-*`

## Future Enhancements

Potential improvements:

1. **Bidirectional Sync**: Pull updates from remote to local
2. **Automatic PR Creation**: Use GitHub API to create PR directly
3. **Conflict Resolution**: Handle conflicts when both local and remote changed
4. **Branch Selection**: Specify which branch to sync with
5. **Partial Sync**: Sync only specific directories (e.g., only `memory/semantic/`)
