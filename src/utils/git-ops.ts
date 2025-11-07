/**
 * Git operations for handling submodules
 */
import simpleGit, { SimpleGit } from 'simple-git';
import inquirer from 'inquirer';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { dirExists, fileExists } from './file-ops.js';
import * as logger from './logger.js';
import ora from 'ora';

/**
 * Default memory repository URL (HTTPS for universal access)
 * Used as fallback when .gitmodules is not available (e.g., pnpm dlx scenario)
 */
export const DEFAULT_MEM_REPO_URL = 'https://github.com/dt-activenetwork/mem.git';

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

/**
 * Read submodule URL from .gitmodules file
 * @param projectRoot - Root directory of the project
 * @param submodulePath - Path to submodule (default: 'mem')
 * @returns Submodule URL or DEFAULT_MEM_REPO_URL if .gitmodules not found
 */
export async function getSubmoduleUrl(projectRoot: string, submodulePath: string = 'mem'): Promise<string> {
  const gitmodulesPath = path.join(projectRoot, '.gitmodules');
  const exists = await fileExists(gitmodulesPath);

  if (!exists) {
    return DEFAULT_MEM_REPO_URL;
  }

  const fs = await import('fs/promises');
  const content = await fs.readFile(gitmodulesPath, 'utf-8');

  // Parse .gitmodules format
  // [submodule "mem"]
  //   path = mem
  //   url = git@github.com:...
  const lines = content.split('\n');
  let inSubmodule = false;
  let currentPath = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for submodule section
    if (trimmed.startsWith('[submodule')) {
      inSubmodule = true;
      currentPath = '';
      continue;
    }

    if (inSubmodule) {
      // Check for path
      if (trimmed.startsWith('path =')) {
        currentPath = trimmed.split('=')[1].trim();
      }

      // Check for url
      if (trimmed.startsWith('url =') && currentPath === submodulePath) {
        return trimmed.split('=')[1].trim();
      }

      // End of section
      if (trimmed.startsWith('[')) {
        inSubmodule = false;
      }
    }
  }

  return DEFAULT_MEM_REPO_URL;
}

/**
 * Get temporary directory for memory repo
 * Returns a unique path in OS temp directory
 */
export function getTmpMemoryDir(): string {
  const tmpBase = os.tmpdir();
  const uniqueId = crypto.randomBytes(8).toString('hex');
  return path.join(tmpBase, `claude-memory-${uniqueId}`);
}

/**
 * Clone memory repo to tmp directory
 * @param repoUrl - URL of the memory repo to clone
 * @returns Path to the cloned repo in tmp
 */
export async function cloneMemoryRepoToTmp(repoUrl: string): Promise<string> {
  const tmpDir = getTmpMemoryDir();
  const git: SimpleGit = simpleGit();

  logger.info(`Cloning memory repo to temporary directory...`);
  await git.clone(repoUrl, tmpDir, ['--depth', '1']);

  return tmpDir;
}

/**
 * Compare two memory repositories and find differences
 * @param sourceDir - Source memory directory (e.g., local claude/)
 * @param targetDir - Target memory directory (e.g., tmp repo)
 * @returns List of files that differ between source and target
 */
export async function diffMemoryRepos(sourceDir: string, targetDir: string): Promise<string[]> {
  const fs = await import('fs/promises');
  const differences: string[] = [];

  async function compareDirectories(srcPath: string, tgtPath: string, relativePath: string = ''): Promise<void> {
    const srcExists = await dirExists(srcPath);
    const tgtExists = await dirExists(tgtPath);

    if (!srcExists) return;

    const srcEntries = await fs.readdir(srcPath, { withFileTypes: true });

    for (const entry of srcEntries) {
      const srcFullPath = path.join(srcPath, entry.name);
      const tgtFullPath = path.join(tgtPath, entry.name);
      const relPath = path.join(relativePath, entry.name);

      // Skip .git directories
      if (entry.name === '.git') continue;

      if (entry.isDirectory()) {
        await compareDirectories(srcFullPath, tgtFullPath, relPath);
      } else if (entry.isFile()) {
        const tgtFileExists = await fileExists(tgtFullPath);

        if (!tgtFileExists) {
          // File exists in source but not in target (new file)
          differences.push(relPath);
        } else {
          // Compare file contents
          const srcContent = await fs.readFile(srcFullPath, 'utf-8');
          const tgtContent = await fs.readFile(tgtFullPath, 'utf-8');

          if (srcContent !== tgtContent) {
            differences.push(relPath);
          }
        }
      }
    }
  }

  await compareDirectories(sourceDir, targetDir);
  return differences;
}

