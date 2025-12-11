import { z } from 'zod';

// User system preferences schema (stored in ~/.claude/)
export const UserSystemPreferencesSchema = z.object({
  /** OS information (static, detected once per machine) */
  os: z.object({
    type: z.enum(['linux', 'darwin', 'windows']),
    name: z.string(),
    package_manager: z.string(),
  }),

  /** User's preferred package managers */
  preferred_managers: z.object({
    python: z.string().optional(), // e.g., 'uv', 'pip', 'poetry'
    node: z.string().optional(), // e.g., 'pnpm', 'npm', 'yarn'
  }),

  /** Locale preferences */
  locale: z.object({
    timezone: z.string(),
    language: z.string(),
  }),

  /** Metadata */
  created_at: z.string(),
  updated_at: z.string(),
});

export type UserSystemPreferences = z.infer<typeof UserSystemPreferencesSchema>;

// Project system config schema (stored in project/.agent/)
export const ProjectSystemConfigSchema = z.object({
  /** Package managers to use in this project */
  package_managers: z.object({
    python: z.string().optional(), // Actual manager for this project
    node: z.string().optional(), // Actual manager for this project
  }),

  /** Metadata */
  configured_at: z.string(),
});

export type ProjectSystemConfig = z.infer<typeof ProjectSystemConfigSchema>;

// Main options schema
export const SystemDetectorOptionsSchema = z.object({
  userPreferences: UserSystemPreferencesSchema.nullable(),
  projectConfig: ProjectSystemConfigSchema,
});

export type SystemDetectorOptions = z.infer<typeof SystemDetectorOptionsSchema>;

// Export schema for glob import
export const schema = SystemDetectorOptionsSchema;
