import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import { parse } from '@babel/parser';
import hash from 'hash-sum';

import { State } from '.';

export default function injectHmr(path: NodePath<t.Program>, state: State) {
  if (!state.get('HOT_MODULE_ID')) return;

  const id = state.get('HOT_MODULE_ID');
  const source = generate(path.node).code;

  // const nodes = path.node.body;

  /**
   * @type {{ name: string, hash: string }[]}
   */
  const declaredComponents: {
    local: string;
    exported: string;
    id: string;
    hash: string;
  }[] = [];

  path.get('body').forEach((p) => {
    const { node } = p;
    if (node.type === 'VariableDeclaration') {
      // ;(node as t.Declaration | t.ExportDeclaration).
      const names = parseComponentDecls(node, source);
      if (names.length) {
        declaredComponents.push(
          ...names.map(({ name, hash: _hash }) => ({
            local: name,
            exported: name,
            id: hash(id + name),
            hash: _hash,
          })),
        );
      }
    }

    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration && node.declaration.type === 'VariableDeclaration') {
        declaredComponents.push(
          ...parseComponentDecls(node.declaration, source).map(
            ({ name, hash: _hash }) => ({
              local: name,
              exported: name,
              id: hash(id + name),
              hash: _hash,
            }),
          ),
        );
      }
    }

    if (
      node.type === 'ExportDefaultDeclaration' &&
      isDefineComponentCall(node.declaration)
    ) {
      declaredComponents.push({
        local: '__default__',
        exported: 'default',
        id: hash(`${id} default`),
        hash: hash(
          source.slice(node.declaration.start!, node.declaration.end!),
        ),
      });

      p.replaceWith(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('__default__'),
            node.declaration as t.CallExpression,
          ),
        ]),
      );

      p.insertAfter(t.exportDefaultDeclaration(t.identifier('__default__')));
    }
  });

  let code = '';
  if (declaredComponents.length) {
    let callbackCode = '';
    // eslint-disable-next-line
    for (const { local, id, hash } of declaredComponents) {
      code +=
        `\n${local}.__hmrId = "${id}"` +
        `\n${local}.__hmrHash = "${hash}"` +
        `\n__VUE_HMR_RUNTIME__.createRecord("${id}", ${local})`;
      callbackCode +=
        `\n  if (${local}.__hmrHash !== $VueHMRHashMap$["${id}"]) {` +
        `\n__VUE_HMR_RUNTIME__.reload("${id}", ${local})` +
        `\n$VueHMRHashMap$["${id}"] = "${hash}"` +
        '}';
    }

    code += `\nif($isVueHMRAcceptable(module)){
      module.hot.accept()
      ${callbackCode}
    }`;
  }

  path.node.body.push(...parse(code, { sourceType: 'module' }).program.body);
}

/**
 * @param {import('@babel/core').types.VariableDeclaration} node
 * @param {string} source
 */
function parseComponentDecls(node: t.VariableDeclaration, source: string) {
  const names = [];
  // eslint-disable-next-line
  for (const decl of node.declarations as any) {
    if (decl.id.type === 'Identifier' && isDefineComponentCall(decl.init)) {
      names.push({
        name: decl.id.name,
        hash: hash(source.slice(decl.init.start, decl.init.end)),
      });
    }
  }
  return names;
}

/**
 * @param {import('@babel/core').types.Node} node
 */
function isDefineComponentCall(node: t.Node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'defineComponent'
  );
}
