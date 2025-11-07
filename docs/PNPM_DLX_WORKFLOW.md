# pnpm dlx Workflow Documentation

## Overview

This document provides a detailed explanation of how `claude-memory-init` works when executed via `pnpm dlx`, including the two-mem architecture and complete execution flow.

**Last Updated:** 2025-01-07

---

## Architecture: Two Types of Mem

### 1. Template Mem (Read-Only Template)

**Purpose:** Official template repository used for initialization and synchronization

**Source:** `https://github.com/dt-activenetwork/mem.git`

**Lifecycle:**
- Temporarily cloned to `/tmp/claude-memory-{random-hex}/`
- Used for operations
- Cleaned up after completion

**Access Strategy:**
- **Development (git clone):** Can optionally use local `claude-memory-init/mem/` submodule (may be outdated)
- **Production (pnpm dlx):** Always clone from remote to `/tmp/` (always latest)

**Use Cases:**
- `init`: Template source for new project initialization
- `sync`: Reference for diff comparison to detect system prompt changes

### 2. Workspace Mem (Read-Write Instance)

**Purpose:** User's project-specific memory system instance

**Location:** `{user-project}/claude/`

**Marker:** `{user-project}/claude/.claude-memory-init`

**Contents:**
```
claude/
├── CLAUDE.md              # Rendered main instructions
├── config.yaml            # Project configuration
├── prompt/                # System prompts (may be modified by user)
│   ├── 0.overview.md
│   ├── 1.objectives.md
│   ├── 2.assumptions.md
│   └── 3.domain-terms.md
├── memory/
│   ├── semantic/          # User's semantic memories
│   ├── episodic/          # User's episodic memories
│   └── index/
│       ├── tags.json
│       └── topics.json
└── .claude-memory-init    # Marker file (indicates initialized)
```

**State Management:**
- Initialized: `.claude-memory-init` exists
- Not initialized: `.claude-memory-init` does not exist

---

## Complete Execution Flow

### Scenario A: `pnpm dlx github:dt-activenetwork/claude-memory-init init --quick`

#### Phase 1: Package Download

```
User executes: pnpm dlx github:dt-activenetwork/claude-memory-init init --quick
Current directory: /home/user/my-project/

↓

pnpm downloads tarball from GitHub
Extracts to: ~/.pnpm-store/.../node_modules/@claude-memory+init/

Package contents:
  ✓ dist/           (compiled JavaScript)
  ✓ package.json
  ✓ README.md
  ✗ .gitmodules     (not in npm package)
  ✗ .claude-init-exclude (not in npm package)
  ✗ mem/ contents   (submodule not included in tarball)
```

#### Phase 2: CLI Entry Point

```typescript
// dist/cli.js executes
program
  .command('init')
  .option('--quick')
  .action(async (options) => {
    const targetDir = path.resolve(options.target); // /home/user/my-project/

    // Check if already initialized
    const initialized = await isProjectInitialized(targetDir);
    // → Checks: /home/user/my-project/claude/.claude-memory-init
    // → Result: false (first time)

    // Build configuration
    const config = await buildQuickConfig(targetDir);

    // Initialize
    await initialize(config, targetDir);
  });
```

#### Phase 3: Initialize Function

**File:** `src/core/initializer.ts::initialize()`

**Step 1-2: Validate Config & Create Base Directory**
```typescript
validateConfig(config);  // Validate configuration structure
await ensureDir(baseDir); // Create /home/user/my-project/claude/
```

**Step 3: Copy Memory System Template**

