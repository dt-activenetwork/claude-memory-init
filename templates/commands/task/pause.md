---
description: Pause current task and save state
---

# Pause Current Task

Save current task state for later resumption.

## Steps

1. **Read current task**:
   ```
   Read .agent/tasks/current.toon
   ```

2. **Verify task is active**:
   - If no active task: "No task in progress"
   - If task status is 'created': "Task not started yet, use /task-start first"

3. **Save session record**:
   ```
   Read .agent/tasks/states/[task-id].toon

   Add to sessions array:
   sessions[N+1]:
     - session_id: "session-[N+1]"
       started_at: "[from current.toon]"
       paused_at: "[current timestamp]"
       duration: "[calculated]"
       work_done: |
         [What was accomplished this session]
       next_steps: |
         [What to do next time]
       files_modified[M]: [list of files]
   ```

4. **Update task state**:
   ```
   Edit .agent/tasks/states/[task-id].toon:

   status: paused
   last_paused_at: "[timestamp]"
   progress:
     phase: "[current phase]"
     completion: [estimated %]
     completed[N]: [list of done items]
     current: ""  ← Clear
     remaining[M]: [list of todo items]
   ```

5. **Clear current.toon**:
   ```
   Edit .agent/tasks/current.toon:

   task:
     id: ""
     name: ""
     status: none
   ```

6. **Report**:
   ```
   ⏸️  Paused: [task name] (task-043)

   Session summary:
   - Duration: 45 minutes
   - Work done: [summary]
   - Progress: 60% → 75%
   - Files modified: 3

   Next steps saved to task state.

   To resume: /task-resume task-043
   To start different task: /task-create or /task-start
   ```

## Key Points

- **Preserves context**: Full session details saved
- **Resumable**: All information needed to continue
- **Trackable**: Session history for retrospective
- **Safe**: Can switch tasks without losing work

**Use case**: End of session, switching to different task, taking a break
