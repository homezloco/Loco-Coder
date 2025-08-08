/*
  ESLint configuration enforcing centralized logging.
  - Disallows all raw console.* usage across the app
  - Whitelists console usage only in:
    * src/utils/logger.js (the centralized logger implementation)
    * src/utils/code-execution.js (temporary console capture for user code)
  - Devs should use src/utils/logger.js (logger.ns('<namespace>')).
*/

module.exports = {
  root: true,
  ignorePatterns: [
    // Ignore legacy/backup files; consider deleting or refactoring later
    'src/**/*.original.js',
    'src/**/*.backup.js',
    'src/**/*.new',
  ],
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    // Disallow ALL raw console usage. Use src/utils/logger.js instead.
    'no-console': ['error'],

    // Helpful React defaults
    'react/prop-types': 'off',
  },
  overrides: [
    {
      files: [
        'src/utils/logger.js',
        'src/utils/code-execution.js',
      ],
      rules: {
        // Allow console in the logger implementation and code execution capture only
        'no-console': 'off',
      },
    },
    {
      files: ['**/*.test.*', '**/*.spec.*'],
      env: { jest: true },
      rules: {
        // Tests may use console output for debugging
        'no-console': 'off',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
};
