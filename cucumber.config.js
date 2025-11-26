/**
 * Cucumber Configuration
 *
 * Configuration for BDD tests using @cucumber/cucumber
 */

export default {
  default: {
    // Path to feature files
    paths: ['tests/bdd/features/**/*.feature'],

    // Path to step definition files
    import: ['tests/bdd/step-definitions/**/*.ts', 'tests/bdd/support/**/*.ts'],

    // Require modules (for TypeScript support)
    requireModule: ['tsx'],

    // Format options
    format: [
      'progress-bar',
      'html:cucumber-report.html',
      'json:cucumber-report.json',
    ],

    // Parallel execution
    parallel: 2,

    // Fail fast (stop on first failure)
    failFast: false,

    // Retry failed scenarios
    retry: 0,

    // Default language for feature files
    // Individual features can override with: # language: zh-CN
    language: 'en',
  },

  // Profile for testing plugin system only
  plugins: {
    paths: ['tests/bdd/features/plugin-*.feature'],
    import: ['tests/bdd/step-definitions/**/*.ts', 'tests/bdd/support/**/*.ts'],
    requireModule: ['tsx'],
    format: ['progress-bar'],
    parallel: 1,
    failFast: false,
    retry: 0,
  },
};
