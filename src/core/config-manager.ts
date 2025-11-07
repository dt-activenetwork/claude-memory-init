/**
 * Configuration management utilities
 */
import * as path from 'path';
import { loadConfigFromYaml, saveConfigToYaml } from './config-loader.js';
import { fileExists } from '../utils/file-ops.js';
import type { FullConfig, Objective } from '../types/config.js';

/**
 * Find config file in target directory
 */
export async function findConfigFile(targetDir: string): Promise<string | null> {
  const configPath = path.join(targetDir, 'claude', 'config.yaml');
  if (await fileExists(configPath)) {
    return configPath;
  }
  return null;
}

/**
 * Load config from target directory
 */
export async function loadConfig(targetDir: string): Promise<{ config: FullConfig; configPath: string }> {
  const configPath = await findConfigFile(targetDir);
  if (!configPath) {
    throw new Error('Config file not found. Run "claude-memory-init init" first.');
  }
  const config = await loadConfigFromYaml(configPath);
  return { config, configPath };
}

/**
 * Add an objective to the config
 */
export async function addObjective(
  targetDir: string,
  objective: string,
  memoryCheck?: string,
  memoryUpdate?: string
): Promise<void> {
  const { config, configPath } = await loadConfig(targetDir);

  const newObjective: Objective = {
    objective,
    memory_check: memoryCheck || `Search semantic notes for "${objective}"`,
    memory_update: memoryUpdate || `Create semantic notes for "${objective}"`
  };

  config.objectives.push(newObjective);
  await saveConfigToYaml(configPath, config);
}

/**
 * Add an assumption to the config
 */
export async function addAssumption(targetDir: string, assumption: string): Promise<void> {
  const { config, configPath } = await loadConfig(targetDir);
  config.assumptions.push(assumption);
  await saveConfigToYaml(configPath, config);
}

/**
 * Set a simple configuration value
 */
export async function setConfigValue(
  targetDir: string,
  key: string,
  value: any
): Promise<void> {
  const { config, configPath } = await loadConfig(targetDir);

  // Support dot notation for nested keys
  const keys = key.split('.');
  let current: any = config;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      throw new Error(`Invalid config key: ${keys.slice(0, i + 1).join('.')}`);
    }
    current = current[keys[i]];
  }

  const lastKey = keys[keys.length - 1];
  if (!(lastKey in current)) {
    throw new Error(`Invalid config key: ${key}`);
  }

  current[lastKey] = value;
  await saveConfigToYaml(configPath, config);
}

/**
 * Remove an objective by index
 */
export async function removeObjective(targetDir: string, index: number): Promise<void> {
  const { config, configPath } = await loadConfig(targetDir);

  if (index < 0 || index >= config.objectives.length) {
    throw new Error(`Invalid index: ${index}. Valid range: 0-${config.objectives.length - 1}`);
  }

  config.objectives.splice(index, 1);
  await saveConfigToYaml(configPath, config);
}

/**
 * Remove an assumption by index
 */
export async function removeAssumption(targetDir: string, index: number): Promise<void> {
  const { config, configPath } = await loadConfig(targetDir);

  if (index < 0 || index >= config.assumptions.length) {
    throw new Error(`Invalid index: ${index}. Valid range: 0-${config.assumptions.length - 1}`);
  }

  config.assumptions.splice(index, 1);
  await saveConfigToYaml(configPath, config);
}
