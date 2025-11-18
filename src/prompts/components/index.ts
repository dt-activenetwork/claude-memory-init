/**
 * UI Components Library
 *
 * Unified export of all interactive UI components for command-line interfaces.
 * These components wrap inquirer.js and ora to provide a consistent, type-safe API.
 */

// Import all components first
import { checkboxList } from './checkbox-list.js';
import { radioList } from './radio-list.js';
import { confirm } from './confirm.js';
import { input } from './input.js';

// Export all components
export { checkboxList, type CheckboxOption } from './checkbox-list.js';
export { radioList, type RadioOption } from './radio-list.js';
export { confirm } from './confirm.js';
export { input, type InputValidator } from './input.js';
export { ProgressIndicator } from './progress.js';

/**
 * Unified UI components interface
 *
 * This interface groups all UI component functions for easy passing to plugin contexts.
 *
 * @example
 * ```typescript
 * import * as ui from './prompts/components';
 *
 * const context: PluginContext = {
 *   ui: {
 *     checkboxList: ui.checkboxList,
 *     radioList: ui.radioList,
 *     confirm: ui.confirm,
 *     input: ui.input
 *   },
 *   // ... other context properties
 * };
 * ```
 */
export interface UIComponents {
  /** Multi-select checkbox list */
  checkboxList: typeof checkboxList;
  /** Single-select radio list */
  radioList: typeof radioList;
  /** Yes/no confirmation */
  confirm: typeof confirm;
  /** Text input */
  input: typeof input;
}
