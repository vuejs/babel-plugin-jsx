const { h, mergeProps } = require('vue');
module.exports = {
  globals: {
    "_h": h,
    "_mergeProps": mergeProps
  },
  setupFiles: ['./tests/setup.js'],
}
