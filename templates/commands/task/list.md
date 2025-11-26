---
description: List all tasks
argument-hint: [filter]
---

# List Tasks

Show all tasks, optionally filtered by status.

**Filter options**: `all` (default), `active`, `paused`, `completed`, `created`

## Steps

1. **Scan task states**:
   ```
   List .agent/tasks/states/
   Read each task-*.toon file
   ```

2. **Parse and categorize**:

   **By status**:
   - `created`: Task defined but not started
   - `in_progress`: Currently active
   - `paused`: Started but currently suspended
   - `completed`: Finished

3. **Apply filter**:

   If $ARGUMENTS is provided:
   - `active`: Show only in_progress
   - `paused`: Show only paused
   - `completed`: Show only completed
   - `created`: Show only created (not started)
   - `all` or empty: Show all tasks

4. **Display organized list**:
   ```
   Tasks Summary
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   🔄 IN PROGRESS (1):
   - [task-043] Implement payment gateway
     Started: 2025-11-20, Session 2, Progress: 75%

   ⏸️  PAUSED (2):
   - [task-040] Update API documentation
     Last worked: 3 days ago, Progress: 40%
   - [task-041] Fix authentication bug
     Last worked: 1 week ago, Progress: 60%

   📝 CREATED (1):
   - [task-044] Refactor database queries
     Created: 2025-11-19, Not started yet

   ✅ COMPLETED (recent 5):
   - [task-042] Implement user profiles (2025-11-18)
   - [task-039] Add rate limiting (2025-11-15)
   ...

   Total: 9 tasks (1 active, 2 paused, 1 created, 5 completed)
   ```

5. **Suggest actions**:
   - If tasks paused: "Resume with `/task-resume [id]`"
   - If tasks created: "Start with `/task-start [id]`"
   - If no active task: "Create new with `/task-create`"

## Key Points

- **Overview**: See all work at a glance
- **Filter**: Focus on specific status
- **Actionable**: Clear next steps for each task

**Use cases**:
- Daily standup: What's in progress?
- Planning: What's pending?
- Retrospective: What was completed?
