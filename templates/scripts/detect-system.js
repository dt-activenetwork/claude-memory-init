#!/usr/bin/env node
/**
 * System Detection Script
 *
 * Detects OS, runtimes, timezone, locale and outputs TOON format.
 * This script is designed to be run by AI agents at initialization.
 */

import { execSync } from 'child_process';
import os from 'os';

/**
 * Detect operating system
 */
function detectOS() {
  const platform = os.platform();
  let type, name, version;

  if (platform === 'linux') {
    type = 'linux';
    try {
      const osRelease = execSync('cat /etc/os-release', { encoding: 'utf-8' });
      name = osRelease.match(/PRETTY_NAME="(.+)"/)?.[1] || 'Linux';
      version = osRelease.match(/VERSION_ID="(.+)"/)?.[1] || '';
    } catch {
      name = 'Linux';
      version = os.release();
    }
  } else if (platform === 'darwin') {
    type = 'darwin';
    name = 'macOS';
    try {
      version = execSync('sw_vers -productVersion', { encoding: 'utf-8' }).trim();
    } catch {
      version = os.release();
    }
  } else if (platform === 'win32') {
    type = 'windows';
    name = 'Windows';
    version = os.release();
  } else {
    type = platform;
    name = platform;
    version = os.release();
  }

  return { type, name, version };
}

/**
 * Detect Python environment
 */
function detectPython() {
  try {
    const version = execSync('python --version 2>&1', { encoding: 'utf-8' })
      .match(/Python (\d+\.\d+\.\d+)/)?.[1];

    if (!version) throw new Error('Not found');

    // Detect package manager
    let pkgManager = 'pip';
    try {
      execSync('poetry --version 2>&1', { encoding: 'utf-8' });
      pkgManager = 'poetry';
    } catch {
      try {
        execSync('pipenv --version 2>&1', { encoding: 'utf-8' });
        pkgManager = 'pipenv';
      } catch {
        // Default to pip
      }
    }

    return { version, package_manager: pkgManager };
  } catch {
    return null;
  }
}

/**
 * Detect Node.js environment
 */
function detectNode() {
  try {
    const version = execSync('node --version', { encoding: 'utf-8' })
      .trim().replace(/^v/, '');

    // Detect package manager
    let pkgManager = 'npm';
    try {
      execSync('pnpm --version 2>&1', { encoding: 'utf-8' });
      pkgManager = 'pnpm';
    } catch {
      try {
        execSync('yarn --version 2>&1', { encoding: 'utf-8' });
        pkgManager = 'yarn';
      } catch {
        // Default to npm
      }
    }

    return { version, package_manager: pkgManager };
  } catch {
    return null;
  }
}

/**
 * Detect environment settings
 */
function detectEnvironment() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const timestamp = new Date().toISOString();

  return { timezone, locale, timestamp };
}

/**
 * Main detection function
 */
function detectSystem() {
  const osInfo = detectOS();
  const pythonInfo = detectPython();
  const nodeInfo = detectNode();
  const envInfo = detectEnvironment();

  // Build TOON output
  const runtimes = [];
  if (pythonInfo) {
    runtimes.push({
      name: 'python',
      version: pythonInfo.version,
      package_manager: pythonInfo.package_manager
    });
  }
  if (nodeInfo) {
    runtimes.push({
      name: 'node',
      version: nodeInfo.version,
      package_manager: nodeInfo.package_manager
    });
  }

  return {
    os: {
      type: osInfo.type,
      name: osInfo.name,
      version: osInfo.version
    },
    runtimes,
    environment: {
      timezone: envInfo.timezone,
      locale: envInfo.locale
    },
    detected_at: envInfo.timestamp
  };
}

// Output TOON format
const data = detectSystem();

console.log('# System Information (Auto-detected)');
console.log('# TOON format\n');
console.log('system:');
console.log('  os:');
console.log(`    type: ${data.os.type}`);
console.log(`    name: ${data.os.name}`);
console.log(`    version: "${data.os.version}"`);

if (data.runtimes.length > 0) {
  console.log(`  runtimes[${data.runtimes.length}]{name,version,package_manager}:`);
  data.runtimes.forEach(r => {
    console.log(`    ${r.name},${r.version},${r.package_manager}`);
  });
}

console.log('  environment:');
console.log(`    timezone: ${data.environment.timezone}`);
console.log(`    locale: ${data.environment.locale}`);
console.log(`  detected_at: "${data.detected_at}"`);
