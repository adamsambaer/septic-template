/**
 * Turn the demo company's literals inside a Sapt project bundle into
 * {{variables}}, client-side.
 *
 * Sapt's snapshot endpoint has its own `tokenize` option, but combining it
 * with `starterContent` corrupts every item's publishedAt (verified 11 Sep
 * 2026: "expected date, received Date"). So the snapshot is captured plain and
 * this module rewrites the bundle before it is patched back.
 *
 * Pure functions, no I/O, unit-tested in template-tokens.test.mjs.
 */

/** Demo literals → template variables. Longer, more specific strings first. */
export const TOKENS = [
  { find: 'Coastal Septic Co. LLC', var: 'legalName', label: 'Legal business name', example: 'Gulfside Septic LLC' },
  { find: 'Coastal Septic Co.', var: 'companyName', label: 'Company name', example: 'Gulfside Septic', required: true },
  { find: '(954) 555-0142', var: 'phone', label: 'Phone, as displayed', example: '(239) 555-0100', required: true },
  { find: '+19545550142', var: 'phoneE164', label: 'Phone, dialable (+1…)', example: '+12395550100', required: true },
  { find: 'dispatch@coastalseptic.example', var: 'email', label: 'Public email', example: 'office@client.com' },
  { find: 'https://coastalseptic.example', var: 'siteUrl', label: 'Site URL', example: 'https://www.client.com' },
  { find: '1420 SW 12th Ave', var: 'street', label: 'Street address', example: '88 Palm Ave' },
  { find: '33315', var: 'zip', label: 'ZIP', example: '33904' },
  { find: '#E8631A', var: 'primaryHex', label: 'Primary brand color', example: '#1D6FB8' },
  { find: '#C4392C', var: 'accentHex', label: 'Emergency color', example: '#C4392C' },
]

/** Declared but not tokenized: no demo literal exists, the workflows already carry the {{placeholder}}. */
export const EXTRA_VARIABLES = [
  { name: 'owner_mobile', label: "Owner's mobile (E.164), receives lead alerts", example: '+12395550110', required: false },
  { name: 'from_number', label: 'Telnyx sending number (E.164)', example: '+12395550199', required: false },
  { name: 'google_review_url', label: 'Google review link, sent by the review-request texts', example: 'https://g.page/r/xxxx/review', required: false },
]

/** The `variables` array Sapt stores on the template (and reports as missing at apply). */
export function variableDeclarations(tokens = TOKENS) {
  return [
    ...tokens.filter((t, i, a) => a.findIndex((x) => x.var === t.var) === i).map(({ var: name, label, example, required }) => ({ name, label, type: 'string', example, required: Boolean(required) })),
    ...EXTRA_VARIABLES.map((x) => ({ ...x, type: 'string' })),
  ]
}

function matcher(find) {
  const esc = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (/^#[0-9a-f]{6}$/i.test(find)) return new RegExp(esc, 'gi') // hex colors: case-insensitive
  if (/^\d+$/.test(find)) return new RegExp(`(?<!\\d)${esc}(?!\\d)`, 'g') // bare numbers (ZIP): whole number only
  return new RegExp(esc, 'g')
}

/**
 * Replace every demo literal inside every string *value* of the bundle.
 * Object keys are never touched. Returns a new bundle plus a per-variable hit count.
 */
export function tokenizeBundle(bundle, tokens = TOKENS) {
  const rules = tokens.map((t) => ({ ...t, re: matcher(t.find) }))
  const hits = {}
  const walk = (v) => {
    if (typeof v === 'string') {
      let s = v
      for (const r of rules) {
        const n = (s.match(r.re) || []).length
        if (!n) continue
        hits[r.var] = (hits[r.var] || 0) + n
        s = s.replace(r.re, `{{${r.var}}}`)
      }
      return s
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      const o = {}
      for (const [k, val] of Object.entries(v)) o[k] = walk(val)
      return o
    }
    return v
  }
  return { bundle: walk(bundle), hits }
}

/**
 * Blank every starter item's publishedAt. Sapt stores the bundle as JSON, so
 * the value is a string, and its apply step calls `.toISOString()` on it and
 * throws ("e.toISOString is not a function", verified 12 Sep 2026). With null
 * the item still applies as published. Mutates and returns the bundle.
 */
export function stripStarterDates(bundle) {
  for (const item of bundle.starterContent?.items ?? []) item.publishedAt = null
  return bundle
}

const AGENCY_TYPE_SLUGS = new Set(['client_onboarding'])
const AGENCY_TAG = 'agency-ops'
const mentionsAgency = (x) => JSON.stringify(x).includes('client_onboarding')

/**
 * Remove what belongs to the agency, not the client: the intake CRM type, the
 * workflows that watch it (tag `agency-ops` or triggered by it), relations and
 * sidebar sections that point at it. Mutates and returns the list of removals.
 */
export function stripAgency(bundle) {
  const removed = []
  const drop = (arr, pred, label) => {
    if (!Array.isArray(arr)) return arr
    return arr.filter((x) => {
      const hit = pred(x)
      if (hit) removed.push(`${label} ${x.name ?? x.slug ?? x.title ?? ''}`.trim())
      return !hit
    })
  }
  bundle.objectTypes = drop(bundle.objectTypes, (t) => AGENCY_TYPE_SLUGS.has(t.slug), 'objectType')
  bundle.objectRelations = drop(bundle.objectRelations, mentionsAgency, 'objectRelation')
  bundle.workflows = drop(bundle.workflows, (w) => (w.tags || []).includes(AGENCY_TAG) || w.triggerTypeSlug === 'client_onboarding' || mentionsAgency(w.trigger ?? {}), 'workflow')
  if (bundle.sidebar?.sections) bundle.sidebar.sections = drop(bundle.sidebar.sections, mentionsAgency, 'sidebarSection')
  return removed
}

/**
 * Strings that still smell like the demo company after tokenizing, with their
 * path, so a missed literal is visible instead of shipping to a client.
 */
export function residue(bundle, patterns = [/coastal ?septic/i, /954\D{0,3}555/, /(?<!\d)33315(?!\d)/, /#e8631a/i], limit = 12) {
  const out = []
  const walk = (v, p) => {
    if (out.length >= limit) return
    if (typeof v === 'string') {
      if (patterns.some((re) => re.test(v))) out.push({ path: p, value: v.length > 90 ? v.slice(0, 87) + '…' : v })
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`))
    else if (v && typeof v === 'object') for (const [k, val] of Object.entries(v)) walk(val, p ? `${p}.${k}` : k)
  }
  walk(bundle, '')
  return out
}
