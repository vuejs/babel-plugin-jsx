import { transformAsync } from '@babel/core'
// @ts-expect-error missing types
import typescript from '@babel/plugin-syntax-typescript'
import VueJsx from '../src'

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