```typescript
// Function: copyMemorySystemTemplate(baseDir)

// 3.1 Determine tool installation path
const toolFileUrl = new URL(import.meta.url).pathname;
const toolFileDir = path.dirname(toolFileUrl);
const toolProjectRoot = path.resolve(toolFileDir, '..', '..');
// → ~/.pnpm-store/.../node_modules/@claude-memory+init/

const localMemDir = path.join(toolProjectRoot, 'mem');
// → ~/.pnpm-store/.../node_modules/@claude-memory+init/mem/

// 3.2 Check if local mem/ exists and has content
const localMemExists = await fse.pathExists(localMemDir);
// → false (pnpm dlx scenario - directory doesn't exist)

let localMemHasContent = false;

// 3.3 Branching logic
if (localMemHasContent) {
  // ❌ NOT taken (git clone development scenario only)
  memSourceDir = localMemDir;
} else {
  // ✅ TAKEN (pnpm dlx scenario)

  // 3.3.1 Get template repository URL
  const submoduleUrl = await getSubmoduleUrl(toolProjectRoot, 'mem');

  // getSubmoduleUrl() internal logic:
  // - Check if .gitmodules exists
  //   → ~/.pnpm-store/.../@claude-memory+init/.gitmodules
  //   → Does not exist
  // - Return DEFAULT_MEM_REPO_URL
  //   → 'https://github.com/dt-activenetwork/mem.git'

  // 3.3.2 Clone template mem to temporary directory
  tmpDir = await cloneMemoryRepoToTmp(submoduleUrl);
  // Executes: git clone --depth 1 https://github.com/dt-activenetwork/mem.git /tmp/claude-memory-a1b2c3d4/
  // → /tmp/claude-memory-a1b2c3d4/

  memSourceDir = tmpDir;
  shouldCleanup = true;
}

// 3.4 Load exclusion configuration
const exclusionConfigPath = path.join(toolProjectRoot, '.claude-init-exclude');
// → ~/.pnpm-store/.../@claude-memory+init/.claude-init-exclude

const exclusionConfig = await loadExclusionConfig(exclusionConfigPath);
// File doesn't exist in pnpm dlx scenario
// → Returns DEFAULT_EXCLUSIONS (hardcoded fallback)

// 3.5 Copy template to workspace
await fse.copy(memSourceDir, targetBaseDir, {
  filter: (src) => {
    // Exclude .git directories
    if (src.includes('.git')) return false;

    // Apply exclusion rules from DEFAULT_EXCLUSIONS:
    // - Framework docs: README.md, FRAMEWORK_OVERVIEW.md, etc.
    // - Setup guides: QUICKSTART.md
    // - Design docs: DESIGN.md
    // - Documentation directory: docs/
    if (shouldExcludeOnCopy(src, memSourceDir, exclusionConfig)) {
      return false;
    }

    return true;
  }
});

// Result:
// Copies from: /tmp/claude-memory-a1b2c3d4/
// Copies to:   /home/user/my-project/claude/
// Excludes:    .git, README.md, docs/, etc.

// 3.6 Cleanup temporary directory
if (shouldCleanup && tmpDir) {
  await cleanupTmpDir(tmpDir);
  // Deletes: /tmp/claude-memory-a1b2c3d4/
}
```

**Step 4-5: Render Templates**

```typescript
// 4. Render CLAUDE.md.template
await instantiateTemplate(
  '/home/user/my-project/claude/CLAUDE.md.template',
  '/home/user/my-project/claude/CLAUDE.md',
  config
);
// Replaces {{project.name}}, {{project.type}}, etc. with actual values

// 5. Render overview template if exists
const overviewTemplatePath = '/home/user/my-project/claude/prompt/0.overview.md.template';
if (await fileExists(overviewTemplatePath)) {
  await instantiateTemplate(
    overviewTemplatePath,
    '/home/user/my-project/claude/prompt/0.overview.md',
    config
  );
}
```

**Step 6-10: Finalization**

