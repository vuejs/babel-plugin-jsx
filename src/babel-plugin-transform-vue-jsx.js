const syntaxJsx = require('@babel/plugin-syntax-jsx').default;
const t = require('@babel/types');
const htmlTags = require('html-tags');
const svgTags = require('svg-tags');
const helperModuleImports = require('@babel/helper-module-imports');

const xlinkRE = /^xlink([A-Z])/;
const eventRE = /^on[A-Z][a-z]+$/;
const rootAttributes = ['class', 'style'];

/**
 * click --> onClick
 */

const transformOn = (event = '') => `on${event[0].toUpperCase()}${event.substr(1)}`;

const filterEmpty = (value) => value !== undefined && value !== null;

/**
 * Transform JSXMemberExpression to MemberExpression
 * @param path JSXMemberExpression
 * @returns MemberExpression
 */
const transformJSXMemberExpression = (path) => {
  const objectPath = path.get('object');
  const propertyPath = path.get('property');

  const transformedObject = objectPath.isJSXMemberExpression()
    ? transformJSXMemberExpression(objectPath)
    : objectPath.isJSXIdentifier()
      ? t.identifier(objectPath.node.name)
      : t.nullLiteral();
  const transformedProperty = t.identifier(propertyPath.get('name').node);
  return t.memberExpression(transformedObject, transformedProperty);
};

/**
 * Get tag (first attribute for h) from JSXOpeningElement
 * @param path JSXOpeningElement
 * @returns Identifier | StringLiteral | MemberExpression
 */
const getTag = (path) => {
  const namePath = path.get('openingElement').get('name');
  if (namePath.isJSXIdentifier()) {
    const { name } = namePath.node;
    if (path.scope.hasBinding(name) && !htmlTags.includes(name) && !svgTags.includes(name)) {
      return t.identifier(name);
    }

    return t.stringLiteral(name);
  }

  if (namePath.isJSXMemberExpression()) {
    return transformJSXMemberExpression(namePath);
  }
  throw new Error(`getTag: ${namePath.type} is not supported`);
};

const getJSXAttributeName = (path) => {
  const nameNode = path.node.name;
  if (t.isJSXIdentifier(nameNode)) {
    return nameNode.name;
  }

  return `${nameNode.namespace.name}:${nameNode.name.name}`;
};

const getJSXAttributeValue = (path, injected) => {
  const valuePath = path.get('value');
  if (valuePath.isJSXElement()) {
    return transformJSXElement(valuePath, injected);
  }
  if (valuePath.isStringLiteral()) {
    return valuePath.node;
  }
  if (valuePath.isJSXExpressionContainer()) {
    return transformJSXExpressionContainer(valuePath);
  }

  return null;
};

const transformJSXAttribute = (path, attributesToMerge, injected) => {
  let name = getJSXAttributeName(path);
  if (name === 'on') {
    const { properties = [] } = getJSXAttributeValue(path);
    properties.forEach((property) => {
      attributesToMerge.push(t.objectExpression([
        t.objectProperty(
          t.identifier(transformOn(property.key.name)),
          property.value,
        ),
      ]));
    });
    return null;
  }
  if (rootAttributes.includes(name) || eventRE.test(name)) {
    attributesToMerge.push(
      t.objectExpression([
        t.objectProperty(
          t.stringLiteral(
            name,
          ),
          getJSXAttributeValue(path, injected),
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
    getJSXAttributeValue(path, injected) || t.booleanLiteral(true),
  );
};

const transformJSXSpreadAttribute = (path, attributesToMerge) => {
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

const transformAttribute = (path, attributesToMerge, injected) => (path.isJSXAttribute()
  ? transformJSXAttribute(path, attributesToMerge, injected)
  : transformJSXSpreadAttribute(path, attributesToMerge));

const getAttributes = (path, injected) => {
  const attributes = path.get('openingElement').get('attributes');
  if (attributes.length === 0) {
    return t.nullLiteral();
  }

  const attributesToMerge = [];
  const attributeArray = [];
  attributes
    .forEach((attribute) => {
      const attr = transformAttribute(attribute, attributesToMerge, injected);
      if (attr) {
        attributeArray.push(attr);
      }
    });
  return t.callExpression(
    injected.mergeProps,
    [
      ...attributesToMerge,
      t.objectExpression(attributeArray),
    ],
  );
};

/**
 * Transform JSXText to StringLiteral
 * @param path JSXText
 * @returns StringLiteral
 */
const transformJSXText = (path) => {
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
 * @param path JSXSpreadChild
 * @returns SpreadElement
 */
const transformJSXSpreadChild = (path) => t.spreadElement(path.get('expression').node);

/**
 * Get children from Array of JSX children
 * @param paths Array<JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement>
 * @param injected {}
 * @returns Array<Expression | SpreadElement>
 */
const getChildren = (paths, injected) => paths
  .map((path) => {
    if (path.isJSXText()) {
      return transformJSXText(path);
    }
    if (path.isJSXExpressionContainer()) {
      return transformJSXExpressionContainer(path);
    }
    if (path.isJSXSpreadChild()) {
      return transformJSXSpreadChild(path);
    }
    if (path.isCallExpression()) {
      return path.node;
    }
    if (path.isJSXElement()) {
      return transformJSXElement(path, injected);
    }
    throw new Error(`getChildren: ${path.type} is not supported`);
  }).filter(filterEmpty);

const transformJSXElement = (path, injected) => t.callExpression(injected.h, [
  getTag(path),
  getAttributes(path, injected),
  t.arrayExpression(getChildren(path.get('children'), injected)),
]);

module.exports = () => ({
  name: 'babel-plugin-transform-vue-jsx',
  inherits: syntaxJsx,
  visitor: {
    JSXElement: {
      exit(path, state) {
        if (!state.vueCreateElementInjected) {
          state.vueCreateElementInjected = helperModuleImports.addNamed(path, 'h', 'vue');
        }
        if (!state.vueMergePropsInjected) {
          state.vueMergePropsInjected = helperModuleImports.addNamed(path, 'mergeProps', 'vue');
        }
        path.replaceWith(
          transformJSXElement(path, {
            h: state.vueCreateElementInjected,
            mergeProps: state.vueMergePropsInjected,
          }),
        );
      },
    },
  },
});
