import { transformAsync } from '@babel/core'
import typescript from '@babel/plugin-syntax-typescript'
import { describe, expect, test } from 'vitest'
import VueJsx from '../src/index.ts'

describe('resolve type', () => {
  describe('runtime props', () => {
    test('basic', async () => {
      const result = await transformAsync(
        `
        interface Props { foo?: string }
        const App = defineComponent((props: Props) => <div />)
        `,
        {
          plugins: [
            [typescript, { isTSX: true }],
            [VueJsx, { resolveType: true }],
          ],
        },
      )
      expect(result!.code).toMatchSnapshot()
    })
  })
})
