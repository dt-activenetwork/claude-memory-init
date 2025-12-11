import { z } from 'zod';

export const GitPluginOptionsSchema = z.object({
  /** Enable auto-commit after initialization */
  auto_commit: z.boolean(),

  /** Commit memory system files separately from other changes */
  commit_separately: z.boolean(),

  /** Patterns to add to .gitignore */
  ignore_patterns: z.array(z.string()),

  /** Remote sync configuration */
  remote_sync: z.object({
    enabled: z.boolean(),
    remote_url: z.string().optional(),
    auto_pr: z.boolean().optional(),
    pr_label: z.string().optional(),
  }),

  /** Allow AI to perform git operations */
  ai_git_operations: z.boolean(),
});

export type GitPluginOptions = z.infer<typeof GitPluginOptionsSchema>;

// Export schema for glob import
export const schema = GitPluginOptionsSchema;
