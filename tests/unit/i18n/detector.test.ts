import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../../../src/i18n/detector.js';

describe('I18N Language Detector', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.CLAUDE_INIT_LANG;
    delete process.env.LANG;
    delete process.env.LANGUAGE;
    delete process.env.LC_ALL;
    delete process.env.LC_MESSAGES;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('CLAUDE_INIT_LANG environment variable', () => {
    it('should return "en" when CLAUDE_INIT_LANG=en', () => {
      process.env.CLAUDE_INIT_LANG = 'en';
      expect(detectLocale()).toBe('en');
    });

    it('should return "zh" when CLAUDE_INIT_LANG=zh', () => {
      process.env.CLAUDE_INIT_LANG = 'zh';
      expect(detectLocale()).toBe('zh');
    });

    it('should ignore unsupported CLAUDE_INIT_LANG values', () => {
      process.env.CLAUDE_INIT_LANG = 'fr';
      expect(detectLocale()).toBe(DEFAULT_LOCALE);
    });
  });

  describe('System locale detection', () => {
    it('should detect zh from LANG=zh_CN.UTF-8', () => {
      process.env.LANG = 'zh_CN.UTF-8';
      expect(detectLocale()).toBe('zh');
    });

    it('should detect en from LANG=en_US.UTF-8', () => {
      process.env.LANG = 'en_US.UTF-8';
      expect(detectLocale()).toBe('en');
    });

    it('should fallback to DEFAULT_LOCALE for unsupported locales', () => {
      process.env.LANG = 'ja_JP.UTF-8';
      expect(detectLocale()).toBe(DEFAULT_LOCALE);
    });
  });

  describe('Priority order', () => {
    it('CLAUDE_INIT_LANG should take priority over LANG', () => {
      process.env.CLAUDE_INIT_LANG = 'en';
      process.env.LANG = 'zh_CN.UTF-8';
      expect(detectLocale()).toBe('en');
    });
  });

  describe('Constants', () => {
    it('should have correct supported locales', () => {
      expect(SUPPORTED_LOCALES).toContain('en');
      expect(SUPPORTED_LOCALES).toContain('zh');
    });

    it('should have "en" as default locale', () => {
      expect(DEFAULT_LOCALE).toBe('en');
    });
  });
});
