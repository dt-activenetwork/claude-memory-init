/**
 * Memory system initializer - orchestrates the initialization process
 */
import * as path from 'path';
import { loadAndRenderTemplate } from './template-engine.js';
import { validateConfig, validateTemplateRendering, getUnreplacedVariables } from './validator.js';
import {
  ensureDir,
  copyFile,
  writeFile,
  fileExists,
  readFile,
  writeJsonFile,
  readJsonFile
} from '../utils/file-ops.js';
import { getCurrentDate } from '../utils/date-utils.js';
import { createMarker } from './marker.js';
import { loadExclusionConfig, shouldExcludeOnCopy, shouldDeleteAfterInit } from './exclusion.js';
import type { FullConfig, IndexFile } from '../types/config.js';
import type { ExclusionConfig } from './exclusion.js';

/**
 * Main initialization function
 */
export async function initialize(config: FullConfig, targetDir: string): Promise<void> {
  const baseDir = path.join(targetDir, config.paths.base_dir);
  const currentDate = getCurrentDate();

  // Step 1: Validate configuration
  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
  }

  // Step 2: Ensure base directory exists
  await ensureDir(baseDir);

  // Step 3: Copy memory system template (auto-detects source)
  await copyMemorySystemTemplate(baseDir);

  // Step 4: Instantiate CLAUDE.md.template
  await instantiateTemplate(
    path.join(baseDir, 'CLAUDE.md.template'),
    path.join(baseDir, 'CLAUDE.md'),
    config
  );

  // Step 5: Check if prompt/0.overview.md.template exists and instantiate
  const overviewTemplatePath = path.join(baseDir, 'prompt', '0.overview.md.template');
  if (await fileExists(overviewTemplatePath)) {
    await instantiateTemplate(
      overviewTemplatePath,
      path.join(baseDir, 'prompt', '0.overview.md'),
      config
    );
  }

  // Step 6: Initialize index files
  await updateIndexFiles(baseDir, currentDate);

  // Step 7: Copy CLAUDE.md to project root
  await copyFile(
    path.join(baseDir, 'CLAUDE.md'),
    path.join(targetDir, 'CLAUDE.md')
  );

  // Step 8: Delete files marked for deletion (e.g., template files)
  await deleteFilesAfterInit(baseDir);

  // Step 9: Update .gitignore
  await updateGitignore(targetDir, config.paths.base_dir);

  // Step 10: Create marker file to indicate initialization
  await createMarker(targetDir, config.paths.base_dir, config.project.name);
}

/**
 * Copy memory system template (auto-detects source)
 * Priority: local mem/ -> clone from .gitmodules
 */
async function copyMemorySystemTemplate(targetBaseDir: string): Promise<void> {
  const fse = await import('fs-extra');
  let memSourceDir: string;
  let tmpDir: string | null = null;
  let shouldCleanup = false;

  // Get project root (where .gitmodules is)
  const toolFileUrl = new URL(import.meta.url).pathname;
  const toolFileDir = path.dirname(toolFileUrl);
  const toolProjectRoot = path.resolve(toolFileDir, '..', '..');
  const localMemDir = path.join(toolProjectRoot, 'mem');

  // Check if local mem/ directory exists and has content
  const localMemExists = await fse.pathExists(localMemDir);
  let localMemHasContent = false;

  if (localMemExists) {
    const { readdir } = await import('fs/promises');
    const files = await readdir(localMemDir);
    // Check if has files other than just .git
    localMemHasContent = files.some(f => f !== '.git');
  }

  if (localMemHasContent) {
    // Local mem/ has content, use it (normal git clone scenario)
    memSourceDir = localMemDir;
  } else {
    // Local mem/ doesn't exist or is empty (pnpm dlx scenario)
    // Read submodule URL from .gitmodules (or use default HTTPS URL)
    const { getSubmoduleUrl, cloneMemoryRepoToTmp } = await import('../utils/git-ops.js');
    const submoduleUrl = await getSubmoduleUrl(toolProjectRoot, 'mem');

    // Clone submodule to tmp
    tmpDir = await cloneMemoryRepoToTmp(submoduleUrl);
    memSourceDir = tmpDir;
    shouldCleanup = true;
  }

  // Load exclusion config from tool project root
  const exclusionConfigPath = path.join(toolProjectRoot, '.claude-init-exclude');
  const exclusionConfig = await loadExclusionConfig(exclusionConfigPath);

  try {
    // Copy entire mem/ directory to target, applying exclusions
    await fse.copy(memSourceDir, targetBaseDir, {
      filter: (src: string) => {
        // Always exclude .git
        if (src.includes('.git')) {
          return false;
        }

        // Apply exclude_on_copy rules
        if (shouldExcludeOnCopy(src, memSourceDir, exclusionConfig)) {
          return false;
        }

        return true;
      }
    });
  } finally {
    // Cleanup tmp directory if we created one
    if (shouldCleanup && tmpDir) {
      const { cleanupTmpDir } = await import('../utils/git-ops.js');
      await cleanupTmpDir(tmpDir);
    }
  }
}

