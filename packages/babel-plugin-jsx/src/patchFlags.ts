// https://github.com/vuejs/vue-next/blob/master/packages/shared/src/patchFlags.ts
// tslint:disable: no-bitwise
export const enum PatchFlags {
  TEXT = 1,
  CLASS = 1 << 1,
  STYLE = 1 << 2,
  PROPS = 1 << 3,
  FULL_PROPS = 1 << 4,
  HYDRATE_EVENTS = 1 << 5,
  STABLE_FRAGMENT = 1 << 6,
  KEYED_FRAGMENT = 1 << 7,
  UNKEYED_FRAGMENT = 1 << 8,
  NEED_PATCH = 1 << 9,
  DYNAMIC_SLOTS = 1 << 10,
  HOISTED = -1,
  BAIL = -2
}

// dev only flag -> name mapping
export const PatchFlagNames = {
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
};
