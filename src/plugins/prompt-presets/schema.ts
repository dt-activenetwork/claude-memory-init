import { z } from 'zod';

export const PromptPresetsOptionsSchema = z.object({
  /** Selected base template (single choice) */
  base_template: z.string(),

  /** Selected enhancements (multi-select, 0 to N) */
  enhancements: z.array(z.string()),
});

export type PromptPresetsOptions = z.infer<typeof PromptPresetsOptionsSchema>;

// Export schema for glob import
export const schema = PromptPresetsOptionsSchema;
