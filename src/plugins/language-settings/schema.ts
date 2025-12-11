import { z } from 'zod';

export const LanguageSettingsOptionsSchema = z.object({
  /** Language for AI's internal thinking (code analysis, technical reasoning) */
  think_language: z.string(),

  /** Language for AI's user-facing outputs (documentation, reports) */
  user_language: z.string(),
});

export type LanguageSettingsOptions = z.infer<typeof LanguageSettingsOptionsSchema>;

// Export schema for glob import
export const schema = LanguageSettingsOptionsSchema;
