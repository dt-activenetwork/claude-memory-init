# Claude Init - Configuration Examples

Real-world configuration examples for different project types.

---

## Example 1: Minimal Python Project

**Scenario**: Small Python script, no complex memory system needed

### Configuration

```toon
# .agent/config.toon

project:
  name: data-analysis-script
  version: 1.0.0

plugins:
  system-detector:
    enabled: true
  memory-system:
    enabled: false
  git:
    enabled: false
  task-system:
    enabled: false
  prompt-presets:
    enabled: false
```

### Generated Structure

```
data-analysis-script/
├── AGENT.md
└── .agent/
    └── system/
        └── info.toon
```

### AGENT.md Content

```markdown
# AI Agent Instructions

**Project**: data-analysis-script

## System Environment

**Operating System**: Ubuntu 22.04
**Package Manager**: apt

## Development Environment

### Python Environment

**Status**: ✅ Available
**Version**: 3.11.5
**Package Manager**: uv (preferred)
**Also Available**: pip

**Installation**:
```bash
uv install <package>
```
```

---

## Example 2: Full-Featured Node.js Project

**Scenario**: Complex web app, needs memory system and task tracking

### Configuration

```toon
# .agent/config.toon

project:
  name: ecommerce-platform
  version: 2.0.0

plugins:
  system-detector:
    enabled: true
  memory-system:
    enabled: true
    options:
      memory_types[2]: knowledge,history
      include_system: true
  git:
    enabled: true
    options:
      auto_commit: false
      ai_git_operations: false
  task-system:
    enabled: true
    options:
      enable_tracking: true
      enable_output: true
  prompt-presets:
    enabled: true
```

### Generated Structure

```
ecommerce-platform/
├── AGENT.md
└── .agent/
    ├── config.toon
    ├── system/
    │   └── info.toon
    ├── git/
    │   ├── rules.md
    │   └── config.toon
    ├── memory/
    │   ├── index/
    │   │   ├── tags.toon
    │   │   └── topics.toon
    │   ├── knowledge/
    │   ├── history/
    │   └── workflows/
    ├── tasks/
    │   ├── current.toon
    │   ├── output/
    │   ├── workflows/
    │   └── tmp/
    └── presets/
        └── README.md
```

### System Info

```toon
# .agent/system/info.toon

plugin: system-detector
detected_at: 2025-11-20T10:00:00Z
last_updated: 2025-11-20T10:00:00Z

os:
  name: Ubuntu
  version: 22.04
  type: linux
  package_manager: apt

node:
  version: 20.10.0
  path: node
  available_managers[2]: pnpm,npm
  selected_manager: pnpm

locale:
  timezone: America/New_York
  language: en_US.UTF-8
```

### Git Config

```toon
# .agent/git/config.toon

plugin: git
config:
  auto_commit: false
  commit_separately: true
  ai_git_operations: false
  ignore_patterns[2]: .agent/tasks/tmp/,.agent/.cache/
```

---

## Example 3: Multi-Language Project

**Scenario**: Full-stack app with Python backend + Node.js frontend

### System Detection Result

```toon
# .agent/system/info.toon

python:
  version: 3.11.5
  path: python3
  available_managers[3]: uv,poetry,pip
  selected_manager: poetry

node:
  version: 20.10.0
  path: node
  available_managers[3]: pnpm,yarn,npm
  selected_manager: pnpm
```

### AGENT.md Content

```markdown
## Development Environment

### Python Environment

**Version**: 3.11.5
**Package Manager**: poetry (preferred)
**Also Available**: uv, pip

**Installation**:
```bash
poetry add <package>
```

### Node.js Environment

**Version**: 20.10.0
**Package Manager**: pnpm (preferred)
**Also Available**: yarn, npm

**Installation**:
```bash
pnpm add <package>
```
```

---

## Example 4: Lock File Detection

**Scenario**: Project with existing `pnpm-lock.yaml`

### During Initialization

