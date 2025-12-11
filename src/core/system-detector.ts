/**
 * Core System Detection Module
 *
 * Provides fundamental system detection utilities for CLI infrastructure.
 * This module is independent of the plugin system and serves as the foundation
 * for dependency checking and environment detection.
 *
 * @module core/system-detector
 */

import * as os from 'os';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Operating system information
 */
export interface OSInfo {
  /** Platform identifier (e.g., 'linux', 'darwin', 'win32') */
  platform: NodeJS.Platform;
  /** Human-readable OS name (e.g., 'Ubuntu 22.04', 'macOS', 'Windows 10') */
  name: string;
  /** OS version string */
  version: string;
  /** System package manager (e.g., 'apt', 'brew', 'choco') */
  packageManager?: string;
}

/**
 * Check if a command exists in the system PATH
 *
 * @param cmd - Command name to check
 * @returns Promise resolving to true if command exists, false otherwise
 *
 * @example
 * ```typescript
 * const hasGit = await commandExists('git');
 * if (hasGit) {
 *   console.log('Git is available');
 * }
 * ```
 */
export async function commandExists(cmd: string): Promise<boolean> {
  try {
    const which = os.platform() === 'win32' ? 'where' : 'which';
    await execAsync(`${which} ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the version of a command
 *
 * @param cmd - Command name to get version for
 * @param versionFlag - Flag to use for version (default: '--version')
 * @returns Promise resolving to version string or null if not available
 *
 * @example
 * ```typescript
 * const nodeVersion = await getCommandVersion('node');
 * // Returns '20.10.0' or null
 * ```
 */
export async function getCommandVersion(
  cmd: string,
  versionFlag: string = '--version'
): Promise<string | null> {
  try {
    const { stdout, stderr } = await execAsync(`${cmd} ${versionFlag}`);
    const output = stdout || stderr;

    // Extract version number from first line
    const firstLine = output.split('\n')[0];

    // Try to find version pattern (e.g., 1.2.3, v1.2.3, 1.2)
    const versionMatch = firstLine.match(/v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)/);
    return versionMatch ? versionMatch[1] : firstLine.trim();
  } catch {
    return null;
  }
}

/**
 * Get operating system information
 *
 * This function detects the current OS and returns detailed information
 * including the platform type, human-readable name, version, and
 * detected system package manager.
 *
 * @returns Promise resolving to OSInfo object
 *
 * @example
 * ```typescript
 * const osInfo = await getOS();
 * console.log(`Running on ${osInfo.name} (${osInfo.platform})`);
 * ```
 */
export async function getOS(): Promise<OSInfo> {
  const platform = os.platform();
  let name: string;
  let version: string;

  switch (platform) {
    case 'win32':
      try {
        const { stdout } = await execAsync('wmic os get Caption,Version /value');
        const caption = stdout.match(/Caption=(.+)/)?.[1]?.trim() || 'Windows';
        const ver = stdout.match(/Version=(.+)/)?.[1]?.trim() || os.release();
        name = caption;
        version = ver;
      } catch {
        name = 'Windows';
        version = os.release();
      }
      break;

    case 'darwin':
      name = 'macOS';
      try {
        const { stdout } = await execAsync('sw_vers -productVersion');
        version = stdout.trim();
      } catch {
        version = os.release();
      }
      break;

    case 'linux':
      try {
        const osRelease = await fs.readFile('/etc/os-release', 'utf-8');
        const detectedName =
          osRelease.match(/^PRETTY_NAME="(.+)"$/m)?.[1] ||
          osRelease.match(/^NAME="(.+)"$/m)?.[1] ||
          'Linux';
        const detectedVersion =
          osRelease.match(/^VERSION_ID="(.+)"$/m)?.[1] ||
          osRelease.match(/^VERSION="(.+)"$/m)?.[1] ||
          '';
        name = detectedName;
        version = detectedVersion;
      } catch {
        name = 'Linux';
        version = os.release();
      }
      break;

    default:
      name = platform;
      version = os.release();
  }

  // Detect system package manager
  const packageManager = await detectSystemPackageManager(platform);

  return { platform, name, version, packageManager };
}

/**
 * Detect the system package manager based on platform
 *
 * @param platform - The OS platform
 * @returns Promise resolving to package manager name or undefined
 */
async function detectSystemPackageManager(
  platform: NodeJS.Platform
): Promise<string | undefined> {
  if (platform === 'darwin') {
    // macOS: prefer Homebrew
    if (await commandExists('brew')) {
      return 'brew';
    }
    if (await commandExists('port')) {
      return 'port';
    }
    return 'brew'; // Default recommendation for macOS
  }

  if (platform === 'win32') {
    // Check for MSYS2 environment
    if (process.env.MSYSTEM && (await commandExists('pacman'))) {
      return 'pacman';
    }
    // Native Windows package managers
    if (await commandExists('winget')) {
      return 'winget';
    }
    if (await commandExists('choco')) {
      return 'choco';
    }
    if (await commandExists('scoop')) {
      return 'scoop';
    }
    return 'winget'; // Default for modern Windows
  }

  if (platform === 'linux') {
    // Linux package managers in priority order
    const linuxManagers = [
      { name: 'apt', check: 'apt --version' },
      { name: 'dnf', check: 'dnf --version' },
      { name: 'pacman', check: 'pacman --version' },
      { name: 'yum', check: 'yum --version' },
      { name: 'zypper', check: 'zypper --version' },
      { name: 'apk', check: 'apk --version' },
      { name: 'emerge', check: 'emerge --version' },
    ];

    for (const { name, check } of linuxManagers) {
      try {
        await execAsync(check);
        return name;
      } catch {
        // Try next
      }
    }
  }

  return undefined;
}

/**
 * Install command templates for common tools
 *
 * Maps tool names to platform-specific install commands.
 * Placeholders:
 * - {tool}: The tool name
 * - {prefix}: sudo or empty string based on privileges
 */
const INSTALL_TEMPLATES: Record<string, Record<string, string>> = {
  // Package managers
  brew: {
    darwin: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
  },
  // Common tools
  git: {
    darwin: 'brew install git',
    linux: '{prefix}apt install git || {prefix}dnf install git || {prefix}pacman -S git',
    win32: 'winget install Git.Git || choco install git',
  },
  node: {
    darwin: 'brew install node',
    linux: '{prefix}apt install nodejs || {prefix}dnf install nodejs || {prefix}pacman -S nodejs',
    win32: 'winget install OpenJS.NodeJS || choco install nodejs',
  },
  python: {
    darwin: 'brew install python',
    linux: '{prefix}apt install python3 || {prefix}dnf install python3 || {prefix}pacman -S python',
    win32: 'winget install Python.Python.3 || choco install python',
  },
  uv: {
    darwin: 'brew install uv || curl -LsSf https://astral.sh/uv/install.sh | sh',
    linux: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
    win32: 'powershell -c "irm https://astral.sh/uv/install.ps1 | iex"',
  },
  pnpm: {
    darwin: 'brew install pnpm || npm install -g pnpm',
    linux: 'npm install -g pnpm',
    win32: 'npm install -g pnpm',
  },
  yarn: {
    darwin: 'brew install yarn || npm install -g yarn',
    linux: 'npm install -g yarn',
    win32: 'npm install -g yarn',
  },
  cargo: {
    darwin: 'brew install rust || curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh',
    linux: 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh',
    win32: 'winget install Rustlang.Rustup',
  },
};

/**
 * Get the install command for a tool on the current OS
 *
 * @param tool - Tool name to get install command for
 * @param osInfo - OS information (from getOS())
 * @returns Install command string or null if not available
 *
 * @example
 * ```typescript
 * const osInfo = await getOS();
 * const installCmd = getInstallCommand('git', osInfo);
 * if (installCmd) {
 *   console.log(`Install git with: ${installCmd}`);
 * }
 * ```
 */
export function getInstallCommand(tool: string, osInfo: OSInfo): string | null {
  const templates = INSTALL_TEMPLATES[tool.toLowerCase()];
  if (!templates) {
    return null;
  }

  const platformKey = osInfo.platform === 'win32' ? 'win32' : osInfo.platform === 'darwin' ? 'darwin' : 'linux';
  const template = templates[platformKey];

  if (!template) {
    return null;
  }

  // Replace placeholders
  const prefix = process.getuid?.() === 0 ? '' : 'sudo ';
  return template.replace(/\{prefix\}/g, prefix).replace(/\{tool\}/g, tool);
}

/**
 * Check if running with root/admin privileges
 *
 * @returns True if running as root/admin
 */
export function isRoot(): boolean {
  if (os.platform() === 'win32') {
    // On Windows, check for admin by trying to read a protected path
    // This is a simplified check; real admin detection requires more complex logic
    return false;
  }
  return process.getuid?.() === 0;
}

/**
 * Check if sudo is available
 *
 * @returns Promise resolving to true if sudo is available
 */
export async function hasSudo(): Promise<boolean> {
  if (os.platform() === 'win32') {
    return false;
  }
  return commandExists('sudo');
}

/**
 * Get the command path
 *
 * @param cmd - Command to find
 * @returns Promise resolving to command path or empty string
 */
export async function getCommandPath(cmd: string): Promise<string> {
  try {
    const which = os.platform() === 'win32' ? 'where' : 'which';
    const { stdout } = await execAsync(`${which} ${cmd}`);
    return stdout.split('\n')[0].trim();
  } catch {
    return '';
  }
}
