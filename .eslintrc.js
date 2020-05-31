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
  extends: 'eslint-config-airbnb-base',
  rules: {
    'no-nested-ternary': [0],
    'no-param-reassign': [0],
    'no-use-before-define': [0],
    'no-plusplus': [0],
    'import/no-extraneous-dependencies': [0],
    'consistent-return': [0],
    'no-bitwise': [0]
  },
};
