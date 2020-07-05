import { spawnSync } from "child_process";

const [, , ...args] = process.argv;

const result = spawnSync("webpack-dev-server", ["--progress", "--config", "webpack.config.ts", ...args], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    TS_NODE_PROJECT: "tsconfig.compile.json",
  },
  stdio: ["pipe", process.stdout, process.stderr],
});

if (result.status !== 0) {
  throw new Error("webpack dev failed.");
}
