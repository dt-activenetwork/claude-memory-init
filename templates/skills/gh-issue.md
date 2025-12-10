---
name: gh-issue
description: Fetch and validate GitHub issue using gh CLI. Validates issue is assigned to current user and linked to a GitHub Project before analysis. Use when user provides a GitHub issue URL to understand, plan, or implement the issue.
version: 1.1.0
---

# GitHub Issue Fetcher and Validator

This skill fetches GitHub issue details using the local `gh` CLI (assumed to be authenticated), validates ownership and project linkage, then helps analyze the issue for implementation.

## When to Use

- User provides a GitHub issue URL
- User wants to understand an issue's requirements
- User needs to plan implementation for an issue
- User asks about a specific GitHub issue

## Step 1: Get Current User

```bash
gh api user --jq '.login'
```

This returns the authenticated GitHub username (e.g., `dt-activenetwork`).

## Step 2: Fetch Issue Details

```bash
gh issue view <URL> --json title,body,state,labels,assignees,author,createdAt,comments,projectItems
```

### URL Format
```
https://github.com/{owner}/{repo}/issues/{number}
```

### JSON Response Structure
```json
{
  "title": "Issue title",
  "body": "Issue description in markdown",
  "state": "OPEN",
  "labels": [{"name": "bug", "description": "...", "color": "d73a4a"}],
  "assignees": [{"login": "username", "name": "Full Name"}],
  "author": {"login": "creator", "name": "Creator Name"},
  "createdAt": "2024-01-01T00:00:00Z",
  "comments": [{"author": {"login": "..."}, "body": "..."}],
  "projectItems": [{"project": {"title": "Project Name"}, "status": {"name": "In Progress"}}]
}
```

## Step 3: Validation (CRITICAL)

### Check 1: Assignee Validation
- Extract `assignees[].login` from the response
- Compare with current user from Step 1
- **If current user NOT in assignees**:
  - WARN: "This issue is not assigned to you ({current_user}). Assignees: {assignee_list}. Are you sure this is the correct issue?"
  - Stop and wait for user confirmation

### Check 2: Project Item Validation
- Check if `projectItems` array is non-empty
- **If empty**:
  - WARN: "This issue is not linked to any GitHub Project. It may not be part of the current sprint/workflow."
  - Stop and wait for user confirmation
- **If non-empty**:
  - Display project details: project title, status, and any custom fields

### Validation Outcome
- **Both checks pass**: Proceed to analysis
- **Either check fails**: Display warnings and ask user to confirm before proceeding

## Step 4: Issue Analysis

After validation passes (or user confirms to proceed):

1. **Identify Issue Type**
   - Bug: "bug" label, error descriptions, "expected vs actual"
   - Feature: "feature", "enhancement" labels
   - Task: "task" label, specific work items
   - Documentation: "docs" label

2. **Extract Key Information**
   - Problem statement or feature request
   - Acceptance criteria (if any)
   - Related issues or PRs mentioned
   - Technical constraints

3. **Check Comments**
   - Additional context from maintainers
   - Clarifications or scope changes
   - Proposed solutions already discussed

4. **Project Item Context**
   - Current status in project board
   - Priority or sprint information
   - Related items in the same project

## Step 5: Implementation Plan

- For bugs: Root cause analysis → Fix strategy → Test plan
- For features: Requirements → Design → Implementation steps → Testing
- Consider edge cases and backwards compatibility

## Error Handling

- Issue not found: Check URL format, verify repository access
- Authentication error: Run `gh auth login`
- Rate limited: Wait and retry, inform user about API limits
- Permission denied: User may not have access to private repo
