---
description: List all incomplete tasks
---

# Incomplete Tasks

List all tasks that are not yet completed.

## Steps

1. **Scan task history**:
   ```
   List .agent/memory/history/
   Read .agent/tasks/current.toon
   ```

2. **Find incomplete tasks**:
   - Current task from `current.toon`
   - Historical tasks marked as `status: in_progress` or `status: pending`
   - Parse from history note frontmatter

3. **Organize by priority**:
   - Current task (highest priority)
   - In-progress tasks
   - Pending tasks

4. **Display**:
   ```
   Incomplete Tasks
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   🔄 CURRENT:
   - [task-042] Implement payment gateway (in_progress)
     Started: 2025-11-20
     Phase: testing

   ⏳ PENDING:
   - [task-040] Update API documentation
   - [task-041] Fix authentication bug

   Total incomplete: 3 tasks
   ```

5. **Offer to work on**:
   - Ask if user wants to continue current task
   - Or switch to a different task

**Use case**: See what's left to do, prioritize work.
