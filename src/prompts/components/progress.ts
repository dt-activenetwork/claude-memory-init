/**
 * Progress Indicator Component
 *
 * A multi-step progress indicator using ora spinner.
 * Displays current step and total steps during a process.
 */

import ora, { type Ora } from 'ora';

/**
 * Progress indicator for multi-step processes
 *
 * Manages a spinner that displays the current step progress.
 * Automatically updates text to show "Step X/Total: description"
 *
 * @example
 * ```typescript
 * const progress = new ProgressIndicator([
 *   'Creating directory structure',
 *   'Installing plugins',
 *   'Generating configuration',
 *   'Creating CLAUDE.md'
 * ]);
 *
 * progress.start();
 * // Shows: [1/4] Creating directory structure
 *
 * await doStep1();
 * progress.nextStep();
 * // Shows: [2/4] Installing plugins
 *
 * await doStep2();
 * progress.nextStep();
 *
 * // ... more steps
 *
 * progress.succeed('Initialization complete!');
 * ```
 */
export class ProgressIndicator {
  private spinner: Ora;
  private steps: string[];
  private currentStep: number = 0;

  /**
   * Creates a new progress indicator
   *
   * @param steps - Array of step descriptions
   */
  constructor(steps: string[]) {
    this.steps = steps;
    this.spinner = ora();
  }

  /**
   * Starts the progress indicator at the first step
   */
  start(): void {
    this.currentStep = 0;
    this.updateSpinner();
    this.spinner.start();
  }

  /**
   * Moves to the next step
   *
   * If already on the last step, this has no effect.
   */
  nextStep(): void {
    this.currentStep++;
    if (this.currentStep < this.steps.length) {
      this.updateSpinner();
    }
  }

  /**
   * Stops the spinner with a success symbol (green ✔)
   *
   * @param message - Optional custom success message
   */
  succeed(message?: string): void {
    this.spinner.succeed(message ?? 'Complete');
  }

  /**
   * Stops the spinner with a failure symbol (red ✖)
   *
   * @param message - Optional custom failure message
   */
  fail(message?: string): void {
    this.spinner.fail(message ?? 'Failed');
  }

  /**
   * Stops the spinner with a warning symbol (yellow ⚠)
   *
   * @param message - Optional custom warning message
   */
  warn(message?: string): void {
    this.spinner.warn(message ?? 'Warning');
  }

  /**
   * Stops the spinner with an info symbol (blue ℹ)
   *
   * @param message - Optional custom info message
   */
  info(message?: string): void {
    this.spinner.info(message ?? 'Info');
  }

  /**
   * Updates the spinner text to show current step progress
   *
   * Format: "[X/Total] Step description"
   *
   * @internal
   */
  private updateSpinner(): void {
    const stepNum = this.currentStep + 1;
    const total = this.steps.length;
    const description = this.steps[this.currentStep];

    this.spinner.text = `[${stepNum}/${total}] ${description}`;
  }
}
