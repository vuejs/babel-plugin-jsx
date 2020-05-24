const { h, mergeProps, withDirectives } = require('vue');

module.exports = {
  globals: {
    '_h': h,
    '_mergeProps': mergeProps,
    '_withDirectives': withDirectives
  },
  setupFiles: ['./test/setup.js'],
}
