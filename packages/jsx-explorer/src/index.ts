import * as monaco from 'monaco-editor';
import { watchEffect } from 'vue';
import { transform } from '@babel/core';
import babelPluginJsx from '@vue/babel-plugin-jsx';
// @ts-expect-error missing types
import typescript from '@babel/plugin-syntax-typescript';
import {
  type VueJSXPluginOptions,
  compilerOptions,
  initOptions,
} from './options';
import './editor.worker';
import './index.css';

main();

interface PersistedState {
  src: string;
  options: VueJSXPluginOptions;
}

function main() {
  const persistedState: PersistedState = JSON.parse(
    localStorage.getItem('state') || '{}'
  );

  Object.assign(compilerOptions, persistedState.options);

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
    };

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
  });
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    allowJs: true,
    allowNonTsExtensions: true,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    target: monaco.languages.typescript.ScriptTarget.Latest,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    isolatedModules: true,
  });

  const editor = monaco.editor.create(document.getElementById('source')!, {
    ...sharedEditorOptions,
    model: monaco.editor.createModel(
      decodeURIComponent(window.location.hash.slice(1)) ||
        persistedState.src ||
        `import { defineComponent } from 'vue'

const App = defineComponent((props) => <div>Hello World</div>)`,
      'typescript',
      monaco.Uri.parse('file:///app.tsx')
    ),
  });

  const output = monaco.editor.create(document.getElementById('output')!, {
    readOnly: true,
    ...sharedEditorOptions,
    model: monaco.editor.createModel(
      '',
      'typescript',
      monaco.Uri.parse('file:///output.tsx')
    ),
  });

  const reCompile = () => {
    const src = editor.getValue();
    const state = JSON.stringify({
      src,
      options: compilerOptions,
    });
    localStorage.setItem('state', state);
    window.location.hash = encodeURIComponent(src);
    console.clear();
    transform(
      src,
      {
        babelrc: false,
        plugins: [
          [babelPluginJsx, { ...compilerOptions }],
          [typescript, { isTSX: true }],
        ],
        ast: true,
      },
      (err, result = {}) => {
        const res = result!;
        if (!err) {
          console.log('AST', res.ast!);
          output.setValue(res.code!);
        } else {
          console.error(err);
          output.setValue(err.message!);
        }
      }
    );
  };

  // handle resize
  window.addEventListener('resize', () => {
    editor.layout();
    output.layout();
  });

  initOptions();
  watchEffect(reCompile);

  // update compile output when input changes
  editor.onDidChangeModelContent(debounce(reCompile));
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300): T {
  let prevTimer: number | null = null;
  return ((...args: any[]) => {
    if (prevTimer) {
      clearTimeout(prevTimer);
    }
    prevTimer = window.setTimeout(() => {
      fn(...args);
      prevTimer = null;
    }, delay);
  }) as any;
}
