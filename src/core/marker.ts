/**
 * Marker file management for detecting initialized projects
 */
import * as path from 'path';
import { fileExists, readJsonFile, writeJsonFile } from '../utils/file-ops.js';
import { getCurrentDate } from '../utils/date-utils.js';
import { DEFAULT_AGENT_DIR, MARKER_FILENAME } from '../constants.js';

/**
 * Marker file name - hidden file in agent directory
 */
const MARKER_FILE = MARKER_FILENAME;

/**
 * Marker file structure
 */
export interface MarkerInfo {
  initialized: boolean;
  version: string;
  date: string;
  base_dir: string;
  project_name?: string;
}

/**
 * Check if a project has been initialized
 */
export async function isProjectInitialized(targetDir: string, baseDir: string = DEFAULT_AGENT_DIR): Promise<boolean> {
  const markerPath = path.join(targetDir, baseDir, MARKER_FILE);
  return await fileExists(markerPath);
}

/**
 * Get marker info if it exists
 */
export async function getMarkerInfo(targetDir: string, baseDir: string = DEFAULT_AGENT_DIR): Promise<MarkerInfo | null> {
  const markerPath = path.join(targetDir, baseDir, MARKER_FILE);

  if (!(await fileExists(markerPath))) {
    return null;
  }

  try {
    return await readJsonFile(markerPath);
  } catch (error) {
    // If file is corrupted or not valid JSON, return null
    return null;
  }
}

/**
 * Create marker file to indicate project is initialized
 */
export async function createMarker(
  targetDir: string,
  baseDir: string = DEFAULT_AGENT_DIR,
  projectName?: string
): Promise<void> {
  const markerPath = path.join(targetDir, baseDir, MARKER_FILE);

  const markerInfo: MarkerInfo = {
    initialized: true,
    version: '1.0.0', // CLI version
    date: getCurrentDate(),
    base_dir: baseDir,
    project_name: projectName
  };

  await writeJsonFile(markerPath, markerInfo);
}

/**
 * Remove marker file
 */
export async function removeMarker(targetDir: string, baseDir: string = DEFAULT_AGENT_DIR): Promise<void> {
  const markerPath = path.join(targetDir, baseDir, MARKER_FILE);
  const fs = await import('fs/promises');

  if (await fileExists(markerPath)) {
    await fs.unlink(markerPath);
  }
}

/**
 * Update marker file with new information
 */
export async function updateMarker(
  targetDir: string,
  baseDir: string = DEFAULT_AGENT_DIR,
  updates: Partial<MarkerInfo>
): Promise<void> {
  const existing = await getMarkerInfo(targetDir, baseDir);

  if (!existing) {
    throw new Error('Marker file does not exist. Cannot update.');
  }

  const updated: MarkerInfo = {
    ...existing,
    ...updates
  };

  const markerPath = path.join(targetDir, baseDir, MARKER_FILE);
  await writeJsonFile(markerPath, updated);
}
