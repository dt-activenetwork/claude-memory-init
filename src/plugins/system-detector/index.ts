/**
 * System Detector Plugin (Redesigned with Skills)
 *
 * Provides detection scripts and optional Skills for system environment detection.
 * Agents run scripts at session start to get fresh environment information.
 */

import * as path from 'path';
import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  PluginContext,
  FileOutput,
} from '../../plugin/types.js';
import { readFile } from '../../utils/file-ops.js';

/**
 * System Detector Plugin Options
 */
export interface SystemDetectorOptions {
  /** Include detection scripts */
  include_scripts: boolean;

  /** Include as Skills (optional) */
  include_as_skill: boolean;
}

/**
 * System Detector Plugin
 */
export const systemDetectorPlugin: Plugin = {
  meta: {
    name: 'system-detector',
    commandName: 'system',
    version: '2.0.0',
    description: 'System detection scripts and Skills',
    recommended: true,
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig> {
      const { ui } = context;

      // Ask if user wants Skills integration
      const includeAsSkill = await ui.confirm(
        'Create system-detector as a Skill (for progressive loading)?',
        false
      );

      const options: SystemDetectorOptions = {
        include_scripts: true, // Always include scripts
        include_as_skill: includeAsSkill,
      };

      return {
        enabled: true,
        options: options as any,
      };
    },

    getSummary(config: PluginConfig): string[] {
      const options = config.options as unknown as SystemDetectorOptions;
      const lines: string[] = [];

      lines.push('Detection scripts: included');

      if (options.include_as_skill) {
        lines.push('Skills integration: enabled');
      }

      return lines;
    },
  },

  hooks: {
    async execute(context: PluginContext): Promise<void> {
      context.logger.info('System detection scripts installed');
    },
  },

  prompt: {
    placeholder: 'SYSTEM_INFO_SECTION',

    generate: (config: PluginConfig): string => {
      if (!config.enabled) {
        return '';
      }

      const options = config.options as unknown as SystemDetectorOptions;

      const lines = ['## System Information'];
      lines.push('');
      lines.push('**At session start**, run detection to get current environment:');
      lines.push('');
      lines.push('```bash');
      lines.push('node .agent/scripts/detect-system.js');
      lines.push('```');
      lines.push('');
      lines.push('Output: TOON format with OS, runtimes, timezone, locale, timestamp.');

      if (options.include_as_skill) {
        lines.push('');
        lines.push('**Skill**: See `.agent/skills/system-detector/SKILL.md` for component scripts.');
      }

      return lines.join('\n');
    },
  },

  outputs: {
    generate: async (config: PluginConfig): Promise<FileOutput[]> => {
      if (!config.enabled) {
        return [];
      }

      const options = config.options as unknown as SystemDetectorOptions;
      const outputs: FileOutput[] = [];

      // 1. Copy detection scripts
      const scriptFiles = ['detect-system.js', 'detect-os.js'];

      for (const scriptFile of scriptFiles) {
        const scriptPath = path.join(process.cwd(), 'templates/system-detector/scripts', scriptFile);
        try {
          const content = await readFile(scriptPath);
          outputs.push({
            path: `scripts/${scriptFile}`,
            content,
            format: 'markdown',
          });
        } catch (err) {
          // Script template not found, skip
        }
      }

      // 2. Optionally create Skill
      if (options.include_as_skill) {
        const skillMdPath = path.join(process.cwd(), 'templates/system-detector/skills/system-detector/SKILL.md');
        try {
          const skillContent = await readFile(skillMdPath);
          outputs.push({
            path: 'skills/system-detector/SKILL.md',
            content: skillContent,
            format: 'markdown',
          });
        } catch (err) {
          // Skill template not found, skip
        }
      }

      return outputs;
    },
  },

  commands: [],
};

export default systemDetectorPlugin;
