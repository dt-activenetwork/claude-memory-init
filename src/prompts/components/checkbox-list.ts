/**
 * Checkbox List Component
 *
 * A multi-select list component using inquirer's checkbox prompt type.
 * Allows users to select multiple options from a list with visual formatting.
 */

import inquirer from 'inquirer';

/**
 * Configuration for a single checkbox option
 */
export interface CheckboxOption {
  /** Display name of the option */
  name: string;
  /** Value returned when selected */
  value: string;
  /** Optional description displayed on the right side */
  description?: string;
  /** Whether the option is checked by default */
  checked?: boolean;
  /** Whether the option is disabled (cannot be selected) */
  disabled?: boolean;
}

/**
 * Displays a multi-select checkbox list to the user
 *
 * @param message - The prompt message to display
 * @param options - Array of checkbox options
 * @returns Promise resolving to an array of selected values
 *
 * @example
 * ```typescript
 * const selected = await checkboxList('Select features:', [
 *   { name: 'Memory System', value: 'memory', checked: true },
 *   { name: 'Git Integration', value: 'git', description: 'Auto-commit' }
 * ]);
 * // selected: ['memory']
 * ```
 */
export const checkboxList = async (
  message: string,
  options: CheckboxOption[]
): Promise<string[]> => {
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message,
      choices: options.map(opt => ({
        name: formatOptionName(opt.name, opt.description),
        value: opt.value,
        checked: opt.checked ?? false,
        disabled: opt.disabled ?? false
      })),
      pageSize: 15,
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
