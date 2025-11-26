/**
 * Python Environment Detection
 *
 * Detects Python version and all available package managers.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Python detection result
 */
export interface PythonInfo {
  version: string;                    // e.g., '3.11.0' or '' if not found
  path: string;                       // Python executable path
  available_managers: string[];       // All detected package managers
}

/**
 * Python info with user selection
 */
export interface PythonInfoWithSelection extends PythonInfo {
  selected_manager: string;           // User-selected package manager
}

/**
 * Detect Python version and path
 *
 * @returns Python version and executable path
 */
export async function detectPythonVersion(): Promise<{ version: string; path: string }> {
  // Try python3 first (more common on modern systems)
  try {
    const { stdout } = await execAsync('python3 --version');
    const match = stdout.match(/Python (\d+\.\d+\.\d+)/);
    if (match) {
      return { version: match[1], path: 'python3' };
    }
  } catch {
    // Try python
    try {
      const { stdout } = await execAsync('python --version');
      const match = stdout.match(/Python (\d+\.\d+\.\d+)/);
      if (match) {
        return { version: match[1], path: 'python' };
      }
    } catch {
      // Python not found
    }
  }

  return { version: '', path: '' };
}

/**
 * Detect all available Python package managers
 *
 * @returns Array of available package managers in priority order
 */
export async function detectAvailablePythonPackageManagers(): Promise<string[]> {
  const available: string[] = [];

  // Check in priority order
  const managers = ['uv', 'poetry', 'pipenv', 'conda', 'pip'];

  for (const manager of managers) {
    try {
      const command = manager === 'pip' ? 'pip --version || pip3 --version' : `${manager} --version`;
      await execAsync(command);
      available.push(manager);
    } catch {
      // Manager not available
    }
  }

  // If no package manager found, assume pip exists with Python
  return available.length > 0 ? available : ['pip'];
}

/**
 * Detect Python environment (complete detection)
 *
 * @returns Python version, path, and all available package managers
 */
export async function detectPython(): Promise<PythonInfo> {
  const { version, path } = await detectPythonVersion();

  if (!version) {
    return { version: '', path: '', available_managers: [] };
  }

  const available_managers = await detectAvailablePythonPackageManagers();

  return { version, path, available_managers };
}
