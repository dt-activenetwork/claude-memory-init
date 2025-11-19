/**
 * System Detector Plugin Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { systemDetectorPlugin } from '../../../src/plugins/system-detector/index.js';
import type { ConfigurationContext, PluginContext } from '../../../src/plugin/types.js';
import { createMockPluginContext } from '../../../src/plugin/context.js';

describe('System Detector Plugin', () => {
  describe('Plugin Metadata', () => {
    it('should have correct metadata', () => {
      expect(systemDetectorPlugin.meta.name).toBe('system-detector');
      expect(systemDetectorPlugin.meta.commandName).toBe('system');
      expect(systemDetectorPlugin.meta.version).toBe('1.0.0');
      expect(systemDetectorPlugin.meta.recommended).toBe(true);
    });

    it('should not need configuration', () => {
      expect(systemDetectorPlugin.configuration?.needsConfiguration).toBe(false);
    });

    it('should not expose any commands', () => {
      expect(systemDetectorPlugin.commands).toEqual([]);
    });
  });

  describe('Configuration', () => {
    let mockContext: ConfigurationContext;

    beforeEach(() => {
      mockContext = {
        projectName: 'test-project',
        projectRoot: '/test/project',
        otherPlugins: new Map(),
        ui: {
          checkboxList: vi.fn(),
          radioList: vi.fn(),
          confirm: vi.fn(),
          input: vi.fn(),
        },
        logger: {
          info: vi.fn(),
          success: vi.fn(),
          error: vi.fn(),
          warning: vi.fn(),
          step: vi.fn(),
          blank: vi.fn(),
        },
      };
    });

    it('should detect system information silently', async () => {
      const config = await systemDetectorPlugin.configuration!.configure(mockContext);

      expect(config.enabled).toBe(true);
      expect(config.options.include_in_config).toBe(true);
      expect(config.options.detection_result).toBeDefined();
    });

    it('should detect OS information', async () => {
      const config = await systemDetectorPlugin.configuration!.configure(mockContext);
      const result: any = config.options.detection_result;

      expect(result.os).toBeDefined();
      expect(result.os.type).toBeTruthy();
      expect(result.os.name).toBeTruthy();
      expect(typeof result.os.is_msys2).toBe('boolean');
    });

    it('should attempt to detect Python', async () => {
      const config = await systemDetectorPlugin.configuration!.configure(mockContext);
      const result: any = config.options.detection_result;

      // Python may or may not be installed
      if (result.python) {
        expect(result.python.version).toBeTruthy();
        expect(result.python.package_manager).toBeTruthy();
      }
    });

    it('should attempt to detect Node.js', async () => {
      const config = await systemDetectorPlugin.configuration!.configure(mockContext);
      const result: any = config.options.detection_result;

      // Node.js should be installed (we're running in Node)
      expect(result.node).toBeDefined();
      expect(result.node.version).toBeTruthy();
      expect(result.node.package_manager).toBeTruthy();
    });
  });

  describe('Summary', () => {
    it('should generate summary with OS only', () => {
      const config = {
        enabled: true,
        options: {
          detection_result: {
            os: {
              type: 'linux',
              name: 'Ubuntu 22.04',
              version: '22.04',
              is_msys2: false,
            },
          },
        },
      };

      const summary = systemDetectorPlugin.configuration!.getSummary(config);

      expect(summary).toHaveLength(1);
      expect(summary[0]).toContain('Ubuntu 22.04');
    });

    it('should generate summary with OS and Python', () => {
      const config = {
        enabled: true,
        options: {
          detection_result: {
            os: {
              type: 'linux',
              name: 'Ubuntu 22.04',
              version: '22.04',
              is_msys2: false,
            },
            python: {
              version: '3.11.0',
              package_manager: 'pip',
            },
          },
        },
      };

      const summary = systemDetectorPlugin.configuration!.getSummary(config);

      expect(summary).toHaveLength(1);
      expect(summary[0]).toContain('Ubuntu 22.04');
      expect(summary[0]).toContain('Python 3.11.0');
    });

    it('should generate summary with all tools', () => {
      const config = {
        enabled: true,
        options: {
          detection_result: {
            os: {
              type: 'linux',
              name: 'Ubuntu 22.04',
              version: '22.04',
              is_msys2: false,
            },
            python: {
              version: '3.11.0',
              package_manager: 'pip',
            },
            node: {
              version: '20.10.0',
              package_manager: 'pnpm',
            },
          },
        },
      };

      const summary = systemDetectorPlugin.configuration!.getSummary(config);

      expect(summary).toHaveLength(1);
      expect(summary[0]).toContain('Ubuntu 22.04');
      expect(summary[0]).toContain('Python 3.11.0');
      expect(summary[0]).toContain('Node.js 20.10.0');
    });

    it('should handle missing detection result', () => {
      const config = {
        enabled: true,
        options: {},
      };

      const summary = systemDetectorPlugin.configuration!.getSummary(config);

      expect(summary).toHaveLength(1);
      expect(summary[0]).toContain('No system information detected');
    });
  });

  describe('Execute Hook', () => {
    it('should store detection result in shared context', async () => {
      const mockPluginContext = createMockPluginContext('/test/project', '/test/project/claude');

      // Add system-detector config to plugins
      const detectionResult = {
        os: {
          type: 'linux',
          name: 'Ubuntu 22.04',
          version: '22.04',
          is_msys2: false,
        },
        node: {
          version: '20.10.0',
          package_manager: 'pnpm',
        },
      };

      mockPluginContext.config.plugins.set('system-detector', {
        enabled: true,
        options: {
          detection_result: detectionResult,
        },
      });

      await systemDetectorPlugin.hooks!.execute!(mockPluginContext);

      expect(mockPluginContext.shared.get('system_info')).toEqual(detectionResult);
    });

    it('should handle missing config gracefully', async () => {
      const mockPluginContext = createMockPluginContext('/test/project', '/test/project/claude');

      await expect(
        systemDetectorPlugin.hooks!.execute!(mockPluginContext)
      ).resolves.not.toThrow();
    });
  });
});
