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
import type { FullConfig, IndexFile } from '../types/config.js';

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

  // Step 3: Copy memory system template from mem/ to target
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

  // Step 8: Update .gitignore
  await updateGitignore(targetDir, config.paths.base_dir);
}

/**
 * Copy memory system template from mem/ directory
 */
async function copyMemorySystemTemplate(targetBaseDir: string): Promise<void> {
  // The mem/ directory is in the project root (not dist/)
  // When running from dist/core/initializer.js, we need to go up to project root
  const currentFileUrl = new URL(import.meta.url).pathname;
  const currentFileDir = path.dirname(currentFileUrl);

  // From dist/core/initializer.js -> go up to project root
  // dist/core -> dist -> project_root
  const projectRoot = path.resolve(currentFileDir, '..', '..');
  const memSourceDir = path.join(projectRoot, 'mem');

  // Copy entire mem/ directory to target, excluding .git
  const fse = await import('fs-extra');
  await fse.copy(memSourceDir, targetBaseDir, {
    filter: (src: string) => {
      // Don't copy .git directory
      return !src.includes('.git');
    }
  });
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