/**
 * Clean up temporary directory
 */
export async function cleanupTmpDir(tmpDir: string): Promise<void> {
  const fse = await import('fs-extra');
  if (await dirExists(tmpDir)) {
    await fse.remove(tmpDir);
  }
}

/**
 * Synchronize memory repo: clone to tmp, compare with local, and optionally create PR
 * @param repoUrl - URL of the memory repo
 * @param localMemoryDir - Local memory directory path
 * @param createPR - Whether to create a PR for differences
 * @returns Object with tmpDir path and list of differences
 */
export async function syncMemoryRepo(
  repoUrl: string,
  localMemoryDir: string,
  createPR: boolean = false
): Promise<{ tmpDir: string; differences: string[] }> {
  // Clone to tmp
  const tmpDir = await cloneMemoryRepoToTmp(repoUrl);

  // Compare local with remote
  const differences = await diffMemoryRepos(localMemoryDir, tmpDir);

  if (differences.length > 0) {
    logger.info(`Found ${differences.length} file(s) with differences`);

    if (createPR) {
      await createPRForMemoryUpdates(tmpDir, localMemoryDir, differences);
    }
  } else {
    logger.info('No differences found between local and remote memory repos');
  }

  return { tmpDir, differences };
}

/**
 * Extract clean filenames without numbers and extensions
 * @param files - List of file paths
 * @returns Array of clean filenames
 */
function extractCleanFilenames(files: string[]): string[] {
  const cleanNames: string[] = [];

  for (const file of files) {
    const basename = path.basename(file, path.extname(file));

    // Remove leading numbers and dots/hyphens (e.g., "1.objectives" -> "objectives")
    const cleaned = basename.replace(/^\d+[\.\-]/, '');

    cleanNames.push(cleaned);
  }

  return cleanNames;
}

/**
 * Generate short hash from content
 * @param content - Content to hash
 * @returns 8-character hex hash
 */
function generateShortHash(content: string): string {
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return hash.substring(0, 8);
}

/**
 * Get PR label for system prompt updates
 * @returns Single label for all system prompt PRs
 */
function getPRLabel(): string {
  return 'system-prompt-update';
}

/**
 * Filter files to only include system memory (memory/system/ directory)
 * @param files - List of all changed files
 * @returns Filtered list containing only system memory files
 * @internal Exported for testing
 */
export function filterSystemMemoryFiles(files: string[]): string[] {
  return files.filter(file => {
    const normalizedPath = file.replace(/\\/g, '/');
    // Only include files in memory/system/ directory (system memory)
    return normalizedPath.startsWith('memory/system/');
  });
}

/**
 * Get git user information
 * @param repoDir - Repository directory
 * @returns Object with username and email
 */
async function getGitUserInfo(repoDir: string): Promise<{ name: string; email: string }> {
  const git: SimpleGit = simpleGit(repoDir);

  try {
    const name = await git.getConfig('user.name');
    const email = await git.getConfig('user.email');

    return {
      name: name.value || 'unknown',
      email: email.value || 'unknown@example.com'
    };
  } catch (error) {
    logger.warning('Could not get git user info, using defaults');
    return {
      name: 'unknown',
      email: 'unknown@example.com'
    };
  }
}

/**
 * Create a PR for memory updates
 * @param tmpRepoDir - Temporary repo directory
 * @param localMemoryDir - Local memory directory
 * @param differences - List of files that differ
 */
