/**
 * Merge Utilities for Heavyweight Plugins
 *
 * Common merge strategies for file content during heavyweight plugin initialization.
 * These utilities handle the merging of protected files when external init commands
 * may have generated conflicting content.
 */

/**
 * Parse JSON safely with fallback
 *
 * @param content JSON string to parse
 * @returns Parsed object or null if invalid
 */
export function safeParseJson(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Deep merge two objects
 *
 * - Objects are recursively merged
 * - Arrays are merged (union, deduplicated)
 * - Source values overwrite target values for primitives
 *
 * @param target Base object
 * @param source Object to merge in (takes precedence)
 * @returns Merged object
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      // Merge arrays (union, deduplicated)
      result[key] = [...new Set([...targetValue, ...sourceValue])];
    } else {
      // Source overwrites target
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Options for markdown merge
 */
export interface MarkdownMergeOptions {
  /** Separator between sections (default: '\n\n---\n\n') */
  separator?: string;

  /** Header to add before their content */
  theirHeader?: string;

  /** Pattern to detect and replace in their content */
  headerReplacement?: {
    pattern: string | RegExp;
    replacement: string;
  };
}

/**
 * Merge markdown files with intelligent handling
 *
 * Strategy: Our content first, then their content with separator
 * Handles header deduplication and replacement
 *
 * @param ourContent Our original content (null if file didn't exist)
 * @param theirContent Content from external init command
 * @param options Merge options
 * @returns Merged content
 */
export function mergeMarkdown(
  ourContent: string | null,
  theirContent: string,
  options: MarkdownMergeOptions = {}
): string {
  const {
    separator = '\n\n---\n\n',
    theirHeader,
    headerReplacement,
  } = options;

  // No original content - use theirs
  if (!ourContent) {
    return theirContent;
  }

  // Check if their content already contains our content (avoid duplication)
  if (theirContent.includes(ourContent.trim())) {
    return theirContent;
  }

  // Apply header replacement if specified
  let processedTheirContent = theirContent;
  if (headerReplacement) {
    processedTheirContent = theirContent.replace(
      headerReplacement.pattern,
      headerReplacement.replacement
    );
  }

  // Build merged content
  const headerSection = theirHeader ? `${theirHeader}\n\n` : '';

  return `${ourContent.trimEnd()}${separator}${headerSection}${processedTheirContent.trimStart()}`;
}

/**
 * Merge JSON files with deep merge
 *
 * Strategy: Deep merge objects, union arrays, their values take precedence
 *
 * @param ourContent Our original JSON content (null if file didn't exist)
 * @param theirContent JSON content from external init command
 * @param indent JSON indentation (default: 2)
 * @returns Merged JSON string
 */
export function mergeJson(
  ourContent: string | null,
  theirContent: string,
  indent: number = 2
): string {
  const theirJson = safeParseJson(theirContent);

  if (!theirJson) {
    // Their content is invalid JSON, return as-is
    return theirContent;
  }

  if (!ourContent) {
    // No existing content, use theirs (formatted)
    return JSON.stringify(theirJson, null, indent);
  }

  const ourJson = safeParseJson(ourContent);

  if (!ourJson) {
    // Our content is invalid, use theirs
    return JSON.stringify(theirJson, null, indent);
  }

  // Deep merge: their values take precedence
  const merged = deepMerge(ourJson, theirJson);

  return JSON.stringify(merged, null, indent);
}

/**
 * Options for gitignore merge
 */
export interface GitignoreMergeOptions {
  /** Comment header for new entries (default: none) */
  header?: string;
}

/**
 * Merge gitignore files
 *
 * Strategy: Append new entries, avoid duplicates
 *
 * @param ourContent Our original gitignore content (null if file didn't exist)
 * @param theirContent Gitignore content from external init command
 * @param options Merge options
 * @returns Merged gitignore content
 */
export function mergeGitignore(
  ourContent: string | null,
  theirContent: string,
  options: GitignoreMergeOptions = {}
): string {
  if (!ourContent) {
    return theirContent;
  }

  // Parse existing entries (ignore comments and empty lines)
  const ourLines = new Set(
    ourContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  );

  // Find new entries from their content
  const theirLines = theirContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const newEntries = theirLines.filter((line) => !ourLines.has(line));

  if (newEntries.length === 0) {
    return ourContent;
  }

  // Build header
  const header = options.header ? `\n${options.header}\n` : '\n';

  return `${ourContent.trimEnd()}${header}${newEntries.join('\n')}\n`;
}

/**
 * Create a markdown merge function with preset options
 *
 * @param options Default options for the merge
 * @returns Configured merge function
 */
export function createMarkdownMerger(
  options: MarkdownMergeOptions
): (ourContent: string | null, theirContent: string) => string {
  return (ourContent, theirContent) => mergeMarkdown(ourContent, theirContent, options);
}

/**
 * Create a JSON merge function with preset indentation
 *
 * @param indent JSON indentation
 * @returns Configured merge function
 */
export function createJsonMerger(
  indent: number = 2
): (ourContent: string | null, theirContent: string) => string {
  return (ourContent, theirContent) => mergeJson(ourContent, theirContent, indent);
}

/**
 * Create a gitignore merge function with preset header
 *
 * @param header Comment header for new entries
 * @returns Configured merge function
 */
export function createGitignoreMerger(
  header?: string
): (ourContent: string | null, theirContent: string) => string {
  return (ourContent, theirContent) => mergeGitignore(ourContent, theirContent, { header });
}
