/**
 * Tests for Prompt Presets Plugin
 */

import { describe, it, expect } from 'vitest';
import { promptPresetsPlugin } from '../../../src/plugins/prompt-presets/index.js';
import type { PluginContext } from '../../../src/plugin/types.js';

describe('Prompt Presets Plugin', () => {
  describe('Configuration', () => {
    it('should have correct metadata', () => {
      expect(promptPresetsPlugin.meta.name).toBe('prompt-presets');
      expect(promptPresetsPlugin.meta.commandName).toBe('presets');
      expect(promptPresetsPlugin.meta.version).toBe('2.0.0');
      expect(promptPresetsPlugin.meta.recommended).toBe(true);
    });

    it('should need configuration', () => {
      expect(promptPresetsPlugin.configuration?.needsConfiguration).toBe(true);
    });
  });

  describe('Output Generation', () => {
    it('should generate preset file with enhancements', async () => {
      const config = {
        enabled: true,
        options: {
          base_template: 'code-review',
          enhancements: ['system-information', 'memory-instructions'],
        },
      };

      const context = createMockContext();

      const outputs = await promptPresetsPlugin.outputs.generate(config, context);

      expect(outputs.length).toBeGreaterThan(0);

      // Should have the preset file
      const presetFile = outputs.find(o => o.path.includes('code-review.md'));
      expect(presetFile).toBeDefined();

      if (presetFile) {
        // Should have base content
        expect(presetFile.content).toContain('# Code Review');

        // Should have enhancement content
        expect(presetFile.content).toContain('System Environment');
        expect(presetFile.content).toContain('Memory System');

        // Should NOT have unreplaced placeholders
        expect(presetFile.content).not.toContain('{{ENHANCEMENTS}}');
      }
    });

    it('should handle minimal preset (no enhancements)', async () => {
      const config = {
        enabled: true,
        options: {
          base_template: 'documentation',
          enhancements: [], // No enhancements
        },
      };

      const context = createMockContext();

      const outputs = await promptPresetsPlugin.outputs.generate(config, context);

      const presetFile = outputs.find(o => o.path.includes('documentation.md'));
      expect(presetFile).toBeDefined();

      if (presetFile) {
        // Should have base content
        expect(presetFile.content).toContain('# Documentation');

        // Should NOT have enhancement sections
        expect(presetFile.content).not.toContain('System Environment');
        expect(presetFile.content).not.toContain('Memory System');
      }
    });

    it('should replace variables with actual values', async () => {
      const config = {
        enabled: true,
        options: {
          base_template: 'architecture',
          enhancements: ['system-information'],
        },
      };

      const context = createMockContext({
        'system-detector': {
          enabled: true,
          options: {
            os: { name: 'Ubuntu', version: '22.04', type: 'linux', package_manager: 'apt' },
            python: { version: '3.11.5', path: 'python3', selected_manager: 'uv', available_managers: ['uv', 'pip'] },
            locale: { timezone: 'America/New_York', language: 'en_US.UTF-8' },
          },
        },
      });

      const outputs = await promptPresetsPlugin.outputs.generate(config, context);
      const presetFile = outputs.find(o => o.path.includes('architecture.md'));

      if (presetFile) {
        // Variables should be replaced
        expect(presetFile.content).toContain('Ubuntu');
        expect(presetFile.content).toContain('3.11.5');
        expect(presetFile.content).toContain('uv');

        // Should NOT have unreplaced variables
        expect(presetFile.content).not.toContain('{{OS_NAME}}');
        expect(presetFile.content).not.toContain('{{PYTHON_VERSION}}');
      }
    });

    it('should handle conditional blocks correctly', async () => {
      const config = {
        enabled: true,
        options: {
          base_template: 'testing',
          enhancements: ['system-information'],
        },
      };

      // Context WITHOUT Python
      const contextNoPython = createMockContext({
        'system-detector': {
          enabled: true,
          options: {
            os: { name: 'Ubuntu', type: 'linux', package_manager: 'apt' },
            // No python
            locale: { timezone: 'UTC', language: 'en_US' },
          },
        },
      });

      const outputs1 = await promptPresetsPlugin.outputs.generate(config, contextNoPython);
      const preset1 = outputs1.find(o => o.path.includes('testing.md'));

      if (preset1) {
        // Should NOT have Python section (conditional)
        expect(preset1.content).not.toContain('### Python Environment');
      }

      // Context WITH Python
      const contextWithPython = createMockContext({
        'system-detector': {
          enabled: true,
          options: {
            os: { name: 'Ubuntu', type: 'linux', package_manager: 'apt' },
            python: { version: '3.11.5', selected_manager: 'pip', available_managers: ['pip'] },
            locale: { timezone: 'UTC', language: 'en_US' },
          },
        },
      });

      const outputs2 = await promptPresetsPlugin.outputs.generate(config, contextWithPython);
      const preset2 = outputs2.find(o => o.path.includes('testing.md'));

      if (preset2) {
        // SHOULD have Python section
        expect(preset2.content).toContain('### Python Environment');
        expect(preset2.content).toContain('3.11.5');
      }
    });
  });

});

/**
 * Create mock plugin context for testing
 */
function createMockContext(pluginConfigs: Record<string, any> = {}): PluginContext {
  const pluginsMap = new Map();

  for (const [name, config] of Object.entries(pluginConfigs)) {
    pluginsMap.set(name, config);
  }

  return {
    projectRoot: '/test/project',
    targetDir: '/test/project',
    config: {
      core: {
        project: { name: 'test-project', root: '/test/project' },
        output: { base_dir: '.agent' },
        plugins: {},
      },
      plugins: pluginsMap,
    },
    shared: new Map(),
    logger: {
      info: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      step: () => {},
      blank: () => {},
    },
    fs: {} as any,
    template: {} as any,
    ui: {} as any,
    i18n: {} as any,
  };
}
