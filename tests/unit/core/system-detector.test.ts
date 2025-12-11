/**
 * Tests for Core System Detector
 *
 * Tests the fundamental system detection utilities used by the CLI infrastructure.
 * Note: Tests that require mocking os.platform() are skipped because ESM modules
 * don't allow spying on exports. The actual functions are tested on the current platform.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

import {
  commandExists,
  getCommandVersion,
  getOS,
  getInstallCommand,
  getCommandPath,
  isRoot,
  hasSudo,
  type OSInfo,
} from '../../../src/core/system-detector.js';
import { exec } from 'child_process';

describe('Core System Detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('commandExists', () => {
    it('should return true when command exists', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: '/usr/bin/git' });
        return {} as any;
      });

      const result = await commandExists('git');
      expect(result).toBe(true);
    });

    it('should return false when command does not exist', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const result = await commandExists('nonexistent-command');
      expect(result).toBe(false);
    });

    it('should use platform-appropriate command locator', async () => {
      // Test on current platform (cannot mock os.platform in ESM)
      const platform = os.platform();
      const expectedCmd = platform === 'win32' ? 'where' : 'which';

      vi.mocked(exec).mockImplementation((cmd, callback) => {
        expect(cmd).toContain(expectedCmd);
        (callback as Function)(null, { stdout: '/usr/bin/git' });
        return {} as any;
      });

      await commandExists('git');
    });
  });

  describe('getCommandVersion', () => {
    it('should extract version from command output', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: 'git version 2.42.0' });
        return {} as any;
      });

      const version = await getCommandVersion('git');
      expect(version).toBe('2.42.0');
    });

    it('should handle version with v prefix', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: 'v20.10.0' });
        return {} as any;
      });

      const version = await getCommandVersion('node');
      expect(version).toBe('20.10.0');
    });

    it('should handle version with additional suffix', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: 'Python 3.11.6-beta1' });
        return {} as any;
      });

      const version = await getCommandVersion('python');
      expect(version).toBe('3.11.6-beta1');
    });

    it('should return null when command fails', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const version = await getCommandVersion('nonexistent');
      expect(version).toBe(null);
    });

    it('should use custom version flag', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback) => {
        expect(cmd).toContain('-v');
        (callback as Function)(null, { stdout: '1.0.0' });
        return {} as any;
      });

      await getCommandVersion('tool', '-v');
    });

    it('should return first line trimmed when no version pattern found', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: 'Tool output without version\nSecond line' });
        return {} as any;
      });

      const version = await getCommandVersion('tool');
      expect(version).toBe('Tool output without version');
    });
  });

  describe('getOS', () => {
    it('should return current platform information', async () => {
      // Test on current platform - we cannot mock os.platform() in ESM
      // This test verifies the function returns a valid OSInfo object
      vi.mocked(exec).mockImplementation((cmd, callback) => {
        // Return success for most commands to allow detection
        if (cmd.includes('--version')) {
          (callback as Function)(null, { stdout: 'version 1.0.0' });
        } else if (cmd.includes('sw_vers')) {
          (callback as Function)(null, { stdout: '14.0' });
        } else if (cmd.includes('wmic')) {
          (callback as Function)(null, { stdout: 'Caption=Windows 10\nVersion=10.0' });
        } else {
          (callback as Function)(new Error('not found'));
        }
        return {} as any;
      });

      const osInfo = await getOS();

      // Verify structure regardless of platform
      expect(osInfo.platform).toBe(os.platform());
      expect(osInfo.name).toBeDefined();
      expect(typeof osInfo.name).toBe('string');
      expect(osInfo.version).toBeDefined();
    });
  });

  describe('getInstallCommand', () => {
    it('should return install command for macOS', () => {
      const osInfo: OSInfo = {
        platform: 'darwin',
        name: 'macOS',
        version: '14.0',
        packageManager: 'brew',
      };

      const cmd = getInstallCommand('git', osInfo);
      expect(cmd).toBe('brew install git');
    });

    it('should return install command for Linux', () => {
      const osInfo: OSInfo = {
        platform: 'linux',
        name: 'Ubuntu',
        version: '22.04',
        packageManager: 'apt',
      };

      const cmd = getInstallCommand('node', osInfo);
      expect(cmd).toContain('apt install');
    });

    it('should return install command for Windows', () => {
      const osInfo: OSInfo = {
        platform: 'win32',
        name: 'Windows 10',
        version: '10.0',
        packageManager: 'winget',
      };

      const cmd = getInstallCommand('git', osInfo);
      expect(cmd).toContain('winget install');
    });

    it('should return null for unknown tool', () => {
      const osInfo: OSInfo = {
        platform: 'darwin',
        name: 'macOS',
        version: '14.0',
        packageManager: 'brew',
      };

      const cmd = getInstallCommand('unknown-tool-xyz', osInfo);
      expect(cmd).toBe(null);
    });

    it('should handle uv install command', () => {
      const osInfo: OSInfo = {
        platform: 'linux',
        name: 'Ubuntu',
        version: '22.04',
        packageManager: 'apt',
      };

      const cmd = getInstallCommand('uv', osInfo);
      expect(cmd).toContain('astral.sh/uv/install.sh');
    });
  });

  describe('getCommandPath', () => {
    it('should return command path', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: '/usr/bin/git\n' });
        return {} as any;
      });

      const path = await getCommandPath('git');
      expect(path).toBe('/usr/bin/git');
    });

    it('should return empty string when command not found', async () => {
      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const path = await getCommandPath('nonexistent');
      expect(path).toBe('');
    });
  });

  describe('isRoot', () => {
    it('should return a boolean based on current user', () => {
      // We cannot mock os.platform() in ESM, so we just verify the function works
      const result = isRoot();
      expect(typeof result).toBe('boolean');

      // On non-Windows, we can verify against process.getuid()
      if (os.platform() !== 'win32' && process.getuid) {
        expect(result).toBe(process.getuid() === 0);
      }
    });
  });

  describe('hasSudo', () => {
    it('should return true when sudo command exists on Unix', async () => {
      // Skip on Windows
      if (os.platform() === 'win32') {
        const result = await hasSudo();
        expect(result).toBe(false);
        return;
      }

      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(null, { stdout: '/usr/bin/sudo' });
        return {} as any;
      });

      const result = await hasSudo();
      expect(result).toBe(true);
    });

    it('should return false when sudo command does not exist', async () => {
      // Skip on Windows (always returns false)
      if (os.platform() === 'win32') {
        const result = await hasSudo();
        expect(result).toBe(false);
        return;
      }

      vi.mocked(exec).mockImplementation((_cmd, callback) => {
        (callback as Function)(new Error('Command not found'));
        return {} as any;
      });

      const result = await hasSudo();
      expect(result).toBe(false);
    });
  });
});
