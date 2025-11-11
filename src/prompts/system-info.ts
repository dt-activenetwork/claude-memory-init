/**
 * Interactive prompts for system information detection
 */
import inquirer from 'inquirer';
import ora from 'ora';
import type { SystemConfig } from '../types/config.js';
import {
  detectSystemInfo,
  getDefaultPackageManager,
  needsPackageManagerSelection,
  generateInstallCommand,
  detectDevelopmentTools,
  needsNodePackageManagerSelection,
  generatePythonVenvCommand,
  generatePythonInstallCommand,
  generateNodeInstallCommand,
  generateNodeRunCommand
} from '../utils/system-detector.js';
import * as logger from '../utils/logger.js';

/**
 * Detect system information and prompt user for selections when needed
 */
export async function promptSystemInfo(): Promise<SystemConfig> {
  const spinner = ora('Detecting system information...').start();

  try {
    // Detect system info
    const systemInfo = await detectSystemInfo();

    spinner.succeed('System information detected');
    logger.blank();

    // Display detected information
    logger.info('🖥️  System Information:');
    logger.info(`  OS: ${systemInfo.os_name} (${systemInfo.os_type})`);
    if (systemInfo.is_msys2) {
      logger.info(`  Environment: MSYS2`);
    }
    logger.info(`  Version: ${systemInfo.os_version}`);
    logger.info(`  User: ${systemInfo.is_root ? 'root/administrator' : 'regular user'}`);
    if (!systemInfo.is_root && systemInfo.has_sudo) {
      logger.info(`  Sudo: available`);
    } else if (!systemInfo.is_root && !systemInfo.has_sudo) {
      logger.info(`  Sudo: not available`);
    }
    logger.blank();

    // Package manager selection
    let selectedPackageManager: string;

    if (systemInfo.package_managers.length === 0) {
      logger.warning('⚠️  No package manager detected');
      logger.info('You may need to specify package installation commands manually.');
      logger.blank();

      const { customPM } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customPM',
          message: 'Enter package manager command (or leave empty):',
          default: ''
        }
      ]);

      selectedPackageManager = customPM || 'unknown';
    } else if (systemInfo.package_managers.length === 1) {
      selectedPackageManager = systemInfo.package_managers[0];
      logger.info(`📦 Package manager: ${selectedPackageManager}`);
      logger.blank();
    } else {
      // Multiple package managers detected
      logger.info('📦 Multiple package managers detected:');
      systemInfo.package_managers.forEach(pm => logger.info(`  - ${pm}`));
      logger.blank();

      // Check if user selection is needed
      if (needsPackageManagerSelection(systemInfo.package_managers)) {
        const defaultPM = getDefaultPackageManager(systemInfo.package_managers, systemInfo.os_type);

        const { packageManager } = await inquirer.prompt([
          {
            type: 'list',
            name: 'packageManager',
            message: 'Select package manager to use:',
            choices: systemInfo.package_managers,
            default: defaultPM
          }
        ]);

        selectedPackageManager = packageManager;
      } else {
        // Auto-select based on priority
        const defaultPM = getDefaultPackageManager(systemInfo.package_managers, systemInfo.os_type);
        selectedPackageManager = defaultPM || systemInfo.package_managers[0];
        logger.info(`Selected package manager: ${selectedPackageManager}`);
        logger.blank();
      }
    }

    // Confirm sudo usage for non-root users
    let installPrefix = systemInfo.install_prefix;
    let hasSudo = systemInfo.has_sudo;

    if (!systemInfo.is_root && systemInfo.has_sudo && selectedPackageManager !== 'unknown') {
      // Check if this package manager typically needs sudo
      const needsSudo = !['paru', 'yay', 'brew', 'scoop', 'choco', 'winget', 'nix-env'].includes(selectedPackageManager);

      if (needsSudo) {
        const { useSudo } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'useSudo',
            message: `Use 'sudo' for package installation with ${selectedPackageManager}?`,
            default: true
          }
        ]);

        if (useSudo) {
          installPrefix = 'sudo';
          hasSudo = true;
        } else {
          installPrefix = '';
          hasSudo = false;
        }
      } else {
        // These package managers don't typically use sudo
        installPrefix = '';
      }
    }

    // Display example install command
    if (selectedPackageManager !== 'unknown') {
      const exampleCommand = generateInstallCommand(selectedPackageManager, installPrefix);
      logger.info('💡 Example install command:');
      logger.info(`  ${exampleCommand}`);
      logger.blank();
    }

    // Detect development tools
    spinner.start('Detecting development tools...');
    const devTools = await detectDevelopmentTools();
    spinner.succeed('Development tools detected');
    logger.blank();

    // Display Python information
    if (devTools.python) {
      logger.info('🐍 Python Environment:');
      logger.info(`  Version: ${devTools.python.version}`);
      logger.info(`  Package Manager: ${devTools.python.package_manager}`);
      if (devTools.python.has_uv) {
        logger.info(`  ✓ uv available (recommended)`);
      }
      if (devTools.python.has_venv) {
        logger.info(`  ✓ venv available`);
      }
      logger.blank();
    }

    // Display and select Node.js package manager
    let nodePackageManager = '';
    if (devTools.node) {
      logger.info('📦 Node.js Environment:');
      logger.info(`  Version: ${devTools.node.version}`);

      if (devTools.node.package_managers.length === 0) {
        logger.warning('  ⚠️  No package manager detected');
      } else if (devTools.node.package_managers.length === 1) {
        nodePackageManager = devTools.node.package_managers[0];
        logger.info(`  Package Manager: ${nodePackageManager}`);
      } else {
        // Multiple package managers, ask user
        logger.info('  Available package managers:');
        devTools.node.package_managers.forEach(pm => logger.info(`    - ${pm}`));
        logger.blank();

        const { selectedNodePM } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedNodePM',
            message: 'Select Node.js package manager:',
            choices: devTools.node.package_managers,
            default: devTools.node.selected_package_manager
          }
        ]);

        nodePackageManager = selectedNodePM;
        devTools.node.selected_package_manager = nodePackageManager;
      }

      if (nodePackageManager) {
        logger.info(`  ✓ Using: ${nodePackageManager}`);
      }
      logger.blank();
    }

    return {
      os_type: systemInfo.os_type,
      os_name: systemInfo.os_name,
      os_version: systemInfo.os_version,
      is_msys2: systemInfo.is_msys2,
      package_manager: selectedPackageManager,
      is_root: systemInfo.is_root,
      has_sudo: hasSudo,
      install_prefix: installPrefix,
      dev_tools: devTools
    };
  } catch (error) {
    spinner.fail('Failed to detect system information');
    throw error;
  }
}

/**
 * Get system info for quick mode (non-interactive)
 */
export async function getSystemInfoQuick(): Promise<SystemConfig> {
  const systemInfo = await detectSystemInfo();
  const defaultPM = getDefaultPackageManager(systemInfo.package_managers, systemInfo.os_type);

  // Detect development tools
  const devTools = await detectDevelopmentTools();

  return {
    os_type: systemInfo.os_type,
    os_name: systemInfo.os_name,
    os_version: systemInfo.os_version,
    is_msys2: systemInfo.is_msys2,
    package_manager: defaultPM || 'unknown',
    is_root: systemInfo.is_root,
    has_sudo: systemInfo.has_sudo,
    install_prefix: systemInfo.install_prefix,
    dev_tools: devTools
  };
}
