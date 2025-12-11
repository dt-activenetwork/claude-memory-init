/**
 * System detection utilities for OS, package manager, user privileges, and development tools
 *
 * This module provides high-level system detection utilities used by plugins.
 * Core detection functions are re-exported from src/core/system-detector.ts.
 */
import * as os from 'os';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as logger from './logger.js';
import type { PythonConfig, NodeConfig, DevelopmentTools } from '../types/config.js';

// Re-export core detection functions for backward compatibility
export {
  commandExists,
  getCommandVersion,
  getOS,
  getInstallCommand,
  getCommandPath,
  isRoot,
  hasSudo,
  type OSInfo,
} from '../core/system-detector.js';

const execAsync = promisify(exec);

export interface SystemInfo {
  os_type: string;           // 'linux' | 'windows' | 'darwin'
  os_name: string;           // e.g., 'Ubuntu 22.04', 'Arch Linux', 'Windows 10', 'macOS'
  os_version: string;        // e.g., '22.04', '6.5.0-arch1', '10.0.19041'
  is_msys2: boolean;         // true if running in MSYS2 environment
  package_managers: string[]; // All detected package managers
  package_manager: string;   // Selected package manager
  is_root: boolean;          // true if running as root/admin
  has_sudo: boolean;         // true if sudo is available
  install_prefix: string;    // '' or 'sudo' depending on privileges
}

/**
 * Detect operating system type and details
 */
export async function detectOS(): Promise<{
  os_type: string;
  os_name: string;
  os_version: string;
  is_msys2: boolean;
}> {
  const platform = os.platform();
  let os_type: string;
  let os_name: string;
  let os_version: string;
  let is_msys2 = false;

  switch (platform) {
    case 'win32':
      os_type = 'windows';
      // Check if running in MSYS2
      is_msys2 = !!process.env.MSYSTEM;

      if (is_msys2) {
        os_name = `Windows (MSYS2 ${process.env.MSYSTEM})`;
        os_version = os.release();
      } else {
        // Try to get Windows version
        try {
          const { stdout } = await execAsync('wmic os get Caption,Version /value');
          const caption = stdout.match(/Caption=(.+)/)?.[1]?.trim() || 'Windows';
          const version = stdout.match(/Version=(.+)/)?.[1]?.trim() || os.release();
          os_name = caption;
          os_version = version;
        } catch {
          os_name = 'Windows';
          os_version = os.release();
        }
      }
      break;

    case 'darwin':
      os_type = 'darwin';
      os_name = 'macOS';
      try {
        const { stdout } = await execAsync('sw_vers -productVersion');
        os_version = stdout.trim();
      } catch {
        os_version = os.release();
      }
      break;

    case 'linux':
      os_type = 'linux';
      try {
        // Read /etc/os-release for distribution info
        const osRelease = await fs.readFile('/etc/os-release', 'utf-8');
        const name = osRelease.match(/^PRETTY_NAME="(.+)"$/m)?.[1] ||
                     osRelease.match(/^NAME="(.+)"$/m)?.[1] || 'Linux';
        const version = osRelease.match(/^VERSION_ID="(.+)"$/m)?.[1] ||
                       osRelease.match(/^VERSION="(.+)"$/m)?.[1] || '';
        os_name = name;
        os_version = version;
      } catch {
        os_name = 'Linux';
        os_version = os.release();
      }
      break;

    default:
      os_type = platform;
      os_name = platform;
      os_version = os.release();
  }

  return { os_type, os_name, os_version, is_msys2 };
}

/**
 * Check if a command exists in PATH
 * @internal Used internally - use exported commandExists from core for external use
 */
