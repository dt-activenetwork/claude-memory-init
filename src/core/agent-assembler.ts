/**
 * AGENT.md Assembler
 *
 * Assembles AGENT.md from template by replacing placeholders with plugin-contributed content.
 */

import { readFile } from '../utils/file-ops.js';
import type { Plugin, PluginConfig, PluginContext } from '../plugin/types.js';

/**
 * Template variables for AGENT.md
 */
export interface AgentTemplateVariables {
  PROJECT_NAME: string;
  VERSION: string;
  LAST_UPDATED: string;
  THINK_LANGUAGE: string;
  USER_LANGUAGE: string;
}

/**
 * Assemble AGENT.md from template and plugin contributions
 *
 * Process:
 * 1. Load AGENT.md.template
 * 2. Replace static variables (PROJECT_NAME, etc.)
 * 3. Replace plugin placeholders with generated content
 * 4. Clean up empty sections (multiple newlines)
 *
 * @param templatePath Path to AGENT.md.template
 * @param variables Template variables
 * @param plugins Enabled plugins
 * @param configs Plugin configurations
 * @param context Plugin context
 * @returns Assembled AGENT.md content
 */
export async function assembleAgentMd(
  templatePath: string,
  variables: AgentTemplateVariables,
  plugins: Plugin[],
  configs: Map<string, PluginConfig>,
  context: PluginContext
): Promise<string> {
  // 1. Load template
  let content = await readFile(templatePath);

  // 2. Replace static variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    content = content.replace(new RegExp(placeholder, 'g'), value);
  }

  // 3. Replace plugin placeholders
  for (const plugin of plugins) {
    if (plugin.prompt) {
      const config = configs.get(plugin.meta.name);

      // Generate content (may be empty string if plugin disabled)
      const generatedContent = config
        ? await plugin.prompt.generate(config, context)
        : '';

      // Replace placeholder
      const placeholder = `{{${plugin.prompt.placeholder}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), generatedContent);
    }
  }

  // 4. Replace any remaining placeholders with empty string
  // This handles placeholders that don't have corresponding plugins
  content = content.replace(/\{\{[A-Z_]+\}\}/g, '');

  // 5. Clean up multiple consecutive newlines (leave max 2)
  content = content.replace(/\n{3,}/g, '\n\n');

  // 6. Trim trailing whitespace on each line
  content = content
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  // 7. Ensure single trailing newline
  content = content.trimEnd() + '\n';

  return content;
}

/**
 * Get all placeholder names from template
 *
 * Useful for validation and debugging.
 *
 * @param template Template content
 * @returns Array of placeholder names
 */
export function extractPlaceholders(template: string): string[] {
  const regex = /\{\{([A-Z_]+)\}\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }

  return placeholders;
}

/**
 * Validate that all placeholders have corresponding plugins or are handled
 *
 * @param template Template content
 * @param plugins Registered plugins
 * @param staticVariables Static variable names
 * @returns Unhandled placeholders (if any)
 */
export function validatePlaceholders(
  template: string,
  plugins: Plugin[],
  staticVariables: string[]
): string[] {
  const allPlaceholders = extractPlaceholders(template);
  const handledPlaceholders = new Set([
    ...staticVariables,
    ...plugins.filter((p) => p.prompt).map((p) => p.prompt!.placeholder),
  ]);

  return allPlaceholders.filter((p) => !handledPlaceholders.has(p));
}
