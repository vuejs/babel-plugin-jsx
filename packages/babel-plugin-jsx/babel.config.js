module.exports = {
  presets: [
    [
      '@babel/env',
      {
        // "modules": "cjs"
      },
    ],
  ],
  plugins: [
    /* eslint-disable-next-line global-require */
    [require('./src/index.js'), { transformOn: true }],
  ],
};
