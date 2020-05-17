const path = require('path')
const jsxInjectionPATH = 'PACKAGE/lib/jsxInjection';
const { jsxRender,jsxMergeProps } = require("./lib/jsxInjection");

module.exports = {
  moduleNameMapper:{
    [jsxInjectionPATH]:path.resolve(__dirname,'./lib/jsxInjection')
  },
  "transform": {
    "^.+\\.[t|j]sx?$": "babel-jest"
  },
  modulePaths :["<rootDir>/lib/"],
  globals: {
    _jsxRender:jsxRender,
    _jsxMergeProps:jsxMergeProps
  }
}
