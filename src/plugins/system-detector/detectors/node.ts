/**
 * Node.js Environment Detection
 *
 * Detects Node.js version and package manager (npm, pnpm, yarn, bun).
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Node.js detection result
 */
export interface NodeInfo {
  version: string;         // e.g., '20.10.0' or '' if not found
  package_manager: string; // 'npm' | 'pnpm' | 'yarn' | 'bun' | ''
}

/**
 * Detect Node.js environment
 *
 * @returns Node.js version and package manager
 */
export async function detectNode(): Promise<NodeInfo> {
  let version = '';
  let package_manager = '';

  // Try to detect Node.js version
  try {
    const { stdout } = await execAsync('node --version');
    // Remove 'v' prefix and get version
    version = stdout.trim().replace(/^v/, '');
  } catch {
    // Node.js not found
  }

  // If Node.js is found, detect package manager
  if (version) {
    // Check for bun
    try {
      await execAsync('bun --version');
      package_manager = 'bun';
    } catch {
      // Check for pnpm
      try {
        await execAsync('pnpm --version');
        package_manager = 'pnpm';
      } catch {
        // Check for yarn
        try {
          await execAsync('yarn --version');
          package_manager = 'yarn';
        } catch {
          // Default to npm
          try {
            await execAsync('npm --version');
            package_manager = 'npm';
          } catch {
            package_manager = 'npm'; // Assume npm exists if Node.js exists
          }
        }
      }
    }
  }

  return { version, package_manager };
}
