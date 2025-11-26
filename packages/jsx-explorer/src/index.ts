// @ts-expect-error missing types
import typescript from '@babel/plugin-syntax-typescript'
import { transform } from '@babel/standalone'
import babelPluginJsx from '@vue/babel-plugin-jsx'
import * as monaco from 'monaco-editor'
import { watchEffect } from 'vue'
import {
  compilerOptions,
  initOptions,
  type VueJSXPluginOptions,
} from './options'
import './editor.worker'
import './index.css'

main()

interface PersistedState {
  src: string
  options: VueJSXPluginOptions
}

function main() {
  const persistedState: PersistedState = JSON.parse(
    localStorage.getItem('state') || '{}',
  )

  Object.assign(compilerOptions, persistedState.options)

  const sharedEditorOptions: monaco.editor.IStandaloneEditorConstructionOptions =
    {
      language: 'typescript',
      tabSize: 2,
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

  monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
  })
  monaco.typescript.typescriptDefaults.setCompilerOptions({
    allowJs: true,
    allowNonTsExtensions: true,
    jsx: monaco.typescript.JsxEmit.Preserve,
    target: monaco.typescript.ScriptTarget.Latest,
    module: monaco.typescript.ModuleKind.ESNext,
    isolatedModules: true,
  })

  const editor = monaco.editor.create(document.querySelector('#source')!, {
    ...sharedEditorOptions,
    model: monaco.editor.createModel(
      decodeURIComponent(globalThis.location.hash.slice(1)) ||
        persistedState.src ||
        `import { defineComponent } from 'vue'

const App = defineComponent((props) => <div>Hello World</div>)`,
      'typescript',
      monaco.Uri.parse('file:///app.tsx'),
    ),
  })

  const output = monaco.editor.create(document.querySelector('#output')!, {
    readOnly: true,
    ...sharedEditorOptions,
    model: monaco.editor.createModel(
      '',
      'typescript',
      monaco.Uri.parse('file:///output.tsx'),
    ),
  })

  const reCompile = () => {
    const src = editor.getValue()
    const state = JSON.stringify({
      src,
      options: compilerOptions,
    })
    localStorage.setItem('state', state)
    globalThis.location.hash = encodeURIComponent(src)
    console.clear()
    try {
      const res = transform(src, {
        babelrc: false,
        plugins: [
          [babelPluginJsx, { ...compilerOptions }],
          [typescript, { isTSX: true }],
        ],
        ast: true,
      })
      console.info('AST', res.ast!)
      output.setValue(res.code!)
    } catch (error: any) {
      console.error(error)
      output.setValue(error.message!)
    }
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
  let prevTimer: ReturnType<typeof setTimeout> | null = null
  return ((...args: any[]) => {
    if (prevTimer) {
      clearTimeout(prevTimer)
    }
    prevTimer = globalThis.setTimeout(() => {
      fn(...args)
      prevTimer = null
    }, delay)
  }) as any
}
