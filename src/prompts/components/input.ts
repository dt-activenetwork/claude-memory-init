/**
 * Input Component
 *
 * A text input component using inquirer's input prompt type.
 * Supports default values and custom validation.
 */

import inquirer from 'inquirer';

/**
 * Validation function type for input
 * @returns true if valid, or an error message string if invalid
 */
export type InputValidator = (input: string) => boolean | string | Promise<boolean | string>;

/**
 * Displays a text input prompt to the user
 *
 * @param message - The prompt message to display
 * @param defaultValue - Optional default value
 * @param validate - Optional validation function
 * @returns Promise resolving to the user's input string
 *
 * @example
 * ```typescript
 * const name = await input('Project name:', 'my-project');
 * // name: 'my-project' (or user's input)
 * ```
 *
 * @example
 * ```typescript
 * const url = await input(
 *   'Git repository URL:',
 *   'git@github.com:user/repo.git',
 *   (input) => {
 *     if (!input) return 'URL is required';
 *     if (!input.startsWith('git@') && !input.startsWith('https://')) {
 *       return 'Invalid Git URL format';
 *     }
 *     return true;
 *   }
 * );
 * ```
 */
export const input = async (
  message: string,
  defaultValue?: string,
  validate?: InputValidator
): Promise<string> => {
  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue,
      validate: validate ?? (() => true)
    }
  ]);

  return value;
};
