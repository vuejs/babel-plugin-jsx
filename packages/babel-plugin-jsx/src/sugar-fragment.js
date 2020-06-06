import { addNamespace } from '@babel/helper-module-imports';

const transformFragment = (t, path, Fragment) => {
  const children = path.get('children') || [];
  return t.jsxElement(
    t.jsxOpeningElement(Fragment, []),
    t.jsxClosingElement(Fragment),
    children.map(({ node }) => node),
    false,
  );
};

export default (t) => ({
  JSXFragment: {
    enter(path, state) {
      if (!state.get('vue')) {
        state.set('vue', addNamespace(path, 'vue'));
      }
      path.replaceWith(
        transformFragment(
          t, path,
          t.jsxMemberExpression(
            t.jsxIdentifier(state.get('vue').name),
            t.jsxIdentifier('Fragment'),
          ),
        ),
      );
    },
  },
});
