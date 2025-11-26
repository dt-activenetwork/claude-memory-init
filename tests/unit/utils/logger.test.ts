import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock chalk before importing logger
vi.mock('chalk', () => ({
  default: {
    blue: (s: string) => `[blue]${s}[/blue]`,
    green: (s: string) => `[green]${s}[/green]`,
    red: (s: string) => `[red]${s}[/red]`,
    yellow: (s: string) => `[yellow]${s}[/yellow]`,
    cyan: (s: string) => `[cyan]${s}[/cyan]`,
    gray: (s: string) => `[gray]${s}[/gray]`,
    bold: (s: string) => `[bold]${s}[/bold]`,
  },
}));

import * as logger from '../../../src/utils/logger.js';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('info', () => {
    it('should log message with blue color', () => {
      logger.info('test message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toBe('[blue]test message[/blue]');
    });

    it('should log multiple messages independently', () => {
      logger.info('first');
      logger.info('second');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy.mock.calls[0][0]).toBe('[blue]first[/blue]');
      expect(consoleLogSpy.mock.calls[1][0]).toBe('[blue]second[/blue]');
    });

    it('should handle empty string', () => {
      logger.info('');

      expect(consoleLogSpy).toHaveBeenCalledWith('[blue][/blue]');
    });
  });

  describe('success', () => {
    it('should log message with green color', () => {
      logger.success('success message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toBe('[green]success message[/green]');
    });

    it('should handle special characters', () => {
      logger.success('100% complete!');

      expect(consoleLogSpy).toHaveBeenCalledWith('[green]100% complete![/green]');
    });
  });

  describe('error', () => {
    it('should log message with red color to stderr', () => {
      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toBe('[red]error message[/red]');
    });

    it('should use console.error not console.log', () => {
      logger.error('test error');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(0);
    });

    it('should handle multiline error messages', () => {
      const multilineError = 'Error:\nLine 1\nLine 2';
      logger.error(multilineError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`[red]${multilineError}[/red]`);
    });
  });

  describe('warning', () => {
    it('should log message with yellow color', () => {
      logger.warning('warning message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toBe('[yellow]warning message[/yellow]');
    });

    it('should handle numbers in warning', () => {
      logger.warning('Warning: Found 3 issues');

      expect(consoleLogSpy).toHaveBeenCalledWith('[yellow]Warning: Found 3 issues[/yellow]');
    });
  });

  describe('step', () => {
    it('should log step with number and message', () => {
      logger.step(1, 'first step');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('[cyan][1] [/cyan]');
      expect(output).toContain('first step');
    });

    it('should handle different step numbers', () => {
      logger.step(5, 'fifth step');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('[cyan][5] [/cyan]');
      expect(output).toContain('fifth step');
    });

    it('should handle step number zero', () => {
      logger.step(0, 'initial step');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('[cyan][0] [/cyan]');
      expect(output).toContain('initial step');
    });

    it('should format step prefix and message correctly', () => {
      logger.step(3, 'process files');

      expect(consoleLogSpy).toHaveBeenCalledWith('[cyan][3] [/cyan]process files');
    });

    it('should handle large step numbers', () => {
      logger.step(999, 'large number step');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('[999]');
    });
  });

  describe('blank', () => {
    it('should log empty line', () => {
      logger.blank();

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith();
    });

    it('should work multiple times', () => {
      logger.blank();
      logger.blank();
      logger.blank();

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
      consoleLogSpy.mock.calls.forEach(call => {
        expect(call).toEqual([]);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed logging calls', () => {
      logger.info('Starting process...');
      logger.step(1, 'Initialize');
      logger.success('Initialization complete');
      logger.warning('Low memory');
      logger.error('Failed to connect');
      logger.blank();

      expect(consoleLogSpy).toHaveBeenCalledTimes(5);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should preserve order of log calls', () => {
      logger.info('First');
      logger.success('Second');
      logger.warning('Third');

      expect(consoleLogSpy.mock.calls[0][0]).toContain('First');
      expect(consoleLogSpy.mock.calls[1][0]).toContain('Second');
      expect(consoleLogSpy.mock.calls[2][0]).toContain('Third');
    });
  });
});