export async function createPRForMemoryUpdates(
  tmpRepoDir: string,
  localMemoryDir: string,
  differences: string[]
): Promise<void> {
  const fs = await import('fs-extra');
  const git: SimpleGit = simpleGit(tmpRepoDir);

  // Filter to only system memory files (memory/system/ directory)
  const systemMemoryFiles = filterSystemMemoryFiles(differences);

  if (systemMemoryFiles.length === 0) {
    logger.warning('No system memory files (memory/system/) found in differences');
    logger.info('Only system memory changes (not semantic/episodic) can be submitted for PR');
    return;
  }

  // Get git user info
  const userInfo = await getGitUserInfo(tmpRepoDir);
  const username = userInfo.name.toLowerCase().replace(/\s+/g, '-');

  // Get current date
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

  // Extract clean filenames (without numbers and extensions)
  const cleanFilenames = extractCleanFilenames(systemMemoryFiles);

  // Generate hash from: username + date + filenames
  const hashContent = `${username}-${dateStr}-${cleanFilenames.join('-')}`;
  const shortHash = generateShortHash(hashContent);

  // Create branch name: sp-{hash}
  const branchName = `sp-${shortHash}`;

  // Keep topic string for PR title
  const topicStr = cleanFilenames.slice(0, 3).join('-') || 'updates';

  logger.info(`Creating branch: ${branchName}`);
  await git.checkoutLocalBranch(branchName);

  // Copy ONLY system memory files from local to tmp repo
  for (const file of systemMemoryFiles) {
    const srcPath = path.join(localMemoryDir, file);
    const destPath = path.join(tmpRepoDir, file);

    // Ensure destination directory exists
    await fs.ensureDir(path.dirname(destPath));

    // Copy file
    await fs.copy(srcPath, destPath);
  }

  // Stage only the system memory files
  for (const file of systemMemoryFiles) {
    await git.add(file);
  }

  // Create descriptive commit message
  const commitMessage = `Add/Update system memory prompts

Author: ${userInfo.name} <${userInfo.email}>
Date: ${new Date().toISOString().split('T')[0]}

System memory files updated:
${systemMemoryFiles.map(f => `- ${f}`).join('\n')}

This PR contains system prompt updates generated during AI-assisted development.
Please review for accuracy and merge if approved.

Generated by claude-memory-init
`;

  await git.commit(commitMessage);

  // Get PR label
  const label = getPRLabel();

  logger.info(`✅ Branch '${branchName}' created with ${systemMemoryFiles.length} system memory file(s)`);
  logger.blank();
  logger.info('📝 Files included in this PR:');
  systemMemoryFiles.forEach(f => logger.info(`   - ${f}`));
  logger.blank();
  logger.info('🏷️  PR label: ' + label);
  logger.blank();
  logger.info('🚀 Next steps:');
  logger.info(`   cd ${tmpRepoDir}`);
  logger.info(`   git push origin ${branchName}`);
  logger.blank();
  logger.info('   # Create PR with label:');
  logger.info(`   gh pr create --title "System memory: ${topicStr}" \\`);
  logger.info(`     --body "See commit message for details" \\`);
  logger.info(`     --label "${label}"`);
  logger.blank();
  logger.info('   # Or create PR without label:');
  logger.info(`   gh pr create --title "System memory: ${topicStr}" --body "See commit message for details"`);
}

/**
 * File change statistics
 */
interface FileStats {
  file: string;
  insertions: number;
  deletions: number;
}

/**
 * Get file change statistics (insertions/deletions)
 */
async function getFileStats(
  tmpRepoDir: string,
  files: string[]
): Promise<FileStats[]> {
  const git: SimpleGit = simpleGit(tmpRepoDir);
  const stats: FileStats[] = [];

  for (const file of files) {
    try {
      // Get diff statistics
      const diff = await git.diff(['--numstat', file]);
      const match = diff.match(/^(\d+)\s+(\d+)/);

      if (match) {
        stats.push({
          file,
          insertions: parseInt(match[1]),
          deletions: parseInt(match[2])
        });
      } else {
        // New file or binary
        stats.push({
          file,
          insertions: 0,
          deletions: 0
        });
      }
    } catch (error) {
      // File doesn't exist in original, treat as new
      stats.push({
        file,
        insertions: 0,
        deletions: 0
      });
    }
  }

  return stats;
}

/**
 * Format commit message preview
 */
