// let nestRE = /^(on|nativeOn|class|style|hook)$/;
// 首字母转为大写
function firstWordCase(nestedKey) {
  return nestedKey.replace(/^[a-z]/, (val) => {
    return val.toUpperCase();
  });
}
var nestRE = /^(attrs|props|on|nativeOn|class|style)$/;

module.exports = function mergeJSXProps(objs) {
  return objs.reduce(function (a, b) {
    var aa, bb, key, nestedKey, temp;
    for (key in b) {
      aa = a[key] || {};
      bb = b[key];
      if (!nestRE.test(key)) {
        a[key] = b[key];
      } else if (aa) {
        // normalize class
        if (key === 'class') {
          if (typeof aa === 'string') {
            temp = aa;
            a[key] = aa = {};
            aa[temp] = true;
          }
          if (typeof bb === 'string') {
            temp = bb;
            b[key] = bb = {};
            bb[temp] = true;
          }
          for (nestedKey in bb) {
            aa[nestedKey] = bb[nestedKey];
          }
          a['class'] = Object.assign(aa, bb);
        } else {
          if (key === 'on' || key === 'nativeOn' || key === 'hook') {
            // merge functions
            for (nestedKey in bb) {
              let key2 = 'on' + firstWordCase(nestedKey);
              a[key2] = mergeFn(a[key2], bb[key2]);
            }
          } else if (Array.isArray(aa)) {
            a[key] = aa.concat(bb);
          } else if (Array.isArray(bb)) {
            a[key] = [aa].concat(bb);
          } else {
            for (nestedKey in bb) {
              a[nestedKey] = bb[nestedKey];
            }
          }
        }
      }
    }
    return a;
  }, {});
};

function mergeFn(a, b) {
  return function () {
    a && a.apply(this, arguments);
    b && b.apply(this, arguments);
  };
}
