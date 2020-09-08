/* istanbul ignore next */
module.exports = {
  presets: [
    '@babel/preset-env',
  ],
  plugins: [
    /* eslint-disable-next-line global-require */
    [require('./dist/index.js'), { optimize: true, isCustomElement: (tag) => /^x-/.test(tag) }],
  ],
};
