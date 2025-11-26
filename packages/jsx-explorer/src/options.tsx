import { createApp, defineComponent, reactive } from 'vue'
import type { VueJSXPluginOptions } from '@vue/babel-plugin-jsx'

export { VueJSXPluginOptions }

export const compilerOptions: VueJSXPluginOptions = reactive({
  mergeProps: true,
  optimize: false,
  transformOn: false,
  enableObjectSlots: true,
  resolveType: false,
})

const App = defineComponent({
  setup() {
    return () => [
      <>
        <h1>Vue 3 JSX Explorer</h1>
        <a
          href="https://app.netlify.com/sites/vue-jsx-explorer/deploys"
          target="_blank"
        >
          History
        </a>
        <div id="options-wrapper">
          <div id="options-label">Options ↘</div>
          <ul id="options">
            <li>
              <input
                type="checkbox"
                id="mergeProps"
                name="mergeProps"
                checked={compilerOptions.mergeProps}
                onChange={(e: Event) => {
                  compilerOptions.mergeProps = (
                    e.target as HTMLInputElement
                  ).checked
                }}
              />
              <label for="mergeProps">mergeProps</label>
            </li>

            <li>
              <input
                type="checkbox"
                id="optimize"
                name="optimize"
                checked={compilerOptions.optimize}
                onChange={(e: Event) => {
                  compilerOptions.optimize = (
                    e.target as HTMLInputElement
                  ).checked
                }}
              />
              <label for="optimize">optimize</label>
            </li>

            <li>
              <input
                type="checkbox"
                id="transformOn"
                name="transformOn"
                checked={compilerOptions.transformOn}
                onChange={(e: Event) => {
                  compilerOptions.transformOn = (
                    e.target as HTMLInputElement
                  ).checked
                }}
              />
              <label for="transformOn">transformOn</label>
            </li>

            <li>
              <input
                type="checkbox"
                id="enableObjectSlots"
                name="enableObjectSlots"
                checked={compilerOptions.enableObjectSlots}
                onChange={(e: Event) => {
                  compilerOptions.enableObjectSlots = (
                    e.target as HTMLInputElement
                  ).checked
                }}
              />
              <label for="enableObjectSlots">enableObjectSlots</label>
            </li>

            <li>
              <input
                type="checkbox"
                id="resolveType"
                name="resolveType"
                checked={!!compilerOptions.resolveType}
                onChange={(e: Event) => {
                  compilerOptions.resolveType = (
                    e.target as HTMLInputElement
                  ).checked
                }}
              />
              <label for="resolveType">resolveType</label>
            </li>
          </ul>
        </div>
      </>,
    ]
  },
})

export function initOptions() {
  createApp(App).mount(document.querySelector('#header')!)
}
