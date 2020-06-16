import htmlTags from 'html-tags';
import svgTags from 'svg-tags';

const PatchFlags = {
  TEXT: 1,
  CLASS: 1 << 1,
  STYLE: 1 << 2,
  PROPS: 1 << 3,
  FULL_PROPS: 1 << 4,
  HYDRATE_EVENTS: 1 << 5,
  STABLE_FRAGMENT: 1 << 6,
  KEYED_FRAGMENT: 1 << 7,
  UNKEYED_FRAGMENT: 1 << 8,
  NEED_PATCH: 1 << 9,
  DYNAMIC_SLOTS: 1 << 10,
  HOISTED: -1,
  BAIL: -2,
};

// dev only flag -> name mapping
const PatchFlagNames = {
  [PatchFlags.TEXT]: 'TEXT',
  [PatchFlags.CLASS]: 'CLASS',
  [PatchFlags.STYLE]: 'STYLE',
  [PatchFlags.PROPS]: 'PROPS',
  [PatchFlags.FULL_PROPS]: 'FULL_PROPS',
  [PatchFlags.HYDRATE_EVENTS]: 'HYDRATE_EVENTS',
  [PatchFlags.STABLE_FRAGMENT]: 'STABLE_FRAGMENT',
  [PatchFlags.KEYED_FRAGMENT]: 'KEYED_FRAGMENT',
  [PatchFlags.UNKEYED_FRAGMENT]: 'UNKEYED_FRAGMENT',
  [PatchFlags.NEED_PATCH]: 'NEED_PATCH',
  [PatchFlags.DYNAMIC_SLOTS]: 'DYNAMIC_SLOTS',
  [PatchFlags.HOISTED]: 'HOISTED',
  [PatchFlags.BAIL]: 'BAIL',
};

const createIdentifier = (t, state, id) => t.memberExpression(state.get('vue'), t.identifier(id));

/**
 * Checks if string is describing a directive
 * @param src string
 */
const isDirective = (src) => src.startsWith('v-')
  || (src.startsWith('v') && src.length >= 2 && src[1] >= 'A' && src[1] <= 'Z');

/**
 * Check if a JSXOpeningElement is fragment
 * @param {*} t
 * @param {*} path
 * @returns boolean
 */
const isFragment = (t, path) => t.isJSXMemberExpression(path)
    && path.node.property.name === 'Fragment';

/**
 * Check if a JSXOpeningElement is a component
 *
 * @param t
 * @param path JSXOpeningElement
 * @returns boolean
 */
const checkIsComponent = (t, path) => {
  const namePath = path.get('name');

  if (t.isJSXMemberExpression(namePath)) {
    return !isFragment(t, namePath); // For withCtx
  }

  const tag = namePath.get('name').node;

  return !htmlTags.includes(tag) && !svgTags.includes(tag);
};

/**
 * Transform JSXMemberExpression to MemberExpression
 * @param t
 * @param path JSXMemberExpression
 * @returns MemberExpression
 */
const transformJSXMemberExpression = (t, path) => {
  const objectPath = path.get('object');
  const propertyPath = path.get('property');

  const transformedObject = objectPath.isJSXMemberExpression()
    ? transformJSXMemberExpression(t, objectPath)
    : objectPath.isJSXIdentifier()
      ? t.identifier(objectPath.node.name)
      : t.nullLiteral();
  const transformedProperty = t.identifier(propertyPath.get('name').node);
  return t.memberExpression(transformedObject, transformedProperty);
};

/**
 * Get tag (first attribute for h) from JSXOpeningElement
 * @param t
 * @param path JSXOpeningElement
 * @returns Identifier | StringLiteral | MemberExpression
 */
