/**
 * Auto-commit functionality for memory system updates
 */
import { execSync } from 'child_process';
import * as path from 'path';
import * as logger from './logger.js';
import type { GitConfig } from '../types/config.js';
import { t } from '../i18n/index.js';

/**
 * Check if directory is a git repository
 */
export function isGitRepository(dir: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: dir,
      stdio: 'pipe'
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of modified files
 */
export function getModifiedFiles(dir: string): string[] {
  try {
    const output = execSync('git status --porcelain', {
      cwd: dir,
      encoding: 'utf8'
    });

    if (!output.trim()) {
      return [];
    }

    return output
      .trim()
      .split('\n')
      .map(line => {
        // Format: "XY filename" where XY is status code
        return line.substring(3).trim();
      })
      .filter(file => file.length > 0);
  } catch (error) {
    logger.error(`Failed to get modified files: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Separate files into memory system and non-memory system files
 */
export function separateMemoryFiles(files: string[], baseDir: string): {
  memoryFiles: string[];
  otherFiles: string[];
} {
  const memoryFiles: string[] = [];
  const otherFiles: string[] = [];

  for (const file of files) {
    // Normalize path separators
    const normalizedFile = file.replace(/\\/g, '/');
    const normalizedBaseDir = baseDir.replace(/\\/g, '/');

    if (normalizedFile.startsWith(`${normalizedBaseDir}/`) || normalizedFile === 'CLAUDE.md') {
      memoryFiles.push(file);
    } else {
      otherFiles.push(file);
    }
  }

  return { memoryFiles, otherFiles };
}

/**
 * Generate commit message for memory system update
 */
export function generateMemoryCommitMessage(files: string[]): string {
  const timestamp = new Date().toISOString().split('T')[0];

  // Categorize files
  const hasConfig = files.some(f => f.includes('config.yaml'));
  const hasPrompts = files.some(f => f.includes('/prompt/'));
  const hasMemory = files.some(f => f.includes('/memory/'));
  const hasCLAUDE = files.some(f => f === 'CLAUDE.md');

  const categories: string[] = [];
  if (hasConfig) categories.push('config');
  if (hasPrompts) categories.push('prompts');
  if (hasMemory) categories.push('memory');
  if (hasCLAUDE) categories.push('CLAUDE.md');

  const categoryText = categories.length > 0 ? ` (${categories.join(', ')})` : '';

  return `chore: update memory system${categoryText}

Update Claude memory system configuration and files.

Date: ${timestamp}
Files updated: ${files.length}

Auto-generated commit by claude-memory-init.`;
}

/**
 * Create a git commit with specified files
 */
export function createCommit(dir: string, files: string[], message: string): boolean {
  try {
    // Stage files
    for (const file of files) {
      execSync(`git add "${file}"`, {
        cwd: dir,
        stdio: 'pipe'
      });
    }

    // Commit
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: dir,
      stdio: 'pipe'
    });

    return true;
  } catch (error) {
    logger.error(`Failed to create commit: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Auto-commit memory system updates
 */
export async function autoCommitMemoryUpdates(
  targetDir: string,
  gitConfig: GitConfig,
  baseDir: string = 'claude'
): Promise<void> {
  // Check if auto-commit is enabled
  if (!gitConfig.auto_commit_memory_updates) {
    return;
  }

  const L = t();

  // Check if it's a git repository
  if (!isGitRepository(targetDir)) {
    logger.warning('⚠️  ' + L.errors.git.notRepo());
    return;
  }

  // Get modified files
  const modifiedFiles = getModifiedFiles(targetDir);
  if (modifiedFiles.length === 0) {
    logger.info('📝 ' + L.utils.autoCommit.noChanges());
    return;
  }

  // Separate memory files from other files
  const { memoryFiles, otherFiles } = separateMemoryFiles(modifiedFiles, baseDir);

  if (memoryFiles.length === 0) {
    logger.info('📝 ' + L.utils.autoCommit.noMemoryChanges());
    return;
  }

  logger.blank();
  logger.info('📝 ' + L.utils.autoCommit.committing());
  logger.blank();

  // Determine commit strategy
  const commitSeparately = gitConfig.commit_memory_separately ?? true;

  if (commitSeparately && otherFiles.length > 0) {
    // Strategy 1: Commit memory files separately
    logger.info('📦 ' + L.utils.autoCommit.committingSeparate({ count: memoryFiles.length }));
    const memoryMessage = generateMemoryCommitMessage(memoryFiles);
    const success = createCommit(targetDir, memoryFiles, memoryMessage);

    if (success) {
      logger.success('✅ ' + L.utils.autoCommit.committed());
      logger.blank();
      logger.info('📝 ' + L.utils.autoCommit.filesCommitted());
      memoryFiles.forEach(file => logger.info(`  - ${file}`));
      logger.blank();
      logger.info('⚠️  ' + L.utils.autoCommit.otherFilesRemain({ count: otherFiles.length }));
      otherFiles.forEach(file => logger.info(`  - ${file}`));
      logger.info('💡 ' + L.utils.autoCommit.commitManually());
    } else {
      logger.error('❌ ' + L.errors.git.commitFailed());
    }
  } else {
    // Strategy 2: Commit all files together
    logger.info('📦 ' + L.utils.autoCommit.committingCombined({ count: memoryFiles.length }));
    const memoryMessage = generateMemoryCommitMessage(memoryFiles);
    const success = createCommit(targetDir, memoryFiles, memoryMessage);

    if (success) {
      logger.success('✅ ' + L.utils.autoCommit.committed());
      logger.blank();
      logger.info('📝 ' + L.utils.autoCommit.filesCommitted());
      memoryFiles.forEach(file => logger.info(`  - ${file}`));
    } else {
      logger.error('❌ ' + L.errors.git.commitFailed());
    }
  }

  logger.blank();
}
