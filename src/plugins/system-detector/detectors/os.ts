/**
 * Operating System Detection
 *
 * Detects OS type, name, version, and special environments (MSYS2).
 */

import * as os from 'os';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * OS detection result
 */
export interface OSInfo {
  type: string;            // 'linux' | 'windows' | 'darwin'
  name: string;            // e.g., 'Ubuntu 22.04', 'Windows 10', 'macOS'
  version: string;         // e.g., '22.04', '10.0.19041', '14.0'
  is_msys2: boolean;       // true if running in MSYS2 environment
  package_manager: string; // System package manager: 'apt', 'yum', 'pacman', 'brew', etc.
}

/**
 * Detect operating system information
 *
 * @returns OS information including type, name, version, and MSYS2 status
 */
export async function detectOS(): Promise<OSInfo> {
  const platform = os.platform();
  let type: string;
  let name: string;
  let version: string;
  let is_msys2 = false;

  switch (platform) {
    case 'win32':
      type = 'windows';
      // Check if running in MSYS2
      is_msys2 = !!process.env.MSYSTEM;

      if (is_msys2) {
        name = `Windows (MSYS2 ${process.env.MSYSTEM})`;
        version = os.release();
      } else {
        // Try to get Windows version
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
      }
      break;

    case 'darwin':
      type = 'darwin';
      name = 'macOS';
      try {
        const { stdout } = await execAsync('sw_vers -productVersion');
        version = stdout.trim();
      } catch {
        version = os.release();
      }
      break;

    case 'linux':
      type = 'linux';
      try {
        // Read /etc/os-release for distribution info
        const osRelease = await fs.readFile('/etc/os-release', 'utf-8');
        const detectedName = osRelease.match(/^PRETTY_NAME="(.+)"$/m)?.[1] ||
                     osRelease.match(/^NAME="(.+)"$/m)?.[1] || 'Linux';
        const detectedVersion = osRelease.match(/^VERSION_ID="(.+)"$/m)?.[1] ||
                       osRelease.match(/^VERSION="(.+)"$/m)?.[1] || '';
        name = detectedName;
        version = detectedVersion;
      } catch {
        name = 'Linux';
        version = os.release();
      }
      break;

    default:
      type = platform;
      name = platform;
      version = os.release();
  }

  // Detect system package manager
  const package_manager = await detectSystemPackageManager(type, is_msys2);

  return { type, name, version, is_msys2, package_manager };
}

/**
 * Detect system package manager
 *
 * @param osType - OS type ('linux', 'windows', 'darwin')
 * @param isMsys2 - Is running in MSYS2 environment
 * @returns Package manager name
 */
async function detectSystemPackageManager(osType: string, isMsys2: boolean): Promise<string> {
  if (osType === 'darwin') {
    // Check for Homebrew on macOS
    try {
      await execAsync('brew --version');
      return 'brew';
    } catch {
      return 'brew'; // Assume brew should be used on macOS
    }
  }

  if (osType === 'windows') {
    if (isMsys2) {
      return 'pacman'; // MSYS2 uses pacman
    }
    // Check for common Windows package managers
    try {
      await execAsync('choco --version');
      return 'choco';
    } catch {
      try {
        await execAsync('winget --version');
        return 'winget';
      } catch {
        return 'winget'; // Default to winget on modern Windows
      }
    }
  }

  if (osType === 'linux') {
    // Check for various Linux package managers
    const managers = [
      { command: 'pacman --version', name: 'pacman' },      // Arch-based
      { command: 'apt --version', name: 'apt' },            // Debian/Ubuntu
      { command: 'dnf --version', name: 'dnf' },            // Fedora
      { command: 'yum --version', name: 'yum' },            // RHEL/CentOS
      { command: 'zypper --version', name: 'zypper' },      // openSUSE
      { command: 'apk --version', name: 'apk' },            // Alpine
    ];

    for (const { command, name } of managers) {
      try {
        await execAsync(command);
        return name;
      } catch {
        // Try next
      }
    }

    return 'apt'; // Default to apt
  }

  return '';
}
