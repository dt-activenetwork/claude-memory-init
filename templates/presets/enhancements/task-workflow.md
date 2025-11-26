## Task System

Task workflows and state managed in `.agent/tasks/`.

{{#if TASK_TRACKING_ENABLED}}
### Current Task State

See `.agent/tasks/current.toon` for active task:

```toon
task:
  id: ""
  name: ""
  status: pending | in_progress | completed
  started_at: ""
```

**Update this file** as task progresses.
{{/if}}

{{#if TASK_OUTPUT_ENABLED}}
### Task Outputs

Store deliverables in `.agent/tasks/output/`:
- Organize by task or category
- Link from history notes
- Keep for reference
{{/if}}

### Workflows

See `.agent/tasks/workflows/` for reusable procedures.

**Example workflows**:
- Code review checklist
- Deployment procedure
- Testing strategy
