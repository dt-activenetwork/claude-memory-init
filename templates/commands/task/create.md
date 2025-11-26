---
description: Create a new task with dedicated prompt
argument-hint: [task-name]
---

# Create Task: $ARGUMENTS

Create a new task definition with dedicated prompt for execution.

## Phase 1: Understand Task Requirements

From the recent conversation, gather:

1. **Task goal**: What needs to be achieved
2. **Task scope**: What's included/excluded
3. **Acceptance criteria**: How to know it's done
4. **Constraints**: Any limitations or requirements
5. **Related context**: Relevant code, docs, or decisions

**Ask user if needed**:
- "What are the main goals for this task?"
- "Are there any specific constraints?"
- "What does 'done' look like?"

## Phase 2: Generate Task ID

```
Scan .agent/tasks/states/ for existing tasks
Find highest number: task-042.toon → 42
New ID: task-043
```

## Phase 3: Create Task Prompt

Generate a specialized prompt file for this task:

```markdown
# .agent/tasks/prompts/task-043-$ARGUMENTS.md

# Task: $ARGUMENTS

**ID**: task-043
**Created**: [ISO timestamp]
**Type**: [inferred: implementation/bug-fix/refactoring/documentation/analysis]

## Goal

[Clear statement of what needs to be achieved]

## Scope

**In scope**:
- [Item 1]
- [Item 2]

**Out of scope**:
- [Item 1]

## Acceptance Criteria

Task is complete when:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Context

[Background information, related code, decisions made]

## Constraints

- [Constraint 1]
- [Constraint 2]

## Related Memory

[Tags that might be relevant: auth, api, database, etc.]

Use `/memory-search <tag>` to find related knowledge before starting.

## Approach

[Suggested approach if discussed, or "TBD during execution"]

---

**Load this prompt with**: `/task-start task-043`
```

## Phase 4: Initialize Task State

```
Create .agent/tasks/states/task-043.toon:

task:
  id: "task-043"
  name: "$ARGUMENTS"
  status: created
  created_at: "[ISO timestamp]"
  prompt_file: "tasks/prompts/task-043-*.md"

sessions[0]:
  # Will be populated when task starts

progress:
  phase: not_started
  completion: 0

tags[N]: [inferred tags]
```

## Phase 5: Report Creation

```
✅ Created task: task-043 - $ARGUMENTS

Task prompt: .agent/tasks/prompts/task-043-*.md
Task state:  .agent/tasks/states/task-043.toon

Next steps:
1. Review the task prompt (I just created it)
2. When ready: /task-start task-043
3. Or edit the prompt first if needed

The prompt contains your requirements and will guide execution.
```

## Key Points

- **Separate creation from execution**: Define task clearly before starting
- **Dedicated prompt**: Each task has its own instructions
- **Reviewable**: User can review/edit prompt before execution
- **Reusable**: Prompt persists, can re-run task if needed

**Philosophy**: Clear requirements → Better execution
