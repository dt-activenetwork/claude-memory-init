---
description: Resume a paused task
argument-hint: [task-id]
---

# Resume Task: $ARGUMENTS

Resume work on a previously paused task with full context restoration.

## Steps

1. **Determine task to resume**:

   **If argument provided**: Use $ARGUMENTS (e.g., "task-043")

   **If no argument**:
   - Check `.agent/tasks/current.toon` for last task
   - Or ask: "Which task to resume?"
   - List paused tasks with `/task-list paused`

2. **Load task state**:
   ```
   Read .agent/tasks/states/$ARGUMENTS.toon
   ```

3. **Verify task is resumable**:
   - Status must be: `paused` or `in_progress`
   - If `created`: Suggest using `/task-start` instead
   - If `completed`: "Task already done. Create new one?"

4. **Load task prompt**:
   ```
   Read .agent/tasks/prompts/$ARGUMENTS-*.md
   ```

5. **Restore context**:

   **Display to yourself** (in thinking):
   ```
   Task: [name]
   Goal: [from prompt]
   Last session: [when paused]
   Progress: [completion %]

   Completed: [list]
   Current phase: [phase]
   Remaining: [list]

   Last session notes:
   [work_done and next_steps from last session]
   ```

6. **Check related memory**:
   ```
   Tags: [from task state]

   For each tag:
     /memory-search [tag]

   Report any NEW notes created since task started
   (might contain learnings from other work)
   ```

7. **Update current.toon**:
   ```
   Edit .agent/tasks/current.toon:

   task:
     id: "$ARGUMENTS"
     name: "[from state]"
     status: in_progress
     resumed_at: "[timestamp]"
     session_number: [increment]
   ```

8. **Add new session to task state**:
   ```
   Edit .agent/tasks/states/$ARGUMENTS.toon:

   sessions[N+1]:
     - session_id: "session-[N+1]"
       started_at: "[timestamp]"
       resumed_from: "session-[N]"

   status: in_progress
   ```

9. **Report resumption**:
   ```
   ▶️  Resumed: [task name] ($ARGUMENTS)

   Session: [N+1]
   Last worked: [X days/hours ago]

   Progress: [completion %]
   ✅ Completed: [list]
   🔄 Current phase: [phase]
   ⏳ Remaining: [list]

   Last session summary:
   [work_done from previous session]

   Next steps (from last session):
   [next_steps]

   Related memory updates:
   [Any new notes since last session]

   Ready to continue where we left off!
   ```

## Intelligent Context Restoration

**AI should**:
- Re-read task prompt to understand full context
- Review previous session notes
- Check for any new memory notes (learnings from other tasks)
- Understand what was done and what's next
- Continue seamlessly

**Don't ask user to repeat information** - everything is saved.

## Key Points

- **Full context restoration**: All details from task state and prompt
- **Session awareness**: Know what was done in previous sessions
- **Memory integration**: Check for new learnings
- **Seamless continuation**: Pick up exactly where left off

**Philosophy**: No context loss between sessions
