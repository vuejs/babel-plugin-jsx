module.exports = {
  presets: [
    [
      '@babel/env',
      {
        // modules: 'cjs',
      },
    ],
  ],
  plugins: [
    /* eslint-disable-next-line global-require */
    [require('./dist/index.js'), { transformOn: true }],
  ],
};
