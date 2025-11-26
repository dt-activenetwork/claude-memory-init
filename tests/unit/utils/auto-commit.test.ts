import { describe, it, expect, vi, beforeEach } from 'vitest';
import { separateMemoryFiles, generateMemoryCommitMessage } from '../../../src/utils/auto-commit.js';

describe('auto-commit', () => {
  describe('separateMemoryFiles', () => {
    it('should separate memory files from other files with default baseDir', () => {
      const files = [
        'claude/config.yaml',
        'claude/memory/index.json',
        'src/index.ts',
        'package.json',
      ];

      const result = separateMemoryFiles(files, 'claude');

      expect(result.memoryFiles).toContain('claude/config.yaml');
      expect(result.memoryFiles).toContain('claude/memory/index.json');
      expect(result.otherFiles).toContain('src/index.ts');
      expect(result.otherFiles).toContain('package.json');
    });

    it('should handle .agent base directory', () => {
      const files = ['.agent/config.toon', '.agent/memory/index.json', 'src/index.ts', 'package.json'];

      const result = separateMemoryFiles(files, '.agent');

      expect(result.memoryFiles).toContain('.agent/config.toon');
      expect(result.memoryFiles).toContain('.agent/memory/index.json');
      expect(result.otherFiles).toContain('src/index.ts');
      expect(result.otherFiles).toContain('package.json');
    });

    it('should handle empty file list', () => {
      const result = separateMemoryFiles([], 'claude');

      expect(result.memoryFiles).toHaveLength(0);
      expect(result.otherFiles).toHaveLength(0);
    });

    it('should handle files with different base directories', () => {
      const files = ['custom-dir/config.yaml', 'src/main.ts', 'README.md'];
      const result = separateMemoryFiles(files, 'custom-dir');

      expect(result.memoryFiles).toContain('custom-dir/config.yaml');
      expect(result.otherFiles).toContain('src/main.ts');
      expect(result.otherFiles).toContain('README.md');
    });

    it('should include CLAUDE.md as memory file', () => {
      const files = ['CLAUDE.md', 'README.md', 'claude/config.yaml'];
      const result = separateMemoryFiles(files, 'claude');

      expect(result.memoryFiles).toContain('CLAUDE.md');
      expect(result.memoryFiles).toContain('claude/config.yaml');
      expect(result.otherFiles).toContain('README.md');
    });

    it('should handle nested memory directories', () => {
      const files = [
        'claude/memory/semantic/sem-001.md',
        'claude/memory/episodic/ep-001.md',
        'claude/prompt/overview.md',
        'src/utils/helper.ts',
      ];

      const result = separateMemoryFiles(files, 'claude');

      expect(result.memoryFiles).toHaveLength(3);
      expect(result.memoryFiles).toContain('claude/memory/semantic/sem-001.md');
      expect(result.memoryFiles).toContain('claude/memory/episodic/ep-001.md');
      expect(result.memoryFiles).toContain('claude/prompt/overview.md');
      expect(result.otherFiles).toContain('src/utils/helper.ts');
    });

    it('should handle Windows-style backslashes', () => {
      const files = ['claude\\config.yaml', 'src\\index.ts'];
      const result = separateMemoryFiles(files, 'claude');

      expect(result.memoryFiles).toContain('claude\\config.yaml');
      expect(result.otherFiles).toContain('src\\index.ts');
    });

    it('should handle mixed path separators', () => {
      const files = ['claude/memory\\index.json', 'src/utils\\helper.ts'];
      const result = separateMemoryFiles(files, 'claude');

      expect(result.memoryFiles).toContain('claude/memory\\index.json');
      expect(result.otherFiles).toContain('src/utils\\helper.ts');
    });

    it('should not include partial matches', () => {
      const files = ['claude-test/file.md', 'not-claude/data.json', 'claude/config.yaml'];
      const result = separateMemoryFiles(files, 'claude');

      expect(result.memoryFiles).toHaveLength(1);
      expect(result.memoryFiles).toContain('claude/config.yaml');
      expect(result.otherFiles).toContain('claude-test/file.md');
      expect(result.otherFiles).toContain('not-claude/data.json');
    });

    it('should handle only memory files', () => {
      const files = ['claude/config.yaml', 'claude/memory/index.json', 'CLAUDE.md'];
      const result = separateMemoryFiles(files, 'claude');

      expect(result.memoryFiles).toHaveLength(3);
      expect(result.otherFiles).toHaveLength(0);
    });

    it('should handle only non-memory files', () => {
      const files = ['src/index.ts', 'package.json', 'README.md'];
      const result = separateMemoryFiles(files, 'claude');

      expect(result.memoryFiles).toHaveLength(0);
      expect(result.otherFiles).toHaveLength(3);
    });
  });

  describe('generateMemoryCommitMessage', () => {
    it('should generate descriptive commit message', () => {
      const files = ['claude/config.yaml', 'claude/memory/index.json'];
      const message = generateMemoryCommitMessage(files);

      expect(message).toContain('chore: update memory system');
      expect(message).toContain('config');
      expect(message).toContain('memory');
      expect(message).toContain('Files updated: 2');
      expect(message.length).toBeGreaterThan(10);
    });

    it('should handle single file', () => {
      const message = generateMemoryCommitMessage(['claude/config.yaml']);

      expect(message).toContain('chore: update memory system');
      expect(message).toContain('Files updated: 1');
      expect(message).toContain('config');
    });

    it('should include date in ISO format', () => {
      const message = generateMemoryCommitMessage(['claude/config.yaml']);

      expect(message).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
    });

    it('should detect config files', () => {
      const message = generateMemoryCommitMessage(['claude/config.yaml']);

      expect(message).toContain('(config)');
    });

    it('should detect prompt files', () => {
      const message = generateMemoryCommitMessage(['claude/prompt/overview.md']);

      expect(message).toContain('(prompts)');
    });

    it('should detect memory files', () => {
      const message = generateMemoryCommitMessage(['claude/memory/semantic/sem-001.md']);

      expect(message).toContain('(memory)');
    });

    it('should detect CLAUDE.md', () => {
      const message = generateMemoryCommitMessage(['CLAUDE.md']);

      expect(message).toContain('(CLAUDE.md)');
    });

    it('should combine multiple categories', () => {
      const files = [
        'claude/config.yaml',
        'claude/prompt/overview.md',
        'claude/memory/index.json',
        'CLAUDE.md',
      ];
      const message = generateMemoryCommitMessage(files);

      expect(message).toContain('config');
      expect(message).toContain('prompts');
      expect(message).toContain('memory');
      expect(message).toContain('CLAUDE.md');
      expect(message).toContain('Files updated: 4');
    });

    it('should include auto-generated footer', () => {
      const message = generateMemoryCommitMessage(['claude/config.yaml']);

      expect(message).toContain('Auto-generated commit by claude-memory-init');
    });

    it('should include commit message body', () => {
      const message = generateMemoryCommitMessage(['claude/config.yaml']);

      expect(message).toContain('Update Claude memory system configuration and files');
    });

    it('should have proper message format', () => {
      const message = generateMemoryCommitMessage(['claude/config.yaml']);
      const lines = message.split('\n');

      // First line should be the subject
      expect(lines[0]).toMatch(/^chore: update memory system/);
      // Second line should be blank
      expect(lines[1]).toBe('');
      // Body should follow
      expect(lines[2]).toContain('Update Claude memory system');
    });

    it('should handle empty file list', () => {
      const message = generateMemoryCommitMessage([]);

      expect(message).toContain('chore: update memory system');
      expect(message).toContain('Files updated: 0');
    });

    it('should handle files without categories', () => {
      const files = ['claude/other/file.txt'];
      const message = generateMemoryCommitMessage(files);

      // Should still generate valid message without category
      expect(message).toContain('chore: update memory system');
      expect(message).toContain('Files updated: 1');
      // Should not have empty parentheses
      expect(message).not.toContain('()');
    });

    it('should count files correctly for large lists', () => {
      const files = Array.from({ length: 25 }, (_, i) => `claude/memory/file-${i}.md`);
      const message = generateMemoryCommitMessage(files);

      expect(message).toContain('Files updated: 25');
    });

    it('should maintain consistent format across different inputs', () => {
      const messages = [
        generateMemoryCommitMessage(['claude/config.yaml']),
        generateMemoryCommitMessage(['claude/memory/index.json']),
        generateMemoryCommitMessage(['CLAUDE.md']),
      ];

      messages.forEach(msg => {
        expect(msg).toMatch(/^chore: update memory system/);
        expect(msg).toContain('Update Claude memory system configuration and files');
        expect(msg).toContain('Auto-generated commit by claude-memory-init');
        expect(msg).toMatch(/Date: \d{4}-\d{2}-\d{2}/);
        expect(msg).toMatch(/Files updated: \d+/);
      });
    });
  });
});
