module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2020,
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    node: true,
    jest: true,
    es6: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint-config-airbnb-base',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    'no-nested-ternary': [0],
    'no-param-reassign': [0],
    'no-use-before-define': [0],
    'no-plusplus': [0],
    'import/no-extraneous-dependencies': [0],
    'consistent-return': [0],
    'no-bitwise': [0],
    'prefer-destructuring': [2, { 'array': false }],
    'import/extensions': [2, 'ignorePackages', { ts: 'never' }],
    '@typescript-eslint/ban-ts-comment': [0],
    '@typescript-eslint/explicit-module-boundary-types': [0],
    '@typescript-eslint/no-explicit-any': [0]
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  }
};
