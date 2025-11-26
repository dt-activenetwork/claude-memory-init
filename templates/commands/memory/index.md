---
description: Show memory system index overview
---

# Memory System Index

Display an overview of the memory system structure and available content.

## Steps

1. **Read both indexes**:
   ```
   Read .agent/memory/index/tags.toon
   Read .agent/memory/index/topics.toon
   ```

2. **Parse and organize**:
   - Count total tags
   - Count total topics
   - Count notes per tag
   - Show topic hierarchy

3. **Display summary**:
   ```
   Memory System Index

   Tags (N total):
   - authentication [3 notes]
   - api-design [5 notes]
   - database [2 notes]
   ...

   Topics (N total):
   - backend
     - auth [3 notes]
     - api [5 notes]
   - frontend
     - components [4 notes]
   ...

   Total notes: N knowledge + M history
   Last updated: [from index file]
   ```

4. **Offer exploration**:
   - Suggest using `/memory:search <tag>` or `/memory:query <topic>`
   - Highlight tags/topics with most notes

**Purpose**: Quick overview to help user find what they need.
