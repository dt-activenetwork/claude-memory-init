import { describe, it, expect, vi } from 'vitest';
import {
  toToon,
  fromToon,
  createToonFile,
  formatSystemInfoAsToon,
  formatPluginConfigAsToon,
} from '../../../src/utils/toon-utils.js';

describe('toon-utils', () => {
  describe('toToon', () => {
    it('should convert simple object to TOON format', () => {
      const obj = { name: 'test', value: 42 };
      const result = toToon(obj);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('name');
      expect(result).toContain('test');
      expect(result).toContain('42');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          age: 30,
        },
      };
      const result = toToon(obj);

      expect(result).toContain('user');
      expect(result).toContain('name');
      expect(result).toContain('John');
      expect(result).toContain('30');
    });

    it('should handle arrays', () => {
      const obj = { items: ['apple', 'banana', 'cherry'] };
      const result = toToon(obj);

      expect(result).toContain('items');
      expect(result).toContain('apple');
      expect(result).toContain('banana');
      expect(result).toContain('cherry');
    });

    it('should handle boolean values', () => {
      const obj = { enabled: true, disabled: false };
      const result = toToon(obj);

      expect(result).toContain('enabled');
      expect(result).toContain('true');
      expect(result).toContain('disabled');
      expect(result).toContain('false');
    });

    it('should handle null values', () => {
      const obj = { value: null };
      const result = toToon(obj);

      expect(result).toContain('value');
      expect(result).toContain('null');
    });

    it('should handle empty objects', () => {
      const obj = {};
      const result = toToon(obj);

      // TOON library encodes empty objects as empty string
      expect(typeof result).toBe('string');
      expect(result).toBe('');
    });

    it('should handle arrays of objects', () => {
      const obj = {
        users: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
        ],
      };
      const result = toToon(obj);

      expect(result).toContain('users');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('25');
      expect(result).toContain('30');
    });
  });

  describe('fromToon', () => {
    it('should parse simple TOON string to object', () => {
      const obj = { name: 'test', value: 42 };
      const toonStr = toToon(obj);
      const result = fromToon(toonStr);

      expect(result).toEqual(obj);
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          age: 30,
        },
      };
      const toonStr = toToon(obj);
      const result = fromToon(toonStr);

      expect(result).toEqual(obj);
    });

    it('should handle arrays', () => {
      const obj = { items: ['apple', 'banana', 'cherry'] };
      const toonStr = toToon(obj);
      const result = fromToon(toonStr);

      expect(result).toEqual(obj);
    });

    it('should support type parameter', () => {
      interface User {
        name: string;
        age: number;
      }

      const user: User = { name: 'Alice', age: 25 };
      const toonStr = toToon(user);
      const result = fromToon<User>(toonStr);

      expect(result.name).toBe('Alice');
      expect(result.age).toBe(25);
    });

    it('should handle roundtrip conversion', () => {
      const original = {
        string: 'hello',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: { key: 'value' },
      };

      const toonStr = toToon(original);
      const result = fromToon(toonStr);

      expect(result).toEqual(original);
    });
  });

  describe('createToonFile', () => {
    it('should create TOON file with header comment', () => {
      const obj = { name: 'test' };
      const result = createToonFile(obj);

      expect(result).toContain('# TOON format');
      expect(result).toContain('AI agent communication');
      expect(result).toContain('name');
      expect(result).toContain('test');
    });

    it('should include custom description in header', () => {
      const obj = { name: 'test' };
      const description = 'Custom Configuration File';
      const result = createToonFile(obj, description);

      expect(result).toContain(`# ${description}`);
      expect(result).toContain('# TOON format');
      expect(result).toContain('name');
      expect(result).toContain('test');
    });

    it('should have header followed by TOON content', () => {
      const obj = { key: 'value' };
      const result = createToonFile(obj);
      const lines = result.split('\n');

      // Should have header comment lines
      expect(lines[0]).toContain('#');
      // Second line might be blank line separator
      const hasSecondHeaderLine = lines[1].includes('#');
      if (hasSecondHeaderLine) {
        expect(lines[1]).toContain('#');
      } else {
        expect(lines[1]).toBe(''); // Blank line separator
      }
    });

    it('should work without description', () => {
      const obj = { test: true };
      const result = createToonFile(obj);

      expect(result).toContain('# TOON format');
      expect(result).not.toContain('# undefined');
      expect(result).toContain('test');
    });
  });

  describe('formatSystemInfoAsToon', () => {
    it('should format system info with OS details', () => {
      const systemInfo = {
        os: {
          type: 'Linux',
          name: 'Ubuntu',
          version: '22.04',
          is_msys2: false,
        },
      };

      const result = formatSystemInfoAsToon(systemInfo);

      expect(result).toContain('System Information');
      expect(result).toContain('Linux');
      expect(result).toContain('Ubuntu');
      expect(result).toContain('22.04');
      expect(result).toContain('false');
    });

    it('should include Python info when available', () => {
      const systemInfo = {
        os: {
          type: 'Linux',
          name: 'Ubuntu',
          version: '22.04',
          is_msys2: false,
        },
        python: {
          version: '3.11.0',
          package_manager: 'pip',
        },
      };

      const result = formatSystemInfoAsToon(systemInfo);

      expect(result).toContain('python');
      expect(result).toContain('3.11.0');
      expect(result).toContain('pip');
    });

    it('should include Node info when available', () => {
      const systemInfo = {
        os: {
          type: 'Windows',
          name: 'Windows 11',
          version: '10.0.22000',
          is_msys2: false,
        },
        node: {
          version: 'v20.10.0',
          package_manager: 'pnpm',
        },
      };

      const result = formatSystemInfoAsToon(systemInfo);

      expect(result).toContain('node');
      expect(result).toContain('v20.10.0');
      expect(result).toContain('pnpm');
    });

    it('should include both Python and Node when both available', () => {
      const systemInfo = {
        os: {
          type: 'Darwin',
          name: 'macOS',
          version: '14.0',
          is_msys2: false,
        },
        python: {
          version: '3.11.0',
          package_manager: 'pip',
        },
        node: {
          version: 'v20.10.0',
          package_manager: 'npm',
        },
      };

      const result = formatSystemInfoAsToon(systemInfo);

      expect(result).toContain('python');
      expect(result).toContain('3.11.0');
      expect(result).toContain('node');
      expect(result).toContain('v20.10.0');
    });

    it('should include timestamp', () => {
      const systemInfo = {
        os: {
          type: 'Linux',
          name: 'Ubuntu',
          version: '22.04',
          is_msys2: false,
        },
      };

      const result = formatSystemInfoAsToon(systemInfo);

      expect(result).toContain('detected_at');
      // Should contain ISO timestamp format
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle empty dev_tools array', () => {
      const systemInfo = {
        os: {
          type: 'Linux',
          name: 'Ubuntu',
          version: '22.04',
          is_msys2: false,
        },
      };

      const result = formatSystemInfoAsToon(systemInfo);

      expect(result).toContain('dev_tools');
      // Should be valid even with empty array
      expect(() => fromToon(result.split('\n\n')[1])).not.toThrow();
    });

    it('should handle MSYS2 flag correctly', () => {
      const systemInfo = {
        os: {
          type: 'Windows',
          name: 'Windows 11',
          version: '10.0.22000',
          is_msys2: true,
        },
      };

      const result = formatSystemInfoAsToon(systemInfo);

      expect(result).toContain('is_msys2');
      expect(result).toContain('true');
    });
  });

  describe('formatPluginConfigAsToon', () => {
    it('should format plugin config with plugin name', () => {
      const config = { enabled: true, timeout: 5000 };
      const result = formatPluginConfigAsToon('test-plugin', config);

      expect(result).toContain('test-plugin');
      expect(result).toContain('Plugin Configuration');
      expect(result).toContain('enabled');
      expect(result).toContain('true');
      expect(result).toContain('5000');
    });

    it('should include timestamp', () => {
      const config = { key: 'value' };
      const result = formatPluginConfigAsToon('my-plugin', config);

      expect(result).toContain('updated_at');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle complex config objects', () => {
      const config = {
        settings: {
          debug: true,
          options: ['a', 'b', 'c'],
        },
        metadata: {
          version: '1.0.0',
        },
      };

      const result = formatPluginConfigAsToon('complex-plugin', config);

      expect(result).toContain('complex-plugin');
      expect(result).toContain('settings');
      expect(result).toContain('debug');
      expect(result).toContain('options');
      expect(result).toContain('metadata');
      expect(result).toContain('1.0.0');
    });

    it('should handle empty config', () => {
      const config = {};
      const result = formatPluginConfigAsToon('empty-plugin', config);

      expect(result).toContain('empty-plugin');
      expect(result).toContain('config');
      expect(() => fromToon(result.split('\n\n')[1])).not.toThrow();
    });

    it('should be parseable back to object', () => {
      const config = { key1: 'value1', key2: 42 };
      const result = formatPluginConfigAsToon('test', config);

      // Extract TOON content (skip header)
      const toonContent = result.split('\n\n').slice(1).join('\n\n');
      const parsed = fromToon(toonContent);

      expect(parsed).toHaveProperty('plugin', 'test');
      expect(parsed).toHaveProperty('config');
      expect((parsed as any).config).toEqual(config);
      expect(parsed).toHaveProperty('updated_at');
    });
  });
});
