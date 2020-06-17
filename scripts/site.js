const webpack = require('webpack');
const webpackConfig = require('./webpack.base.conf');

webpack(Object.assign(webpackConfig, { mode: 'production', devtool: false }), (err, stats) => {
  if (err) throw err;
  process.stdout.write(`${stats.toString({
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
  })}\n\n`);
});
