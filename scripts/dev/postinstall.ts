#!/usr/bin/env node
/**
 * Post-install script to ensure git submodules are initialized
 * This runs after `pnpm install` to set up the mem/ submodule
 */
import simpleGit from 'simple-git';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function postInstall() {
  console.log('🔧 Checking git submodules...');

  const git = simpleGit(projectRoot);

  try {
    // Check if this is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.log('⚠️  Not a git repository, skipping submodule initialization');
      return;
    }

    // Check if mem/ directory exists and has content
    const fs = await import('fs');
    const memPath = path.join(projectRoot, 'mem');

    if (!fs.existsSync(memPath) || fs.readdirSync(memPath).length === 0) {
      console.log('📦 Initializing git submodules...');
      await git.submoduleInit();
      await git.submoduleUpdate();
      console.log('✅ Submodules initialized');
    } else {
      console.log('✅ Submodules already initialized');
    }
  } catch (error) {
    console.error('⚠️  Failed to initialize submodules:', error instanceof Error ? error.message : error);
    console.log('💡 You may need to run: git submodule update --init --recursive');
  }
}

postInstall().catch(error => {
  console.error('❌ Post-install script failed:', error);
  process.exit(0); // Don't fail the install
});
