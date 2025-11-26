---
description: Mark current task as complete
---

# Mark Task Complete

Mark the current task as completed and update task state.

## Steps

1. **Read current task**:
   ```
   Read .agent/tasks/current.toon
   ```

2. **Confirm completion**:
   - Display task details
   - Ask user: "Mark this task as complete?"

3. **If confirmed, update state**:
   ```
   Edit .agent/tasks/current.toon:
   - Change status: completed
   - Add completed_at: [current timestamp]
   - Add completion_notes: [brief summary]
   ```

4. **Create history record** (if not exists):
   - Create `.agent/memory/history/hist-NNN-[task-name].md`
   - Include: what was done, outcomes, learnings
   - Link to task outputs if any

5. **Update memory indexes**:
   - Add relevant tags to `tags.toon`
   - Add to topic hierarchy in `topics.toon`

6. **Clear or prompt for next task**:
   ```
   ✅ Task completed: [task.name]

   Next steps:
   - Start a new task: /task:start
   - View incomplete tasks: /task:incomplete
   - Take a break 😊
   ```

**Use case**: Properly close out a task with documentation and memory updates.
