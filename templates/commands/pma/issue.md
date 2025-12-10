Fetch, validate, and analyze the GitHub issue from the provided URL.

## Issue URL
$ARGUMENTS

## Instructions

1. **Get current user**: Run `gh api user --jq '.login'` to get the current authenticated GitHub user

2. **Fetch issue details**: Use `gh issue view <URL> --json title,body,state,labels,assignees,author,createdAt,comments,projectItems`

3. **Validate the issue** (CRITICAL - must check both conditions):

   **Check 1 - Assignee validation**:
   - Verify the current gh user is in the `assignees` array
   - If NOT assigned to current user: **WARN** "This issue is not assigned to you ({current_user}). Assignees: {list}. Are you sure this is the correct issue?"

   **Check 2 - Project Item validation**:
   - Check if `projectItems` array is non-empty
   - If empty: **WARN** "This issue is not linked to any GitHub Project. It may not be part of the current sprint/workflow."
   - If non-empty: Display the project item details (project name, status, fields)

   **If either check fails**: Stop and ask user to confirm before proceeding

4. **If validation passes**, analyze the issue:
   - Identify the type (bug, feature, task, enhancement, etc.)
   - Understand the requirements or problem description
   - Note any acceptance criteria or expected behavior
   - Check comments for additional context
   - Extract project item status/priority if available

5. **Propose implementation approach**:
   - If it's a bug: analyze root cause and propose fix strategy
   - If it's a feature/task: break down into implementation steps
   - Consider edge cases and potential impacts
   - Suggest which files might need changes (if codebase context is available)

6. **Present findings**: Summarize the issue, validation status, and your proposed approach clearly, then ask if the user wants to proceed with implementation.

7. **If validation passes and entering implementation phase**:

   First, **ask user about branch setup**:
   - Check current git branch: `git branch --show-current`
   - Ask user: "Which branch should I create the feature branch from? (default: {current_branch})"
   - If user confirms or provides no input, use current branch as base

   Then, **create feature branch**:
   - Generate branch name based on issue (e.g., `{issue_number}-{short_description}`)
   - Check if branch name already exists: `git branch --list {branch_name}`
   - If exists, the naming is likely wrong - generate a different, more descriptive branch name
   - Create and checkout new branch:
     ```bash
     git checkout -b {branch_name}
     ```

   Then establish task context block:

   ```
   ═══════════════════════════════════════════════════════════
   ACTIVE TASK: {issue_title}
   Issue: {issue_url}
   Type: {bug/feature/task/...}
   Project: {project_title} | Status: {status_name}
   Branch: {new_branch_name} (from {base_branch})
   ═══════════════════════════════════════════════════════════
   ```

   Then inform the user:

   "We are now working on this issue. When ready to complete, use one of the following commands:

   - `/pma-pr` - Create a Pull Request to resolve this issue
   - `/pma-close` - Close the issue as not planned (with comment explaining why)"
