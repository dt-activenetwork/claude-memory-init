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
 * Detect Python environment with usage instructions
 */
function detectPython() {
  try {
    const version = execSync('python --version 2>&1', { encoding: 'utf-8' })
      .match(/Python (\d+\.\d+\.\d+)/)?.[1];

    if (!version) throw new Error('Not found');

    // Detect package manager (priority: uv > poetry > pipenv > pip)
    let pkgManager = 'pip';
    let installCmd = 'pip install';
    let runCmd = 'python';
    let venvCmd = 'python -m venv';

    try {
      execSync('uv --version 2>&1', { encoding: 'utf-8' });
      pkgManager = 'uv';
      installCmd = 'uv add';
      runCmd = 'uv run';
      venvCmd = 'uv venv';
    } catch {
      try {
        execSync('poetry --version 2>&1', { encoding: 'utf-8' });
        pkgManager = 'poetry';
        installCmd = 'poetry add';
        runCmd = 'poetry run';
        venvCmd = 'poetry install';
      } catch {
        try {
          execSync('pipenv --version 2>&1', { encoding: 'utf-8' });
          pkgManager = 'pipenv';
          installCmd = 'pipenv install';
          runCmd = 'pipenv run';
          venvCmd = 'pipenv --python 3';
        } catch {
          // Default to pip
        }
      }
    }

    return {
      version,
      package_manager: pkgManager,
      install_command: installCmd,
      run_command: runCmd,
      venv_command: venvCmd,
    };
  } catch {
    return null;
  }
}

/**
 * Detect Node.js environment with usage instructions
 */
function detectNode() {
  try {
    const version = execSync('node --version', { encoding: 'utf-8' })
      .trim().replace(/^v/, '');

    // Detect package manager (priority: pnpm > bun > yarn > npm)
    let pkgManager = 'npm';
    let installCmd = 'npm install';
    let runCmd = 'npm run';
    let execCmd = 'npx';

    try {
      execSync('pnpm --version 2>&1', { encoding: 'utf-8' });
      pkgManager = 'pnpm';
      installCmd = 'pnpm add';
      runCmd = 'pnpm';
      execCmd = 'pnpm exec';
    } catch {
      try {
        execSync('bun --version 2>&1', { encoding: 'utf-8' });
        pkgManager = 'bun';
        installCmd = 'bun add';
        runCmd = 'bun run';
        execCmd = 'bunx';
      } catch {
        try {
          execSync('yarn --version 2>&1', { encoding: 'utf-8' });
          pkgManager = 'yarn';
          installCmd = 'yarn add';
          runCmd = 'yarn';
          execCmd = 'yarn exec';
        } catch {
          // Default to npm
        }
      }
    }

    return {
      version,
      package_manager: pkgManager,
      install_command: installCmd,
      run_command: runCmd,
      exec_command: execCmd,
    };
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

  // Build result with full info
  const runtimes = [];
  if (pythonInfo) {
    runtimes.push({
      name: 'python',
      ...pythonInfo
    });
  }
  if (nodeInfo) {
    runtimes.push({
      name: 'node',
      ...nodeInfo
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

// Output TOON format with instructions
const data = detectSystem();

console.log('# System Environment Detection');
console.log('# This output serves as runtime instructions for AI agents');
console.log('# TOON format\n');

console.log('system:');
console.log('  os:');
console.log(`    type: ${data.os.type}`);
console.log(`    name: ${data.os.name}`);
console.log(`    version: "${data.os.version}"`);
console.log('');

// Python with commands
const pythonInfo = data.runtimes.find(r => r.name === 'python');
if (pythonInfo) {
  console.log('  python:');
  console.log(`    version: "${pythonInfo.version}"`);
  console.log(`    package_manager: ${pythonInfo.package_manager}`);
  console.log(`    install: "${pythonInfo.install_command}"`);
  console.log(`    run: "${pythonInfo.run_command}"`);
  console.log(`    venv: "${pythonInfo.venv_command}"`);
  console.log('');
}

// Node.js with commands
const nodeInfo = data.runtimes.find(r => r.name === 'node');
if (nodeInfo) {
  console.log('  node:');
  console.log(`    version: "${nodeInfo.version}"`);
  console.log(`    package_manager: ${nodeInfo.package_manager}`);
  console.log(`    install: "${nodeInfo.install_command}"`);
  console.log(`    run: "${nodeInfo.run_command}"`);
  console.log(`    exec: "${nodeInfo.exec_command}"`);
  console.log('');
}

console.log('  environment:');
console.log(`    timezone: ${data.environment.timezone}`);
console.log(`    locale: ${data.environment.locale}`);
console.log('');

console.log(`  detected_at: "${data.detected_at}"`);
