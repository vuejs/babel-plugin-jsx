declare function transformOn(
  obj: Record<string, any>
): Record<`on${string}`, any>;

export { transformOn as default, transformOn as 'module.exports' };
