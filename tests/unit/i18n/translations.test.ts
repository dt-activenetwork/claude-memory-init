import { describe, it, expect } from 'vitest';
import en from '../../../src/i18n/en/index.js';
import zh from '../../../src/i18n/zh/index.js';

describe('I18N Translations', () => {
  function getAllKeys(obj: object, prefix = ''): string[] {
    const keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  describe('Translation completeness', () => {
    it('should have all English keys present in Chinese translation', () => {
      const enKeys = getAllKeys(en);
      const zhKeys = new Set(getAllKeys(zh));
      const missingInZh = enKeys.filter(key => !zhKeys.has(key));
      expect(missingInZh).toEqual([]);
    });

    it('should not have extra keys in Chinese that are not in English', () => {
      const enKeys = new Set(getAllKeys(en));
      const zhKeys = getAllKeys(zh);
      const extraInZh = zhKeys.filter(key => !enKeys.has(key));
      expect(extraInZh).toEqual([]);
    });
  });

  describe('Parameter placeholders', () => {
    function checkPlaceholders(enStr: string, zhStr: string, key: string) {
      // Extract placeholders, filtering out pluralization markers ({{...}})
      // For English: extract and remove type annotations to get parameter names
      // For Chinese: extract parameter names directly (no type annotations)
      const extractParams = (str: string, removeTypes = false) => {
        const matches = str.match(/\{[^}]+\}/g) || [];
        const filtered = matches.filter(m => !m.startsWith('{{'));
        if (removeTypes) {
          // Remove type annotations from English placeholders (e.g., {name:string} -> {name})
          return filtered.map(p => p.replace(/:[a-zA-Z]+\}/, '}')).sort();
        }
        return filtered.sort();
      };
      const enParams = extractParams(enStr, true);  // Remove types from English
      const zhParams = extractParams(zhStr, false); // Chinese should have no types
      expect(zhParams, `Key "${key}" has mismatched placeholders`).toEqual(enParams);
    }

    function compareValues(enObj: object, zhObj: object, prefix = '') {
      for (const [key, enValue] of Object.entries(enObj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const zhValue = (zhObj as Record<string, unknown>)[key];
        if (typeof enValue === 'string' && typeof zhValue === 'string') {
          checkPlaceholders(enValue, zhValue, fullKey);
        } else if (typeof enValue === 'object' && typeof zhValue === 'object' && enValue !== null && zhValue !== null) {
          compareValues(enValue as object, zhValue as object, fullKey);
        }
      }
    }

    it('should have matching parameter placeholders in all translations', () => {
      compareValues(en, zh);
    });
  });

  describe('Translation quality', () => {
    function checkNotEmpty(obj: object, prefix = ''): string[] {
      const emptyKeys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string' && value.trim() === '') {
          emptyKeys.push(fullKey);
        } else if (typeof value === 'object' && value !== null) {
          emptyKeys.push(...checkNotEmpty(value, fullKey));
        }
      }
      return emptyKeys;
    }

    it('should not have empty translations in English', () => {
      const emptyInEn = checkNotEmpty(en);
      expect(emptyInEn).toEqual([]);
    });

    it('should not have empty translations in Chinese', () => {
      const emptyInZh = checkNotEmpty(zh);
      expect(emptyInZh).toEqual([]);
    });
  });
});
