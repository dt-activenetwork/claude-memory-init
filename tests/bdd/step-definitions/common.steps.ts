import { Given, When, Then } from '@cucumber/cucumber';
import { TestWorld } from '../support/world.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import assert from 'node:assert';

// ============ Given Steps ============

Given('a new empty project directory', async function (this: TestWorld) {
  await this.createTempProject();
});

Given('一个新的空项目目录', async function (this: TestWorld) {
  await this.createTempProject();
});

Given('a project directory with file {string} containing:', async function (
  this: TestWorld,
  filePath: string,
  content: string
) {
  await this.createTempProject();
  const fullPath = path.join(this.projectDir, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content);
});

Given('the project is already initialized', async function (this: TestWorld) {
  await this.createTempProject();
  const agentDir = path.join(this.projectDir, '.agent');
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(
    path.join(agentDir, '.claude-memory-init'),
    JSON.stringify({ initialized: true, version: '2.0.0', date: new Date().toISOString() })
  );
});

Given('项目已经初始化过', async function (this: TestWorld) {
  await this.createTempProject();
  const agentDir = path.join(this.projectDir, '.agent');
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(
    path.join(agentDir, '.claude-memory-init'),
    JSON.stringify({ initialized: true, version: '2.0.0', date: new Date().toISOString() })
  );
});

// ============ Then Steps (File Assertions) ============

Then('the directory {string} should exist', async function (
  this: TestWorld,
  dirPath: string
) {
  const fullPath = path.join(this.projectDir, dirPath);
  const stats = await fs.stat(fullPath);
  assert.ok(stats.isDirectory(), `Expected ${dirPath} to be a directory`);
});

Then('the file {string} should exist', async function (
  this: TestWorld,
  filePath: string
) {
  const fullPath = path.join(this.projectDir, filePath);
  const stats = await fs.stat(fullPath);
  assert.ok(stats.isFile(), `Expected ${filePath} to be a file`);
});

Then('the file {string} should contain {string}', async function (
  this: TestWorld,
  filePath: string,
  expectedContent: string
) {
  const fullPath = path.join(this.projectDir, filePath);
  const content = await fs.readFile(fullPath, 'utf-8');
  assert.ok(
    content.includes(expectedContent),
    `Expected ${filePath} to contain "${expectedContent}"`
  );
});

Then('the file {string} should not contain {string}', async function (
  this: TestWorld,
  filePath: string,
  unexpectedContent: string
) {
  const fullPath = path.join(this.projectDir, filePath);
  const content = await fs.readFile(fullPath, 'utf-8');
  assert.ok(
    !content.includes(unexpectedContent),
    `Expected ${filePath} not to contain "${unexpectedContent}"`
  );
});

Then('an error should be raised with message containing {string}', async function (
  this: TestWorld,
  expectedMessage: string
) {
  assert.ok(this.lastError !== null, 'Expected an error to be raised');
  assert.ok(
    this.lastError?.message.includes(expectedMessage),
    `Expected error message to contain "${expectedMessage}"`
  );
});

Then('no error should be raised', async function (this: TestWorld) {
  assert.strictEqual(this.lastError, null, 'Expected no error to be raised');
});

// ============ Chinese Language Support ============

Then('目录 {string} 应该存在', async function (this: TestWorld, dirPath: string) {
  const fullPath = path.join(this.projectDir, dirPath);
  const stats = await fs.stat(fullPath);
  assert.ok(stats.isDirectory(), `Expected ${dirPath} to be a directory`);
});

Then('文件 {string} 应该存在', async function (this: TestWorld, filePath: string) {
  const fullPath = path.join(this.projectDir, filePath);
  const stats = await fs.stat(fullPath);
  assert.ok(stats.isFile(), `Expected ${filePath} to be a file`);
});

Then('文件 {string} 应该包含 {string}', async function (
  this: TestWorld,
  filePath: string,
  expectedContent: string
) {
  const fullPath = path.join(this.projectDir, filePath);
  const content = await fs.readFile(fullPath, 'utf-8');

  assert.ok(
    content.includes(expectedContent),
    `Expected ${filePath} to contain "${expectedContent}"`
  );
});

Then('文件 {string} 不应该包含 {string}', async function (
  this: TestWorld,
  filePath: string,
  unexpectedContent: string
) {
  const fullPath = path.join(this.projectDir, filePath);
  const content = await fs.readFile(fullPath, 'utf-8');
  assert.ok(
    !content.includes(unexpectedContent),
    `Expected ${filePath} not to contain "${unexpectedContent}"`
  );
});
