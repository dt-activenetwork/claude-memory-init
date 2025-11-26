import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { TestWorld } from './world.js';
import sinon from 'sinon';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Backup user preferences path
const USER_PREFS_PATH = path.join(os.homedir(), '.claude/system/preferences.toon');
let userPrefsBackup: string | null = null;

BeforeAll(async function () {
  // 全局初始化
  console.log('🥒 Starting Cucumber BDD tests...');

  // Backup user preferences if exists
  try {
    userPrefsBackup = await fs.readFile(USER_PREFS_PATH, 'utf-8');
    await fs.unlink(USER_PREFS_PATH);
    console.log('  User preferences backed up and removed for testing');
  } catch {
    // File doesn't exist, no need to backup
  }
});

AfterAll(async function () {
  // Restore user preferences if had backup
  if (userPrefsBackup) {
    try {
      const dir = path.dirname(USER_PREFS_PATH);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(USER_PREFS_PATH, userPrefsBackup);
      console.log('  User preferences restored');
    } catch (error) {
      console.error('  Failed to restore user preferences:', error);
    }
  }

  console.log('🥒 Cucumber BDD tests completed.');
});

Before(async function (this: TestWorld) {
  // 清理可能遗留的 stubs，避免 "already wrapped" 错误
  sinon.restore();

  // 每个场景前重置状态
  this.lastOutput = '';
  this.lastError = null;
  this.mockInputs.clear();
});

After(async function (this: TestWorld) {
  // 恢复所有 sinon stubs，避免污染其他测试
  sinon.restore();

  // 每个场景后清理临时文件
  await this.cleanup();

  // Remove user preferences created during test
  try {
    await fs.unlink(USER_PREFS_PATH);
  } catch {
    // File doesn't exist, ignore
  }
});
