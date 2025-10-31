/**
 * Git operations for handling submodules
 */
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import { dirExists, fileExists } from './file-ops.js';
import * as logger from './logger.js';

/**
 * Initialize and update git submodules
 * This ensures the mem/ submodule is present and up-to-date
 */
export async function ensureSubmodule(repoPath: string, submodulePath: string = 'mem'): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath);

  const fullSubmodulePath = path.join(repoPath, submodulePath);
  const submoduleExists = await dirExists(fullSubmodulePath);

  if (!submoduleExists) {
    // Submodule directory doesn't exist, initialize it
    logger.info(`Initializing git submodule: ${submodulePath}`);
    await git.submoduleInit();
    await git.submoduleUpdate();
  } else {
    // Check if it's actually a git submodule
    try {
      const submodules = await git.subModule(['status']);
      if (submodules.includes(submodulePath)) {
        // Update existing submodule
        logger.info(`Updating git submodule: ${submodulePath}`);
        await git.submoduleUpdate();
      }
    } catch (error) {
      // Not a git repo or no submodules configured
      logger.warning(`${submodulePath} exists but is not a git submodule`);
    }
  }
}

/**
 * Check if mem/ submodule is properly initialized
 */
export async function isSubmoduleInitialized(repoPath: string, submodulePath: string = 'mem'): Promise<boolean> {
  const fullSubmodulePath = path.join(repoPath, submodulePath);
  const exists = await dirExists(fullSubmodulePath);

  if (!exists) {
    return false;
  }

  // Check if .git exists (can be a file or directory for submodules)
  const gitSubmodule = path.join(fullSubmodulePath, '.git');
  return await fileExists(gitSubmodule) || await dirExists(gitSubmodule);
}

/**
 * Clone repository with submodules
 */
export async function cloneWithSubmodules(repoUrl: string, targetPath: string): Promise<void> {
  const git: SimpleGit = simpleGit();
  await git.clone(repoUrl, targetPath, ['--recurse-submodules']);
}

/**
 * Update submodule to latest commit on tracked branch
 */
export async function updateSubmoduleToLatest(repoPath: string, submodulePath: string = 'mem'): Promise<void> {
  const git: SimpleGit = simpleGit(repoPath);

  logger.info(`Updating ${submodulePath} to latest version`);
  await git.submoduleUpdate(['--remote', submodulePath]);
}
