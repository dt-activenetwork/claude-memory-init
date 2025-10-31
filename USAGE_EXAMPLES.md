# Usage Examples

This document provides practical examples for using the Claude Memory System Initializer.

## Example 1: Quick Start for New Project

You just created a new project and want to set up Claude Memory System immediately:

```bash
cd my-new-project
pnpm dlx @claude-memory/init init --quick
```

**Result:**
- Memory system initialized in `claude/` directory
- `CLAUDE.md` created in project root
- Ready to use with Claude immediately

## Example 2: Custom Configuration for Existing Project

You have an existing project and want to customize the memory system:

### Step 1: Create config file

Create `claude/config.yaml`:

```yaml
project:
  name: "E-commerce Backend"
  type: "Node.js microservices"
  description: "REST API for online shopping platform"

language:
  user_language: "English"
  think_language: "English"

paths:
  base_dir: "claude"
  codebase: "/home/user/projects/ecommerce-backend"

objectives:
  - objective: "Document API endpoints and their purposes"
    memory_check: "Search semantic notes for 'api', 'endpoint', 'routes'"
    memory_update: "Create semantic notes for API architecture"

  - objective: "Track database schema changes"
    memory_check: "Check episodic notes for schema modifications"
    memory_update: "Record schema changes with migration references"

assumptions:
  - "Uses Express.js framework"
  - "PostgreSQL database with Prisma ORM"
  - "Microservices communicate via REST"

domain:
  terms:
    - "Order Service: Handles order creation and management"
    - "Payment Service: Processes payments via Stripe"
  evidence:
    - "All API claims must reference controller files"
    - "Database claims must cite schema.prisma"
  external_sources:
    - "API docs: ./docs/api-spec.yaml"
```

### Step 2: Initialize

```bash
pnpm dlx @claude-memory/init init --config ./claude/config.yaml
```

### Step 3: Verify

```bash
# Check generated files
ls -la claude/
cat CLAUDE.md | head -20
```

## Example 3: Interactive Mode for Teams

Setting up for a team project where you want to discuss each setting:

```bash
pnpm dlx @claude-memory/init init --interactive
```

**Interactive prompts will ask:**

1. **Project name:** `Customer Portal`
2. **Project type:** Select `Full-stack web application`
3. **Description:** `Customer-facing portal for account management`
4. **User language:** Select `English`
5. **Think language:** Select `English`
6. **Base directory:** Accept default `claude`
7. **Codebase path:** Accept detected path
8. **Objective 1:**
   - Objective: `Understand authentication flow`
   - Memory check: `Search for 'auth', 'jwt', 'session'`
   - Memory update: `Document auth mechanisms`
9. **Add more objectives?** `Yes`
10. **Objective 2:**
    - Objective: `Track component hierarchy`
    - Memory check: `Query React component notes`
    - Memory update: `Create component relationship diagrams`
11. **Add more?** `No`
12. **Assumption 1:** `Uses React with TypeScript`
13. **Add more assumptions?** `No`
14. **Add domain terms?** `No`

## Example 4: Validating Configuration Before Deployment

You've created a config for a new team member and want to verify it's correct:

```bash
# Validate the config
pnpm dlx @claude-memory/init validate --config ./claude/config.yaml

# If valid, initialize
pnpm dlx @claude-memory/init init --config ./claude/config.yaml
```

**Output on success:**
```
🔍 Validating configuration...
✔ Configuration loaded
✔ Configuration is valid
```

**Output on error:**
```
🔍 Validating configuration...
✔ Configuration loaded
✖ Configuration validation failed

Errors:
  ✗ project.name is required
  ✗ objectives[0].memory_check is required
```

## Example 5: Multi-Language Project

Setting up memory system for a project with Chinese documentation:

```yaml
project:
  name: "智能客服系统"
  type: "Python AI服务"
  description: "基于大语言模型的智能客服系统"

language:
  user_language: "Chinese"      # Output in Chinese
  think_language: "English"     # Think in English for technical accuracy

paths:
  base_dir: "claude"
  codebase: "/home/user/projects/ai-customer-service"

objectives:
  - objective: "分析对话流程架构"
    memory_check: "查询语义笔记中的'对话'、'流程'、'架构'"
    memory_update: "创建对话系统架构的语义笔记"

assumptions:
  - "使用 FastAPI 框架"
  - "集成 OpenAI API"
  - "支持多轮对话"
```

## Example 6: Large Codebase with Custom Settings

For a large enterprise project requiring fine-tuned memory settings:

