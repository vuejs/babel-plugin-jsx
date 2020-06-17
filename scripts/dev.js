const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('./webpack.base.conf');

const compiler = webpack(webpackConfig);

const devServerOptions = {
  inline: true,
  open: true,
  hot: true,
  overlay: true,
};

const server = new WebpackDevServer(compiler, devServerOptions);

server.listen(8080, '127.0.0.1');
