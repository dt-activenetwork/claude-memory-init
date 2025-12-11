import { z } from 'zod';

export const PmaGhOptionsSchema = z.object({
  /** Enable issue validation (check assignee and project linkage) */
  enable_validation: z.boolean(),

  /** Auto-create feature branch when starting issue */
  auto_create_branch: z.boolean(),

  /** Branch naming pattern */
  branch_pattern: z.string(),
});

export type PmaGhOptions = z.infer<typeof PmaGhOptionsSchema>;

// Export schema for glob import
export const schema = PmaGhOptionsSchema;
