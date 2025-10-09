const reactRefreshPlugin = require('eslint-plugin-react-refresh');

if (reactRefreshPlugin?.configs?.recommended) {
  const recommended = reactRefreshPlugin.configs.recommended;
  reactRefreshPlugin.configs.recommended = {
    plugins: ['react-refresh'],
    rules: recommended.rules ?? { 'react-refresh/only-export-components': 'error' },
  };
}

module.exports = {
  root: true,
  env: { browser: true, es2023: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-refresh', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-refresh/recommended',
    'prettier',
  ],
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist', 'node_modules'],
};
