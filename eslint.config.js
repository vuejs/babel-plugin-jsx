import { sxzz } from '@sxzz/eslint-config'

export default sxzz(
  { pnpm: true },
  {
    rules: {
      'import/no-default-export': 'off',
      'unicorn/filename-case': 'off',
      'antfu/top-level-function': 'error',
    },
  },
)
