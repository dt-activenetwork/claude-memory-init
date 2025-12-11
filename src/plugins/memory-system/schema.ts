import { z } from 'zod';

export const MemorySystemOptionsSchema = z.object({
  /** Enabled memory types */
  memory_types: z.array(z.string()), // ['knowledge', 'history']

  /** Include system knowledge layer */
  include_system: z.boolean(),
});

export type MemorySystemOptions = z.infer<typeof MemorySystemOptionsSchema>;

// Export schema for glob import
export const schema = MemorySystemOptionsSchema;