function formatCommitPreview(
  branchName: string,
  commitMessage: string,
  userInfo: { name: string; email: string },
  fileStats: FileStats[]
): void {
  logger.blank();
  logger.info('━'.repeat(60));
  logger.info('📋 COMMIT PREVIEW');
  logger.info('━'.repeat(60));
  logger.blank();

  logger.info(`Branch: ${branchName}`);
  logger.info(`Author: ${userInfo.name} <${userInfo.email}>`);
  logger.blank();

  logger.info('Commit Message:');
  logger.info('┌' + '─'.repeat(58) + '┐');
  commitMessage.split('\n').forEach(line => {
    const paddedLine = line.padEnd(56);
    logger.info('│ ' + paddedLine + ' │');
  });
  logger.info('└' + '─'.repeat(58) + '┘');
  logger.blank();

  if (fileStats.length > 0) {
    logger.info('File Changes:');
    fileStats.forEach(stat => {
      logger.info(`  ${stat.file}`);
      if (stat.insertions > 0 || stat.deletions > 0) {
        logger.info(`    ${stat.insertions} insertions(+), ${stat.deletions} deletions(-)`);
      } else {
        logger.info(`    (new file)`);
      }
    });
    logger.blank();
  }

  logger.info('━'.repeat(60));
  logger.blank();
}

/**
 * Check if gh CLI is available
 * @internal Exported for testing
 */
export async function isGHCLIAvailable(): Promise<boolean> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('gh --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Display PR creation instructions for manual creation
 */
async function displayPRInstructions(
  tmpRepoDir: string,
  branchName: string,
  prTitle: string,
  prBody: string,
  prLabel: string,
  git: SimpleGit
): Promise<void> {
  // Get remote URL for web UI link
  let prCreationUrl = '';
  try {
    const remoteUrl = await git.getRemotes(true);
    const origin = remoteUrl.find(r => r.name === 'origin');
    if (origin && origin.refs.fetch) {
      const match = origin.refs.fetch.match(/github\.com[:/](.+?)\.git/);
      if (match) {
        prCreationUrl = `https://github.com/${match[1]}/pull/new/${branchName}`;
      }
    }
  } catch (error) {
    // Ignore error
  }

  logger.info('┌' + '─'.repeat(58) + '┐');
  logger.info('│ ' + 'Pull Request Information'.padEnd(56) + ' │');
  logger.info('├' + '─'.repeat(58) + '┤');
  logger.info('│ ' + ''.padEnd(56) + ' │');
  logger.info('│ ' + `Branch: ${branchName}`.padEnd(56) + ' │');
  logger.info('│ ' + `Title:  ${prTitle}`.padEnd(56) + ' │');
  logger.info('│ ' + `Body:   ${prBody}`.padEnd(56) + ' │');
  logger.info('│ ' + `Label:  ${prLabel}`.padEnd(56) + ' │');
  logger.info('│ ' + ''.padEnd(56) + ' │');
  logger.info('└' + '─'.repeat(58) + '┘');
  logger.blank();

  logger.info('📌 Option 1: Use GitHub CLI');
  logger.info('┌' + '─'.repeat(58) + '┐');
  logger.info('│ ' + `cd ${tmpRepoDir}`.substring(0, 56).padEnd(56) + ' │');
  logger.info('│ ' + ''.padEnd(56) + ' │');
  logger.info('│ ' + `gh pr create \\`.padEnd(56) + ' │');
  logger.info('│ ' + `  --title "${prTitle}" \\`.padEnd(56) + ' │');
  logger.info('│ ' + `  --body "${prBody}" \\`.padEnd(56) + ' │');
  logger.info('│ ' + `  --label "${prLabel}"`.padEnd(56) + ' │');
  logger.info('└' + '─'.repeat(58) + '┘');
  logger.blank();

  if (prCreationUrl) {
    logger.info('📌 Option 2: Use Web UI');
    logger.info('┌' + '─'.repeat(58) + '┐');
    logger.info('│ ' + 'Open this URL in your browser:'.padEnd(56) + ' │');
    logger.info('│ ' + ''.padEnd(56) + ' │');
    logger.info('│ ' + prCreationUrl.substring(0, 56).padEnd(56) + ' │');
    if (prCreationUrl.length > 56) {
      logger.info('│ ' + prCreationUrl.substring(56).padEnd(56) + ' │');
    }
    logger.info('│ ' + ''.padEnd(56) + ' │');
    logger.info('│ ' + 'Then fill in:'.padEnd(56) + ' │');
    logger.info('│ ' + `  Title: ${prTitle}`.substring(0, 56).padEnd(56) + ' │');
    logger.info('│ ' + `  Label: ${prLabel}`.padEnd(56) + ' │');
    logger.info('└' + '─'.repeat(58) + '┘');
    logger.blank();
  }

  logger.success('✅ Branch pushed successfully - ready for PR');
  logger.blank();
}

/**
 * Create PR using gh CLI
 */
async function createPRWithGH(
  tmpRepoDir: string,
  title: string,
  body: string,
  label: string
): Promise<string> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const command = `gh pr create --title "${title}" --body "${body}" --label "${label}"`;

  const result = await execAsync(command, { cwd: tmpRepoDir });

  // Extract PR URL from output
  const urlMatch = result.stdout.match(/https:\/\/github\.com\/[^\s]+/);
  return urlMatch ? urlMatch[0] : '';
}

