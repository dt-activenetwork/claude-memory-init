---
description: Show recent memory notes
argument-hint: [count]
---

# Recent Memory Notes

Show the $ARGUMENTS most recent memory notes (default: 5 if not specified).

## Steps

1. **Scan memory directories**:
   ```
   List .agent/memory/knowledge/
   List .agent/memory/history/
   ```

2. **Sort by date**:
   - Parse dates from frontmatter or filenames
   - Sort in descending order (newest first)
   - Take top $ARGUMENTS items (or 5 if not specified)

3. **Read and summarize each**:
   - Read the complete note file
   - Extract: title, date, tags, summary

4. **Display**:
   ```
   Recent Memory Notes (latest $ARGUMENTS):

   1. [hist-042] 2025-11-20: Implemented payment gateway
      Tags: [stripe, payments, api]
      Summary: Integrated Stripe checkout...

   2. [know-015] 2025-11-19: Payment architecture
      Tags: [architecture, payments]
      Summary: Payment processing flow...

   ...
   ```

5. **Context for continuation**:
   - Highlight if any recent notes relate to current task
   - Suggest relevant notes to review

**Use case**: Quickly catch up on recent work when resuming a project.
