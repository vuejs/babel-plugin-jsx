# Vue 3 Babel JSX 插件

以 JSX 的方式来编写 Vue 代码

## 安装

安装插件

```
npm install @ant-design-vue/babel-plugin-jsx -D

npm install @ant-design-vue/babel-helper-vue-transform-on
```

配置 Babel 

```
{
  "plugins": ["@ant-design-vue/babel-plugin-jsx"]
}
```

## 使用

### 参数

* transformOn

把 `on: { click: xx }` 转成 `onClick: xxx`

* compatibleProps

兼容大多数 Vue 2 的写法，Vue 3 中，把所有属性都改成了顶级属性，意味这不需要再传递 props，attrs 这些属性。

开启这个参数意味着对 { attrs, props, on } 做了兼容处理，但是所有的属性外层都会有 `compatibleProps` 方法

## 兼容性

要求：

- **Babel 7+**
- **Vue 3+**
