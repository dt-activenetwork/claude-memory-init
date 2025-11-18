/**
 * Radio List Component
 *
 * A single-select list component using inquirer's list prompt type.
 * Allows users to select one option from a list with arrow navigation.
 */

import inquirer from 'inquirer';

/**
 * Configuration for a single radio option
 */
export interface RadioOption {
  /** Display name of the option */
  name: string;
  /** Value returned when selected */
  value: string;
  /** Optional description displayed on the right side */
  description?: string;
}

/**
 * Displays a single-select radio list to the user
 *
 * @param message - The prompt message to display
 * @param options - Array of radio options
 * @param defaultValue - Optional default value to pre-select
 * @returns Promise resolving to the selected value
 *
 * @example
 * ```typescript
 * const choice = await radioList('Select template source:', [
 *   { name: 'Default Template', value: 'default', description: '(recommended)' },
 *   { name: 'Custom Git Repository', value: 'git' },
 *   { name: 'Local Directory', value: 'local' }
 * ], 'default');
 * // choice: 'default'
 * ```
 */
export const radioList = async (
  message: string,
  options: RadioOption[],
  defaultValue?: string
): Promise<string> => {
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message,
      choices: options.map(opt => ({
        name: formatOptionName(opt.name, opt.description),
        value: opt.value
      })),
      default: defaultValue,
      pageSize: 10,
      loop: false
    }
  ]);

  return selected;
};

/**
 * Formats an option name with optional description
 *
 * @param name - The option name
 * @param description - Optional description
 * @returns Formatted string with name and description
 *
 * @internal
 */
const formatOptionName = (name: string, description?: string): string => {
  if (!description) {
    return name;
  }

  // Pad name to 20 characters for alignment
  const paddedName = name.padEnd(20);
  return `${paddedName} ${description}`;
};
