# Quick Reference - Remote Sync Feature

## TL;DR

```bash
# 从远程初始化
claude-memory-init init --quick --repo https://github.com/team/memory-repo.git

# 检查差异（显示所有变更）
claude-memory-init sync --repo https://github.com/team/memory-repo.git

# 创建 PR（只包含 prompt/ 文件）
claude-memory-init sync --repo https://github.com/team/memory-repo.git --pr

# 推送
cd /tmp/claude-memory-xxxxx  # 工具会显示实际路径
git push origin {branch-name}
gh pr create
```

## What Gets Included in PR?

| Directory | Included in PR? | Reason |
|-----------|----------------|---------|
| `prompt/` | ✅ YES | System prompts - reusable templates |
| `memory/semantic/` | ❌ NO | Project-specific knowledge |
| `memory/episodic/` | ❌ NO | Conversation history |
| `config.yaml` | ❌ NO | Project-specific config |

## Branch Naming

**Format:** `sp-{hash}`

**Examples:**
- `sp-a1b2c3d4`
- `sp-f8e7d6c5`
- `sp-12ab34cd`

**Hash generated from:**
- Git username (from config)
- Current date (YYYYMMDD)
- Clean filenames (numbers and extensions removed)

**Example hash generation:**
```
Input: john-smith + 20250107 + overview-objectives-assumptions
Hash:  sp-a1b2c3d4
```

**Clean filename rules:**
- `1.objectives.md` → `objectives`
- `2.assumptions.md` → `assumptions`
- `0.overview.md` → `overview`

## Common Scenarios

### Scenario 1: First Time Setup
```bash
cd my-new-project
claude-memory-init init --quick --repo https://github.com/team/memory-repo.git
# Work with Claude...
# Update prompts in claude/prompt/
claude-memory-init sync --repo https://github.com/team/memory-repo.git --pr
```

### Scenario 2: Already Initialized, Want to Sync
```bash
cd my-existing-project
# Check what changed
claude-memory-init sync --repo https://github.com/team/memory-repo.git

# Create PR if you updated prompt/ files
claude-memory-init sync --repo https://github.com/team/memory-repo.git --pr
```

### Scenario 3: Debug Mode
```bash
# Keep temp directory to inspect
claude-memory-init sync --repo URL --pr --no-cleanup

# Manually push
cd /tmp/claude-memory-xxxxx
git log  # Check commit
git push origin branch-name
```

## Output Example

```
🔄 Syncing memory repository...
✔ Found 5 difference(s)

All changed files:
  ✓ prompt/0.overview.md (system memory - will be included in PR)
  ✓ prompt/1.objectives.md (system memory - will be included in PR)
  - memory/semantic/sem-001.md (skipped - not system memory)
  - memory/episodic/ep-005.md (skipped - not system memory)

Creating branch: sp-a1b2c3d4
✅ Branch created with 2 system memory file(s)

📝 Files included in this PR:
   - prompt/0.overview.md
   - prompt/1.objectives.md

🏷️  PR label: system-prompt-update

🚀 Next steps:
   cd /tmp/claude-memory-a1b2c3d4
   git push origin sp-a1b2c3d4

   # Create PR with label:
   gh pr create --title "System memory: overview-objectives" \
     --body "See commit message for details" \
     --label "system-prompt-update"

   # Or create PR without label:
   gh pr create --title "System memory: overview-objectives" --body "See commit message for details"
```

## PR Label

**Single label for all system prompt PRs:**
- `system-prompt-update`

**Using label with gh CLI:**
```bash
gh pr create --label "system-prompt-update"
```

## Troubleshooting

### "No system memory files found"
- Only files in `prompt/` directory are included
- Check if you actually modified any files in `claude/prompt/`
- Semantic memories (`memory/semantic/`) are intentionally excluded

### "Could not get git user info"
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### "Failed to clone repository"
- Check URL is correct
- Check git credentials are configured
- Try cloning manually: `git clone <url>`

### Branch already exists
- Remote might have an old branch with same name
- Delete old branch: `git push origin --delete branch-name`
- Or wait a day (date in branch name will change)

## Tips

1. **Review before pushing**: The tool creates the branch locally, you control when to push
2. **Multiple topics**: If you modify many prompt files, branch name will have multiple topics
3. **Clean commits**: Each sync creates a single, well-formatted commit
4. **Automatic cleanup**: Temp directories are deleted by default (use `--no-cleanup` to keep)
5. **Safe operation**: Never modifies your local project, only works in temp

## See Also

- `REMOTE_SYNC.md` - Detailed documentation
- `FEATURE_SUMMARY.md` - Technical implementation details
- `README.md` - General usage
