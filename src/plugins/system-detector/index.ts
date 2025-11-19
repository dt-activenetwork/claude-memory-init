/**
 * System Detector Plugin
 *
 * Automatically detects operating system and development tools.
 * This plugin runs silently during initialization and provides
 * system information that can be used by other plugins.
 */

import type {
  Plugin,
  PluginConfig,
  ConfigurationContext,
  PluginContext,
  FileOutput,
} from '../../plugin/types.js';
import { detectOS } from './detectors/os.js';
import { detectPython } from './detectors/python.js';
import { detectNode } from './detectors/node.js';
import { formatSystemInfoAsToon } from '../../utils/toon-utils.js';

/**
 * System detection results
 */
export interface SystemDetectionResult {
  os: {
    type: string;
    name: string;
    version: string;
    is_msys2: boolean;
  };
  python?: {
    version: string;
    package_manager: string;
  };
  node?: {
    version: string;
    package_manager: string;
  };
}

/**
 * System Detector Plugin
 *
 * Detects system information automatically without user interaction.
 */
export const systemDetectorPlugin: Plugin = {
  meta: {
    name: 'system-detector',
    commandName: 'system',
    version: '1.0.0',
    description: 'Detect OS and development tools',
    recommended: true,
  },

  configuration: {
    needsConfiguration: false,

    /**
     * Configure (silent detection)
     *
     * Runs system detection without prompting the user.
     */
    async configure(context: ConfigurationContext): Promise<PluginConfig> {
      // Silently detect system information
      const os = await detectOS();
      const python = await detectPython();
      const node = await detectNode();

      const detectionResult: SystemDetectionResult = {
        os,
        python: python.version ? python : undefined,
        node: node.version ? node : undefined,
      };

      return {
        enabled: true,
        options: {
          include_in_config: true,
          detection_result: detectionResult as unknown as Record<string, unknown>,
        },
      };
    },

    /**
     * Get summary of detected system
     *
     * Displays the detected system information in the final summary.
     */
    getSummary(config: PluginConfig): string[] {
      const result = config.options.detection_result as unknown as SystemDetectionResult | undefined;

      if (!result) {
        return ['No system information detected'];
      }

      const parts: string[] = [];

      // OS info
      parts.push(result.os.name);

      // Python info
      if (result.python?.version) {
        parts.push(`Python ${result.python.version}`);
      }

      // Node.js info
      if (result.node?.version) {
        parts.push(`Node.js ${result.node.version}`);
      }

      return [`Auto-detected: ${parts.join(', ')}`];
    },
  },

  hooks: {
    /**
     * Execute hook - store detection results in shared context
     */
    async execute(context: PluginContext): Promise<void> {
      const config = context.config.plugins.get('system-detector');

      if (!config) {
        return;
      }

      const result = config.options.detection_result as unknown as SystemDetectionResult | undefined;

      if (result) {
        // Store in shared context for other plugins to use
        context.shared.set('system_info', result);
        context.logger.info(`System detected: ${result.os.name}`);
      }
    },
  },

  // No commands exposed
  commands: [],

  // Prompt contribution to AGENT.md
  prompt: {
    placeholder: 'SYSTEM_INFO_SECTION',

    generate: (config: PluginConfig): string => {
      const result = config.options.detection_result as unknown as SystemDetectionResult | undefined;

      if (!result) {
        return '';
      }

      const parts: string[] = [result.os.name];

      if (result.python?.version) {
        parts.push(`Python ${result.python.version}`);
      }

      if (result.node?.version) {
        parts.push(`Node.js ${result.node.version}`);
      }

      return `## System Information

**Detected**: ${parts.join(', ')}

See \`.agent/system/info.toon\` for complete details.`;
    },
  },

  // File outputs to .agent/ directory
  outputs: {
    generate: (config: PluginConfig): FileOutput[] => {
      const result = config.options.detection_result as unknown as SystemDetectionResult | undefined;

      if (!result) {
        return [];
      }

      // Generate TOON formatted system info file
      const toonContent = formatSystemInfoAsToon(result);

      return [
        {
          path: 'system/info.toon',
          content: toonContent,
          format: 'toon',
        },
      ];
    },
  },
};

export default systemDetectorPlugin;
