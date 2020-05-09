var nestableRE = /^(props|domProps|on|nativeOn|hook)([\-_A-Z])/;
var dirRE = /^v-/;
var xlinkRE = /^xlink([A-Z])/;

module.exports = function groupProps(props, t) {
  var newProps = [];
  var currentNestedObjects = Object.create(null);
  props.forEach(function (prop) {
    var name = prop.key.value || prop.key.name;
    // nested modules
    var nestMatch = name.match(nestableRE);
    // <span on-click={fnA}></span>  将老的代码中这样的写法，最终转换成数据对象为{onClick:fnA}
    if (nestMatch) {
      var suffix = name.replace(nestableRE, function (_, $1, $2) {
        return $1 + ($2 === '-' ? '' : $2.toUpperCase());
      });
      var nestedProp = t.objectProperty(t.stringLiteral(suffix), prop.value);
      newProps.push(nestedProp);
    } else if (dirRE.test(name)) {
      // 指令的处理照旧，后面再进行处理
      name = name.replace(dirRE, '');
      var dirs = currentNestedObjects.directives;
      if (!dirs) {
        dirs = currentNestedObjects.directives = t.objectProperty(
          t.identifier('directives'),
          t.arrayExpression([]),
        );
        newProps.push(dirs);
      }
      dirs.value.elements.push(
        t.objectExpression([
          t.objectProperty(t.identifier('name'), t.stringLiteral(name)),
          t.objectProperty(t.identifier('value'), prop.value),
        ]),
      );
    } else {
    /** 剩余的属性进行平铺 */
      // guard xlink attributes
      if (xlinkRE.test(prop.key.name)) {
        prop.key.name = JSON.stringify(
          prop.key.name.replace(xlinkRE, function (m, p1) {
            return 'xlink:' + p1.toLowerCase();
          }),
        );
      }
      newProps.push(prop);
    }
  });
  return t.objectExpression(newProps);
};
