import { z } from 'zod';

export const TaskSystemOptionsSchema = z.object({
  /** Enable task tracking */
  enable_tracking: z.boolean(),

  /** Enable task output directory */
  enable_output: z.boolean(),
});

export type TaskSystemOptions = z.infer<typeof TaskSystemOptionsSchema>;

// Export schema for glob import
export const schema = TaskSystemOptionsSchema;
