/**
 * File operation utilities
 */
import { promises as fs } from 'fs';
import * as path from 'path';
import fse from 'fs-extra';

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
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeFile(filePath, content);
}
