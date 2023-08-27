import type * as BabelCore from '@babel/core';
import { parseExpression } from '@babel/parser';
import {
  type SimpleTypeResolveContext,
  type SimpleTypeResolveOptions,
  extractRuntimeEmits,
  extractRuntimeProps,
} from '@vue/compiler-sfc';
import { codeFrameColumns } from '@babel/code-frame';
import { addNamed } from '@babel/helper-module-imports';
import { declare } from '@babel/helper-plugin-utils';

export { SimpleTypeResolveOptions as Options };

export default declare<SimpleTypeResolveOptions>(({ types: t }, options) => {
  let ctx: SimpleTypeResolveContext | undefined;
  let helpers: Set<string> | undefined;

  return {
    name: 'babel-plugin-resolve-type',
    pre(file) {
      const filename = file.opts.filename || 'unknown.js';
      helpers = new Set();
      ctx = {
        filename: filename,
        source: file.code,
        options,
        ast: file.ast.program.body,
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

        const { node } = path;

        if (!t.isIdentifier(node.callee, { name: 'defineComponent' })) return;
        if (!checkDefineComponent(path)) return;

        const comp = node.arguments[0];
        if (!comp || !t.isFunction(comp)) return;

        let options = node.arguments[1];
        if (!options) {
          options = t.objectExpression([]);
          node.arguments.push(options);
        }

        node.arguments[1] = processProps(comp, options) || options;
        node.arguments[1] = processEmits(comp, node.arguments[1]) || options;
      },
      VariableDeclarator(path) {
        inferComponentName(path);
      },
    },
    post(file) {
      for (const helper of helpers!) {
        addNamed(file.path, `_${helper}`, 'vue');
      }
    },
  };

  function inferComponentName(
    path: BabelCore.NodePath<BabelCore.types.VariableDeclarator>
  ) {
    const id = path.get('id');
    const init = path.get('init');
    if (!id || !id.isIdentifier() || !init || !init.isCallExpression()) return;

    if (!init.get('callee')?.isIdentifier({ name: 'defineComponent' })) return;
    if (!checkDefineComponent(init)) return;

    const nameProperty = t.objectProperty(
      t.identifier('name'),
      t.stringLiteral(id.node.name)
    );
    const { arguments: args } = init.node;
    if (args.length === 0) return;

    if (args.length === 1) {
      init.node.arguments.push(t.objectExpression([]));
    }
    args[1] = addProperty(t, args[1], nameProperty);
  }

  function processProps(
    comp: BabelCore.types.Function,
    options:
      | BabelCore.types.ArgumentPlaceholder
      | BabelCore.types.JSXNamespacedName
      | BabelCore.types.SpreadElement
      | BabelCore.types.Expression
  ) {
    const props = comp.params[0];
    if (!props) return;

    if (props.type === 'AssignmentPattern') {
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
    return addProperty(
      t,
      options,
      t.objectProperty(t.identifier('props'), ast)
    );
  }

  function processEmits(
    comp: BabelCore.types.Function,
    options:
      | BabelCore.types.ArgumentPlaceholder
      | BabelCore.types.JSXNamespacedName
      | BabelCore.types.SpreadElement
      | BabelCore.types.Expression
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
    return addProperty(
      t,
      options,
      t.objectProperty(t.identifier('emits'), ast)
    );
  }
});

function getTypeAnnotation(node: BabelCore.types.Node) {
  if (
    'typeAnnotation' in node &&
    node.typeAnnotation &&
    node.typeAnnotation.type === 'TSTypeAnnotation'
  ) {
    return node.typeAnnotation.typeAnnotation;
  }
}

function checkDefineComponent(
  path: BabelCore.NodePath<BabelCore.types.CallExpression>
) {
  const defineCompImport =
    path.scope.getBinding('defineComponent')?.path.parent;
  if (!defineCompImport) return true;

  return (
    defineCompImport.type === 'ImportDeclaration' &&
    /^@?vue(\/|$)/.test(defineCompImport.source.value)
  );
}

function addProperty<T extends BabelCore.types.Node>(
  t: (typeof BabelCore)['types'],
  object: T,
  property: BabelCore.types.ObjectProperty
) {
  if (t.isObjectExpression(object)) {
    object.properties.unshift(property);
  } else if (t.isExpression(object)) {
    return t.objectExpression([property, t.spreadElement(object)]);
  }
  return object;
}
