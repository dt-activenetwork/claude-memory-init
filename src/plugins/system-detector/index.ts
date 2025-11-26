/**
 * System Detector Plugin (v2.1)
 *
 * Two-layer architecture:
 * - User Memory (~/.claude/system/preferences.toon): Static user preferences
 * - Project Memory (.agent/system/config.toon): Project-specific configuration
 *
 * Dynamic detection (versions, paths) is handled by hooks at runtime.
 */

import * as path from 'path';
import type {
  Plugin,
  PluginConfig,
  PluginOptionValue,
  ConfigurationContext,
  PluginContext,
  FileOutput,
} from '../../plugin/types.js';
import { readFile, fileExists } from '../../utils/file-ops.js';
import { detectOS } from './detectors/os.js';
import { detectPython } from './detectors/python.js';
import { detectNode } from './detectors/node.js';
import {
  USER_MEMORY_DIR,
  USER_MEMORY_SUBDIRS,
  USER_MEMORY_FILES,
  PROJECT_MEMORY_FILES,
} from '../../constants.js';

// ============================================================================
// Types
// ============================================================================

/**
 * User-level preferences (stored in ~/.claude/system/preferences.toon)
 * These are static and persist across all projects.
 */
export interface UserSystemPreferences {
  /** OS information (static, detected once per machine) */
  os: {
    type: 'linux' | 'darwin' | 'windows';
    name: string;
    package_manager: string;
  };

  /** User's preferred package managers */
  preferred_managers: {
    python?: string;  // e.g., 'uv', 'pip', 'poetry'
    node?: string;    // e.g., 'pnpm', 'npm', 'yarn'
  };

  /** Locale preferences */
  locale: {
    timezone: string;
    language: string;
  };

  /** Metadata */
  created_at: string;
  updated_at: string;
}

/**
 * Project-level configuration (stored in .agent/system/config.toon)
 * These are specific to each project.
 */
export interface ProjectSystemConfig {
  /** Package managers to use in this project */
  package_managers: {
    python?: string;  // Actual manager for this project
    node?: string;    // Actual manager for this project
  };

  /** Metadata */
  configured_at: string;
}

/**
 * Combined plugin options (for internal use)
 */
export interface SystemDetectorOptions {
  userPreferences: UserSystemPreferences | null;
  projectConfig: ProjectSystemConfig;
}

// ============================================================================
// User Memory Management
// ============================================================================

/**
 * Get path to user preferences file
 */
function getUserPreferencesPath(): string {
  return path.join(USER_MEMORY_DIR, USER_MEMORY_SUBDIRS.SYSTEM, USER_MEMORY_FILES.SYSTEM_PREFERENCES);
}

/**
 * Load user preferences from ~/.claude/system/preferences.toon
 */
async function loadUserPreferences(): Promise<UserSystemPreferences | null> {
  const prefsPath = getUserPreferencesPath();

  if (!(await fileExists(prefsPath))) {
    return null;
  }

  try {
    const content = await readFile(prefsPath);
    return parseUserPreferences(content);
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    return null;
  }
}

/**
 * Parse user preferences from TOON format
 */
function parseUserPreferences(content: string): UserSystemPreferences | null {
  try {
    const lines = content.split('\n').filter(line => !line.trim().startsWith('#') && line.trim());

    const prefs: Partial<UserSystemPreferences> = {
      os: { type: 'linux', name: '', package_manager: '' },
      preferred_managers: {},
      locale: { timezone: '', language: '' },
    };

    let currentSection: 'root' | 'os' | 'preferred_managers' | 'locale' = 'root';

    for (const line of lines) {
      const trimmed = line.trim();

      // Section headers
      if (trimmed === 'os:') currentSection = 'os';
      else if (trimmed === 'preferred_managers:') currentSection = 'preferred_managers';
      else if (trimmed === 'locale:') currentSection = 'locale';
      // Root level
      else if (trimmed.startsWith('created_at:')) {
        prefs.created_at = trimmed.split(': ')[1];
      } else if (trimmed.startsWith('updated_at:')) {
        prefs.updated_at = trimmed.split(': ')[1];
      }
      // Section properties
      else if (currentSection === 'os' && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':').map(s => s.trim());
        if (key === 'type') prefs.os!.type = value as 'linux' | 'darwin' | 'windows';
        else if (key === 'name') prefs.os!.name = value;
        else if (key === 'package_manager') prefs.os!.package_manager = value;
      } else if (currentSection === 'preferred_managers' && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':').map(s => s.trim());
        if (key === 'python') prefs.preferred_managers!.python = value;
        else if (key === 'node') prefs.preferred_managers!.node = value;
      } else if (currentSection === 'locale' && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':').map(s => s.trim());
        if (key === 'timezone') prefs.locale!.timezone = value;
        else if (key === 'language') prefs.locale!.language = value;
      }
    }

    return prefs as UserSystemPreferences;
  } catch (error) {
    console.error('Failed to parse user preferences:', error);
    return null;
  }
}

