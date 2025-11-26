/**
 * File operation utilities
 */
import { promises as fs } from 'fs';
import * as path from 'path';
import fse from 'fs-extra';
import { USER_MEMORY_DIR, USER_MEMORY_SUBDIRS, type MemoryScope } from '../constants.js';

/**
 * Ensure directory exists, create if not
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fse.ensureDir(dirPath);
}

/**
 * Copy file from source to destination
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await fse.copy(src, dest);
}

/**
 * Read file content as string
 */
export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Write content to file
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if directory exists
 */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Find claude directory (or custom base_dir) from starting path
 * Searches up the directory tree
 */
export async function findClaudeDir(startPath: string, baseDirName: string = 'claude'): Promise<string | null> {
  let currentPath = path.resolve(startPath);

  while (true) {
    const claudePath = path.join(currentPath, baseDirName);
    if (await dirExists(claudePath)) {
      return claudePath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      // Reached root
      return null;
    }
    currentPath = parentPath;
  }
}

/**
 * Read JSON file and parse
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  const content = await readFile(filePath);
  return JSON.parse(content);
}

/**
 * Write object to JSON file
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeFile(filePath, content);
}

// ============================================================================
// User Memory Utilities
// ============================================================================

/**
 * Get the User Memory base directory (~/.claude/)
 */
export function getUserMemoryDir(): string {
  return USER_MEMORY_DIR;
}

/**
 * Ensure User Memory directory structure exists
 *
 * Creates:
 * - ~/.claude/
 * - ~/.claude/system/
 * - ~/.claude/preferences/
 * - ~/.claude/cache/
 */
export async function ensureUserMemoryStructure(): Promise<void> {
  await ensureDir(USER_MEMORY_DIR);
  await ensureDir(path.join(USER_MEMORY_DIR, USER_MEMORY_SUBDIRS.SYSTEM));
  await ensureDir(path.join(USER_MEMORY_DIR, USER_MEMORY_SUBDIRS.PREFERENCES));
  await ensureDir(path.join(USER_MEMORY_DIR, USER_MEMORY_SUBDIRS.CACHE));
}

/**
 * Check if User Memory directory exists
 */
export async function userMemoryExists(): Promise<boolean> {
  return await dirExists(USER_MEMORY_DIR);
}

/**
 * Get the base directory for a given memory scope
 *
 * @param scope Memory scope ('user' or 'project')
 * @param projectAgentDir Project's .agent/ directory (required for 'project' scope)
 * @returns Absolute path to the base directory
 */
export function getScopeBaseDir(scope: MemoryScope, projectAgentDir?: string): string {
  if (scope === 'user') {
    return USER_MEMORY_DIR;
  }

  if (!projectAgentDir) {
    throw new Error('projectAgentDir is required for project scope');
  }

  return projectAgentDir;
}

/**
 * Resolve a relative path to an absolute path based on memory scope
 *
 * @param relativePath Path relative to scope's base directory
 * @param scope Memory scope
 * @param projectAgentDir Project's .agent/ directory (required for 'project' scope)
 * @returns Absolute path
 */
export function resolveScopedPath(
  relativePath: string,
  scope: MemoryScope,
  projectAgentDir?: string
): string {
  const baseDir = getScopeBaseDir(scope, projectAgentDir);
  return path.join(baseDir, relativePath);
}

/**
 * Write a file to the appropriate scope directory
 *
 * @param relativePath Path relative to scope's base directory
 * @param content File content
 * @param scope Memory scope
 * @param projectAgentDir Project's .agent/ directory (required for 'project' scope)
 */
export async function writeScopedFile(
  relativePath: string,
  content: string,
  scope: MemoryScope,
  projectAgentDir?: string
): Promise<void> {
  // Ensure User Memory structure exists if writing to user scope
  if (scope === 'user') {
    await ensureUserMemoryStructure();
  }

  const fullPath = resolveScopedPath(relativePath, scope, projectAgentDir);
  const dir = path.dirname(fullPath);

  await ensureDir(dir);
  await writeFile(fullPath, content);
}

/**
 * Read a file from the appropriate scope directory
 *
 * @param relativePath Path relative to scope's base directory
 * @param scope Memory scope
 * @param projectAgentDir Project's .agent/ directory (required for 'project' scope)
 * @returns File content
 */
export async function readScopedFile(
  relativePath: string,
  scope: MemoryScope,
  projectAgentDir?: string
): Promise<string> {
  const fullPath = resolveScopedPath(relativePath, scope, projectAgentDir);
  return await readFile(fullPath);
}

/**
 * Check if a file exists in the appropriate scope directory
 *
 * @param relativePath Path relative to scope's base directory
 * @param scope Memory scope
 * @param projectAgentDir Project's .agent/ directory (required for 'project' scope)
 * @returns true if file exists
 */
export async function scopedFileExists(
  relativePath: string,
  scope: MemoryScope,
  projectAgentDir?: string
): Promise<boolean> {
  const fullPath = resolveScopedPath(relativePath, scope, projectAgentDir);
  return await fileExists(fullPath);
}

/**
 * Append content to an existing file, or create it if it doesn't exist
 *
 * If the file exists, adds a blank line and then the new content.
 * If the file doesn't exist, creates it with the new content.
 *
 * @param filePath Absolute path to the file
 * @param newContent Content to append
 * @returns true if appended to existing file, false if created new file
 */
export async function appendOrCreateFile(
  filePath: string,
  newContent: string
): Promise<boolean> {
  if (await fileExists(filePath)) {
    // Append to existing file
    const existingContent = await readFile(filePath);
    const trimmedExisting = existingContent.trimEnd();
    const finalContent = `${trimmedExisting}\n\n${newContent}`;
    await writeFile(filePath, finalContent);
    return true;
  } else {
    // Create new file
    const dir = path.dirname(filePath);
    await ensureDir(dir);
    await writeFile(filePath, newContent);
    return false;
  }
}

/**
 * Find the first existing file from a list of candidate paths
 *
 * @param candidates Array of file paths to check
 * @returns The first existing file path, or null if none exist
 */
export async function findFirstExistingFile(
  candidates: string[]
): Promise<string | null> {
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}
