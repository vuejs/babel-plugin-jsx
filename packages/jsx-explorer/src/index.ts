import * as monaco from 'monaco-editor'
import { watchEffect } from 'vue'
import { transform } from '@babel/core'
import babelPluginJsx from '@vue/babel-plugin-jsx'
import {
  initOptions,
  compilerOptions,
  type VueJSXPluginOptions,
} from './options'
import './index.css'

main()

interface PersistedState {
  src: string
  options: VueJSXPluginOptions
}

function main() {
  const persistedState: PersistedState = JSON.parse(
    localStorage.getItem('state') || '{}'
  )

  Object.assign(compilerOptions, persistedState.options)

  const sharedEditorOptions: monaco.editor.IStandaloneEditorConstructionOptions =
    {
      theme: 'vs-dark',
      fontSize: 14,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      contextmenu: false,
      minimap: {
        enabled: false,
      },
    }

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    allowJs: true,
    allowNonTsExtensions: true,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    target: monaco.languages.typescript.ScriptTarget.Latest,
  })

  const editor = monaco.editor.create(document.getElementById('source')!, {
    value:
      decodeURIComponent(window.location.hash.slice(1)) ||
      persistedState.src ||
      'const App = () => <div>Hello World</div>',
    language: 'typescript',
    tabSize: 2,
    ...sharedEditorOptions,
  })

  const output = monaco.editor.create(document.getElementById('output')!, {
    value: '',
    language: 'javascript',
    readOnly: true,
    tabSize: 2,
    ...sharedEditorOptions,
  })

  const reCompile = () => {
    const src = editor.getValue()
    const state = JSON.stringify({
      src,
      options: compilerOptions,
    })
    localStorage.setItem('state', state)
    window.location.hash = encodeURIComponent(src)
    console.clear()
    transform(
      src,
      {
        babelrc: false,
        plugins: [[babelPluginJsx, compilerOptions]],
        ast: true,
      },
      (err, result = {}) => {
        const res = result!
        if (!err) {
          console.log('AST', res.ast!)
          output.setValue(res.code!)
        } else {
          output.setValue(err.message!)
        }
      }
    )
  }

  // handle resize
  window.addEventListener('resize', () => {
    editor.layout()
    output.layout()
  })

  initOptions()
  watchEffect(reCompile)

  // update compile output when input changes
  editor.onDidChangeModelContent(debounce(reCompile))
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300): T {
  let prevTimer: number | null = null
  return ((...args: any[]) => {
    if (prevTimer) {
      clearTimeout(prevTimer)
    }
    prevTimer = window.setTimeout(() => {
      fn(...args)
      prevTimer = null
    }, delay)
  }) as any
}
