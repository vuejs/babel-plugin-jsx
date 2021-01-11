import * as t from '@babel/types';
import * as BabelCore from '@babel/core';
import template from '@babel/template';
import syntaxJsx from '@babel/plugin-syntax-jsx';

import { addNamed, isModule, addNamespace } from '@babel/helper-module-imports';
import { NodePath } from '@babel/traverse';
import tranformVueJSX from './transform-vue-jsx';
import sugarFragment from './sugar-fragment';
import injectHmr from './inject-hmr';

export type State = {
  get: (name: string) => any;
  set: (name: string, value: any) => any;
  opts: VueJSXPluginOptions;
};

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
}

export type ExcludesBoolean = <T>(x: T | false | true) => x is T;

const HMR_INJECT_NAME = '$HotMoudleId$';

const hasJSX = (parentPath: NodePath) => {
  let fileHasJSX = false;
  parentPath.traverse({
    JSXElement(path) {
      // skip ts error
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

export default ({ types }: typeof BabelCore) => ({
  name: 'babel-plugin-jsx',
  inherits: syntaxJsx,
  visitor: {
    ...tranformVueJSX,
    ...sugarFragment,
    VariableDeclaration(path: NodePath<t.VariableDeclaration>, state: State) {
      if (
        t.isVariableDeclarator(path.node.declarations[0]) &&
        t.isIdentifier(
          (path.node.declarations[0] as t.VariableDeclarator).id,
        ) &&
        ((path.node.declarations[0] as t.VariableDeclarator).id as t.Identifier)
          .name === HMR_INJECT_NAME
      ) {
        state.set(
          'HOT_MODULE_ID',
          ((path.node.declarations[0] as t.VariableDeclarator)
            .init as t.StringLiteral).value,
        );
      }
    },
    Program: {
      enter(path: NodePath, state: State) {
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
                const identifier = addNamed(path, name, 'vue', {
                  ensureLiveReference: true,
                });
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
                const lastImport = (path.get('body') as NodePath[])
                  .filter((p) => p.isImportDeclaration())
                  .pop();
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
                  sourceName = addNamespace(path, 'vue', {
                    ensureLiveReference: true,
                  }).name;
                }
                return t.memberExpression(
                  t.identifier(sourceName),
                  t.identifier(name),
                );
              });
            });
          }
        }
      },
      exit(path: NodePath<t.Program>, state: State) {
        injectHmr(path, state);
      },
    },
  },
});
