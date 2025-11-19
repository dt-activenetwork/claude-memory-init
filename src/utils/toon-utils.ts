/**
 * TOON Format Utilities
 *
 * Utilities for working with TOON (Token-Oriented Object Notation) format.
 * TOON is the first-class citizen for AI agent data interchange.
 */

import { encode, decode } from '@toon-format/toon';

/**
 * Convert JavaScript object to TOON string
 *
 * @param obj Object to convert
 * @returns TOON formatted string
 */
export function toToon(obj: unknown): string {
  return encode(obj, { indent: 2 });
}

/**
 * Parse TOON string to JavaScript object
 *
 * @param toonString TOON formatted string
 * @returns Parsed object
 */
export function fromToon<T = unknown>(toonString: string): T {
  return decode(toonString) as T;
}

/**
 * Write object to TOON file
 *
 * @param obj Object to write
 * @returns TOON file content with header comment
 */
export function createToonFile(obj: unknown, description?: string): string {
  const header = description
    ? `# ${description}\n# TOON format - optimized for AI agent communication\n\n`
    : `# TOON format - optimized for AI agent communication\n\n`;

  return header + toToon(obj);
}

/**
 * Format system information as TOON
 *
 * @param systemInfo System detection result
 * @returns Formatted TOON string
 */
export function formatSystemInfoAsToon(systemInfo: {
  os: {
    type: string;
    name: string;
    version: string;
    is_msys2: boolean;
  };
  python?: {
    version: string;
    package_manager: string;
  };
  node?: {
    version: string;
    package_manager: string;
  };
}): string {
  // Build dev_tools array for tabular format
  const devTools: Array<{ name: string; version: string; package_manager: string }> = [];

  if (systemInfo.python?.version) {
    devTools.push({
      name: 'python',
      version: systemInfo.python.version,
      package_manager: systemInfo.python.package_manager,
    });
  }

  if (systemInfo.node?.version) {
    devTools.push({
      name: 'node',
      version: systemInfo.node.version,
      package_manager: systemInfo.node.package_manager,
    });
  }

  const data = {
    system: {
      os: {
        type: systemInfo.os.type,
        name: systemInfo.os.name,
        version: systemInfo.os.version || '',
        is_msys2: systemInfo.os.is_msys2,
      },
      dev_tools: devTools,
      detected_at: new Date().toISOString(),
    },
  };

  return createToonFile(data, 'System Information (Auto-detected)');
}

/**
 * Format plugin configuration as TOON
 *
 * @param pluginName Plugin name
 * @param config Plugin configuration
 * @returns Formatted TOON string
 */
export function formatPluginConfigAsToon(pluginName: string, config: Record<string, unknown>): string {
  const data = {
    plugin: pluginName,
    config,
    updated_at: new Date().toISOString(),
  };

  return createToonFile(data, `${pluginName} Plugin Configuration`);
}
