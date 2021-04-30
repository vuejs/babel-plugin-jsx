module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2020,
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
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
    'airbnb-typescript/base',
  ],
  rules: {
    'no-nested-ternary': [0],
    'no-param-reassign': [0],
    'no-use-before-define': [0],
    'no-restricted-syntax': [0],
    'no-plusplus': [0],
    'import/no-extraneous-dependencies': [0],
    'consistent-return': [0],
    'no-bitwise': [0],
    '@typescript-eslint/no-use-before-define': [0],
    'prefer-destructuring': [2, { array: false }],
    'max-len': [0],
  },
};
