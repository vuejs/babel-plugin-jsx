const transformOn = require('@ant-design-vue/babel-helper-vue-transform-on');

const compatibleProps = (attr) => {
  const {
    props, on = {}, attrs, ...rest
  } = attr || {};
  return {
    ...props, ...attrs, ...transformOn(on), ...rest,
  };
};

module.exports = compatibleProps;
