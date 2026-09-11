/**
 * A client's CMS starter content, in Sapt template-bundle shape.
 *
 * Sapt has no REST write for CMS items, but it does let us create a project
 * template from a bundle and apply it. So `pnpm onboard --create-project`
 * takes the base septic template, swaps its demo starter content for the
 * items composed from the intake record (their settings, the services they
 * offer, their cities, their reviews; the template's FAQ and process steps),
 * saves that as a one-off template, applies it, and deletes it. The client
 * project then starts with their content, not the demo's, and the first
 * scheduled sync has nothing wrong to overwrite.
 *
 * Photos stay the demo's until real ones are uploaded (the form only collects
 * folder links). Pure function, tested in starter-content.test.mjs.
 */
import { slugify } from './onboard-map.mjs'

function deepMerge(base, over) {
  if (over === null || over === undefined) return base
  if (Array.isArray(over) || typeof over !== 'object') return over
  const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) }
  for (const [k, v] of Object.entries(over)) {
    if (v === null || v === undefined) continue
    out[k] = deepMerge(out[k], v)
  }
  return out
}

function schemaKeys(base, typeSlug) {
  const ct = (base.contentTypes || []).find((c) => (c.contentType?.slug ?? c.slug) === typeSlug)
  const schema = ct?.contentType?.schema ?? ct?.schema
  return schema ? new Set(Object.keys(schema)) : null
}

function baseItem(base, typeSlug, slug = 'default') {
  const all = base.starterContent?.items || []
  return all.find((i) => i.contentTypeSlug === typeSlug && i.slug === slug) ?? all.find((i) => i.contentTypeSlug === typeSlug)
}

const mk = (contentTypeSlug, slug, name, content, displayOrder = 0) => ({ contentTypeSlug, slug, name, content, status: 'published', displayOrder, tags: [], publishedAt: null })

/**
 * @param base    the base template bundle (contentTypes + starterContent from `pnpm sapt-template snapshot`)
 * @param client  the bundle from onboardingToBundle(record.data)
 * @returns { items, notes }
 */
export function clientStarterItems(base, client) {
  const notes = []
  const items = []

  // Singletons: the client's values over the template's, limited to what the schema knows.
  const settingsBase = baseItem(base, 'site-settings')
  const keys = schemaKeys(base, 'site-settings')
  const merged = deepMerge(settingsBase?.content ?? {}, client.settings ?? {})
  const settings = keys ? Object.fromEntries(Object.entries(merged).filter(([k]) => keys.has(k))) : merged
  const dropped = Object.keys(client.settings ?? {}).filter((k) => keys && !keys.has(k))
  if (dropped.length) notes.push(`settings keys the CMS schema does not have, not stamped: ${dropped.join(', ')}`)
  items.push(mk('site-settings', 'default', settingsBase?.name ?? 'Site settings', settings))

  const photosBase = baseItem(base, 'site-photos')
  if (photosBase) items.push(mk('site-photos', 'default', photosBase.name, photosBase.content))

  const copyBase = baseItem(base, 'site-copy')
  if (copyBase) items.push(mk('site-copy', 'default', copyBase.name, deepMerge(copyBase.content, client.copy ?? {})))

  // Collections: every published item is a page or a card.
  const seen = new Set()
  const unique = (typeSlug, slug) => {
    let s = slug || 'item'
    for (let n = 2; seen.has(`${typeSlug}/${s}`); n++) s = `${slug}-${n}`
    seen.add(`${typeSlug}/${s}`)
    return s
  }
  const order = (x, i) => x.displayOrder ?? i + 1
  for (const [i, s] of (client.services ?? []).entries()) items.push(mk('service', unique('service', s.content.slug), s.content.title, s.content, order(s, i)))
  for (const [i, c] of (client.cities ?? []).entries()) items.push(mk('city', unique('city', c.content.slug), c.content.name, c.content, order(c, i)))
  for (const [i, f] of (client.faqs ?? []).entries()) items.push(mk('faq', unique('faq', slugify(f.content.question)), f.content.question, f.content, order(f, i)))
  for (const [i, p] of (client.steps ?? []).entries()) items.push(mk('process-step', unique('process-step', slugify(p.content.title)), `${i + 1}. ${p.content.title}`, p.content, order(p, i)))
  for (const [i, r] of (client.reviews ?? []).entries()) items.push(mk('review', unique('review', slugify(`${r.content.name} ${r.content.city}`)), `${r.content.name} — ${r.content.city}`, r.content, order(r, i)))

  return { items, notes }
}
