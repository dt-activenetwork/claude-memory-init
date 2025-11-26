---
description: Search memory system by tag
argument-hint: [tag-name]
---

# Memory Search: $ARGUMENTS

Search the memory system for notes tagged with **$ARGUMENTS**.

## Steps

1. **Read the tag index**:
   ```
   Read .agent/memory/index/tags.toon
   ```

2. **Find the tag** "$ARGUMENTS" in the index

3. **Extract note IDs**:
   - Look for: `$ARGUMENTS[N]: note-id-1,note-id-2,...`
   - Parse the comma-separated list

4. **Report findings**:
   - If found: "Found N notes tagged '$ARGUMENTS': [list of IDs]"
   - If not found: "No notes found with tag '$ARGUMENTS'"

5. **Offer to read**:
   - Ask if user wants to read any of the matching notes
   - Read the full note files from `.agent/memory/knowledge/` or `.agent/memory/history/`

## Example

```
Tag "authentication" → [know-001, know-005, hist-012]

Found 3 notes:
- know-001: OAuth 2.0 implementation
- know-005: Session management
- hist-012: Login feature implementation (2025-11-15)

Would you like me to read any of these?
```

**Key**: Read the COMPLETE note files, not just excerpts.
