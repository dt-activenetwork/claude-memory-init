/**
 * Logger utility for colored console output
 */
import chalk from 'chalk';

/**
 * Output info message (blue)
 */
export function info(message: string): void {
  console.log(chalk.blue(message));
}

/**
 * Output success message (green)
 */
export function success(message: string): void {
  console.log(chalk.green(message));
}

/**
 * Output error message (red)
 */
export function error(message: string): void {
  console.error(chalk.red(message));
}

/**
 * Output warning message (yellow)
 */
export function warning(message: string): void {
  console.log(chalk.yellow(message));
}

/**
 * Output step message
 */
export function step(stepNumber: number, message: string): void {
  console.log(chalk.cyan(`[${stepNumber}] `) + message);
}

/**
 * Output a blank line
 */
export function blank(): void {
  console.log();
}
