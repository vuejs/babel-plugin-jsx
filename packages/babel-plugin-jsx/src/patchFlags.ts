// https://github.com/vuejs/core/blob/main/packages/shared/src/patchFlags.ts

export const PatchFlags = {
  TEXT: 1,
  CLASS: (1 << 1) as 2,
  STYLE: (1 << 2) as 4,
  PROPS: (1 << 3) as 8,
  FULL_PROPS: (1 << 4) as 16,
  HYDRATE_EVENTS: (1 << 5) as 32,
  STABLE_FRAGMENT: (1 << 6) as 64,
  KEYED_FRAGMENT: (1 << 7) as 128,
  UNKEYED_FRAGMENT: (1 << 8) as 256,
  NEED_PATCH: (1 << 9) as 512,
  DYNAMIC_SLOTS: (1 << 10) as 1024,
  HOISTED: -1,
  BAIL: -2,
} as const

// dev only flag -> name mapping
export const PatchFlagNames: {
  readonly [PatchFlags.CLASS]: 'CLASS'
  readonly [PatchFlags.STYLE]: 'STYLE'
  readonly [PatchFlags.PROPS]: 'PROPS'
  readonly [PatchFlags.FULL_PROPS]: 'FULL_PROPS'
  readonly [PatchFlags.HYDRATE_EVENTS]: 'HYDRATE_EVENTS'
  readonly [PatchFlags.STABLE_FRAGMENT]: 'STABLE_FRAGMENT'
  readonly [PatchFlags.KEYED_FRAGMENT]: 'KEYED_FRAGMENT'
  readonly [PatchFlags.UNKEYED_FRAGMENT]: 'UNKEYED_FRAGMENT'
  readonly [PatchFlags.DYNAMIC_SLOTS]: 'DYNAMIC_SLOTS'
  readonly [PatchFlags.NEED_PATCH]: 'NEED_PATCH'
  readonly [PatchFlags.TEXT]: 'TEXT'
  readonly [PatchFlags.HOISTED]: 'HOISTED'
  readonly [PatchFlags.BAIL]: 'BAIL'
} = {
  [PatchFlags.TEXT]: 'TEXT',
  [PatchFlags.CLASS]: 'CLASS',
  [PatchFlags.STYLE]: 'STYLE',
  [PatchFlags.PROPS]: 'PROPS',
  [PatchFlags.FULL_PROPS]: 'FULL_PROPS',
  [PatchFlags.HYDRATE_EVENTS]: 'HYDRATE_EVENTS',
  [PatchFlags.STABLE_FRAGMENT]: 'STABLE_FRAGMENT',
  [PatchFlags.KEYED_FRAGMENT]: 'KEYED_FRAGMENT',
  [PatchFlags.UNKEYED_FRAGMENT]: 'UNKEYED_FRAGMENT',
  [PatchFlags.DYNAMIC_SLOTS]: 'DYNAMIC_SLOTS',
  [PatchFlags.NEED_PATCH]: 'NEED_PATCH',
  [PatchFlags.HOISTED]: 'HOISTED',
  [PatchFlags.BAIL]: 'BAIL',
} as const
