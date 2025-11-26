---
description: Start executing a task
argument-hint: [task-id]
---

# Start Task: $ARGUMENTS

Begin executing a task that has been created (has a prompt).

**Note**: Use `/task-create` first if task doesn't exist yet.

## Steps

1. **Validate task exists**:
   ```
   Check if .agent/tasks/states/$ARGUMENTS.toon exists
   Check if .agent/tasks/prompts/$ARGUMENTS-*.md exists
   ```

   If not found: "Task $ARGUMENTS doesn't exist. Use `/task-create` first."

2. **Check current task**:
   ```
   Read .agent/tasks/current.toon
   ```

   If another task is active:
   - Warn: "Task '[name]' is currently in progress"
   - Ask: "Pause it and start $ARGUMENTS?"
   - If yes: `/task-pause` first

3. **Load task prompt**:
   ```
   Read .agent/tasks/prompts/$ARGUMENTS-*.md COMPLETELY
   ```

   **This is the task spec** - understand:
   - Goal and scope
   - Acceptance criteria
   - Constraints
   - Context and background

4. **Load task state**:
   ```
   Read .agent/tasks/states/$ARGUMENTS.toon
   ```

   Understand:
   - Previous sessions (if any)
   - Current progress
   - What's been done
   - What remains

5. **Check related memory**:
   ```
   Tags from task: [list]

   For each tag:
     /memory-search [tag]

   Report relevant knowledge:
   "Found N notes related to this task. Key notes:
    - know-005: [relevant knowledge]
    - hist-020: [previous similar work]"
   ```

6. **Update current.toon**:
   ```
   Edit .agent/tasks/current.toon:

   task:
     id: "$ARGUMENTS"
     name: "[from task state]"
     status: in_progress
     started_at: "[timestamp]"
     session_number: [increment from task state]
     prompt_loaded: true
   ```

7. **Add session to task state**:
   ```
   Edit .agent/tasks/states/$ARGUMENTS.toon:

   sessions[N+1]:
     - session_id: "session-[N+1]"
       started_at: "[timestamp]"

   status: in_progress
   ```

8. **Begin execution**:
   ```
   ▶️  Started: [task name] ($ARGUMENTS)

   Session: [N+1]
   [If N > 0: "Resuming from session [N]"]

   Goal: [from prompt]

   Current progress:
   ✅ Completed: [items]
   🔄 Phase: [phase]
   ⏳ Remaining: [items]

   Related knowledge loaded:
   [Summary of relevant memory notes]

   Ready to work! Following task prompt guidance.
   ```

## Important

**Task prompt is the source of truth**:
- Read it completely before starting
- Follow its requirements and constraints
- Refer back to it during execution
- Update task state as you progress

**This is execution, not creation**: Task spec already defined in prompt.

**Use /task-pause** when you need to stop (saves progress for next session).
