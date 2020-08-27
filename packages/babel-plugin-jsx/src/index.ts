import syntaxJsx from '@babel/plugin-syntax-jsx';
import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import tranformVueJSX from './transform-vue-jsx';
import sugarFragment from './sugar-fragment';
import { JSX_HELPER_KEY } from './utils';

export type State = {
  get: (name: string) => any;
  set: (name: string, value: any) => any;
  opts: Opts;
}

interface Opts {
  transformOn?: boolean;
  optimize?: boolean;
  isCustomElement?: (tag: string) => boolean;
}

function filterOutDuplicateVueImports(path: NodePath<t.Program>, state: State) {
  const helpers: Set<string> = state.get(JSX_HELPER_KEY);
  if (!helpers) {
    return;
  }
  const importedHelperKeys = Array.from(helpers.values());
  const importDeclaration: t.ImportSpecifier[] = importedHelperKeys.map(
    (imported) => t.importSpecifier(
      t.identifier(imported), t.identifier(imported),
    ),
  );
  const expression = t.importDeclaration(importDeclaration, t.stringLiteral('vue'));
  path.unshiftContainer('body', expression);
}

export type ExcludesBoolean = <T>(x: T | false | true) => x is T;

export default () => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    Program: {
      exit: filterOutDuplicateVueImports,
    },
    ...tranformVueJSX(),
    ...sugarFragment(),
  },
});
