import { addNamed, addNamespace, isModule } from '@babel/helper-module-imports'
import { declare } from '@babel/helper-plugin-utils'
import syntaxJsx from '@babel/plugin-syntax-jsx'
import template from '@babel/template'
import * as t from '@babel/types'
import ResolveType from '@vue/babel-plugin-resolve-type'
import sugarFragment from './sugar-fragment'
import transformVueJSX from './transform-vue-jsx'
import type { State, VueJSXPluginOptions } from './interface'
import type {
  NodePath,
  PluginAPI,
  PluginObject,
  PluginPass,
  Visitor,
} from '@babel/core'

export type { VueJSXPluginOptions }

const hasJSX = (parentPath: NodePath<t.Program>) => {
  return t.traverseFast(parentPath.node, (node) => {
    if (t.isJSXElement(node) || t.isJSXFragment(node)) {
      return t.traverseFast.stop
    }
  })
}

const JSX_ANNOTATION_REGEX = /\*?\s*@jsx\s+(\S+)/

const plugin: (
  api: PluginAPI,
  options: VueJSXPluginOptions,
  dirname: string,
) => PluginObject<State & PluginPass> = declare<State, VueJSXPluginOptions>(
  (api, opt, dirname) => {
    const { types } = api
    let resolveType: PluginObject<PluginPass> | undefined
    if (opt.resolveType) {
      if (typeof opt.resolveType === 'boolean') opt.resolveType = {}
      resolveType = ResolveType(api, opt.resolveType, dirname)
    }
    return {
      ...resolveType,
      name: 'babel-plugin-jsx',
      inherits: syntaxJsx,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      visitor: {
        ...resolveType?.visitor,
        ...transformVueJSX,
        ...sugarFragment,
        Program: {
          enter(path, state) {
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
              ]
              if (isModule(path)) {
                // import { createVNode } from "vue";
                const importMap: Record<
                  string,
                  t.MemberExpression | t.Identifier
                > = {}
                importNames.forEach((name) => {
                  state.set(name, () => {
                    if (importMap[name]) {
                      return types.cloneNode(importMap[name])
                    }
                    const identifier = addNamed(path, name, 'vue', {
                      ensureLiveReference: true,
                    })
                    importMap[name] = identifier
                    return identifier
                  })
                })
                const { enableObjectSlots = true } = state.opts
                if (enableObjectSlots) {
                  state.set('@vue/babel-plugin-jsx/runtimeIsSlot', () => {
                    if (importMap.runtimeIsSlot) {
                      return importMap.runtimeIsSlot
                    }
                    const { name: isVNodeName } = state.get(
                      'isVNode',
                    )() as t.Identifier
                    const isSlot = path.scope.generateUidIdentifier('isSlot')
                    const ast = template.ast`
                    function ${isSlot.name}(s) {
                      return typeof s === 'function' || (Object.prototype.toString.call(s) === '[object Object]' && !${isVNodeName}(s));
                    }
                  `
                    const lastImport = (
                      path.get('body') as NodePath[]
                    ).findLast((p) => p.isImportDeclaration())
                    if (lastImport) {
                      lastImport.insertAfter(ast)
                    }
                    importMap.runtimeIsSlot = isSlot
                    return isSlot
                  })
                }
              } else {
                // var _vue = require('vue');
                let sourceName: t.Identifier
                importNames.forEach((name) => {
                  state.set(name, () => {
                    if (!sourceName) {
                      sourceName = addNamespace(path, 'vue', {
                        ensureLiveReference: true,
                      }) as t.Identifier
                    }
                    return t.memberExpression(sourceName, t.identifier(name))
                  })
                })

                const helpers: Record<string, t.Identifier> = {}

                const { enableObjectSlots = true } = state.opts
                if (enableObjectSlots) {
                  state.set('@vue/babel-plugin-jsx/runtimeIsSlot', () => {
                    if (helpers.runtimeIsSlot) {
                      return helpers.runtimeIsSlot
                    }
                    const isSlot = path.scope.generateUidIdentifier('isSlot')
                    const { object: objectName } = state.get(
                      'isVNode',
                    )() as t.MemberExpression
                    const ast = template.ast`
                    function ${isSlot.name}(s) {
                      return typeof s === 'function' || (Object.prototype.toString.call(s) === '[object Object]' && !${
                        (objectName as t.Identifier).name
                      }.isVNode(s));
                    }
                  `

                    const nodePaths = path.get('body') as NodePath[]
                    const lastImport = nodePaths.findLast(
                      (p) =>
                        p.isVariableDeclaration() &&
                        p.node.declarations.some(
                          (d) =>
                            (d.id as t.Identifier)?.name === sourceName.name,
                        ),
                    )
                    if (lastImport) {
                      lastImport.insertAfter(ast)
                    }
                    return isSlot
                  })
                }
              }

              const {
                opts: { pragma = '' },
                file,
              } = state

              if (pragma) {
                state.set('createVNode', () => t.identifier(pragma))
              }

              if (file.ast.comments) {
                for (const comment of file.ast.comments) {
                  const jsxMatches = JSX_ANNOTATION_REGEX.exec(comment.value)
                  if (jsxMatches) {
                    state.set('createVNode', () => t.identifier(jsxMatches[1]))
                  }
                }
              }
            }
          },
        },
      } as Visitor<State>,
    }
  },
)

export default plugin
export { plugin as 'module.exports' }
