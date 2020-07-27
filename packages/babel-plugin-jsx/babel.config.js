module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-typescript',
  ],
  plugins: [
    /* eslint-disable-next-line global-require */
    [require('./dist/index.js'), { optimize: true, isCustomElement: (tag) => /^x-/.test(tag) }],
  ],
};
