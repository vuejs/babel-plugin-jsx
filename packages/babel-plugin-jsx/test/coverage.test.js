import * as fs from 'fs';
import * as path from 'path';
import { transformSync } from '@babel/core';
import preset from '../babel.config';

test('coverage', () => {
  const mainTest = fs.readFileSync(path.resolve(__dirname, './index.test.js'));
  transformSync(mainTest, {
    babelrc: false,
    presets: [preset],
    filename: 'index.test.js',
  });
});
