import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { TestWorld } from './world.js';

BeforeAll(async function () {
  // 全局初始化（如果需要）
  console.log('🥒 Starting Cucumber BDD tests...');
});

AfterAll(async function () {
  console.log('🥒 Cucumber BDD tests completed.');
});

Before(async function (this: TestWorld) {
  // 每个场景前重置状态
  this.lastOutput = '';
  this.lastError = null;
  this.mockInputs.clear();
});

After(async function (this: TestWorld) {
  // 每个场景后清理临时文件
  await this.cleanup();
});
