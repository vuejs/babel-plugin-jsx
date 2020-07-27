const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: false,
  context: path.join(__dirname, '../packages/jsx-explorer'),
  entry: './src/index.ts',
  output: {
    publicPath: './',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          compilerOptions: { downlevelIteration: true },
        },
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'fonts/[name].[hash:7].[ext]',
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader', 'css-loader',
        ],
      },
    ],
  },
  plugins: [
    new MonacoWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html',
      filename: 'index.html',
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  node: {
    fs: 'empty',
  },
};