/**
 * Instantiate a template file
 */
export async function instantiateTemplate(
  templatePath: string,
  outputPath: string,
  config: FullConfig
): Promise<void> {
  // Load and render template
  const rendered = await loadAndRenderTemplate(templatePath, config);

  // Validate rendering
  if (!validateTemplateRendering(rendered)) {
    const unreplaced = getUnreplacedVariables(rendered);
    throw new Error(
      `Template rendering incomplete. Unreplaced variables: ${unreplaced.join(', ')}`
    );
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await ensureDir(outputDir);

  // Write rendered content
  await writeFile(outputPath, rendered);
}

/**
 * Update index files with current date
 */
export async function updateIndexFiles(baseDir: string, date: string): Promise<void> {
  const indexDir = path.join(baseDir, 'memory', 'index');
  await ensureDir(indexDir);

  // Update tags.json
  const tagsPath = path.join(indexDir, 'tags.json');
  await updateIndexFile(tagsPath, date, {
    "_comment": "This is the global tags index. Update immediately after creating/updating any memory note.",
    "_usage": "Add note IDs to tag arrays. Use lowercase, hyphen-separated tag names.",
    "_example": {
      "architecture": ["sem-001", "sem-002"],
      "query-api": ["sem-004", "ep-003"],
      "task-completion": ["ep-001", "ep-002", "ep-003"]
    },
    "tags": {},
    "updated": date
  });

  // Update topics.json
  const topicsPath = path.join(indexDir, 'topics.json');
  await updateIndexFile(topicsPath, date, {
    "_comment": "This is the global topics index. Update immediately after creating/updating any memory note.",
    "_usage": "Organize notes by subject area. Each topic has a description and list of note IDs.",
    "_example": {
      "System Architecture": {
        "description": "Core architectural patterns and designs",
        "notes": ["sem-001", "sem-002"]
      },
      "Task Sessions": {
        "description": "Historical records of task executions",
        "notes": ["ep-001", "ep-002", "ep-003"]
      }
    },
    "topics": {},
    "updated": date
  });
}

/**
 * Update or create an index file
 */
async function updateIndexFile(filePath: string, date: string, defaultContent: any): Promise<void> {
  if (await fileExists(filePath)) {
    // Update existing file's date
    const content = await readJsonFile(filePath);
    content.updated = date;
    await writeJsonFile(filePath, content);
  } else {
    // Create new file with default content
    await writeJsonFile(filePath, defaultContent);
  }
}

/**
 * Delete files marked for deletion after initialization
 * This is driven by the delete_after_init section in .claude-init-exclude
 */
async function deleteFilesAfterInit(baseDir: string): Promise<void> {
  const fs = await import('fs/promises');

  // Get project root to load exclusion config
  const currentFileUrl = new URL(import.meta.url).pathname;
  const currentFileDir = path.dirname(currentFileUrl);
  const projectRoot = path.resolve(currentFileDir, '..', '..');
  const exclusionConfigPath = path.join(projectRoot, '.claude-init-exclude');
  const exclusionConfig = await loadExclusionConfig(exclusionConfigPath);

  // Find all files recursively that should be deleted
  async function findFilesToDelete(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Check if directory should be deleted
        if (shouldDeleteAfterInit(fullPath, baseDir, exclusionConfig)) {
          files.push(fullPath);
          // Don't recurse into directories marked for deletion
        } else {
          files.push(...await findFilesToDelete(fullPath));
        }
      } else {
        // Check if file should be deleted
        if (shouldDeleteAfterInit(fullPath, baseDir, exclusionConfig)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  const filesToDelete = await findFilesToDelete(baseDir);

  // Delete each file/directory
  const fse = await import('fs-extra');
  for (const filePath of filesToDelete) {
    await fse.remove(filePath);
  }
}

/**
 * Update .gitignore to exclude temp directory
 */
export async function updateGitignore(projectRoot: string, baseDir: string): Promise<void> {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const tempPattern = `${baseDir}/temp/`;

  let content = '';
  if (await fileExists(gitignorePath)) {
    content = await readFile(gitignorePath);
  }

  // Check if pattern already exists
  if (content.includes(tempPattern)) {
    return; // Already present
  }

  // Add pattern
  const newContent = content.trim() + '\n\n# Claude Memory System temporary files\n' + tempPattern + '\n';
  await writeFile(gitignorePath, newContent);
}
