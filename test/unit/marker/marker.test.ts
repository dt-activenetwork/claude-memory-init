/**
 * Unit tests for marker file management
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  isProjectInitialized,
  getMarkerInfo,
  createMarker,
  removeMarker,
  updateMarker,
  type MarkerInfo
} from '../../../src/core/marker.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('marker system', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `test-marker-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('isProjectInitialized', () => {
    test('returns false when marker does not exist', async () => {
      const result = await isProjectInitialized(tmpDir);

      expect(result).toBe(false);
    });

    test('returns true when marker exists', async () => {
      // Create marker first
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      await createMarker(tmpDir, 'claude', 'Test Project');

      const result = await isProjectInitialized(tmpDir);

      expect(result).toBe(true);
    });

    test('works with custom base directory', async () => {
      const customDir = path.join(tmpDir, 'custom-claude');
      await fs.mkdir(customDir);
      await createMarker(tmpDir, 'custom-claude', 'Test Project');

      const result = await isProjectInitialized(tmpDir, 'custom-claude');

      expect(result).toBe(true);
    });

    test('returns false for non-existent directory', async () => {
      const result = await isProjectInitialized('/nonexistent/path');

      expect(result).toBe(false);
    });
  });

  describe('getMarkerInfo', () => {
    test('returns null when marker does not exist', async () => {
      const result = await getMarkerInfo(tmpDir);

      expect(result).toBeNull();
    });

    test('returns marker info when it exists', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      await createMarker(tmpDir, 'claude', 'Test Project');

      const result = await getMarkerInfo(tmpDir);

      expect(result).not.toBeNull();
      expect(result?.initialized).toBe(true);
      expect(result?.version).toBe('1.0.0');
      expect(result?.base_dir).toBe('claude');
      expect(result?.project_name).toBe('Test Project');
      expect(result?.date).toBeDefined();
    });

    test('returns null for corrupted marker file', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      const markerPath = path.join(claudeDir, '.claude-memory-init');
      await fs.writeFile(markerPath, 'invalid json {[}]');

      const result = await getMarkerInfo(tmpDir);

      expect(result).toBeNull();
    });

    test('works with custom base directory', async () => {
      const customDir = path.join(tmpDir, 'my-base');
      await fs.mkdir(customDir);
      await createMarker(tmpDir, 'my-base', 'Custom Project');

      const result = await getMarkerInfo(tmpDir, 'my-base');

      expect(result?.base_dir).toBe('my-base');
      expect(result?.project_name).toBe('Custom Project');
    });
  });

  describe('createMarker', () => {
    test('creates marker file successfully', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);

      await createMarker(tmpDir, 'claude', 'Test Project');

      const markerPath = path.join(claudeDir, '.claude-memory-init');
      const exists = await fs.access(markerPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    test('creates marker with correct structure', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);

      await createMarker(tmpDir, 'claude', 'My Project');

      const info = await getMarkerInfo(tmpDir);

      expect(info?.initialized).toBe(true);
      expect(info?.version).toBe('1.0.0');
      expect(info?.base_dir).toBe('claude');
      expect(info?.project_name).toBe('My Project');
      expect(info?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('creates marker without project name', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);

      await createMarker(tmpDir, 'claude');

      const info = await getMarkerInfo(tmpDir);

      expect(info?.project_name).toBeUndefined();
    });

    test('overwrites existing marker', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);

      await createMarker(tmpDir, 'claude', 'First Name');
      await createMarker(tmpDir, 'claude', 'Second Name');

      const info = await getMarkerInfo(tmpDir);

      expect(info?.project_name).toBe('Second Name');
    });
  });

  describe('removeMarker', () => {
    test('removes existing marker', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      await createMarker(tmpDir, 'claude', 'Test Project');

      await removeMarker(tmpDir);

      const exists = await isProjectInitialized(tmpDir);
      expect(exists).toBe(false);
    });

    test('does not throw when marker does not exist', async () => {
      await expect(removeMarker(tmpDir)).resolves.not.toThrow();
    });

    test('works with custom base directory', async () => {
      const customDir = path.join(tmpDir, 'custom');
      await fs.mkdir(customDir);
      await createMarker(tmpDir, 'custom', 'Test');

      await removeMarker(tmpDir, 'custom');

      const exists = await isProjectInitialized(tmpDir, 'custom');
      expect(exists).toBe(false);
    });
  });

  describe('updateMarker', () => {
    test('updates existing marker with new information', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      await createMarker(tmpDir, 'claude', 'Original Name');

      await updateMarker(tmpDir, 'claude', {
        project_name: 'Updated Name'
      });

      const info = await getMarkerInfo(tmpDir);
      expect(info?.project_name).toBe('Updated Name');
      expect(info?.version).toBe('1.0.0'); // Other fields preserved
    });

    test('updates multiple fields', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      await createMarker(tmpDir, 'claude', 'Test');

      await updateMarker(tmpDir, 'claude', {
        version: '2.0.0',
        project_name: 'New Name'
      });

      const info = await getMarkerInfo(tmpDir);
      expect(info?.version).toBe('2.0.0');
      expect(info?.project_name).toBe('New Name');
    });

    test('throws error when marker does not exist', async () => {
      await expect(
        updateMarker(tmpDir, 'claude', { project_name: 'Test' })
      ).rejects.toThrow('Marker file does not exist');
    });

    test('preserves fields not being updated', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      await createMarker(tmpDir, 'claude', 'Test Project');

      const originalInfo = await getMarkerInfo(tmpDir);
      const originalDate = originalInfo?.date;

      await updateMarker(tmpDir, 'claude', {
        version: '1.1.0'
      });

      const updatedInfo = await getMarkerInfo(tmpDir);
      expect(updatedInfo?.version).toBe('1.1.0');
      expect(updatedInfo?.date).toBe(originalDate);
      expect(updatedInfo?.project_name).toBe('Test Project');
      expect(updatedInfo?.base_dir).toBe('claude');
    });

    test('works with custom base directory', async () => {
      const customDir = path.join(tmpDir, 'custom');
      await fs.mkdir(customDir);
      await createMarker(tmpDir, 'custom', 'Test');

      await updateMarker(tmpDir, 'custom', {
        project_name: 'Updated'
      });

      const info = await getMarkerInfo(tmpDir, 'custom');
      expect(info?.project_name).toBe('Updated');
    });
  });

  describe('marker file structure', () => {
    test('marker is a hidden file', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      await createMarker(tmpDir, 'claude', 'Test');

      const markerPath = path.join(claudeDir, '.claude-memory-init');
      const exists = await fs.access(markerPath).then(() => true).catch(() => false);

      expect(exists).toBe(true);
      expect(path.basename(markerPath)).toMatch(/^\./); // Starts with dot
    });

    test('marker contains valid JSON', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      await createMarker(tmpDir, 'claude', 'Test');

      const markerPath = path.join(claudeDir, '.claude-memory-init');
      const content = await fs.readFile(markerPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveProperty('initialized');
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('date');
      expect(parsed).toHaveProperty('base_dir');
    });

    test('marker date format is YYYY-MM-DD', async () => {
      const claudeDir = path.join(tmpDir, 'claude');
      await fs.mkdir(claudeDir);
      await createMarker(tmpDir, 'claude', 'Test');

      const info = await getMarkerInfo(tmpDir);

      expect(info?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
