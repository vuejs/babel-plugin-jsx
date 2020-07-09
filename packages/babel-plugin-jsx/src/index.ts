import syntaxJsx from '@babel/plugin-syntax-jsx';
import tranformVueJSX from './transform-vue-jsx';
import sugarFragment from './sugar-fragment';

export type State = {
  get: (name: string) => any;
  set: (name: string, value: any) => any;
  opts: Opts;
}

interface Opts {
  transformOn?: boolean;
  compatibleProps?: boolean;
}

export type ExcludesFalse = <T>(x: T | false) => x is T;

export default () => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    ...tranformVueJSX(),
    ...sugarFragment(),
  },
});
