const htmlTags = require('html-tags');
const svgTags = require('svg-tags');
const { addNamed, addDefault } = require('@babel/helper-module-imports');

const xlinkRE = /^xlink([A-Z])/;
const onRE = /^on[A-Z][a-z]+$/;
const rootAttributes = ['class', 'style'];

const isOn = (key) => onRE.test(key);

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

const transformJSXSpreadAttribute = (t, path, mergeArgs) => {
  const argument = path.get('argument').node;
  const { properties } = argument;
  if (!properties) {
    return t.spreadElement(argument);
  }
  return t.spreadElement(t.objectExpression(properties.filter((property) => {
    const { key, value } = property;
    const name = key.value;
    if (rootAttributes.includes(name)) {
      mergeArgs.push(
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

const needToMerge = (name) => rootAttributes.includes(name) || isOn(name);

/**
 * Check if a JSXOpeningElement is a component
 *
 * @param t
 * @param path JSXOpeningElement
 * @returns boolean
 */
const checkIsComponent = (t, path) => {
  const name = path.get('openingElement.name');

  if (t.isJSXMemberExpression(name)) {
    return true;
  }

  const tag = name.get('name').node;

  return !htmlTags.includes(tag) && !svgTags.includes(tag);
};

const buildProps = (t, path, state) => {
  const isComponent = checkIsComponent(t, path);
  const props = path.get('openingElement').get('attributes');
  const directives = [];
  if (props.length === 0) {
    return {
      props: t.nullLiteral(),
      directives,
    };
  }

  const propsExpression = [];

  // patchFlag analysis
  let patchFlag = 0;
  let hasRef = false;
  let hasClassBinding = false;
  let hasStyleBinding = false;
  let hasHydrationEventBinding = false;
  let hasDynamicKeys = false;

  const dynamicPropNames = [];
  const mergeArgs = [];

  props
    .forEach((prop) => {
      if (prop.isJSXAttribute()) {
        let name = getJSXAttributeName(t, prop);

        if (name === '_model') {
          name = 'onUpdate:modelValue';
        }

        const attributeValue = getJSXAttributeValue(t, prop);
        if (!t.isStringLiteral(attributeValue)) {
          if (
            !isComponent
            && isOn(name)
            // omit the flag for click handlers becaues hydration gives click
            // dedicated fast path.
            && name.toLowerCase() !== 'onclick'
            // omit v-model handlers
            && name !== 'onUpdate:modelValue'
          ) {
            hasHydrationEventBinding = true;
          }

          if (name === 'class' && !isComponent) {
            hasClassBinding = true;
          } else if (name === 'style' && !isComponent) {
            hasStyleBinding = true;
          } else if (
            name !== 'key'
            && !isDirective(name)
            && name !== 'on'
            && !dynamicPropNames.includes(name)
          ) {
            dynamicPropNames.push(name);
          }
        } else if (name === 'ref') {
          hasRef = true;
        }
        if (state.opts.transformOn && (name === 'on' || name === 'nativeOn')) {
          const transformOn = addDefault(
            path,
            '@ant-design-vue/babel-helper-vue-transform-on',
            { nameHint: '_transformOn' },
          );
          mergeArgs.push(t.callExpression(
            transformOn,
            [attributeValue || t.booleanLiteral(true)],
          ));
          return;
        }
        if (isDirective(name) || name === 'onUpdate:modelValue') {
          if (name === 'onUpdate:modelValue') {
            directives.push(attributeValue);
          } else {
            const directiveName = name.startsWith('v-')
              ? name.replace('v-', '')
              : name.replace(`v${name[1]}`, name[1].toLowerCase());
            if (directiveName === 'show') {
              directives.push(t.arrayExpression([
                state.get('vShow'),
                attributeValue,
              ]));
            } else {
              directives.push(t.arrayExpression([
                t.callExpression(state.get('resolveDirective'), [
                  t.stringLiteral(directiveName),
                ]),
                attributeValue,
              ]));
            }
          }
          return;
        }
        if (needToMerge(name)) {
          mergeArgs.push(
            t.objectExpression([
              t.objectProperty(
                t.stringLiteral(
                  name,
                ),
                attributeValue,
              ),
            ]),
          );
          return;
        }
        if (name.match(xlinkRE)) {
          name = name.replace(xlinkRE, (_, firstCharacter) => `xlink:${firstCharacter.toLowerCase()}`);
        }
        propsExpression.push(t.objectProperty(
          t.stringLiteral(name),
          attributeValue || t.booleanLiteral(true),
        ));
      } else {
        hasDynamicKeys = true;
        propsExpression.push(transformJSXSpreadAttribute(t, prop, mergeArgs));
      }
    });

  // patchFlag analysis
  if (hasDynamicKeys) {
    patchFlag |= PatchFlags.FULL_PROPS;
  } else {
    if (hasClassBinding) {
      patchFlag |= PatchFlags.CLASS;
    }
    if (hasStyleBinding) {
      patchFlag |= PatchFlags.STYLE;
    }
    if (dynamicPropNames.length) {
      patchFlag |= PatchFlags.PROPS;
    }
    if (hasHydrationEventBinding) {
      patchFlag |= PatchFlags.HYDRATE_EVENTS;
    }
  }

  if (
    (patchFlag === 0 || patchFlag === PatchFlags.HYDRATE_EVENTS)
    && hasRef
  ) {
    patchFlag |= PatchFlags.NEED_PATCH;
  }

  return {
    props: mergeArgs.length ? t.callExpression(
      state.get('mergeProps'),
      [
        ...mergeArgs,
        propsExpression.length && t.objectExpression(propsExpression),
      ].filter(Boolean),
    ) : t.objectExpression(propsExpression),
    directives,
    patchFlag,
    dynamicPropNames,
  };
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
  const tag = getTag(t, path);
  const children = t.arrayExpression(getChildren(t, path.get('children')));
  const {
    props,
    directives,
    patchFlag,
    dynamicPropNames = [],
  } = buildProps(t, path, state);

  const compatibleProps = addDefault(
    path, '@ant-design-vue/babel-helper-vue-compatible-props', { nameHint: '_compatibleProps' },
  );

  const flagNames = Object.keys(PatchFlagNames)
    .map(Number)
    .filter((n) => n > 0 && patchFlag & n)
    .map((n) => PatchFlagNames[n])
    .join(', ');

  const isComponent = checkIsComponent(t, path);
  const createVNode = t.callExpression(state.get('createVNode'), [
    tag,
    state.opts.compatibleProps ? t.callExpression(compatibleProps, [props]) : props,
    isComponent
      ? t.objectExpression([
        t.objectProperty(
          t.identifier('default'),
          t.callExpression(state.get('withCtx'), [
            t.arrowFunctionExpression(
              [],
              children,
            ),
          ]),
        ),
      ])
      : children,
    patchFlag && t.addComment(t.numericLiteral(patchFlag), 'leading', ` ${flagNames} `),
    dynamicPropNames.length
      && t.arrayExpression(dynamicPropNames.map((name) => t.stringLiteral(name))),
  ].filter(Boolean));

  if (!directives.length) {
    return createVNode;
  }

  return t.callExpression(state.get('withDirectives'), [
    createVNode,
    t.arrayExpression(directives),
  ]);
};

const imports = [
  'createVNode', 'mergeProps', 'withDirectives',
  'resolveDirective', 'vShow', 'withCtx',
];

module.exports = (t) => ({
  JSXElement: {
    exit(path, state) {
      imports.forEach((m) => {
        state.set(m, addNamed(path, m, 'vue'));
      });
      path.replaceWith(
        transformJSXElement(t, path, state),
      );
    },
  },
});
