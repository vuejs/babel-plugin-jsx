import { transformAsync } from '@babel/core';
import typescript from '@babel/plugin-syntax-typescript';
import jsx from '@babel/plugin-syntax-jsx';

import VueJsx from '../src';

describe('resolve type', () => {
  describe('runtime props', () => {
    test('basic', async () => {
      const result = await transformAsync(
        `
        interface Props { foo?: string }
        const App = defineComponent((props: Props) => <div />)
        `,
        {
          plugins: [typescript, jsx, [VueJsx, { resolveType: true }]],
        }
      );
      expect(result!.code).toMatchSnapshot();
    });
  });
});
