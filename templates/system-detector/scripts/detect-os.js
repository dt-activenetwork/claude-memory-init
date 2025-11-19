#!/usr/bin/env node
/**
 * Detect OS information only
 */

import { execSync } from 'child_process';
import os from 'os';

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

// Output TOON
console.log('os:');
console.log(`  type: ${type}`);
console.log(`  name: ${name}`);
console.log(`  version: "${version}"`);
