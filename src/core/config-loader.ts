/**
 * Configuration loader for YAML config files
 */
import YAML from 'yaml';
import { readFile } from '../utils/file-ops.js';
import type { FullConfig } from '../types/config.js';

/**
 * Load configuration from YAML file
 */
export async function loadConfigFromYaml(configPath: string): Promise<FullConfig> {
  try {
    const content = await readFile(configPath);
    let config = YAML.parse(content) as FullConfig;

    // Backward compatibility: Auto-detect system info if not present
    if (!config.system) {
      const { getSystemInfoQuick } = await import('../prompts/system-info.js');
      config.system = await getSystemInfoQuick();
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save configuration to YAML file
 */
export async function saveConfigToYaml(configPath: string, config: FullConfig): Promise<void> {
  try {
    const content = YAML.stringify(config);
    const { writeFile } = await import('../utils/file-ops.js');
    await writeFile(configPath, content);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save config to ${configPath}: ${error.message}`);
    }
    throw error;
  }
}
