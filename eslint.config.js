const config = require('@rubensworks/eslint-config');

module.exports = config([
  {
    ignores: [
      '**/*.d.ts',
      '**/*.js',
      '**/*.js.map',
      'lang/**',
    ],
  },
  {
    files: [ '**/*.ts' ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [ './tsconfig.eslint.json' ],
      },
    },
  },
  {
    // This is a Node.js CLI project - disable rules that don't apply
    rules: {
      'import/no-nodejs-modules': 'off',
      'ts/prefer-nullish-coalescing': 'off',
      'no-sync': 'off',
    },
  },
  {
    files: [ 'bin/*.ts' ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [ '**/*.md' ],
    rules: {
      'style/no-tabs': 'off',
      'style/no-mixed-spaces-and-tabs': 'off',
    },
  },
]);