```
[System Detection]
✓ Node.js: 20.10.0
  Available managers: pnpm, npm, yarn

? Multiple Node.js package managers detected. Which do you prefer?
  ◉ pnpm        ⚡ Fast, disk space efficient (recommended)  ← Auto-selected!
  ○ npm         📦 Standard Node.js package manager
  ○ yarn        🧶 Fast, reliable, secure dependency manager
```

**Why pnpm is first**: Detected `pnpm-lock.yaml` in project root.

### Result

```toon
node:
  available_managers[3]: pnpm,npm,yarn
  selected_manager: pnpm
```

---

## Example 5: Memory System in Action

### Knowledge Note

```markdown
# .agent/memory/knowledge/know-001-authentication-flow.md

---
id: know-001
tags: [auth, oauth, security]
topics: [backend.auth, api.security]
created: 2025-11-20
updated: 2025-11-20
---

# OAuth 2.0 Authentication Flow

## Overview

Our application uses OAuth 2.0 with JWT tokens for authentication.

## Flow

1. User requests login
2. Frontend redirects to `/auth/login`
3. Backend validates with OAuth provider
4. JWT token issued (expires in 24h)
5. Token stored in httpOnly cookie

## Implementation

- Auth service: `src/services/auth.ts:42`
- Token validation: `src/middleware/auth.ts:18`
- Refresh logic: `src/services/token.ts:67`

## Related

- [[know-005]] - Session management
- [[know-012]] - Security best practices
```

### Index Entry

```toon
# .agent/memory/index/tags.toon

tags:
  auth[3]: know-001,know-005,know-012
  oauth[1]: know-001
  security[2]: know-001,know-012

updated: "2025-11-20T10:30:00Z"
```

### How Claude Uses It

```
User: "How does authentication work?"

Claude:
1. Reads .agent/memory/index/tags.toon
2. Finds tag "auth" → [know-001, know-005, know-012]
3. Reads know-001-authentication-flow.md
4. Answers based on documented knowledge (no code reading needed)
```

**Result**: Faster response, accurate answer, no wasted context.

---

## Example 6: Task Tracking

### Current Task

```toon
# .agent/tasks/current.toon

task:
  id: "task-042"
  name: "Implement payment gateway"
  status: in_progress
  started_at: "2025-11-20T09:00:00Z"

progress:
  phase: implementation
  completed[3]: research,design,api-integration
  current: testing
  remaining[2]: documentation,deployment

context:
  payment_provider: stripe
  api_version: "2023-10-16"

notes: |
  Using Stripe Checkout for simplicity.
  Webhook endpoint: /api/webhooks/stripe
```

### How Claude Uses It

When you return to work:
```
User: "Continue working on the payment gateway"

Claude:
1. Reads .agent/tasks/current.toon
2. Sees: task-042, phase: testing
3. Knows: Stripe integration, webhook endpoint
4. Continues from where you left off
```

---

## Example 7: Workflow Template

```markdown
# .agent/tasks/workflows/workflow-code-review.md

# Code Review Workflow

## Trigger

User requests: "Review this PR" or "Code review needed"

## Steps

1. **Read PR changes**
   - Use git diff or provided files
   - Understand scope and purpose

2. **Check memory**
   - Read .agent/memory/index/tags.toon
   - Find related knowledge notes
   - Review architectural patterns

3. **Review checklist**
   - [ ] Code quality (naming, structure)
   - [ ] Security (input validation, auth)
   - [ ] Performance (N+1 queries, caching)
   - [ ] Tests (coverage, edge cases)

4. **Provide feedback**
   - List issues by severity
   - Suggest improvements
   - Highlight good practices

5. **Update memory**
   - Document new patterns discovered
   - Add to indexes
```

---

## Summary

These examples show:

1. **Flexibility**: Configure for your needs (minimal to full-featured)
2. **Persistence**: Preferences saved, no repeated questions
3. **Intelligence**: Lock file detection, smart defaults
4. **Efficiency**: TOON format, indexed memory
5. **Scalability**: Works for small scripts to large applications

Start simple, add features as needed!