/**
 * Interactive PR creation flow
 */
export async function createPRInteractive(
  tmpRepoDir: string,
  localMemoryDir: string,
  differences: string[],
  options: {
    interactive?: boolean;
    autoConfirm?: boolean;
  } = {}
): Promise<void> {
  const fs = await import('fs-extra');
  const git: SimpleGit = simpleGit(tmpRepoDir);

  // Filter to only system memory files
  const systemMemoryFiles = filterSystemMemoryFiles(differences);

  if (systemMemoryFiles.length === 0) {
    logger.warning('No system memory files (memory/system/) found in differences');
    logger.info('Only system memory changes (not semantic/episodic) can be submitted for PR');
    return;
  }

  // Get git user info
  const userInfo = await getGitUserInfo(tmpRepoDir);
  const username = userInfo.name.toLowerCase().replace(/\s+/g, '-');

  // Get current date
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

  // Extract clean filenames
  const cleanFilenames = extractCleanFilenames(systemMemoryFiles);

  // Generate hash and branch name
  const hashContent = `${username}-${dateStr}-${cleanFilenames.join('-')}`;
  const shortHash = generateShortHash(hashContent);
  const branchName = `sp-${shortHash}`;

  // Topic string for PR title
  const topicStr = cleanFilenames.slice(0, 3).join('-') || 'updates';

  // Create commit message
  const commitMessage = `Add/Update system memory prompts

Author: ${userInfo.name} <${userInfo.email}>
Date: ${new Date().toISOString().split('T')[0]}

System memory files updated:
${systemMemoryFiles.map(f => `- ${f}`).join('\n')}

This PR contains system prompt updates generated during AI-assisted development.
Please review for accuracy and merge if approved.

Generated by claude-memory-init
`;

  // Copy files to temp repo first (for diff stats)
  for (const file of systemMemoryFiles) {
    const srcPath = path.join(localMemoryDir, file);
    const destPath = path.join(tmpRepoDir, file);
    await fs.ensureDir(path.dirname(destPath));
    await fs.copy(srcPath, destPath);
  }

  // Get file stats
  const fileStats = await getFileStats(tmpRepoDir, systemMemoryFiles);

  // Display preview
  formatCommitPreview(branchName, commitMessage, userInfo, fileStats);

  // Interactive mode or auto-confirm
  const interactive = options.interactive !== false;
  const autoConfirm = options.autoConfirm || false;

  // Step 1: Confirm commit creation
  let confirmCommit = autoConfirm;
  if (interactive && !autoConfirm) {
    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmCommit',
      message: 'Create this commit?',
      default: true
    }]);
    confirmCommit = answer.confirmCommit;
  }

  if (!confirmCommit) {
    logger.info('Commit cancelled');
    return;
  }

  // Create branch and commit
  const spinner = ora('Creating commit...').start();
  try {
    await git.checkoutLocalBranch(branchName);

    // Stage files
    for (const file of systemMemoryFiles) {
      await git.add(file);
    }

    // Commit
    await git.commit(commitMessage);

    spinner.succeed(`Commit created: ${branchName}`);
  } catch (error) {
    spinner.fail('Failed to create commit');
    logger.error(error instanceof Error ? error.message : String(error));
    return;
  }

  // Step 2: Confirm push
  let confirmPush = autoConfirm;
  if (interactive && !autoConfirm) {
    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmPush',
      message: 'Push to remote repository?',
      default: true
    }]);
    confirmPush = answer.confirmPush;
  }

  if (!confirmPush) {
    logger.blank();
    logger.info('Commit created locally. To push later:');
    logger.info(`  cd ${tmpRepoDir}`);
    logger.info(`  git push origin ${branchName}`);
    return;
  }

  // Push to remote
  spinner.start('Pushing to remote...');
  try {
    await git.push('origin', branchName);
    spinner.succeed('Branch pushed successfully');
  } catch (error) {
    spinner.fail('Push failed');
    logger.blank();
    logger.error('━'.repeat(60));
    logger.error('⚠️  PUSH FAILED');
    logger.error('━'.repeat(60));
    logger.blank();
    logger.error(error instanceof Error ? error.message : String(error));
    logger.blank();
    logger.info('Your commit has been created locally at:');
    logger.info(`  ${tmpRepoDir}`);
    logger.blank();
    logger.info('You can manually push with:');
    logger.info(`  cd ${tmpRepoDir}`);
    logger.info(`  git push origin ${branchName}`);
    logger.blank();
    logger.info('Troubleshooting:');
    logger.info('  - Check SSH keys: ssh -T git@github.com');
    logger.info('  - Use HTTPS: git remote set-url origin https://...');
    logger.info('  - Check repository permissions');
    return;
  }

  // Step 3: Check if gh CLI is available BEFORE asking
  logger.blank();
  const hasGH = await isGHCLIAvailable();

  if (hasGH) {
    logger.info('✓ GitHub CLI (gh) detected - can create PR automatically');
  } else {
    logger.warning('⚠️  GitHub CLI (gh) not found - will provide manual instructions');
    logger.info('   Install gh: https://cli.github.com/');
  }
  logger.blank();

  // Step 4: Confirm PR creation
  let confirmPR = autoConfirm;
  if (interactive && !autoConfirm) {
    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmPR',
      message: hasGH ? 'Create PR now using gh CLI?' : 'Show PR creation information?',
      default: true
    }]);
    confirmPR = answer.confirmPR;
  }

  if (!confirmPR) {
    logger.blank();
    logger.success('✅ Branch pushed successfully');
    logger.blank();
    logger.info(`Branch: ${branchName}`);
    logger.info(`Files: ${systemMemoryFiles.length} updated`);
    logger.blank();
    logger.info('To create PR manually, see information above or use:');
    logger.info(`  gh pr create --title "System memory: ${topicStr}" \\`);
    logger.info(`    --body "See commit message for details" \\`);
    logger.info(`    --label "${getPRLabel()}"`);
    return;
  }

  // Get PR title and body
  const prTitle = `System memory: ${topicStr}`;
  const prBody = `See commit message for details`;
  const prLabel = getPRLabel();

  // If gh is available, create PR automatically
  if (hasGH) {
    spinner.start('Creating pull request with gh CLI...');
    try {
      const prUrl = await createPRWithGH(
        tmpRepoDir,
        prTitle,
        prBody,
        prLabel
      );

      spinner.succeed('Pull request created');

      // Success message
      logger.blank();
      logger.success('━'.repeat(60));
      logger.success('✅ COMPLETE');
      logger.success('━'.repeat(60));
      logger.blank();
      logger.info(`Pull Request: ${prUrl}`);
      logger.info(`Branch: ${branchName}`);
      logger.info(`Label: ${prLabel}`);
      logger.blank();
      logger.info('Your changes have been submitted for review.');
      logger.blank();
    } catch (error) {
      spinner.fail('Failed to create PR with gh CLI');
      logger.blank();
      logger.error(error instanceof Error ? error.message : String(error));
      logger.blank();

      // Fall back to manual instructions
      logger.info('Please create PR manually:');
      logger.blank();
      displayPRInstructions(tmpRepoDir, branchName, prTitle, prBody, prLabel, git);
    }
  } else {
    // gh not available - show manual instructions
    logger.blank();
    logger.info('📋 PR Information (copy and use):');
    logger.blank();

    displayPRInstructions(tmpRepoDir, branchName, prTitle, prBody, prLabel, git);
  }
}
