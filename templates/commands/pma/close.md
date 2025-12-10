Close the current active issue as "not planned" with a comment explaining why.

## Instructions

1. **Verify active task context**: Ensure we are currently working on an issue from `/pma-issue`. If no active issue context exists, warn the user and ask them to first run `/pma-issue <url>`.

2. **Review conversation history**: Look back at:
   - The original issue content
   - What was discussed and investigated during this session
   - Why we decided not to proceed (e.g., duplicate, out of scope, invalid, won't fix, blocked by external factors, etc.)

3. **Compose close comment**: Based on conversation context, write a comment that:
   - Explains why this issue is being closed as not planned
   - Summarizes any investigation or analysis done
   - Provides context for future reference

4. **Close the issue**:
   ```bash
   gh issue comment {issue_url} --body "{composed_comment}"
   gh issue close {issue_url} --reason "not planned"
   ```

5. **Display result**:
   ```
   ═══════════════════════════════════════════════════════════
   TASK CLOSED: {issue_title}
   Issue: {issue_url}
   Reason: Not planned
   ═══════════════════════════════════════════════════════════
   ```
