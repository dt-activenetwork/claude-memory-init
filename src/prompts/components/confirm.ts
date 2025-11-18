/**
 * Confirm Component
 *
 * A yes/no confirmation prompt using inquirer's confirm prompt type.
 * Returns a boolean value based on user selection.
 */

import inquirer from 'inquirer';

/**
 * Displays a confirmation prompt to the user
 *
 * @param message - The question to ask
 * @param defaultValue - Default value if user presses Enter (default: true)
 * @returns Promise resolving to true (yes) or false (no)
 *
 * @example
 * ```typescript
 * const proceed = await confirm('Proceed with initialization?', true);
 * if (proceed) {
 *   console.log('User confirmed');
 * }
 * ```
 *
 * @example
 * ```typescript
 * const enableAutoCommit = await confirm('Enable auto-commit?', false);
 * // enableAutoCommit: true or false
 * ```
 */
export const confirm = async (
  message: string,
  defaultValue: boolean = true
): Promise<boolean> => {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }
  ]);

  return confirmed;
};