/**
 * Generate TOON content for user preferences
 */
function generateUserPreferencesTOON(prefs: UserSystemPreferences): string {
  const lines: string[] = [];

  lines.push('# User System Preferences');
  lines.push('# Managed by claude-memory-init CLI');
  lines.push('');
  lines.push(`created_at: ${prefs.created_at}`);
  lines.push(`updated_at: ${prefs.updated_at}`);
  lines.push('');

  lines.push('os:');
  lines.push(`  type: ${prefs.os.type}`);
  lines.push(`  name: ${prefs.os.name}`);
  lines.push(`  package_manager: ${prefs.os.package_manager}`);
  lines.push('');

  lines.push('preferred_managers:');
  if (prefs.preferred_managers.python) {
    lines.push(`  python: ${prefs.preferred_managers.python}`);
  }
  if (prefs.preferred_managers.node) {
    lines.push(`  node: ${prefs.preferred_managers.node}`);
  }
  lines.push('');

  lines.push('locale:');
  lines.push(`  timezone: ${prefs.locale.timezone}`);
  lines.push(`  language: ${prefs.locale.language}`);

  return lines.join('\n');
}

// ============================================================================
// Project Memory Management
// ============================================================================

/**
 * Generate TOON content for project configuration
 */
function generateProjectConfigTOON(config: ProjectSystemConfig): string {
  const lines: string[] = [];

  lines.push('# Project System Configuration');
  lines.push('# Package managers for this project');
  lines.push('');
  lines.push(`configured_at: ${config.configured_at}`);
  lines.push('');

  lines.push('package_managers:');
  if (config.package_managers.python) {
    lines.push(`  python: ${config.package_managers.python}`);
  }
  if (config.package_managers.node) {
    lines.push(`  node: ${config.package_managers.node}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Detection Utilities
// ============================================================================

/**
 * Detect static system information
 */
async function detectStaticInfo(): Promise<{ timezone: string; language: string }> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = process.env.LANG || process.env.LANGUAGE || 'en_US.UTF-8';
  return { timezone, language };
}

/**
 * Get package manager descriptions
 */
function getPythonManagerDescription(pm: string): string {
  const descriptions: Record<string, string> = {
    'pip': 'Standard Python package installer',
    'uv': '⚡ Ultra-fast Python package installer (recommended)',
    'poetry': '📦 Dependency management and packaging',
    'pipenv': '🔧 Virtual environments and dependencies',
    'conda': '🐍 Package and environment management',
  };
  return descriptions[pm] || '';
}

function getNodeManagerDescription(pm: string): string {
  const descriptions: Record<string, string> = {
    'npm': '📦 Standard Node.js package manager',
    'pnpm': '⚡ Fast, disk space efficient (recommended)',
    'yarn': '🧶 Fast, reliable, secure dependency manager',
    'bun': '🔥 All-in-one JavaScript runtime and toolkit',
  };
  return descriptions[pm] || '';
}

// ============================================================================
// Plugin Definition
// ============================================================================

export const systemDetectorPlugin: Plugin = {
  meta: {
    name: 'system-detector',
    commandName: 'system',
    version: '2.1.0',
    description: 'Configure system environment with two-layer memory',
    recommended: true,
  },

  configuration: {
    needsConfiguration: true,

    async configure(context: ConfigurationContext): Promise<PluginConfig> {
      const { ui, logger, projectRoot } = context;

      logger.info('\n[System Configuration]');

      // 1. Load or create user preferences
      let userPrefs = await loadUserPreferences();
      let isFirstTime = !userPrefs;

      if (userPrefs) {
        // Show existing preferences
        logger.info('✓ Found user preferences (~/.claude/)');
        logger.info(`  OS: ${userPrefs.os.name} (${userPrefs.os.type})`);
        if (userPrefs.preferred_managers.python) {
          logger.info(`  Preferred Python manager: ${userPrefs.preferred_managers.python}`);
        }
        if (userPrefs.preferred_managers.node) {
          logger.info(`  Preferred Node manager: ${userPrefs.preferred_managers.node}`);
        }
      } else {
        logger.info('First time setup - detecting system...\n');

        // Detect OS
        const osInfo = await detectOS();
        logger.info(`✓ OS: ${osInfo.name} (${osInfo.type})`);
        logger.info(`  System package manager: ${osInfo.package_manager}`);

        // Detect locale
        const localeInfo = await detectStaticInfo();
        logger.info(`✓ Timezone: ${localeInfo.timezone}`);
        logger.info(`✓ Language: ${localeInfo.language}`);

        // Detect and select Python manager
        const pythonInfo = await detectPython();
        let preferredPythonManager: string | undefined;

        if (pythonInfo.version && pythonInfo.available_managers.length > 0) {
          logger.info(`\n✓ Python detected: ${pythonInfo.version}`);
          logger.info(`  Available managers: ${pythonInfo.available_managers.join(', ')}`);

          if (pythonInfo.available_managers.length === 1) {
            preferredPythonManager = pythonInfo.available_managers[0];
            logger.info(`  → Using: ${preferredPythonManager}`);
          } else {
            preferredPythonManager = await ui.radioList(
              'Select your preferred Python package manager:',
              pythonInfo.available_managers.map(pm => ({
                name: pm,
                value: pm,
                description: getPythonManagerDescription(pm),
              })),
              pythonInfo.available_managers[0]
            );
            logger.info(`  → Selected: ${preferredPythonManager}`);
          }
        }

        // Detect and select Node manager
        const nodeInfo = await detectNode(projectRoot);
        let preferredNodeManager: string | undefined;

        if (nodeInfo.version && nodeInfo.available_managers.length > 0) {
          logger.info(`\n✓ Node.js detected: ${nodeInfo.version}`);
          logger.info(`  Available managers: ${nodeInfo.available_managers.join(', ')}`);

          if (nodeInfo.available_managers.length === 1) {
            preferredNodeManager = nodeInfo.available_managers[0];
            logger.info(`  → Using: ${preferredNodeManager}`);
          } else {
            preferredNodeManager = await ui.radioList(
              'Select your preferred Node.js package manager:',
              nodeInfo.available_managers.map(pm => ({
                name: pm,
                value: pm,
                description: getNodeManagerDescription(pm),
              })),
              nodeInfo.available_managers[0]
            );
            logger.info(`  → Selected: ${preferredNodeManager}`);
          }
        }

        // Create user preferences
        const now = new Date().toISOString();
        userPrefs = {
          os: {
            type: osInfo.type as 'linux' | 'darwin' | 'windows',
            name: osInfo.name,
            package_manager: osInfo.package_manager,
          },
          preferred_managers: {
            python: preferredPythonManager,
            node: preferredNodeManager,
          },
          locale: localeInfo,
          created_at: now,
          updated_at: now,
        };
      }

      // 2. Configure project-specific settings
      logger.info('\n[Project Configuration]');

      // Default to user preferences
      let projectPythonManager = userPrefs.preferred_managers.python;
      let projectNodeManager = userPrefs.preferred_managers.node;

      // Ask if user wants to use different managers for this project
      if (projectPythonManager || projectNodeManager) {
        const usePreferred = await ui.confirm(
          `Use your preferred managers for this project?${projectPythonManager ? ` (Python: ${projectPythonManager})` : ''}${projectNodeManager ? ` (Node: ${projectNodeManager})` : ''}`,
          true
        );

        if (!usePreferred) {
          // Let user choose different managers for this project
          if (projectPythonManager) {
            const pythonInfo = await detectPython();
            if (pythonInfo.available_managers.length > 1) {
              projectPythonManager = await ui.radioList(
                'Select Python package manager for this project:',
                pythonInfo.available_managers.map(pm => ({
                  name: pm,
                  value: pm,
                  description: getPythonManagerDescription(pm),
                })),
                projectPythonManager
              );
            }
          }

          if (projectNodeManager) {
            const nodeInfo = await detectNode(projectRoot);
            if (nodeInfo.available_managers.length > 1) {
              projectNodeManager = await ui.radioList(
                'Select Node.js package manager for this project:',
                nodeInfo.available_managers.map(pm => ({
                  name: pm,
                  value: pm,
                  description: getNodeManagerDescription(pm),
                })),
                projectNodeManager
              );
            }
          }
        }
      }

      // Create project config
      const projectConfig: ProjectSystemConfig = {
        package_managers: {
          python: projectPythonManager,
          node: projectNodeManager,
        },
        configured_at: new Date().toISOString(),
      };

      logger.info(`  Python: ${projectPythonManager || '(not configured)'}`);
      logger.info(`  Node: ${projectNodeManager || '(not configured)'}`);

      // Build combined options
      const options: SystemDetectorOptions = {
        userPreferences: userPrefs,
        projectConfig,
      };

      return {
        enabled: true,
        options: {
          ...options,
          _isFirstTime: isFirstTime,
        } as unknown as Record<string, PluginOptionValue>,
      };
    },

    getSummary(config: PluginConfig): string[] {
      const options = config.options as unknown as SystemDetectorOptions & { _isFirstTime?: boolean };
      const lines: string[] = [];

      if (options.userPreferences) {
        lines.push(`OS: ${options.userPreferences.os.name}`);
      }

      if (options.projectConfig.package_managers.python) {
        lines.push(`Python: ${options.projectConfig.package_managers.python}`);
      }

      if (options.projectConfig.package_managers.node) {
        lines.push(`Node: ${options.projectConfig.package_managers.node}`);
      }

      return lines;
    },
  },

  hooks: {
    async execute(context: PluginContext): Promise<void> {
      const { logger } = context;
      const config = context.config.plugins.get('system-detector');

      if (!config) return;

      const options = config.options as unknown as SystemDetectorOptions & { _isFirstTime?: boolean };

      if (options._isFirstTime && options.userPreferences) {
        logger.info('User preferences saved to ~/.claude/system/preferences.toon');
      }
      logger.info('Project configuration saved to .agent/system/config.toon');
    },
  },

  prompt: {
    placeholder: 'SYSTEM_INFO_SECTION',

    generate: (config: PluginConfig): string => {
      if (!config.enabled) {
        return '';
      }

      const options = config.options as unknown as SystemDetectorOptions;
      const lines: string[] = [];

      lines.push('## System Environment');
      lines.push('');

      if (options.userPreferences) {
        lines.push(`**Operating System**: ${options.userPreferences.os.name} (${options.userPreferences.os.type})`);
        lines.push(`**System Package Manager**: ${options.userPreferences.os.package_manager}`);
        lines.push('');
      }

      lines.push('## Package Managers');
      lines.push('');
      lines.push('Use these package managers for this project:');
      lines.push('');

      if (options.projectConfig.package_managers.python) {
        lines.push(`- **Python**: \`${options.projectConfig.package_managers.python}\``);
      }

      if (options.projectConfig.package_managers.node) {
        lines.push(`- **Node.js**: \`${options.projectConfig.package_managers.node}\``);
      }

      lines.push('');
      lines.push('> Note: Runtime versions are detected dynamically. Use appropriate commands to check versions when needed.');

      return lines.join('\n');
    },
  },

  outputs: {
    generate: async (config: PluginConfig): Promise<FileOutput[]> => {
      if (!config.enabled) {
        return [];
      }

      const options = config.options as unknown as SystemDetectorOptions & { _isFirstTime?: boolean };
      const outputs: FileOutput[] = [];

      // 1. Save user preferences (only if first time or updated)
      if (options._isFirstTime && options.userPreferences) {
        const userPrefsContent = generateUserPreferencesTOON(options.userPreferences);
        outputs.push({
          path: `${USER_MEMORY_SUBDIRS.SYSTEM}/${USER_MEMORY_FILES.SYSTEM_PREFERENCES}`,
          content: userPrefsContent,
          format: 'toon',
          scope: 'user',
        });
      }

      // 2. Save project configuration (always)
      const projectConfigContent = generateProjectConfigTOON(options.projectConfig);
      outputs.push({
        path: PROJECT_MEMORY_FILES.SYSTEM_CONFIG,
        content: projectConfigContent,
        format: 'toon',
        scope: 'project',
      });

      return outputs;
    },
  },

  commands: [],
};

export default systemDetectorPlugin;
