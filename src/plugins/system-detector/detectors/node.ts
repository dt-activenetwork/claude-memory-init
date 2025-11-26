/**
 * Node.js Environment Detection
 *
 * Detects Node.js version and all available package managers.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Node.js detection result
 */
export interface NodeInfo {
  version: string;                    // e.g., '20.10.0' or '' if not found
  path: string;                       // Node.js executable path
  available_managers: string[];       // All detected package managers
}

/**
 * Node.js info with user selection
 */
export interface NodeInfoWithSelection extends NodeInfo {
  selected_manager: string;           // User-selected package manager
}

/**
 * Detect Node.js version and path
 *
 * @returns Node.js version and executable path
 */
export async function detectNodeVersion(): Promise<{ version: string; path: string }> {
  try {
    const { stdout } = await execAsync('node --version');
    const version = stdout.trim().replace(/^v/, '');
    return { version, path: 'node' };
  } catch {
    return { version: '', path: '' };
  }
}

/**
 * Detect package manager from lock files
 *
 * @param projectRoot - Project root directory
 * @returns Detected package manager from lock file, or empty string
 */
export function detectPackageManagerFromLockFile(projectRoot: string): string {
  const lockFiles: Record<string, string> = {
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
    'bun.lockb': 'bun',
  };

  for (const [lockFile, manager] of Object.entries(lockFiles)) {
    if (fs.existsSync(path.join(projectRoot, lockFile))) {
      return manager;
    }
  }

  return '';
}

/**
 * Detect all available Node.js package managers
 *
 * @param projectRoot - Project root directory (to check lock files)
 * @returns Array of available package managers with lock file preference first
 */
export async function detectAvailableNodePackageManagers(
  projectRoot: string = process.cwd()
): Promise<string[]> {
  const available: string[] = [];
  const managers = ['bun', 'pnpm', 'yarn', 'npm'];

  // Check which package managers are installed
  for (const manager of managers) {
    try {
      await execAsync(`${manager} --version`);
      available.push(manager);
    } catch {
      // Manager not available
    }
  }

  // If no package manager found, assume npm exists with Node.js
  if (available.length === 0) {
    return ['npm'];
  }

  // Reorder: put lock file preference first
  const lockFilePreference = detectPackageManagerFromLockFile(projectRoot);
  if (lockFilePreference && available.includes(lockFilePreference)) {
    const reordered = [
      lockFilePreference,
      ...available.filter(m => m !== lockFilePreference),
    ];
    return reordered;
  }

  return available;
}

/**
 * Detect Node.js environment (complete detection)
 *
 * @param projectRoot - Project root directory
 * @returns Node.js version, path, and all available package managers
 */
export async function detectNode(projectRoot: string = process.cwd()): Promise<NodeInfo> {
  const { version, path } = await detectNodeVersion();

  if (!version) {
    return { version: '', path: '', available_managers: [] };
  }

  const available_managers = await detectAvailableNodePackageManagers(projectRoot);

  return { version, path, available_managers };
}