```yaml
project:
  name: "Enterprise ERP System"
  type: "Java monorepo"
  description: "Multi-module enterprise resource planning system"

language:
  user_language: "English"
  think_language: "English"

paths:
  base_dir: "claude"
  codebase: "/enterprise/erp-system"

objectives:
  - objective: "Map module dependencies"
    memory_check: "Search for 'module', 'dependency', 'import'"
    memory_update: "Create dependency graph notes"

assumptions:
  - "Uses Spring Boot framework"
  - "Gradle multi-project build"
  - "30+ modules in monorepo"

tasks:
  use_task_specific_indexes: true
  use_incremental_work: true
  max_context_per_step: 3000      # Larger context for complex code
  max_task_context: 15000         # Increased for large tasks
  hygiene_cycle_frequency: 3      # More frequent cleanup

advanced:
  max_tags: 200                    # More tags for large project
  max_topics: 100                  # More topics
  target_context_reduction: 0.85   # Aggressive context reduction
```

## Example 7: CI/CD Integration

Automatically initialize memory system in CI pipeline:

```yaml
# .github/workflows/init-claude.yml
name: Initialize Claude Memory

on:
  push:
    branches: [main]
    paths:
      - 'claude/config.yaml'

jobs:
  init:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Validate config
        run: pnpm dlx @claude-memory/init validate --config ./claude/config.yaml

      - name: Initialize memory system
        run: pnpm dlx @claude-memory/init init --config ./claude/config.yaml

      - name: Commit generated files
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add CLAUDE.md claude/
          git commit -m "Update Claude memory system" || true
          git push
```

## Example 8: Re-initialization After Config Changes

You've updated your objectives in config.yaml and want to regenerate:

```bash
# Backup existing memory notes (important!)
cp -r claude/memory claude/memory.backup

# Re-initialize (will regenerate CLAUDE.md and templates)
pnpm dlx @claude-memory/init init --config ./claude/config.yaml

# Restore memory notes if needed
cp -r claude/memory.backup/* claude/memory/
```

**Note:** Re-initialization overwrites generated files (CLAUDE.md, templates) but preserves memory notes if they already exist.

## Example 9: Project-Specific Target Directory

Initialize memory system in a specific subdirectory:

```bash
# Initialize in a workspace subdirectory
pnpm dlx @claude-memory/init init --quick --target ./packages/backend

# Result: creates ./packages/backend/claude/ and ./packages/backend/CLAUDE.md
```

## Example 10: Testing Configuration Locally

Test your config without modifying the project:

```bash
# Create a test directory
mkdir /tmp/test-claude
cp claude/config.yaml /tmp/test-claude/

# Initialize in test directory
pnpm dlx @claude-memory/init init \
  --config /tmp/test-claude/config.yaml \
  --target /tmp/test-claude

# Review results
ls -la /tmp/test-claude/claude/
cat /tmp/test-claude/CLAUDE.md

# If satisfied, initialize in real project
pnpm dlx @claude-memory/init init --config ./claude/config.yaml
```

## Common Workflows

### Workflow 1: Starting Fresh

```bash
cd my-project
pnpm dlx @claude-memory/init init --quick
# Start using Claude with memory system immediately
```

### Workflow 2: Team Onboarding

```bash
# Team lead creates config
cat > claude/config.yaml << EOF
# ... project-specific config ...
EOF

# Commit config
git add claude/config.yaml
git commit -m "Add Claude memory config"
git push

# New team member initializes
git pull
pnpm dlx @claude-memory/init init
```

### Workflow 3: Gradual Configuration

```bash
# Start with quick mode
pnpm dlx @claude-memory/init init --quick

# Customize generated config
vim claude/config.yaml

# Validate changes
pnpm dlx @claude-memory/init validate --config claude/config.yaml

# Re-initialize with custom config
pnpm dlx @claude-memory/init init --config claude/config.yaml
```

## Tips

1. **Always validate** before initializing: `validate --config <path>`
2. **Backup memory notes** before re-initialization
3. **Use quick mode** for prototypes, config mode for production
4. **Commit config.yaml** to version control
5. **Don't commit** `claude/temp/` (auto-gitignored)
6. **Think language = English** is recommended for technical accuracy

## Troubleshooting

### Config file not found
```bash
# Make sure config exists
ls claude/config.yaml

# Or use absolute path
pnpm dlx @claude-memory/init init --config /absolute/path/to/config.yaml
```

### Validation errors
```bash
# Run validate to see specific errors
pnpm dlx @claude-memory/init validate --config claude/config.yaml

# Fix errors in config.yaml
vim claude/config.yaml

# Validate again
pnpm dlx @claude-memory/init validate --config claude/config.yaml
```

### Permission errors
```bash
# Make sure you have write permissions
ls -la .
chmod u+w .

# Or use sudo (not recommended)
sudo pnpm dlx @claude-memory/init init --quick
```
