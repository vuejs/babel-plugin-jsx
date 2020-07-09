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

## 表达式

### 内容
函数式组件

```jsx
const App = () => <div></div>
```

在 render 中使用

```jsx
const App = {
  render() {
    return <div>Vue 3.0</div>
  }
}
```

```jsx
const App = defineComponent(() => {
  const count = ref(0);

  const inc = () => {
    count.value++;
  };

  return () => (
    <div onClick={inc}>
      {count.value}
    </div>
  )
})
```

Fragment

```jsx
const App = () => (
  <>
    <span>I'm</span>
    <span>Fragment</span>
  </>
)
```

### Attributes/Props

```jsx
const App = () => <input type="email" />
```

with a dynamic binding:

```jsx
const placeholderText = 'email'
const App = () => (
  <input
    type="email"
    placeholder={placeholderText}
  />
)
```

### 指令

> 建议在 JSX 中使用驼峰 (`vModel`)，但是 `v-model` 也能用

v-show

```jsx
const App = {
  data() {
    return { visible: true };
  },
  render() {
    return <input vShow={this.visible} />;
  },
};
```

v-model

* 修饰符：使用 (`_`) 代替 (`.`) (`vModel_trim={this.test}`)

```jsx
export default {
  data: () => ({
    test: 'Hello World',
  }),
  render() {
    return (
      <>
        <input type="text" vModel_trim={this.test} />
        {this.test}
      </>
    )
  },
}
```

自定义指令

```jsx
const App = {
  directives: { custom: customDirective },
  setup() {
    return () => (
      <a
        vCustom={{
          value: 123,
          modifiers: { modifier: true },
          arg: 'arg',
        }}
      />
    );
  },
}
```

### 插槽 

目前功能没有想好怎么实现，欢迎在 issue 中讨论，可以先使用 `props` 来代替

## 谁在用

<table>
  <tbody>
    <tr>
      <td align="center">
        <a target="_blank" href="https://www.antdv.com/">
          <img
            width="32"
            src="https://qn.antdv.com/logo.png"
          />
          <br>
          <strong>Ant Design Vue</strong>
        </a>
      </td>
      <td align="center">
        <a target="_blank" href="https://youzan.github.io/">
          <img
            width="32"
            style="vertical-align: -0.32em; margin-right: 8px;"
            src="https://img.yzcdn.cn/vant/logo.png"
          />
          <br>
          <strong>Vant</strong>
        </a>
      </td>
    </tr>
  </tbody>
</table>

## 兼容性

要求：

- **Babel 7+**
- **Vue 3+**
