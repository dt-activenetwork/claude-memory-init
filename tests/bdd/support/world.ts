import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface CustomWorld extends World {
  tmpDir: string;
  projectDir: string;
  lastOutput: string;
  lastError: Error | null;
  pluginRegistry: any;
  initializer: any;
  mockInputs: Map<string, any>;
}

export class TestWorld extends World implements CustomWorld {
  tmpDir: string = '';
  projectDir: string = '';
  lastOutput: string = '';
  lastError: Error | null = null;
  pluginRegistry: any = null;
  initializer: any = null;
  mockInputs: Map<string, any> = new Map();

  constructor(options: IWorldOptions) {
    super(options);
  }

  async createTempProject(): Promise<string> {
    this.tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-init-bdd-'));
    this.projectDir = path.join(this.tmpDir, 'test-project');
    await fs.mkdir(this.projectDir, { recursive: true });
    return this.projectDir;
  }

  async cleanup(): Promise<void> {
    if (this.tmpDir) {
      await fs.rm(this.tmpDir, { recursive: true, force: true });
    }
  }

  setMockInput(key: string, value: any): void {
    this.mockInputs.set(key, value);
  }

  getMockInput(key: string): any {
    return this.mockInputs.get(key);
  }

  hasMockInput(key: string): boolean {
    return this.mockInputs.has(key);
  }

  clearMockInputs(): void {
    this.mockInputs.clear();
  }

  async createFile(relativePath: string, content: string): Promise<void> {
    if (!this.projectDir) {
      throw new Error('Project directory not created. Call createTempProject() first.');
    }
    const fullPath = path.join(this.projectDir, relativePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async readFile(relativePath: string): Promise<string> {
    if (!this.projectDir) {
      throw new Error('Project directory not created. Call createTempProject() first.');
    }
    const fullPath = path.join(this.projectDir, relativePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  async fileExists(relativePath: string): Promise<boolean> {
    if (!this.projectDir) return false;
    const fullPath = path.join(this.projectDir, relativePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(relativePath: string): Promise<boolean> {
    if (!this.projectDir) return false;
    const fullPath = path.join(this.projectDir, relativePath);
    try {
      const stats = await fs.stat(fullPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}

setWorldConstructor(TestWorld);
