/**
 * Config merge and copy templating.
 *
 * `deepMerge` lays the CMS snapshot over the demo defaults: objects merge
 * key by key, arrays and scalars replace, null and undefined are skipped so
 * a blank CMS field never wipes a default by accident. (The pull script
 * normalises the fields where "blank" must win, like the license number.)
 *
 * `fill` swaps {placeholders} in copy strings. Unknown placeholders are left
 * in place so a typo is visible on the page instead of silently vanishing.
 */

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch as T
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) continue
    const current = base[key]
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value
  }
  return out as T
}

export function fill(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    vars[key] === undefined ? match : String(vars[key])
  )
}
