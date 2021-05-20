import * as t from '@babel/types';
import htmlTags from 'html-tags';
import svgTags from 'svg-tags';
import { NodePath } from '@babel/traverse';
import type { State } from './interface';
import SlotFlags from './slotFlags';

export const JSX_HELPER_KEY = 'JSX_HELPER_KEY';
export const FRAGMENT = 'Fragment';
export const KEEP_ALIVE = 'KeepAlive';

/**
 * create Identifier
 * @param path NodePath
 * @param state
 * @param name string
 * @returns MemberExpression
 */
export const createIdentifier = (
  state: State, name: string,
): t.Identifier | t.MemberExpression => state.get(name)();

/**
 * Checks if string is describing a directive
 * @param src string
 */
export const isDirective = (src: string): boolean => src.startsWith('v-')
  || (src.startsWith('v') && src.length >= 2 && src[1] >= 'A' && src[1] <= 'Z');

/**
 * Should transformed to slots
 * @param tag string
 * @returns boolean
 */
export const shouldTransformedToSlots = (tag: string) => !(tag.endsWith(FRAGMENT) || tag === KEEP_ALIVE);

/**
 * Check if a Node is a component
 *
 * @param t
 * @param path JSXOpeningElement
 * @returns boolean
 */
export const checkIsComponent = (path: NodePath<t.JSXOpeningElement>, state: State): boolean => {
  const namePath = path.get('name');

  if (namePath.isJSXMemberExpression()) {
    return shouldTransformedToSlots(namePath.node.property.name); // For withCtx
  }

  const tag = (namePath as NodePath<t.JSXIdentifier>).node.name;

  return !state.opts.isCustomElement?.(tag) && shouldTransformedToSlots(tag) && !htmlTags.includes(tag) && !svgTags.includes(tag);
};

/**
 * Transform JSXMemberExpression to MemberExpression
 * @param path JSXMemberExpression
 * @returns MemberExpression
 */
export const transformJSXMemberExpression = (
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
export const getTag = (
  path: NodePath<t.JSXElement>,
  state: State,
): t.Identifier | t.CallExpression | t.StringLiteral | t.MemberExpression => {
  const namePath = path.get('openingElement').get('name');
  if (namePath.isJSXIdentifier()) {
    const { name } = namePath.node;
    if (!htmlTags.includes(name) && !svgTags.includes(name)) {
      return (name === FRAGMENT
        ? createIdentifier(state, FRAGMENT)
        : path.scope.hasBinding(name)
          ? t.identifier(name)
          : state.opts.isCustomElement?.(name)
            ? t.stringLiteral(name)
            : t.callExpression(createIdentifier(state, 'resolveComponent'), [t.stringLiteral(name)]));
    }

    return t.stringLiteral(name);
  }

  if (namePath.isJSXMemberExpression()) {
    return transformJSXMemberExpression(namePath);
  }
  throw new Error(`getTag: ${namePath.type} is not supported`);
};

export const getJSXAttributeName = (path: NodePath<t.JSXAttribute>): string => {
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
export const transformJSXText = (path: NodePath<t.JSXText>): t.StringLiteral | null => {
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
export const transformJSXExpressionContainer = (
  path: NodePath<t.JSXExpressionContainer>,
): (
  t.Expression
  ) => path.get('expression').node as t.Expression;

/**
 * Transform JSXSpreadChild
 * @param path JSXSpreadChild
 * @returns SpreadElement
 */
export const transformJSXSpreadChild = (
  path: NodePath<t.JSXSpreadChild>,
): t.SpreadElement => t.spreadElement(path.get('expression').node);

export const walksScope = (path: NodePath, name: string, slotFlag: SlotFlags): void => {
  if (path.scope.hasBinding(name) && path.parentPath) {
    if (t.isJSXElement(path.parentPath.node)) {
      path.parentPath.setData('slotFlag', slotFlag);
    }
    walksScope(path.parentPath, name, slotFlag);
  }
};

export const buildIIFE = (path: NodePath<t.JSXElement>, children: t.Expression[]) => {
  const { parentPath } = path;
  if (t.isAssignmentExpression(parentPath)) {
    const { left } = parentPath.node as t.AssignmentExpression;
    if (t.isIdentifier(left)) {
      return children.map((child) => {
        if (t.isIdentifier(child) && child.name === left.name) {
          const insertName = path.scope.generateUidIdentifier(child.name);
          parentPath.insertBefore(
            t.variableDeclaration('const', [
              t.variableDeclarator(
                insertName,
                t.callExpression(
                  t.functionExpression(null, [], t.blockStatement([t.returnStatement(child)])),
                  [],
                ),
              ),
            ]),
          );
          return insertName;
        }
        return child;
      });
    }
  }
  return children;
};

const onRE = /^on[^a-z]/;

export const isOn = (key: string) => onRE.test(key);

const mergeAsArray = (existing: t.ObjectProperty, incoming: t.ObjectProperty) => {
  if (t.isArrayExpression(existing.value)) {
    existing.value.elements.push(incoming.value as t.Expression);
  } else {
    existing.value = t.arrayExpression([
      existing.value as t.Expression,
      incoming.value as t.Expression,
    ]);
  }
};

export const dedupeProperties = (properties: t.ObjectProperty[] = [], mergeProps?: boolean) => {
  if (!mergeProps) {
    return properties;
  }
  const knownProps = new Map<string, t.ObjectProperty>();
  const deduped: t.ObjectProperty[] = [];
  properties.forEach((prop) => {
    if (t.isStringLiteral(prop.key)) {
      const { value: name } = prop.key;
      const existing = knownProps.get(name);
      if (existing) {
        if (name === 'style' || name === 'class' || name.startsWith('on')) {
          mergeAsArray(existing, prop);
        }
      } else {
        knownProps.set(name, prop);
        deduped.push(prop);
      }
    } else {
      // v-model target with variable
      deduped.push(prop);
    }
  });

  return deduped;
};

/**
 *  Check if an attribute value is constant
 * @param node
 * @returns boolean
 */
export const isConstant = (
  node: t.Expression | t.Identifier | t.Literal | t.SpreadElement | null,
): boolean => {
  if (t.isIdentifier(node)) {
    return node.name === 'undefined';
  }
  if (t.isArrayExpression(node)) {
    const { elements } = node;
    return elements.every((element) => element && isConstant(element));
  }
  if (t.isObjectExpression(node)) {
    return node.properties.every((property) => isConstant((property as any).value));
  }
  if (t.isLiteral(node)) {
    return true;
  }
  return false;
};

export const transformJSXSpreadAttribute = (
  nodePath: NodePath,
  path: NodePath<t.JSXSpreadAttribute>,
  mergeProps: boolean,
  args: (t.ObjectProperty | t.Expression | t.SpreadElement)[],
) => {
  const argument = path.get('argument') as NodePath<t.ObjectExpression | t.Identifier>;
  const properties = t.isObjectExpression(argument.node) ? argument.node.properties : undefined;
  if (!properties) {
    if (argument.isIdentifier()) {
      walksScope(nodePath, (argument.node as t.Identifier).name, SlotFlags.DYNAMIC);
    }
    args.push(mergeProps ? argument.node : t.spreadElement(argument.node));
  } else if (mergeProps) {
    args.push(t.objectExpression(properties));
  } else {
    args.push(...(properties as t.ObjectProperty[]));
  }
};
