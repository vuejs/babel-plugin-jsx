import { codeFrameColumns } from '@babel/code-frame';
import type * as BabelCore from '@babel/core';
import { addNamed } from '@babel/helper-module-imports';
import { declare } from '@babel/helper-plugin-utils';
import { parseExpression } from '@babel/parser';
import {
  type SimpleTypeResolveContext,
  type SimpleTypeResolveOptions,
  extractRuntimeEmits,
  extractRuntimeProps,
} from '@vue/compiler-sfc';

export { SimpleTypeResolveOptions as Options };

export default declare<SimpleTypeResolveOptions>(({ types: t }, options) => {
  let ctx: SimpleTypeResolveContext | undefined;
  let helpers: Set<string> | undefined;
  // let ast
  return {
    name: 'babel-plugin-resolve-type',
    pre(file) {
      const filename = file.opts.filename || 'unknown.js';
      helpers = new Set();
      // ast = file;
      ctx = {
        filename: filename,
        source: file.code,
        options,
        ast: file.ast.program.body,
        isCE: false,
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

        let propsGenerics: BabelCore.types.TSType | undefined;
        let emitsGenerics: BabelCore.types.TSType | undefined;
        if (node.typeParameters && node.typeParameters.params.length > 0) {
          propsGenerics = node.typeParameters.params[0];
          emitsGenerics = node.typeParameters.params[1];
        }

        node.arguments[1] =
          processProps(comp, propsGenerics, options) || options;
        node.arguments[1] =
          processEmits(comp, emitsGenerics, node.arguments[1]) || options;
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
    generics: BabelCore.types.TSType | undefined,
    options:
      | BabelCore.types.ArgumentPlaceholder
      | BabelCore.types.SpreadElement
      | BabelCore.types.Expression
  ) {
    const props = comp.params[0];
    if (!props) return;

    if (props.type === 'AssignmentPattern') {
      if (generics) {
        ctx!.propsTypeDecl = resolveTypeReference(generics);
      } else {
        ctx!.propsTypeDecl = getTypeAnnotation(props.left);
      }
      ctx!.propsRuntimeDefaults = props.right;
    } else {
      if (generics) {
        ctx!.propsTypeDecl = resolveTypeReference(generics);
      } else {
        ctx!.propsTypeDecl = getTypeAnnotation(props);
      }
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
    generics: BabelCore.types.TSType | undefined,
    options:
      | BabelCore.types.ArgumentPlaceholder
      | BabelCore.types.SpreadElement
      | BabelCore.types.Expression
  ) {
    let emitType: BabelCore.types.Node | undefined;
    if (generics) {
      emitType = resolveTypeReference(generics);
    }

    const setupCtx = comp.params[1] && getTypeAnnotation(comp.params[1]);
    if (
      !emitType &&
      setupCtx &&
      t.isTSTypeReference(setupCtx) &&
      t.isIdentifier(setupCtx.typeName, { name: 'SetupContext' })
    ) {
      emitType = setupCtx.typeParameters?.params[0];
    }
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

  function resolveTypeReference(typeNode: BabelCore.types.TSType) {
    if (!ctx) return;

    // 如果是类型引用，尝试解析
    if (t.isTSTypeReference(typeNode)) {
      const typeName = getTypeReferenceName(typeNode);
      if (typeName) {
        const typeDeclaration = findTypeDeclaration(typeName);
        if (typeDeclaration) {
          return typeDeclaration;
        }
      }
    }

    return;
  }

  function getTypeReferenceName(typeRef: BabelCore.types.TSTypeReference) {
    if (t.isIdentifier(typeRef.typeName)) {
      return typeRef.typeName.name;
    } else if (t.isTSQualifiedName(typeRef.typeName)) {
      // 处理 A.B 这样的限定名称
      const parts: string[] = [];
      let current: BabelCore.types.TSEntityName = typeRef.typeName;

      while (t.isTSQualifiedName(current)) {
        if (t.isIdentifier(current.right)) {
          parts.unshift(current.right.name);
        }
        current = current.left;
      }

      if (t.isIdentifier(current)) {
        parts.unshift(current.name);
      }

      return parts.join('.');
    }
    return null;
  }

  function findTypeDeclaration(typeName: string) {
    if (!ctx) return null;
    // console.warn('11',ast)
    // 在 AST 中查找类型声明
    for (const statement of ctx.ast) {
      if (
        t.isTSInterfaceDeclaration(statement) &&
        statement.id.name === typeName
      ) {
        // 将接口转换为类型字面量
        return t.tsTypeLiteral(statement.body.body);
      }

      if (
        t.isTSTypeAliasDeclaration(statement) &&
        statement.id.name === typeName
      ) {
        return statement.typeAnnotation;
      }

      // 处理导出的类型声明
      if (t.isExportNamedDeclaration(statement) && statement.declaration) {
        if (
          t.isTSInterfaceDeclaration(statement.declaration) &&
          statement.declaration.id.name === typeName
        ) {
          return t.tsTypeLiteral(statement.declaration.body.body);
        }

        if (
          t.isTSTypeAliasDeclaration(statement.declaration) &&
          statement.declaration.id.name === typeName
        ) {
          return statement.declaration.typeAnnotation;
        }
      }
    }

    return null;
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
