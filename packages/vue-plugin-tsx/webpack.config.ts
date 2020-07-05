const path = require("path");
import transformer from "./src/index";

module.exports = {
  mode: "development",
  devtool: "cheap-module-eval-source-map",
  entry: "./example/index.tsx",
  output: {
    path: path.resolve(__dirname, "./dist"),
    publicPath: "/dist/",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              getCustomTransformers: () => ({
                before: [transformer()],
              }),
              transpileOnly: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  devServer: {
    inline: true,
    open: true,
    hot: true,
    overlay: true,
  },
};
