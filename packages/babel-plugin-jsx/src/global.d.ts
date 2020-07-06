

declare module '@babel/helper-module-imports' {
    import { JSXElement } from '@babel/types'
    import { NodePath } from '@babel/traverse'
    export const addDefault: (path: NodePath<JSXElement>, module: string, option: object) => void
    export const addNamespace: (path: NodePath<JSXElement>, namespace: string) => void
}
declare module '@babel/plugin-syntax-jsx' {
    export const syntaxJsx : any
}