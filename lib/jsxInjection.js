const {
  h, resolveDirective, withDirectives, mergeProps,
} = require('vue');

function isObject(val) {
  return val !== null && typeof val === 'object';
}
function isVNode(value) {
  // eslint-disable-next-line no-underscore-dangle
  return value ? value._isVNode === true : false;
}

function handleDirective(directives) {
  return directives.map((item) => {
    // handle situation: <a v-cust={{value,modifiers,arg}} />
    // eslint-disable-next-line no-underscore-dangle
    if (item._internal_directive_flag && item.value && item.value && !item.modifiers && !item.arg) {
      const directiveOption = item.value;
      item = {
        value: directiveOption.value,
        modifiers: directiveOption.modifiers,
        arg: directiveOption.arg,
        name: item.name,
      };
    }
    if (typeof item.dir === 'string') {
      item.name = item.dir;
    }
    if (typeof item.name === 'string') {
      item.dir = resolveDirective(item.name);
    }
    return [item.dir, item.value, item.arg, item.modifiers];
  });
}
function jsxRender(type, propsOrChildren, children) {
  if (
    arguments.length > 1
        && isObject(propsOrChildren)
        && !Array.isArray(propsOrChildren)
        && !isVNode(propsOrChildren)
  ) {
    const { directives } = propsOrChildren;
    if (directives && directives.length > 0) {
      const directivesArr = handleDirective(directives);
      delete propsOrChildren.directives;
      return withDirectives(h.call(this, type, propsOrChildren, children), directivesArr);
    }
  }
  return h.call(this, type, propsOrChildren, children);
}
function jsxMergeProps(...arg) {
  arg = arg.map((props) => {
    props.onJSXTEMPDirectives = props.directives;
    return props;
  });
  // 'directives' should be merged like 'on'
  const result = mergeProps(...arg);
  result.directives = result.onJSXTEMPDirectives;
  delete result.onJSXTEMPDirectives;
  if (!result.directives || result.directives.length === 0) {
    delete result.directives;
  }
  return result;
}

module.exports = {
  jsxRender,
  jsxMergeProps,
};
