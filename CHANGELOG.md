## 1.0.0-rc.2

`2020-08-28`

- 🌟 rename package scope from ant-design-vue to vue ([09c220e](https://github.com/vuejs/jsx-next/commit/09c220eeff98bbec757a83d41af1f0731652d00c))
- 🌟 replace namespace imports with named imports [#67](https://github.com/vuejs/jsx-next/pull/67)

## 1.0.0-rc.1

`2020-07-29`

- 🌟 support `v-html` and `v-text`
- 🌟 add `isCustomElement`
- 🛠 do not optimize by default

### Breaking Change

- remove `compatibleProps`
- rename `usePatchFlag` as `optimize`

## 1.0.0-beta.4

`2020-07-22`

- 🐞Properly force update on forwarded slots [#33](https://github.com/vueComponent/jsx/pull/33)

## 1.0.0-beta.3

`2020-07-15`

- 🐞 Fix directive with single param did not work


## 1.0.0-beta.2

`2020-07-15`

- 🐞 Fix walksScope throw error when path.parentPath is null [#25](https://github.com/vueComponent/jsx/pull/25)
- 🐞 Fix fragment with condition fails with undefined vnode [#28](https://github.com/vueComponent/jsx/pull/28)
- 🌟 New Directive API


## 1.0.0-beta.1

`2020-07-12`

- 🐞 Fix component doesn't render when variables outside slot
- 🌟 support `vSlots`
- 🌟 optional `usePatchFlag`