```typescript
// 6. Initialize index files
await updateIndexFiles(baseDir, currentDate);
// Creates:
// - /home/user/my-project/claude/memory/index/tags.json
// - /home/user/my-project/claude/memory/index/topics.json

// 7. Copy CLAUDE.md to project root
await copyFile(
  '/home/user/my-project/claude/CLAUDE.md',
  '/home/user/my-project/CLAUDE.md'
);

// 8. Delete template files
await deleteFilesAfterInit(baseDir);
// Deletes all files matching pattern: *.template
// - claude/CLAUDE.md.template
// - claude/prompt/0.overview.md.template

// 9. Update .gitignore
await updateGitignore(targetDir, 'claude');
// Adds: claude/temp/

// 10. Create marker file
await createMarker(targetDir, 'claude', config.project.name);
// Creates: /home/user/my-project/claude/.claude-memory-init
// Content: { initialized: true, version: "1.0.0", date: "2025-01-07", ... }
```

#### Phase 4: Final State

```
/home/user/my-project/
├── claude/
│   ├── CLAUDE.md              ✓ (rendered)
│   ├── config.yaml            ✓
│   ├── prompt/
│   │   ├── 0.overview.md      ✓ (rendered)
│   │   ├── 1.objectives.md    ✓
│   │   ├── 2.assumptions.md   ✓
│   │   └── 3.domain-terms.md  ✓
│   ├── memory/
│   │   ├── semantic/          ✓
│   │   ├── episodic/          ✓
│   │   └── index/
│   │       ├── tags.json      ✓
│   │       └── topics.json    ✓
│   └── .claude-memory-init    ✓ (marker)
├── CLAUDE.md                   ✓ (copy)
└── .gitignore                  ✓ (updated)
```

---

### Scenario B: `pnpm dlx github:dt-activenetwork/claude-memory-init sync --pr`

#### Phase 1: Package Download

Same as Scenario A.

#### Phase 2: CLI Entry Point

```typescript
// dist/cli.js executes
program
  .command('sync')
  .option('--pr', 'Create a PR for differences')
  .option('--no-cleanup', 'Keep temporary directory')
  .action(async (options) => {
    const targetDir = path.resolve(options.target); // /home/user/my-project/

    // Check if project is initialized
    const initialized = await isProjectInitialized(targetDir);
    // → Checks: /home/user/my-project/claude/.claude-memory-init
    // → Result: true (project already initialized)

    if (!initialized) {
      logger.error('Project is not initialized. Run "claude-memory-init init" first.');
      process.exit(1);
    }

    // Get template mem URL
    const currentFileUrl = new URL(import.meta.url).pathname;
    const projectRoot = path.resolve(path.dirname(currentFileUrl), '..');
    // → ~/.pnpm-store/.../node_modules/@claude-memory+init/

    const submoduleUrl = await getSubmoduleUrl(projectRoot, 'mem');
    // → 'https://github.com/dt-activenetwork/mem.git' (fallback)

    const markerInfo = await getMarkerInfo(targetDir);
    const localMemoryDir = path.join(targetDir, markerInfo?.base_dir || 'claude');
    // → /home/user/my-project/claude/

    // Sync
    const { tmpDir, differences } = await syncMemoryRepo(
      submoduleUrl,
      localMemoryDir,
      options.pr
    );
  });
```

#### Phase 3: Sync Memory Repository

**File:** `src/utils/git-ops.ts::syncMemoryRepo()`

**Step 1: Clone Template Mem to Temporary Directory**

```typescript
const tmpDir = await cloneMemoryRepoToTmp(repoUrl);
// Executes: git clone --depth 1 https://github.com/dt-activenetwork/mem.git /tmp/claude-memory-xyz789/
// → /tmp/claude-memory-xyz789/
```

**Step 2: Compare Workspace vs Template**

```typescript
const differences = await diffMemoryRepos(localMemoryDir, tmpDir);

// diffMemoryRepos() internal logic:
// - Recursively compare files in:
//   - Source: /home/user/my-project/claude/ (workspace)
//   - Target: /tmp/claude-memory-xyz789/ (template)
// - For each file:
//   - Check if exists in both locations
//   - Compare file contents byte-by-byte
//   - Add to differences list if different

// Example result:
// differences = [
//   'prompt/1.objectives.md',  // User modified
//   'prompt/2.assumptions.md', // User modified
//   'memory/semantic/sem-001-architecture.md', // User created
//   'memory/episodic/ep-001-task.md'  // User created
// ]
```

