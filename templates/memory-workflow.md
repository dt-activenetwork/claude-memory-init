# Memory System Workflow

## Index-Based Retrieval (REQUIRED)

**CRITICAL**: Do NOT use find/grep to search memory. Use indexes.

Wrong way:
```
❌ find .agent/memory -name "*.md" | xargs grep "authentication"
❌ grep -r "oauth" .agent/memory/
```

Correct way:
```
✅ Read .agent/memory/index/tags.toon
✅ Look up tag "auth" → get note IDs [sem-005, sem-008]
✅ Read sem-005.md and sem-008.md directly
```

Why indexes exist:
- Tags/topics are curated (not guessed)
- Direct file access (no scanning)
- Token efficient (read only relevant notes)

## Three-Phase Pattern

### Phase 1: Read Memory (Before Work)

Steps:
1. Read `.agent/memory/index/tags.toon`
2. Read `.agent/memory/index/topics.toon`
3. Query tags/topics for task keywords (use tags FROM index, not invented)
4. Read identified semantic notes BY ID (e.g., sem-005)
5. Read last 1-2 episodic notes BY ID

Example:
```
Task: "Analyze authentication module"
→ Read tags.toon
→ Find tag "auth" in index → [sem-005, sem-008]
→ Find topic "authentication.implementation" → [sem-005]
→ Read .agent/memory/semantic/sem-005-authentication-architecture.md
→ Read .agent/memory/episodic/ep-012-auth-review-session.md
→ Start work with existing knowledge
```

Anti-pattern:
```
❌ Guess keyword "authentication"
❌ grep -r "authentication" .agent/memory/
❌ Hope to find something
```

### Phase 2: Work (Using Memory)

Rules:
- Use semantic notes as foundation
- Only read new code if memory insufficient
- Create notes immediately on discoveries (don't batch)
- Update episodic note with progress

Example:
```
Discovery: New OAuth2 flow in AuthController.ts:45-120
→ Immediately create sem-008-oauth2-flow.md
→ Update ep-current with discovery note
→ Continue work
```

### Phase 3: Update Memory (After Work)

Steps:
1. Create/update semantic notes (stable knowledge)
2. Create episodic note (session record)
3. Update tags.toon and topics.toon
4. Add cross-references

Example:
```
Session complete: Documented authentication module
→ Created sem-008-oauth2-flow.md, sem-009-session-management.md
→ Created ep-013-auth-documentation-session.md
→ Updated tags.toon: add [oauth2, session] → [sem-008, sem-009]
→ Updated topics.toon: add authentication.oauth2 → sem-008
→ Added cross-refs: sem-008 ← relates to → sem-005
```

## Memory Types

semantic/:   Stable architectural knowledge (sem-NNN-name.md)
episodic/:   Task history and sessions (ep-NNN-name.md)
procedural/: Reusable workflows (proc-name.md)
system/:     System-level shared knowledge (sys-name.md)

## Index Format

tags.toon:
```toon
tags:
  auth[2]: sem-005,sem-008
  oauth2[1]: sem-008
  api[3]: sem-005,sem-007,sem-010
updated: "2025-11-19T14:00:00Z"
```

topics.toon:
```toon
topics:
  authentication:
    implementation[2]: sem-005,sem-008
    security[1]: sem-005
  api:
    design[2]: sem-007,sem-010
updated: "2025-11-19T14:00:00Z"
```

## Note Format

semantic note example:
```markdown
---
id: sem-008
title: OAuth2 Authentication Flow
tags: [auth, oauth2, security]
topics: [authentication.oauth2]
created: 2025-11-19
updated: 2025-11-19
---

# OAuth2 Authentication Flow

## Architecture
[Description]

## Implementation
Location: AuthController.ts:45-120
[Details]

## Related
- [[sem-005]] - Base authentication system
```

episodic note example:
```markdown
---
id: ep-013
date: 20251119
task: Document authentication module
status: completed
tags: [documentation, auth]
---

# Auth Documentation Session

## What Was Done
- Analyzed OAuth2 implementation
- Created sem-008, sem-009
- Generated API documentation

## Outputs
- docs/auth-api.md
- .agent/memory/semantic/sem-008-oauth2-flow.md

## Next Steps
None (complete)
```

## File Locations

memory/index/tags.toon         - Tag-based index
memory/index/topics.toon       - Topic hierarchy
memory/semantic/*.md           - Architectural knowledge
memory/episodic/*.md           - Task history
memory/procedural/*.md         - Workflows
memory/system/*.md             - System knowledge (tools, standards)
