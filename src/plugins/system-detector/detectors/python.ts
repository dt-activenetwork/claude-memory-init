/**
 * Python Environment Detection
 *
 * Detects Python version and package manager (pip, pipenv, poetry, conda).
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Python detection result
 */
export interface PythonInfo {
  version: string;        // e.g., '3.11.0' or '' if not found
  package_manager: string; // 'pip' | 'pipenv' | 'poetry' | 'conda' | ''
}

/**
 * Detect Python environment
 *
 * @returns Python version and package manager
 */
export async function detectPython(): Promise<PythonInfo> {
  let version = '';
  let package_manager = '';

  // Try to detect Python version
  try {
    const { stdout } = await execAsync('python --version');
    const match = stdout.match(/Python (\d+\.\d+\.\d+)/);
    if (match) {
      version = match[1];
    }
  } catch {
    // Try python3
    try {
      const { stdout } = await execAsync('python3 --version');
      const match = stdout.match(/Python (\d+\.\d+\.\d+)/);
      if (match) {
        version = match[1];
      }
    } catch {
      // Python not found
    }
  }

  // If Python is found, detect package manager
  if (version) {
    // Check for conda
    try {
      await execAsync('conda --version');
      package_manager = 'conda';
    } catch {
      // Check for poetry
      try {
        await execAsync('poetry --version');
        package_manager = 'poetry';
      } catch {
        // Check for pipenv
        try {
          await execAsync('pipenv --version');
          package_manager = 'pipenv';
        } catch {
          // Default to pip
          try {
            await execAsync('pip --version');
            package_manager = 'pip';
          } catch {
            try {
              await execAsync('pip3 --version');
              package_manager = 'pip';
            } catch {
              package_manager = 'pip'; // Assume pip exists if Python exists
            }
          }
        }
      }
    }
  }

  return { version, package_manager };
}
