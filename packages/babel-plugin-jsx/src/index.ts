import syntaxJsx from '@babel/plugin-syntax-jsx';
import tranformVueJSX from './transform-vue-jsx';
import sugarFragment from './sugar-fragment';
import { Babel } from './types';

export default ({ types: t }:Babel) => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    ...tranformVueJSX(t),
    ...sugarFragment(t),
  },
});
