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
  mergeProps?: boolean;
  isCustomElement?: (tag: string) => boolean;
}

export type ExcludesBoolean = <T>(x: T | false | true) => x is T;

export default () => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    Program: {
      exit(path: NodePath<t.Program>, state: State) {
        const helpers: Set<string> = state.get(JSX_HELPER_KEY);
        if (!helpers) {
          return;
        }

        const body = path.get('body');
        const specifierNames = new Set<string>();
        body
          .filter((nodePath) => t.isImportDeclaration(nodePath.node)
            && nodePath.node.source.value === 'vue')
          .forEach((nodePath) => {
            let shouldKeep = false;
            const newSpecifiers = (nodePath.node as t.ImportDeclaration).specifiers
              .filter((specifier) => {
                if (t.isImportSpecifier(specifier)) {
                  const { imported, local } = specifier;
                  if (local.name === imported.name) {
                    specifierNames.add(imported.name);
                    return false;
                  }
                  return true;
                }
                if (t.isImportNamespaceSpecifier(specifier)) {
                  // should keep when `import * as Vue from 'vue'`
                  shouldKeep = true;
                }
                return false;
              });

            if (newSpecifiers.length) {
              nodePath.replaceWith(t.importDeclaration(newSpecifiers, t.stringLiteral('vue')));
            } else if (!shouldKeep) {
              nodePath.remove();
            }
          });

        const importedHelperKeys = new Set([...specifierNames, ...helpers]);
        const specifiers: t.ImportSpecifier[] = [...importedHelperKeys].map(
          (imported) => t.importSpecifier(
            t.identifier(imported), t.identifier(imported),
          ),
        );
        const expression = t.importDeclaration(specifiers, t.stringLiteral('vue'));
        path.unshiftContainer('body', expression);
      },
    },
    ...tranformVueJSX(),
    ...sugarFragment(),
  },
});
