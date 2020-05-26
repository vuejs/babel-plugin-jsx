const helperModuleImports = require('@babel/helper-module-imports');

const transformFragment = (t, path, { name }) => {
  const children = path.get('children') || [];
  return t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier(name), []),
    t.jsxClosingElement(t.jsxIdentifier(name)),
    children.map(({ node }) => node),
    false,
  );
};

module.exports = (t) => ({
  JSXFragment: {
    enter(path) {
      if (!path.vueFragment) {
        path.vueFragment = helperModuleImports.addNamed(path, 'Fragment', 'vue');
      }
      path.replaceWith(transformFragment(t, path, path.vueFragment));
    },
  },
});
