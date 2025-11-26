---
description: Show current task status
---

# Current Task Status

Display the current task state and progress.

## Steps

1. **Read current task state**:
   ```
   Read .agent/tasks/current.toon
   ```

2. **Parse and display**:
   ```
   Current Task
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ID:          [task.id]
   Name:        [task.name]
   Status:      [task.status] (pending/in_progress/completed)
   Started:     [task.started_at]

   Progress:
   ✅ Completed: [progress.completed items]
   🔄 Current:   [progress.current]
   ⏳ Remaining: [progress.remaining items]

   Context:
   [task context notes if any]
   ```

3. **Provide next actions**:
   - Based on status, suggest what to do next
   - If in_progress: Offer to continue
   - If completed: Offer to start new task

4. **Check for related memory**:
   - If task has associated tags, mention relevant memory notes

**Use case**: Quickly see what task you're working on and what's next.
