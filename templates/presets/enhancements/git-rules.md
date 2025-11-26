## Git Operations

{{#if GIT_AI_OPERATIONS_ALLOWED}}
**AI Git Operations**: ALLOWED (with constraints)

You may perform git operations following these rules:
- ✅ Create commits with descriptive messages
- ✅ Stage files with `git add`
- ✅ Check status with `git status`
- ❌ **NEVER** use `--force` flags
- ❌ **NEVER** perform hard resets
- ❌ **ALWAYS** check authorship before amending

{{#if GIT_AUTO_COMMIT}}
**Auto-commit**: ENABLED
{{#if GIT_COMMIT_SEPARATELY}}
- Agent files committed separately from other changes
{{/if}}
{{/if}}
{{else}}
**AI Git Operations**: FORBIDDEN

🚫 **ABSOLUTE PROHIBITION**: You are **FORBIDDEN** from performing ANY git operations.

- ❌ No git commands (commit, push, pull, merge, etc.)
- ❌ No commit message generation
- ❌ No staging files
- ❌ No suggestions to run git commands

**Rationale**: Version control is EXCLUSIVELY the user's responsibility.

When work is complete:
1. ✅ Inform user: "Work complete. Files modified: [list]"
2. ❌ **DO NOT** offer to commit
{{/if}}

**Gitignore**: The following patterns are auto-ignored:
{{#each GIT_IGNORE_PATTERNS}}
- `{{this}}`
{{/each}}