**Step 3: Filter System Memory Files**

```typescript
if (differences.length > 0 && createPR) {
  await createPRForMemoryUpdates(tmpDir, localMemoryDir, differences);
}

// createPRForMemoryUpdates() internal logic:

// 3.1 Filter to only system memory (prompt/ directory)
const systemMemoryFiles = filterSystemMemoryFiles(differences);
// Input:  ['prompt/1.objectives.md', 'prompt/2.assumptions.md',
//          'memory/semantic/sem-001.md', 'memory/episodic/ep-001.md']
// Output: ['prompt/1.objectives.md', 'prompt/2.assumptions.md']

if (systemMemoryFiles.length === 0) {
  logger.warning('No system memory files (prompt/) found in differences');
  logger.info('Only system prompt changes can be submitted for PR');
  return;
}

// 3.2 Generate branch name
const userInfo = await getGitUserInfo(tmpDir);
// → { name: 'John Smith', email: 'john@example.com' }

const username = userInfo.name.toLowerCase().replace(/\s+/g, '-');
// → 'john-smith'

const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
// → '20250107'

const cleanFilenames = extractCleanFilenames(systemMemoryFiles);
// Input:  ['prompt/1.objectives.md', 'prompt/2.assumptions.md']
// Output: ['objectives', 'assumptions']

const hashContent = `${username}-${dateStr}-${cleanFilenames.join('-')}`;
// → 'john-smith-20250107-objectives-assumptions'

const shortHash = generateShortHash(hashContent);
// → MD5(hashContent).substring(0, 8)
// → 'a1b2c3d4'

const branchName = `sp-${shortHash}`;
// → 'sp-a1b2c3d4'

// 3.3 Create branch in tmpDir
await git.checkoutLocalBranch(branchName);
// In /tmp/claude-memory-xyz789/: git checkout -b sp-a1b2c3d4

// 3.4 Copy workspace system memory files to tmpDir
for (const file of systemMemoryFiles) {
  const srcPath = path.join(localMemoryDir, file);
  const destPath = path.join(tmpDir, file);

  await fs.ensureDir(path.dirname(destPath));
  await fs.copy(srcPath, destPath);
}
// Copies:
// - /home/user/my-project/claude/prompt/1.objectives.md
//   → /tmp/claude-memory-xyz789/prompt/1.objectives.md
// - /home/user/my-project/claude/prompt/2.assumptions.md
//   → /tmp/claude-memory-xyz789/prompt/2.assumptions.md

// 3.5 Stage and commit
for (const file of systemMemoryFiles) {
  await git.add(file);
}

const commitMessage = `Add/Update system memory prompts

Author: John Smith <john@example.com>
Date: 2025-01-07

System memory files updated:
- prompt/1.objectives.md
- prompt/2.assumptions.md

This PR contains system prompt updates generated during AI-assisted development.
Please review for accuracy and merge if approved.

Generated by claude-memory-init
`;

await git.commit(commitMessage);

// 3.6 Display instructions
logger.info('✅ Branch \'sp-a1b2c3d4\' created with 2 system memory file(s)');
logger.info('📝 Files included in this PR:');
logger.info('   - prompt/1.objectives.md');
logger.info('   - prompt/2.assumptions.md');
logger.info('🏷️  PR label: system-prompt-update');
logger.info('🚀 Next steps:');
logger.info('   cd /tmp/claude-memory-xyz789/');
logger.info('   git push origin sp-a1b2c3d4');
logger.info('   gh pr create --title "System memory: objectives-assumptions" \\');
logger.info('     --body "See commit message for details" \\');
logger.info('     --label "system-prompt-update"');
```

**Step 4: Cleanup**

