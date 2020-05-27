const htmlTags = require('html-tags');
const svgTags = require('svg-tags');
const { addNamed, addDefault } = require('@babel/helper-module-imports');

const xlinkRE = /^xlink([A-Z])/;
const eventRE = /^on[A-Z][a-z]+$/;
const rootAttributes = ['class', 'style'];


/**
 * Checks if string is describing a directive
 * @param src string
 */
const isDirective = (src) => src.startsWith('v-')
  || (src.startsWith('v') && src.length >= 2 && src[1] >= 'A' && src[1] <= 'Z');

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

const getJSXAttributeValue = (t, path) => {
  const valuePath = path.get('value');
  if (valuePath.isJSXElement()) {
    return transformJSXElement(t, valuePath);
  }
  if (valuePath.isStringLiteral()) {
    return valuePath.node;
  }
  if (valuePath.isJSXExpressionContainer()) {
    return transformJSXExpressionContainer(valuePath);
  }

  return null;
};

const transformJSXAttribute = (t, path, state, attributesToMerge, directives) => {
  let name = getJSXAttributeName(t, path);
  const attributeValue = getJSXAttributeValue(t, path);
  if (state.opts.transformOn && (name === 'on' || name === 'nativeOn')) {
    const transformOn = addDefault(path, '@ant-design-vue/babel-helper-vue-transform-on', { nameHint: '_transformOn' });
    attributesToMerge.push(t.callExpression(
      transformOn,
      [attributeValue || t.booleanLiteral(true)],
    ));
    return null;
  }
  if (isDirective(name)) {
    const directiveName = name.startsWith('v-')
      ? name.replace('v-', '')
      : name.replace(`v${name[1]}`, name[1].toLowerCase());
    if (directiveName === '_model') {
      directives.push(attributeValue);
    } else if (directiveName === 'show') {
      directives.push(t.arrayExpression([
        state.vShow,
        attributeValue,
      ]));
    } else {
      directives.push(t.arrayExpression([
        t.callExpression(state.resolveDirective, [
          t.stringLiteral(directiveName),
        ]),
        attributeValue,
      ]));
    }
    return null;
  }
  if (rootAttributes.includes(name) || eventRE.test(name)) {
    attributesToMerge.push(
      t.objectExpression([
        t.objectProperty(
          t.stringLiteral(
            name,
          ),
          attributeValue,
        ),
      ]),
    );
    return null;
  }
  if (name.match(xlinkRE)) {
    name = name.replace(xlinkRE, (_, firstCharacter) => `xlink:${firstCharacter.toLowerCase()}`);
  }

  return t.objectProperty(
    t.stringLiteral(
      name,
    ),
    attributeValue || t.booleanLiteral(true),
  );
};

const transformJSXSpreadAttribute = (t, path, attributesToMerge) => {
  const argument = path.get('argument').node;
  const { properties } = argument;
  if (!properties) {
    return t.spreadElement(argument);
  }
  return t.spreadElement(t.objectExpression(properties.filter((property) => {
    const { key, value } = property;
    const name = key.value;
    if (rootAttributes.includes(name)) {
      attributesToMerge.push(
        t.objectExpression([
          t.objectProperty(
            t.stringLiteral(name),
            value,
          ),
        ]),
      );
      return false;
    }
    return true;
  })));
};

const transformAttribute = (t, path, state, attributesToMerge, directives) => (
  path.isJSXAttribute()
    ? transformJSXAttribute(t, path, state, attributesToMerge, directives)
    : transformJSXSpreadAttribute(t, path, attributesToMerge));

const getAttributes = (t, path, state, directives) => {
  const attributes = path.get('openingElement').get('attributes');
  if (attributes.length === 0) {
    return t.nullLiteral();
  }

  const attributesToMerge = [];
  const attributeArray = [];
  attributes
    .forEach((attribute) => {
      const attr = transformAttribute(t, attribute, state, attributesToMerge, directives);
      if (attr) {
        attributeArray.push(attr);
      }
    });
  return t.callExpression(
    state.mergeProps,
    [
      ...attributesToMerge,
      t.objectExpression(attributeArray),
    ],
  );
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
 * Get children from Array of JSX children
 * @param t
 * @param paths Array<JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement>
 * @returns Array<Expression | SpreadElement>
 */
const getChildren = (t, paths) => paths
  .map((path) => {
    if (path.isJSXText()) {
      return transformJSXText(t, path);
    }
    if (path.isJSXExpressionContainer()) {
      return transformJSXExpressionContainer(path);
    }
    if (path.isJSXSpreadChild()) {
      return transformJSXSpreadChild(t, path);
    }
    if (path.isCallExpression()) {
      return path.node;
    }
    if (path.isJSXElement()) {
      return transformJSXElement(t, path);
    }
    throw new Error(`getChildren: ${path.type} is not supported`);
  }).filter((value) => (
    value !== undefined
      && value !== null
      && !t.isJSXEmptyExpression(value)
  ));


const transformJSXElement = (t, path, state) => {
  const directives = [];
  const tag = getTag(t, path);
  const children = t.arrayExpression(getChildren(t, path.get('children')));
  const attributes = getAttributes(t, path, state, directives);
  const compatibleProps = addDefault(
    path, '@ant-design-vue/babel-helper-vue-compatible-props', { nameHint: '_compatibleProps' },
  );
  const h = t.callExpression(state.h, [
    tag,
    state.opts.compatibleProps ? t.callExpression(compatibleProps, [attributes]) : attributes,
    !t.isStringLiteral(tag) && !tag.name.includes('Fragment')
      ? t.objectExpression([
        t.objectProperty(
          t.identifier('default'),
          t.callExpression(state.withCtx, [
            t.arrowFunctionExpression(
              [],
              children,
            ),
          ]),
        ),
      ])
      : children,
  ]);
  if (!directives.length) {
    return h;
  }
  return t.callExpression(state.withDirectives, [
    h,
    t.arrayExpression(directives),
  ]);
};

const imports = [
  'h', 'mergeProps', 'withDirectives',
  'resolveDirective', 'vShow', 'withCtx',
];

module.exports = (t) => ({
  JSXElement: {
    exit(path, state) {
      imports.forEach((m) => {
        state[m] = addNamed(path, m, 'vue');
      });
      path.replaceWith(
        transformJSXElement(t, path, state),
      );
    },
  },
});
