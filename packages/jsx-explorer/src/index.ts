/* eslint-disable no-console */
// eslint-disable-next-line import/no-unresolved
import * as m from 'monaco-editor';
import { h, createApp } from 'vue';
import { transform } from '@babel/core';
import babelPluginJsx from '../../babel-plugin-jsx/src';
import './index.css';

declare global {
  interface Window {
    monaco: typeof m
    init: () => void
  }
}

window.init = () => {
  const { monaco } = window;
  createApp(
    () => h('h1', null, 'Vue JSX Explorer'),
  ).mount('#header');

  // @ts-ignore
  if (module.hot) {
  // @ts-ignore
    module.hot.accept('../../babel-plugin-jsx/src', () => {
      compile();
    });
  }

  const sharedEditorOptions: m.editor.IStandaloneEditorConstructionOptions = {
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

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    allowJs: true,
    allowNonTsExtensions: true,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    target: monaco.languages.typescript.ScriptTarget.Latest,
  });

  const editor = monaco.editor.create(document.getElementById('source')!, {
    value: decodeURIComponent(window.location.hash.slice(1)) || localStorage.getItem('state') || 'const App = () => <div>Hello World</div>',
    language: 'typescript',
    tabSize: 2,
    ...sharedEditorOptions,
  });

  const output = monaco.editor.create(document.getElementById('output')!, {
    value: '',
    language: 'javascript',
    readOnly: true,
    tabSize: 2,
    ...sharedEditorOptions,
  });

  const compile = () => {
    const src = editor.getValue();
    localStorage.setItem('state', src);
    window.location.hash = encodeURIComponent(src);
    console.clear();
    transform(src, {
      babelrc: false,
      plugins: [[babelPluginJsx, { transformOn: true, optimize: true }]],
      ast: true,
    }, (err, result = {}) => {
      const res = result!;
      if (!err) {
        console.log('AST', res.ast!);
        output.setValue(res.code!);
      } else {
        output.setValue(err.message!);
      }
    });
  };

  // handle resize
  window.addEventListener('resize', () => {
    editor.layout();
    output.layout();
  });

  compile();

  // update compile output when input changes
  editor.onDidChangeModelContent(debounce(compile));
};

function debounce<T extends(...args: any[]) => any>(
  fn: T,
  delay = 300): T {
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
