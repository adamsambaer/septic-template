/**
 * Re-bind workflow HTTP actions after a template is applied.
 *
 * When Sapt snapshots a project it scrubs every HTTP action's url, headers and
 * body from the bundle and leaves a marker in their place:
 *
 *   "__sapt_template_rebind_required__:actions[0].http.body.template"
 *
 * A project stamped from the template therefore has workflows that cannot run
 * until those fields are filled again. The agency project still holds the real
 * values (they come back unredacted over REST), so onboarding copies them
 * across by workflow name and action index, filling {{owner_mobile}} and
 * {{from_number}} on the way. Secrets are never copied: the Telnyx key is a
 * `{{credentials.telnyx_api_key}}` reference, resolved per project at run time.
 *
 * Pure function, unit-tested in rebind.test.mjs.
 */

export const MARKER = '__sapt_template_rebind_required__:'

/** Resolve "actions[2].http.headers.Authorization" against a source actions array. */
function lookup(actions, markerPath) {
  const m = markerPath.match(/^actions\[(\d+)\]\.(.*)$/)
  if (!m) return undefined
  let node = actions[Number(m[1])]
  for (const key of m[2].split('.')) {
    if (node == null) return undefined
    // The marker path names an `http` sub-object that the stored action shape does not have.
    if (key === 'http' && !(key in node)) continue
    node = node[key]
  }
  return node
}

function fill(value, vars) {
  if (typeof value !== 'string') return value
  return value.replace(/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g, (all, name) => (vars[name] ? vars[name] : all))
}

/**
 * Returns { actions, bound, unresolved }:
 *   actions     the destination actions with every marker replaced
 *   bound       marker paths that were filled
 *   unresolved  marker paths with no source value (left as-is so they stay visible)
 */
export function rebindActions(dstActions, srcActions, vars = {}) {
  const bound = []
  const unresolved = []
  const walk = (v) => {
    if (typeof v === 'string') {
      if (!v.startsWith(MARKER)) return v
      const p = v.slice(MARKER.length)
      const found = lookup(srcActions || [], p)
      if (found === undefined) { unresolved.push(p); return v }
      bound.push(p)
      return fill(found, vars)
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      const o = {}
      for (const [k, val] of Object.entries(v)) o[k] = walk(val)
      return o
    }
    return v
  }
  return { actions: walk(dstActions), bound, unresolved }
}

/** True when any string in the actions still carries the marker. */
export function needsRebind(actions) {
  return JSON.stringify(actions ?? []).includes(MARKER)
}
