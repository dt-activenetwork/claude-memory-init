#!/usr/bin/env node

/**
 * Main entry point for Claude Memory System Initializer CLI
 */
import { setupCLI } from './cli.js';
import * as logger from './utils/logger.js';

// Global error handlers
process.on('unhandledRejection', (reason) => {
  logger.error('\nUnhandled rejection:');
  logger.error(reason instanceof Error ? reason.message : String(reason));
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('\nUncaught exception:');
  logger.error(error.message);
  process.exit(1);
});

// Run CLI
const program = setupCLI();
program.parse(process.argv);
