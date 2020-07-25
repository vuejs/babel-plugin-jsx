import * as fs from 'fs';
import * as path from 'path';
import { transformSync } from '@babel/core';
import preset from '../babel.config.js';

test('coverage', () => {
  ['index.test.tsx', 'v-model.test.tsx']
    .forEach((filename) => {
      const mainTest = fs.readFileSync(path.resolve(__dirname, `./${filename}`)).toString();
      transformSync(mainTest, {
        babelrc: false,
        presets: [preset],
        filename,
      });
    });
});
