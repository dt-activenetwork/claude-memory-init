## Memory System Usage

This project uses a memory system in `.agent/memory/`.

**CRITICAL**: Always use indexes, not find/grep.

### Workflow

**Before starting work**:
1. Read `.agent/memory/index/tags.toon`
2. Read `.agent/memory/index/topics.toon`
3. Look up relevant tags/topics
4. Read identified notes by ID

**During work**:
- Use knowledge from memory notes
- Don't re-analyze what's already documented

**After completing work**:
1. Create/update memory notes
2. Update indexes immediately
3. Add cross-references

### Memory Structure

```
.agent/memory/
├── index/
│   ├── tags.toon      # Tag → Note IDs
│   └── topics.toon    # Topic hierarchy
├── knowledge/         # Stable facts (sem-NNN)
├── history/           # Task records (ep-NNN)
└── workflows/         # Procedures
```

**Example**:
```
Task: "Analyze authentication"
→ Read tags.toon
→ Find tag "auth" → [know-001, know-005]
→ Read know-001-oauth-flow.md
→ Use knowledge to answer
```

See `.agent/memory/workflow.md` for complete workflow.
