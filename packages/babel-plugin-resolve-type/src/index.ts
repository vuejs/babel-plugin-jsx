import type * as BabelCore from '@babel/core';
import { parseExpression } from '@babel/parser';
// @ts-expect-error no dts
import typescript from '@babel/plugin-syntax-typescript';
import {
  type SFCScriptCompileOptions,
  type SimpleTypeResolveContext,
  extractRuntimeEmits,
  extractRuntimeProps,
} from '@vue/compiler-sfc';
import { codeFrameColumns } from '@babel/code-frame';
import { addNamed } from '@babel/helper-module-imports';

export interface Options {
  compileOptions?: SFCScriptCompileOptions;
}

function getTypeAnnotation(node: BabelCore.types.Node) {
  if (
    'typeAnnotation' in node &&
    node.typeAnnotation &&
    node.typeAnnotation.type === 'TSTypeAnnotation'
  ) {
    return node.typeAnnotation.typeAnnotation;
  }
}

export default ({
  types: t,
}: typeof BabelCore): BabelCore.PluginObj<Options> => {
  let ctx: SimpleTypeResolveContext | undefined;
  let helpers: Set<string> | undefined;

  function processProps(
    comp: BabelCore.types.Function,
    options: BabelCore.types.ObjectExpression
  ) {
    const props = comp.params[0];
    if (!props) return;

    if (props.type === 'AssignmentPattern' && 'typeAnnotation' in props.left) {
      ctx!.propsTypeDecl = getTypeAnnotation(props.left);
      ctx!.propsRuntimeDefaults = props.right;
    } else {
      ctx!.propsTypeDecl = getTypeAnnotation(props);
    }

    if (!ctx!.propsTypeDecl) return;

    const runtimeProps = extractRuntimeProps(ctx!);
    if (!runtimeProps) {
      return;
    }

    const ast = parseExpression(runtimeProps);
    options.properties.push(t.objectProperty(t.identifier('props'), ast));
  }

  function processEmits(
    comp: BabelCore.types.Function,
    options: BabelCore.types.ObjectExpression
  ) {
    const setupCtx = comp.params[1] && getTypeAnnotation(comp.params[1]);
    if (
      !setupCtx ||
      !t.isTSTypeReference(setupCtx) ||
      !t.isIdentifier(setupCtx.typeName, { name: 'SetupContext' })
    )
      return;

    const emitType = setupCtx.typeParameters?.params[0];
    if (!emitType) return;

    ctx!.emitsTypeDecl = emitType;
    const runtimeEmits = extractRuntimeEmits(ctx!);

    const ast = t.arrayExpression(
      Array.from(runtimeEmits).map((e) => t.stringLiteral(e))
    );
    options.properties.push(t.objectProperty(t.identifier('emits'), ast));
  }

  return {
    name: 'babel-plugin-resolve-type',
    inherits: typescript,
    pre(file) {
      const filename = file.opts.filename || 'unknown.js';
      helpers = new Set();
      ctx = {
        filename: filename,
        source: file.code,
        options: this.compileOptions || {},
        ast: file.ast.program.body as any,
        error(msg, node) {
          throw new Error(
            `[@vue/babel-plugin-resolve-type] ${msg}\n\n${filename}\n${codeFrameColumns(
              file.code,
              {
                start: {
                  line: node.loc!.start.line,
                  column: node.loc!.start.column + 1,
                },
                end: {
                  line: node.loc!.end.line,
                  column: node.loc!.end.column + 1,
                },
              }
            )}`
          );
        },
        helper(key) {
          helpers!.add(key);
          return `_${key}`;
        },
        getString(node) {
          return file.code.slice(node.start!, node.end!);
        },
        bindingMetadata: Object.create(null),
        propsTypeDecl: undefined,
        propsRuntimeDefaults: undefined,
        propsDestructuredBindings: {},
        emitsTypeDecl: undefined,
      };
    },
    visitor: {
      CallExpression(path) {
        if (!ctx) {
          throw new Error(
            '[@vue/babel-plugin-resolve-type] context is not loaded.'
          );
        }

        const node = path.node;
        if (!t.isIdentifier(node.callee, { name: 'defineComponent' })) return;

        const comp = node.arguments[0];
        if (!comp || !t.isFunction(comp)) return;

        let options = node.arguments[1];
        if (!options) {
          options = t.objectExpression([]);
          node.arguments.push(options);
        }

        if (!t.isObjectExpression(options)) {
          throw new Error(
            '[@vue/babel-plugin-resolve-type] Options inside of defineComponent should be an object expression.'
          );
        }

        processProps(comp, options);
        processEmits(comp, options);
      },
    },
    post(file) {
      for (const helper of helpers!) {
        addNamed(file.path, `_${helper}`, 'vue');
      }
    },
  };
};
