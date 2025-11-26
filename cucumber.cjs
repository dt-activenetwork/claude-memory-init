module.exports = {
  default: {
    import: ['tests/bdd/step-definitions/**/*.ts', 'tests/bdd/support/**/*.ts'],
    paths: ['tests/bdd/features/**/*.feature'],
    format: ['progress-bar', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
};