async function localCommandExists(command: string): Promise<boolean> {
  try {
    const which = os.platform() === 'win32' ? 'where' : 'which';
    await execAsync(`${which} ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect available package managers based on OS type
 */
export async function detectPackageManagers(os_type: string, is_msys2: boolean): Promise<string[]> {
  const managers: string[] = [];

  if (os_type === 'windows') {
    if (is_msys2) {
      // MSYS2 uses pacman
      if (await localCommandExists('pacman')) managers.push('pacman');
    } else {
      // Native Windows package managers
      if (await localCommandExists('choco')) managers.push('choco');
      if (await localCommandExists('scoop')) managers.push('scoop');
      if (await localCommandExists('winget')) managers.push('winget');
    }
  } else if (os_type === 'darwin') {
    // macOS package managers
    if (await localCommandExists('brew')) managers.push('brew');
    if (await localCommandExists('port')) managers.push('port');
  } else if (os_type === 'linux') {
    // Linux package managers - check common ones
    // Debian/Ubuntu family
    if (await localCommandExists('apt')) managers.push('apt');
    if (await localCommandExists('apt-get')) managers.push('apt-get');

    // Arch family
    if (await localCommandExists('pacman')) managers.push('pacman');
    if (await localCommandExists('paru')) managers.push('paru');
    if (await localCommandExists('yay')) managers.push('yay');

    // Red Hat family
    if (await localCommandExists('dnf')) managers.push('dnf');
    if (await localCommandExists('yum')) managers.push('yum');

    // SUSE
    if (await localCommandExists('zypper')) managers.push('zypper');

    // Alpine
    if (await localCommandExists('apk')) managers.push('apk');

    // Gentoo
    if (await localCommandExists('emerge')) managers.push('emerge');

    // Nix
    if (await localCommandExists('nix-env')) managers.push('nix-env');
  }

  return managers;
}

/**
 * Determine default package manager based on priority
 */
export function getDefaultPackageManager(managers: string[], os_type: string): string | null {
  if (managers.length === 0) return null;
  if (managers.length === 1) return managers[0];

  // Priority-based selection
  const priorities: Record<string, string[]> = {
    linux: ['apt', 'dnf', 'pacman', 'paru', 'yay', 'zypper', 'apk', 'emerge', 'yum', 'apt-get', 'nix-env'],
    darwin: ['brew', 'port'],
    windows: ['winget', 'choco', 'scoop', 'pacman']
  };

  const priority = priorities[os_type] || managers;

  for (const pm of priority) {
    if (managers.includes(pm)) {
      return pm;
    }
  }

  return managers[0];
}

/**
 * Check if current user is root/administrator
 */
export async function checkRootPrivileges(): Promise<boolean> {
  if (os.platform() === 'win32') {
    // Windows: Check if running as administrator
    try {
      await execAsync('net session', { windowsHide: true });
      return true;
    } catch {
      return false;
    }
  } else {
    // Unix-like: Check if UID is 0
    return process.getuid ? process.getuid() === 0 : false;
  }
}

/**
 * Check if sudo is available and working
 */
export async function checkSudoAvailability(): Promise<boolean> {
  if (os.platform() === 'win32') {
    return false; // Windows doesn't use sudo
  }

  try {
    await execAsync('which sudo');
    // Try sudo -n true to check if sudo is available without password prompt
    try {
      await execAsync('sudo -n true');
      return true;
    } catch {
      // sudo exists but may require password
      return await localCommandExists('sudo');
    }
  } catch {
    return false;
  }
}

/**
 * Get install command prefix based on privileges
 */
export function getInstallPrefix(is_root: boolean, has_sudo: boolean): string {
  if (is_root) {
    return '';
  }
  if (has_sudo) {
    return 'sudo';
  }
  return '';
}

/**
 * Generate example install command
 */
export function generateInstallCommand(package_manager: string, install_prefix: string): string {
  const prefix = install_prefix ? `${install_prefix} ` : '';

  const commands: Record<string, string> = {
    'apt': `${prefix}apt install <package>`,
    'apt-get': `${prefix}apt-get install <package>`,
    'pacman': `${prefix}pacman -S <package>`,
    'paru': `paru -S <package>`,  // AUR helpers typically don't need sudo
    'yay': `yay -S <package>`,    // AUR helpers typically don't need sudo
    'dnf': `${prefix}dnf install <package>`,
    'yum': `${prefix}yum install <package>`,
    'zypper': `${prefix}zypper install <package>`,
    'apk': `${prefix}apk add <package>`,
    'emerge': `${prefix}emerge <package>`,
    'brew': `brew install <package>`,
    'port': `${prefix}port install <package>`,
    'choco': `choco install <package>`,
    'scoop': `scoop install <package>`,
    'winget': `winget install <package>`,
    'nix-env': `nix-env -i <package>`
  };

  return commands[package_manager] || `${prefix}${package_manager} install <package>`;
}

/**
 * Detect all system information
 * Note: This does NOT handle user interaction for package manager selection
 * That is handled separately in the prompts module
 */
export async function detectSystemInfo(): Promise<Omit<SystemInfo, 'package_manager'>> {
  const { os_type, os_name, os_version, is_msys2 } = await detectOS();
  const package_managers = await detectPackageManagers(os_type, is_msys2);
  const is_root = await checkRootPrivileges();
  const has_sudo = is_root ? false : await checkSudoAvailability();
  const install_prefix = getInstallPrefix(is_root, has_sudo);

  return {
    os_type,
    os_name,
    os_version,
    is_msys2,
    package_managers,
    is_root,
    has_sudo,
    install_prefix
  };
}

/**
 * Get groups of package managers that should trigger user selection
 * These are groups where multiple options are commonly available
 */
export function getPackageManagerGroups(): Record<string, string[]> {
  return {
    'arch_aur': ['pacman', 'paru', 'yay'],
    'redhat': ['dnf', 'yum'],
    'debian': ['apt', 'apt-get']
  };
}

/**
 * Check if user selection is needed for package managers
 */
export function needsPackageManagerSelection(managers: string[]): boolean {
  if (managers.length <= 1) return false;

  const groups = getPackageManagerGroups();

  // Check if detected managers belong to same group
  for (const group of Object.values(groups)) {
    const intersection = managers.filter(m => group.includes(m));
    if (intersection.length > 1) {
      return true;
    }
  }

  // If managers from different ecosystems, also ask
  return managers.length > 1;
}

/**
 * Get command version
 */
async function getCommandVersion(command: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`${command} --version`);
    // Extract version number from first line
    const firstLine = stdout.split('\n')[0];
    const versionMatch = firstLine.match(/\d+\.\d+\.\d+/);
    return versionMatch ? versionMatch[0] : firstLine.trim();
  } catch {
    return null;
  }
}

/**
 * Get command path
 */
async function getCommandPath(command: string): Promise<string> {
  try {
    const which = os.platform() === 'win32' ? 'where' : 'which';
    const { stdout } = await execAsync(`${which} ${command}`);
    return stdout.split('\n')[0].trim();
  } catch {
    return '';
  }
}

/**
 * Detect Python environment
 */
export async function detectPython(): Promise<PythonConfig> {
  // Try python3 first, then python
  let pythonCmd = 'python3';
  let available = await localCommandExists(pythonCmd);

  if (!available) {
    pythonCmd = 'python';
    available = await localCommandExists(pythonCmd);
  }

  if (!available) {
    return {
      available: false,
      version: '',
      path: '',
      package_manager: 'none',
      has_uv: false,
      has_venv: false
    };
  }

  // Get Python version and path
  const version = await getCommandVersion(pythonCmd) || 'unknown';
  const path = await getCommandPath(pythonCmd);

  // Check for uv (modern Python package manager)
  const has_uv = await localCommandExists('uv');

  // Check for venv support (built into Python 3.3+)
  let has_venv = false;
  try {
    await execAsync(`${pythonCmd} -m venv --help`);
    has_venv = true;
  } catch {
    has_venv = false;
  }

  // Determine package manager priority: uv > venv > pip
  let package_manager: 'uv' | 'venv' | 'pip' | 'none';
  if (has_uv) {
    package_manager = 'uv';
  } else if (has_venv) {
    package_manager = 'venv';
  } else {
    // pip should be available if Python is available
    package_manager = 'pip';
  }

  return {
    available: true,
    version,
    path,
    package_manager,
    has_uv,
    has_venv
  };
}

/**
 * Detect Node.js environment
 */
export async function detectNode(): Promise<NodeConfig> {
  const available = await localCommandExists('node');

  if (!available) {
    return {
      available: false,
      version: '',
      path: '',
      package_managers: [],
      selected_package_manager: ''
    };
  }

  // Get Node version and path
  const version = await getCommandVersion('node') || 'unknown';
  const path = await getCommandPath('node');

  // Detect available Node package managers
  const package_managers: string[] = [];

  if (await localCommandExists('pnpm')) package_managers.push('pnpm');
  if (await localCommandExists('yarn')) package_managers.push('yarn');
  if (await localCommandExists('npm')) package_managers.push('npm');

  // Default selection priority: pnpm > yarn > npm
  let selected_package_manager = '';
  if (package_managers.includes('pnpm')) {
    selected_package_manager = 'pnpm';
  } else if (package_managers.includes('yarn')) {
    selected_package_manager = 'yarn';
  } else if (package_managers.includes('npm')) {
    selected_package_manager = 'npm';
  }

  return {
    available: true,
    version,
    path,
    package_managers,
    selected_package_manager
  };
}

/**
 * Detect all development tools
 */
export async function detectDevelopmentTools(): Promise<DevelopmentTools> {
  const python = await detectPython();
  const node = await detectNode();

  return {
    python: python.available ? python : undefined,
    node: node.available ? node : undefined
  };
}

/**
 * Check if user selection is needed for Node package managers
 */
export function needsNodePackageManagerSelection(managers: string[]): boolean {
  // If pnpm, yarn, and npm all exist, ask user to choose
  return managers.length > 1;
}

/**
 * Generate Python virtual environment creation command
 */
export function generatePythonVenvCommand(pythonConfig: PythonConfig, venvName: string = 'venv'): string {
  if (pythonConfig.package_manager === 'uv') {
    return `uv venv ${venvName}`;
  } else if (pythonConfig.package_manager === 'venv') {
    const pythonCmd = pythonConfig.path.includes('python3') ? 'python3' : 'python';
    return `${pythonCmd} -m venv ${venvName}`;
  } else {
    return `python -m venv ${venvName}`;
  }
}

/**
 * Generate Python package install command
 */
export function generatePythonInstallCommand(pythonConfig: PythonConfig): string {
  if (pythonConfig.package_manager === 'uv') {
    return 'uv pip install <package>';
  } else {
    return 'pip install <package>';
  }
}

/**
 * Generate Node package install command
 */
export function generateNodeInstallCommand(packageManager: string): string {
  const commands: Record<string, string> = {
    'pnpm': 'pnpm add <package>',
    'yarn': 'yarn add <package>',
    'npm': 'npm install <package>'
  };
  return commands[packageManager] || 'npm install <package>';
}

/**
 * Generate Node script run command
 */
export function generateNodeRunCommand(packageManager: string, script: string = '<script>'): string {
  const commands: Record<string, string> = {
    'pnpm': `pnpm ${script}`,
    'yarn': `yarn ${script}`,
    'npm': `npm run ${script}`
  };
  return commands[packageManager] || `npm run ${script}`;
}
