## 1.1.0

`2021-09-30`

- 🌟 feat: allow string arguments on directives [#496]

## 1.0.6

`2021-05-02`

- 🐞 fix wrong compilation result of custom directives

## 1.0.5

`2021-04-18`

- 🐞 using v-slots without children should not be spread

## 1.0.4

`2021-03-29`

- 🌟 add pragma option and support @jsx annotation [#322]

## 1.0.3

`2021-02-06`

- 🐞 the child nodes of `keepAlive` should not be transformed to slots

## 1.0.2

`2021-01-17`

- 🛠 merge generated imports [#274]

## 1.0.1

`2021-01-09`

- 🌟 support optional `enableObjectSlots` [#259]

## 1.0.0

`2020-12-26`

## 1.0.0-rc.5

`2020-12-12`

- 🐞 wrong result in slots array map expression [#218](https://github.com/vuejs/jsx-next/pull/218)

## 1.0.0-rc.4

`2020-12-08`

- 🌟 support multiple v-models
- 🌟 support support passing object slots via JSX children

## 1.0.0-rc.3

`2020-09-14`

- 🐞 fix mergeProps order error ([bf59811](https://github.com/vuejs/jsx-next/commit/bf59811f4334dbc30fd62ba33a33926031dd8835))
- 🌟 optional mergeProps ([e16695d](https://github.com/vuejs/jsx-next/commit/e16695d87e269000055828f32492690c4cf796b2))

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

- 🐞 Properly force update on forwarded slots [#33](https://github.com/vueComponent/jsx/pull/33)

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