const getTag = (t, path) => {
  const namePath = path.get('openingElement').get('name');
  if (namePath.isJSXIdentifier()) {
    const { name } = namePath.node;
    if (path.scope.hasBinding(name) && !htmlTags.includes(name) && !svgTags.includes(name)) {
      return t.identifier(name);
    }

    return t.stringLiteral(name);
  }

  if (namePath.isJSXMemberExpression()) {
    return transformJSXMemberExpression(t, namePath);
  }
  throw new Error(`getTag: ${namePath.type} is not supported`);
};

const getJSXAttributeName = (t, path) => {
  const nameNode = path.node.name;
  if (t.isJSXIdentifier(nameNode)) {
    return nameNode.name;
  }

  return `${nameNode.namespace.name}:${nameNode.name.name}`;
};

/**
 * Transform JSXText to StringLiteral
 * @param t
 * @param path JSXText
 * @returns StringLiteral
 */
const transformJSXText = (t, path) => {
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
const transformJSXExpressionContainer = (path) => path.get('expression').node;

/**
 * Transform JSXSpreadChild
 * @param t
 * @param path JSXSpreadChild
 * @returns SpreadElement
 */
const transformJSXSpreadChild = (t, path) => t.spreadElement(path.get('expression').node);

/**
 * Get JSX element type
 *
 * @param t
 * @param path Path<JSXOpeningElement>
 */
const getType = (t, path) => {
  const typePath = path
    .get('attributes')
    .find(
      (attributePath) => t.isJSXAttribute(attributePath)
        && t.isJSXIdentifier(attributePath.get('name'))
        && attributePath.get('name.name').node === 'type'
        && t.isStringLiteral(attributePath.get('value')),
    );

  return typePath ? typePath.get('value.value').node : '';
};

const resolveDirective = (t, path, state, tag, directiveName) => {
  if (directiveName === 'show') {
    return createIdentifier(t, state, 'vShow');
  } if (directiveName === 'model') {
    let modelToUse;
    const type = getType(t, path.parentPath);
    switch (tag.value) {
      case 'select':
        modelToUse = createIdentifier(t, state, 'vModelSelect');
        break;
      case 'textarea':
        modelToUse = createIdentifier(t, state, 'vModelText');
        break;
      default:
        switch (type) {
          case 'checkbox':
            modelToUse = createIdentifier(t, state, 'vModelCheckbox');
            break;
          case 'radio':
            modelToUse = createIdentifier(t, state, 'vModelRadio');
            break;
          default:
            modelToUse = createIdentifier(t, state, 'vModelText');
        }
    }
    return modelToUse;
  }
  return t.callExpression(
    createIdentifier(t, state, 'resolveDirective'), [
      t.stringLiteral(directiveName),
    ],
  );
};

/**
 * Parse directives metadata
 *
 * @param t
 * @param  path JSXAttribute
 * @returns null | Object<{ modifiers: Set<string>, valuePath: Path<Expression>}>
 */
const parseDirectives = (t, {
  name, path, value, state, tag, isComponent,
}) => {
  const modifiers = name.split('_');
  const directiveName = modifiers.shift()
    .replace(/^v/, '')
    .replace(/^-/, '')
    .replace(/^\S/, (s) => s.toLowerCase());

  if (directiveName === 'model' && !t.isJSXExpressionContainer(path.get('value'))) {
    throw new Error('You have to use JSX Expression inside your v-model');
  }

  const modifiersSet = new Set(modifiers);

  const hasDirective = directiveName !== 'model' || (directiveName === 'model' && !isComponent);

  return {
    directiveName,
    modifiers: modifiersSet,
    directive: hasDirective ? [
      resolveDirective(t, path, state, tag, directiveName),
      value,
      modifiersSet.size && t.unaryExpression('void', t.numericLiteral(0), true),
      modifiersSet.size && t.objectExpression(
        [...modifiersSet].map(
          (modifier) => t.objectProperty(
            t.identifier(modifier),
            t.booleanLiteral(true),
          ),
        ),
      ),
    ].filter(Boolean) : undefined,
  };
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
  PatchFlags,
  PatchFlagNames,
  parseDirectives,
  isFragment,
};
