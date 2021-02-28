import * as t from '@babel/types';
import * as BabelCore from '@babel/core';
import template from '@babel/template';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import { addNamed, isModule, addNamespace } from '@babel/helper-module-imports';
import { NodePath } from '@babel/traverse';
import transformVueJSX from './transform-vue-jsx';
import sugarFragment from './sugar-fragment';

export type State = {
  get: (name: string) => any;
  set: (name: string, value: any) => any;
  opts: VueJSXPluginOptions;
  file: BabelCore.BabelFile
}

export interface VueJSXPluginOptions {
  /** transform `on: { click: xx }` to `onClick: xxx` */
  transformOn?: boolean;
  /** enable optimization or not. */
  optimize?: boolean;
  /** merge static and dynamic class / style attributes / onXXX handlers */
  mergeProps?: boolean;
  /** configuring custom elements */
  isCustomElement?: (tag: string) => boolean;
  /** enable object slots syntax */
  enableObjectSlots?: boolean;
  /** Replace the function used when compiling JSX expressions */
  pragma?: string;
}

export type ExcludesBoolean = <T>(x: T | false | true) => x is T;

const hasJSX = (parentPath: NodePath<t.Program>) => {
  let fileHasJSX = false;
  parentPath.traverse({
    JSXElement(path) { // skip ts error
      fileHasJSX = true;
      path.stop();
    },
    JSXFragment(path) {
      fileHasJSX = true;
      path.stop();
    },
  });

  return fileHasJSX;
};

const JSX_ANNOTATION_REGEX = /\*?\s*@jsx\s+([^\s]+)/;

export default ({ types }: typeof BabelCore) => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    ...transformVueJSX,
    ...sugarFragment,
    Program: {
      enter(path: NodePath<t.Program>, state: State) {
        if (hasJSX(path)) {
          const importNames = [
            'createVNode',
            'Fragment',
            'resolveComponent',
            'withDirectives',
            'vShow',
            'vModelSelect',
            'vModelText',
            'vModelCheckbox',
            'vModelRadio',
            'vModelText',
            'vModelDynamic',
            'resolveDirective',
            'mergeProps',
            'createTextVNode',
            'isVNode',
          ];
          if (isModule(path)) {
            // import { createVNode } from "vue";
            const importMap: Record<string, t.Identifier> = {};
            importNames.forEach((name) => {
              state.set(name, () => {
                if (importMap[name]) {
                  return types.cloneNode(importMap[name]);
                }
                const identifier = addNamed(
                  path,
                  name,
                  'vue',
                  {
                    ensureLiveReference: true,
                  },
                );
                importMap[name] = identifier;
                return identifier;
              });
            });
            const { enableObjectSlots = true } = state.opts;
            if (enableObjectSlots) {
              state.set('@vue/babel-plugin-jsx/runtimeIsSlot', () => {
                if (importMap.runtimeIsSlot) {
                  return importMap.runtimeIsSlot;
                }
                const { name: isVNodeName } = state.get('isVNode')();
                const isSlot = path.scope.generateUidIdentifier('isSlot');
                const ast = template.ast`
                  function ${isSlot.name}(s) {
                    return typeof s === 'function' || (Object.prototype.toString.call(s) === '[object Object]' && !${isVNodeName}(s));
                  }
                `;
                const lastImport = (path.get('body') as NodePath[]).filter((p) => p.isImportDeclaration()).pop();
                if (lastImport) {
                  lastImport.insertAfter(ast);
                }
                importMap.runtimeIsSlot = isSlot;
                return isSlot;
              });
            }
          } else {
            // var _vue = require('vue');
            let sourceName = '';
            importNames.forEach((name) => {
              state.set(name, () => {
                if (!sourceName) {
                  sourceName = addNamespace(
                    path,
                    'vue',
                    {
                      ensureLiveReference: true,
                    },
                  ).name;
                }
                return t.memberExpression(t.identifier(sourceName), t.identifier(name));
              });
            });
          }

          const { opts: { pragma = '' }, file } = state;

          if (pragma) {
            state.set('createVNode', () => t.identifier(pragma));
          }

          if (file.ast.comments) {
            for (const comment of file.ast.comments) {
              const jsxMatches = JSX_ANNOTATION_REGEX.exec(comment.value);
              if (jsxMatches) {
                state.set('createVNode', () => t.identifier(jsxMatches[1]));
              }
            }
          }
        }
      },
      exit(path: NodePath<t.Program>) {
        const body = path.get('body') as NodePath[];
        const specifiersMap = new Map<string, t.ImportSpecifier>();

        body.filter((nodePath) => t.isImportDeclaration(nodePath.node)
          && nodePath.node.source.value === 'vue')
          .forEach((nodePath) => {
            const { specifiers } = nodePath.node as t.ImportDeclaration;
            let shouldRemove = false;
            specifiers.forEach((specifier) => {
              if (!specifier.loc && t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                specifiersMap.set(specifier.imported.name, specifier);
                shouldRemove = true;
              }
            });
            if (shouldRemove) {
              nodePath.remove();
            }
          });

        const specifiers = [...specifiersMap.keys()].map(
          (imported) => specifiersMap.get(imported)!,
        );
        if (specifiers.length) {
          path.unshiftContainer('body', t.importDeclaration(specifiers, t.stringLiteral('vue')));
        }
      },
    },
  },
});
