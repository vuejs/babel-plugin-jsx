import * as t from '@babel/types';
import htmlTags from 'html-tags';
import svgTags from 'svg-tags';
import { NodePath } from '@babel/traverse';
import { State } from '.';

/**
 * create Identifier
 * @param state
 * @param id string
 * @returns MemberExpression
 */
const createIdentifier = (
  state: State, id: string,
): t.MemberExpression => t.memberExpression(state.get('vue'), t.identifier(id));

/**
 * Checks if string is describing a directive
 * @param src string
 */
const isDirective = (src: string): boolean => src.startsWith('v-')
  || (src.startsWith('v') && src.length >= 2 && src[1] >= 'A' && src[1] <= 'Z');

/**
 * Check if a Node is fragment
 * @param {*} path JSXIdentifier | JSXMemberExpression | JSXNamespacedName
 * @returns boolean
 */
const isFragment = (
  path:
    NodePath<t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName>,
): boolean => t.isJSXMemberExpression(path)
    && (path.node as t.JSXMemberExpression).property.name === 'Fragment';

/**
 * Check if a Node is a component
 *
 * @param t
 * @param path JSXOpeningElement
 * @returns boolean
 */
const checkIsComponent = (path: NodePath<t.JSXOpeningElement>): boolean => {
  const namePath = path.get('name');

  if (t.isJSXMemberExpression(namePath)) {
    return !isFragment(namePath); // For withCtx
  }

  const tag = (namePath as NodePath<t.JSXIdentifier>).node.name;

  return !htmlTags.includes(tag) && !svgTags.includes(tag);
};

/**
 * Transform JSXMemberExpression to MemberExpression
 * @param path JSXMemberExpression
 * @returns MemberExpression
 */
const transformJSXMemberExpression = (
  path: NodePath<t.JSXMemberExpression>,
): t.MemberExpression => {
  const objectPath = path.node.object;
  const propertyPath = path.node.property;
  const transformedObject = t.isJSXMemberExpression(objectPath)
    ? transformJSXMemberExpression(path.get('object') as NodePath<t.JSXMemberExpression>)
    : t.isJSXIdentifier(objectPath)
      ? t.identifier(objectPath.name)
      : t.nullLiteral();
  const transformedProperty = t.identifier(propertyPath.name);
  return t.memberExpression(transformedObject, transformedProperty);
};

/**
 * Get tag (first attribute for h) from JSXOpeningElement
 * @param path JSXElement
 * @param state State
 * @returns Identifier | StringLiteral | MemberExpression | CallExpression
 */
const getTag = (
  path: NodePath<t.JSXElement>,
  state: State,
): t.Identifier | t.CallExpression | t.StringLiteral | t.MemberExpression => {
  const namePath = path.get('openingElement').get('name');
  if (namePath.isJSXIdentifier()) {
    const { name } = namePath.node;
    if (!htmlTags.includes(name) && !svgTags.includes(name)) {
      return path.scope.hasBinding(name)
        ? t.identifier(name)
        : t.callExpression(createIdentifier(state, 'resolveComponent'), [t.stringLiteral(name)]);
    }

    return t.stringLiteral(name);
  }

  if (namePath.isJSXMemberExpression()) {
    return transformJSXMemberExpression(namePath);
  }
  throw new Error(`getTag: ${namePath.type} is not supported`);
};

const getJSXAttributeName = (path: NodePath<t.JSXAttribute>): string => {
  const nameNode = path.node.name;
  if (t.isJSXIdentifier(nameNode)) {
    return nameNode.name;
  }

  return `${nameNode.namespace.name}:${nameNode.name.name}`;
};

/**
 * Transform JSXText to StringLiteral
 * @param path JSXText
 * @returns StringLiteral | null
 */
const transformJSXText = (path: NodePath<t.JSXText>): t.StringLiteral | null => {
  const { node } = path;
  const lines = node.value.split(/\r\n|\n|\r/);

  let lastNonEmptyLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/[^ \t]/)) {
      lastNonEmptyLine = i;
    }
  }

  let str = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const isFirstLine = i === 0;
    const isLastLine = i === lines.length - 1;
    const isLastNonEmptyLine = i === lastNonEmptyLine;

    // replace rendered whitespace tabs with spaces
    let trimmedLine = line.replace(/\t/g, ' ');

    // trim whitespace touching a newline
    if (!isFirstLine) {
      trimmedLine = trimmedLine.replace(/^[ ]+/, '');
    }

    // trim whitespace touching an endline
    if (!isLastLine) {
      trimmedLine = trimmedLine.replace(/[ ]+$/, '');
    }

    if (trimmedLine) {
      if (!isLastNonEmptyLine) {
        trimmedLine += ' ';
      }

      str += trimmedLine;
    }
  }

  return str !== '' ? t.stringLiteral(str) : null;
};

/**
 * Transform JSXExpressionContainer to Expression
 * @param path JSXExpressionContainer
 * @returns Expression
 */
const transformJSXExpressionContainer = (
  path: NodePath<t.JSXExpressionContainer>,
): (t.Expression
) => path.get('expression').node as t.Expression;

/**
 * Transform JSXSpreadChild
 * @param path JSXSpreadChild
 * @returns SpreadElement
 */
const transformJSXSpreadChild = (
  path: NodePath<t.JSXSpreadChild>,
): t.SpreadElement => t.spreadElement(path.get('expression').node);

const walksScope = (path: NodePath, name: string): void => {
  if (path.scope.hasBinding(name) && path.parentPath) {
    if (t.isJSXElement(path.parentPath.node)) {
      path.parentPath.setData('optimize', false);
    }
    walksScope(path.parentPath, name);
  }
};

export {
  createIdentifier,
  isDirective,
  checkIsComponent,
  transformJSXMemberExpression,
  getTag,
  getJSXAttributeName,
  transformJSXText,
  transformJSXSpreadChild,
  transformJSXExpressionContainer,
  isFragment,
  walksScope,
};