```typescript
if (options.cleanup) {
  await cleanupTmpDir(tmpDir);
  // Deletes: /tmp/claude-memory-xyz789/
} else {
  logger.info(`📁 Temporary directory: ${tmpDir}`);
  // Keep for debugging with --no-cleanup flag
}
```

---

## Key Design Decisions

### 1. Why Temporary Directory for Template Mem?

**Problem:** `pnpm dlx` doesn't clone git submodules

**Solution:** Always clone template mem to `/tmp/` in pnpm dlx scenario

**Benefits:**
- No pollution of user's working directory
- Cross-platform support (os.tmpdir())
- Automatic cleanup
- Always uses latest template version

### 2. Why Filter to `prompt/` Only for PR?

**Rationale:**
- **System prompts** (`prompt/`) = Team-shared templates → Should be in PR
- **Semantic memories** (`memory/semantic/`) = Project-specific knowledge → Should NOT be in PR
- **Episodic memories** (`memory/episodic/`) = Task history → Should NOT be in PR

**Goal:** Only curated, team-relevant content should be submitted to official template repository

### 3. Why Hash-Based Branch Names?

**Format:** `sp-{hash}`

**Example:** `sp-a1b2c3d4`

**Advantages:**
- Short and readable (12 chars vs 50+ chars)
- Content-based uniqueness (same changes = same branch)
- Clear prefix (`sp` = System Prompt)

### 4. Why HTTPS Instead of SSH for Default URL?

**Default:** `https://github.com/dt-activenetwork/mem.git`

**Reasons:**
- No SSH key configuration required
- Better compatibility for CI/CD environments
- Works for new users immediately
- Public repository access doesn't require authentication

### 5. Why Hardcode Fallback URL?

**Problem:** `.gitmodules` is not included in npm packages

**Solution:** Hardcode `DEFAULT_MEM_REPO_URL` in code

**Benefits:**
- Works in all scenarios (pnpm dlx, npm install, git clone)
- Graceful degradation
- Users can still override by maintaining local `.gitmodules` if needed

---

## Troubleshooting

### Issue: "Project is not initialized"

**Cause:** `.claude-memory-init` marker file doesn't exist

**Solution:** Run `claude-memory-init init` first

### Issue: "No system memory files found in differences"

**Cause:** User only modified files outside `prompt/` directory

**Solution:** Only changes to `prompt/` can be submitted for PR

### Issue: Template clone fails

**Cause:** Network issues or invalid repository URL

**Solution:**
- Check internet connection
- Verify `https://github.com/dt-activenetwork/mem.git` is accessible
- For development: Use `git clone --recurse-submodules` to have local template

---

## Comparison: pnpm dlx vs git clone

| Aspect | pnpm dlx | git clone |
|--------|----------|-----------|
| Tool installation | Temporary cache | Local repository |
| .gitmodules | Not included | Included |
| .claude-init-exclude | Not included | Included |
| mem/ submodule | Not included | Included (if initialized) |
| Template source | Always clone to /tmp/ | Can use local mem/ if available |
| Template freshness | Always latest | May be outdated |
| Network required | Yes (every time) | Only if local mem/ empty |
| Use case | End users, CI/CD | Development, testing |

---

## Future Enhancements

1. **Bidirectional Sync** - Pull remote template updates to local workspace
2. **Auto PR Creation** - Use GitHub API to create PR directly (no manual git push)
3. **Conflict Resolution** - Handle concurrent modifications gracefully
4. **Branch Selection** - Allow specifying target branch for PR
5. **Partial Sync** - Sync specific subdirectories only
6. **Template Caching** - Cache template in user's home directory to reduce clones

---

## Related Files

- `src/core/initializer.ts` - Main initialization orchestration
- `src/utils/git-ops.ts` - Git operations and submodule handling
- `src/core/marker.ts` - Project initialization state tracking
- `src/core/exclusion.ts` - File exclusion rules
- `src/cli.ts` - CLI command definitions
- `docs/REMOTE_SYNC.md` - Detailed sync/PR documentation
- `CLAUDE.md` - Project overview and instructions
