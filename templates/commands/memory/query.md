---
description: Query memory by topic
argument-hint: [topic-path]
---

# Memory Query: $ARGUMENTS

Query the memory system for notes under topic **$ARGUMENTS**.

## Steps

1. **Read the topic index**:
   ```
   Read .agent/memory/index/topics.toon
   ```

2. **Navigate to topic** "$ARGUMENTS"
   - Topics use dot notation: `backend.auth.oauth`
   - Find the nested path in the TOON structure

3. **Extract note IDs**:
   - Get the list of note IDs under this topic
   - Example: `backend.auth[2]: know-001,know-005`

4. **Read matching notes**:
   - Read EACH note file completely
   - Notes in `.agent/memory/knowledge/` or `.agent/memory/history/`

5. **Provide organized summary**:
   ```
   Topic: $ARGUMENTS

   Found N notes:

   1. [know-001] OAuth 2.0 Flow
      - Created: 2025-11-10
      - Tags: [auth, oauth, security]
      - Summary: [first 2-3 sentences]

   2. [know-005] Session Management
      ...
   ```

## Related Topics

After answering, suggest related topics from the index that might be useful.

**Important**: Read complete note files to provide accurate information.
