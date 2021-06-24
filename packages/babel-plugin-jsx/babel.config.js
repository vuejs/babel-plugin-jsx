/* istanbul ignore next */
module.exports = {
  presets: [
    '@babel/preset-env',
  ],
  plugins: [
    /* eslint-disable-next-line global-require */
    [
      !process.env.MODE
        ? require('./dist/index.js')
        : require('./dist/vue-jsx.min.js'),
      {
        optimize: true,
        isCustomElement: (tag) => /^x-/.test(tag)
      },
    ],
  ],
};
