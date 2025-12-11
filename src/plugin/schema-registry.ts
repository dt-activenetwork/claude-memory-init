import type { ZodType } from 'zod';

/**
 * Schema Registry - Uses Vite's import.meta.glob to batch import all plugin schemas
 *
 * Each plugin should export a `schema` constant from its schema.ts file.
 */

// Batch import all plugin schemas using Vite's glob import
const schemaModules = import.meta.glob<{ schema: ZodType }>(
  '../plugins/*/schema.ts',
  { eager: true }
);

// Extract plugin name from path: '../plugins/git/schema.ts' -> 'git'
function extractPluginName(path: string): string {
  const match = path.match(/\/plugins\/([^/]+)\/schema\.ts$/);
  return match?.[1] ?? '';
}

// Build schema registry
export const schemaRegistry = new Map<string, ZodType>();

for (const [path, module] of Object.entries(schemaModules)) {
  const pluginName = extractPluginName(path);
  if (pluginName && module.schema) {
    schemaRegistry.set(pluginName, module.schema);
  }
}

/**
 * Get schema for a specific plugin
 *
 * @param pluginName Plugin name (e.g., 'git', 'memory-system')
 * @returns Zod schema or undefined if not found
 */
export function getSchema(pluginName: string): ZodType | undefined {
  return schemaRegistry.get(pluginName);
}

/**
 * Validate plugin options using its schema
 *
 * @param pluginName Plugin name
 * @param options Options to validate
 * @returns Validated and parsed options
 * @throws ZodError if validation fails, Error if no schema found
 */
export function validatePluginOptions<T>(pluginName: string, options: unknown): T {
  const schema = schemaRegistry.get(pluginName);
  if (!schema) {
    throw new Error(`No schema found for plugin: ${pluginName}`);
  }
  return schema.parse(options) as T;
}

/**
 * Safely validate plugin options (returns result instead of throwing)
 *
 * @param pluginName Plugin name
 * @param options Options to validate
 * @returns Object with success status and data/error
 */
export function safeValidatePluginOptions<T>(
  pluginName: string,
  options: unknown
): { success: true; data: T } | { success: false; error: Error } {
  const schema = schemaRegistry.get(pluginName);
  if (!schema) {
    return { success: false, error: new Error(`No schema found for plugin: ${pluginName}`) };
  }

  const result = schema.safeParse(options);
  if (result.success) {
    return { success: true, data: result.data as T };
  }
  return { success: false, error: result.error };
}
