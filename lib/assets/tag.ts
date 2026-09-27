export function makeAssetTag(index = 0) {
  const suffix = `${Date.now().toString(36)}${index}`.slice(-6).toUpperCase();
  return `AST-${suffix}`;
}

export function allocateAssetTag(used: Set<string>, index = 0) {
  for (let offset = 0; offset < 80; offset += 1) {
    const tag = makeAssetTag(index + offset);
    if (!used.has(tag.toUpperCase())) {
      used.add(tag.toUpperCase());
      return tag;
    }
  }
  const fallback = `AST-${Date.now().toString(36).toUpperCase()}${index}`.slice(0, 40);
  used.add(fallback.toUpperCase());
  return fallback;
}
