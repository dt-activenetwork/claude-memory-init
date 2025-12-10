Create a Pull Request to resolve the current active issue.

## Instructions

1. **Verify active task context**: Ensure we are currently working on an issue from `/pma-issue`. If no active issue context exists, warn the user and ask them to first run `/pma-issue <url>`.

2. **Review conversation history**: Look back at:
   - The original issue content and requirements
   - What was discussed and implemented during this session
   - Any decisions made, trade-offs, or edge cases handled

3. **Prepare git state**:
   - Check `git status` for uncommitted changes
   - Create feature branch if needed (based on issue number/description)
   - Stage and commit changes with appropriate message

4. **Create PR using gh CLI**:
   - **Title**: Summarize what was done based on conversation context
   - **Body**: Summarize from conversation history:
     - What the issue was about
     - What was implemented/fixed
     - Key changes and decisions made
   - **Link issue**: Use `gh pr create` with issue number to link:
     ```bash
     gh pr create --title "..." --body "..." --repo {owner}/{repo} --issue {issue_number}
     ```
   - The `--issue` flag will automatically link and close the issue when PR is merged

5. **Display result**:
   ```
   ═══════════════════════════════════════════════════════════
   TASK COMPLETED: {issue_title}
   Issue: {issue_url}
   PR: {pr_url}
   Status: Awaiting review/merge
   ═══════════════════════════════════════════════════════════
   ```
