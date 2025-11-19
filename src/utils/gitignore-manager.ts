/**
 * Gitignore Manager
 *
 * Manages .gitignore files with plugin contributions.
 * Plugins can contribute their own ignore patterns.
 */

import * as path from 'path';
import { fileExists, readFile, writeFile } from './file-ops.js';

/**
 * Gitignore contribution from a plugin
 */
export interface GitignoreContribution {
  /** Plugin name (for comments) */
  plugin: string;

  /** Patterns to ignore */
  patterns: string[];

  /** Optional comment/description */
  comment?: string;
}

/**
 * Gitignore Manager
 */
export class GitignoreManager {
  private contributions: Map<string, GitignoreContribution> = new Map();

  /**
   * Add contribution from a plugin
   */
  addContribution(contribution: GitignoreContribution): void {
    this.contributions.set(contribution.plugin, contribution);
  }

  /**
   * Generate .gitignore content from all contributions
   */
  generate(): string {
    const lines: string[] = [];

    lines.push('# AI Agent - Auto-generated gitignore rules');
    lines.push('# Managed by claude-memory-init plugins');
    lines.push('');

    for (const [pluginName, contribution] of this.contributions) {
      lines.push(`# ${pluginName} plugin`);
      if (contribution.comment) {
        lines.push(`# ${contribution.comment}`);
      }

      for (const pattern of contribution.patterns) {
        lines.push(pattern);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Write .gitignore file to target directory
   *
   * If .gitignore exists, appends contributions.
   * If not, creates new file.
   */
  async write(targetDir: string, filename: string = '.gitignore'): Promise<void> {
    const gitignorePath = path.join(targetDir, filename);
    const newContent = this.generate();

    if (await fileExists(gitignorePath)) {
      // Append to existing
      const existing = await readFile(gitignorePath);

      // Check if our section already exists
      if (existing.includes('# AI Agent - Auto-generated gitignore rules')) {
        // Replace existing section
        const pattern = /# AI Agent - Auto-generated gitignore rules[\s\S]*?(?=\n#[^\s]|\n[^\s#]|$)/;
        const updated = existing.replace(pattern, newContent);
        await writeFile(gitignorePath, updated);
      } else {
        // Append new section
        const combined = existing.trimEnd() + '\n\n' + newContent;
        await writeFile(gitignorePath, combined);
      }
    } else {
      // Create new file
      await writeFile(gitignorePath, newContent);
    }
  }

  /**
   * Write .gitignore to .agent/ directory
   */
  async writeAgentGitignore(agentDir: string): Promise<void> {
    const gitignorePath = path.join(agentDir, '.gitignore');
    const content = this.generate();
    await writeFile(gitignorePath, content);
  }
}

/**
 * Create gitignore manager with default contributions
 */
export function createGitignoreManager(): GitignoreManager {
  const manager = new GitignoreManager();

  // Core contributions (always added)
  manager.addContribution({
    plugin: 'core',
    patterns: [
      '.agent/temp/',
      '.agent/.cache/',
      '.agent/scripts/*.log',
    ],
    comment: 'Core temporary files',
  });

  return manager;
}
