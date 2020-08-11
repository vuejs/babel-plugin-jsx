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
  const helpers: Map<string, t.Identifier> = state.get(JSX_HELPER_KEY);
  if (!helpers) {
    return;
  }
  const importedHelperKeys = Array.from(helpers.keys());
  const importedFromVueExpression = path.get('body').filter((innerPath: NodePath<any>) => {
    if (innerPath.isImportDeclaration()) {
      const importSpecifiers = innerPath.get('specifiers') as NodePath<t.ImportSpecifier>[];
      if (importSpecifiers.length > 1) {
        return false;
      }
      const firstSpecifier = importSpecifiers[0];
      if (firstSpecifier.isImportSpecifier()) {
        const imported = firstSpecifier.get('imported').get('name') as NodePath<string>;
        const local = firstSpecifier.get('local').get('name') as NodePath<string>;
        return helpers.get(imported.node)?.name === local.node;
      }
    }
    return false;
  });
  importedFromVueExpression.forEach((exp) => exp.remove());
  const importDeclaration: (t.ImportSpecifier
    | t.ImportDefaultSpecifier
    | t.ImportNamespaceSpecifier)[] = [];
  importedHelperKeys.forEach((imported: string) => {
    const local = helpers.get(imported);
    if (!local) {
      throw Error(`Cannot find specific imports for ${imported}`);
    }
    importDeclaration.push(t.importSpecifier(local, t.identifier(imported)));
  });
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
