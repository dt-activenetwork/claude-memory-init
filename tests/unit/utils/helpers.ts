import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Create temporary directory for file operation tests
 */
export async function createTempDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'claude-test-'));
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
    console.warn(`Failed to cleanup temp dir ${dir}:`, error);
  }
}

/**
 * Create test file with content
 */
export async function createTestFile(
  baseDir: string,
  relativePath: string,
  content: string
): Promise<string> {
  const fullPath = path.join(baseDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');
  return fullPath;
}

/**
 * Read test file content
 */
export async function readTestFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf8');
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
 * Create directory structure
 */
export async function createDirStructure(baseDir: string, dirs: string[]): Promise<void> {
  for (const dir of dirs) {
    await fs.mkdir(path.join(baseDir, dir), { recursive: true });
  }
}

/**
 * List files in directory recursively
 */
export async function listFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentDir: string, relativePath: string = ''): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        await scan(path.join(currentDir, entry.name), entryPath);
      } else {
        files.push(entryPath);
      }
    }
  }

  await scan(dir);
  return files;
}
