/**
 * Turn a septic company's existing website into a filled-in intake record.
 *
 *   pnpm draft https://theiroldsite.com
 *   pnpm draft https://theiroldsite.com --pages 15
 *
 * Why this exists: the old flow asked the owner to fill in 53 fields. Almost
 * everything on that form is already published on the website they already
 * have. This reads it, so the call with them becomes "is this right?" instead
 * of "tell us everything about your business".
 *
 * Output is `onboarding/out/<slug>/record.json`, shaped exactly like a
 * `client_onboarding` CRM record, so it feeds the existing pipeline unchanged:
 *
 *   pnpm draft <url>            → record.json  (+ a report of what it found)
 *   pnpm onboard --file <that>  → their site and their Sapt project
 *
 * Three rules this script follows, because a wrong fact on a contractor's site
 * is worse than a missing one:
 *   1. Nothing is invented. Every value comes from a page, and the report says
 *      which page it came from.
 *   2. Claims are never guessed. A license number is only taken when it is
 *      labelled as one. Ratings and review counts are left alone entirely,
 *      because a stale rating copied off an old site is a lie on a new one.
 *   3. Whatever it cannot find is listed under "ask them", not filled with a
 *      plausible default.
 *
 * It reads server-rendered HTML only, which is what these sites are. If a site
 * is a JavaScript app this finds little, and the report will say so.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { slugify } from './lib/onboard-map.mjs'
import { SERVICE_KEYWORDS, extractRecord } from './lib/draft-map.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const UA = 'AirAcquisitionOnboarding/1.0 (+building this client a new site)'

const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const mergeFile = flag('--record')
const maxPages = Number(flag('--pages')) || 12

// The intake form's own record can seed this: it carries the website URL, and
// whatever the client typed themselves outranks anything read off their site.
let typed = {}
if (mergeFile) {
  const p = path.resolve(ROOT, mergeFile)
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
  typed = raw.data ?? raw.record?.data ?? raw
}

const start = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--record' && args[i - 1] !== '--pages') || typed.current_website
if (!start) {
  console.error(`usage: pnpm draft <url of their existing site> [--pages 12] [--record <intake record.json>]

  pnpm draft https://theiroldsite.com
  pnpm draft --record onboarding/out/them/record.json     (reads the URL from the record)`)
  process.exit(2)
}
const startUrl = /^https?:\/\//i.test(start) ? start : `https://${start}`

/** Fetch one page as text. Never throws; a dead page is just an empty page. */
async function get(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' })
    if (!res.ok) return { url, html: '', status: res.status }
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('html')) return { url, html: '', status: res.status }
    return { url: res.url, html: await res.text(), status: res.status }
  } catch (e) {
    return { url, html: '', status: 0, error: e.message }
  }
}

/** Internal links, de-duplicated, ranked so the useful pages get fetched first. */
function crawlTargets(html, baseUrl) {
  const base = new URL(baseUrl)
  const seen = new Map()
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    let href = m[1]
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue
    let u
    try { u = new URL(href, baseUrl) } catch { continue }
    if (u.hostname !== base.hostname) continue
    if (/\.(jpg|jpeg|png|webp|gif|pdf|zip|svg|mp4)$/i.test(u.pathname)) continue
    u.hash = ''
    const key = u.toString()
    const anchor = m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const hay = `${u.pathname} ${anchor}`.toLowerCase()
    // Rank: the pages that carry the facts we need come first.
    let score = 0
    if (/service|septic|pump|repair|install|inspect|drain/.test(hay)) score += 5
    if (/area|location|city|cities|serving|county/.test(hay)) score += 5
    if (/about|our-story|who-we-are|team/.test(hay)) score += 4
    if (/contact/.test(hay)) score += 3
    if (/review|testimonial/.test(hay)) score += 2
    if (/blog|news|post|category|tag|privacy|terms|cart|account|login/.test(hay)) score -= 6
    if (u.pathname === '/' || u.pathname === '') score -= 10
    if (!seen.has(key) || seen.get(key).score < score) seen.set(key, { url: key, anchor, score })
  }
  return [...seen.values()].filter((x) => x.score > 0).sort((a, b) => b.score - a.score)
}

async function main() {
  console.log(`draft: reading ${startUrl}`)
  const home = await get(startUrl)
  if (!home.html) {
    console.error(`could not read ${startUrl}${home.error ? ` (${home.error})` : ` (HTTP ${home.status})`}`)
    process.exit(1)
  }

  const targets = crawlTargets(home.html, home.url).slice(0, maxPages)
  console.log(`  found ${targets.length} pages worth reading`)
  const pages = [{ url: home.url, html: home.html, anchor: 'home' }]
  for (const t of targets) {
    const p = await get(t.url)
    if (p.html) pages.push({ url: p.url, html: p.html, anchor: t.anchor })
    process.stdout.write('.')
  }
  process.stdout.write('\n')

  const { record: scraped, found, missing: rawMissing, photos } = extractRecord(pages, startUrl)

  // Whatever the client typed on the intake form outranks anything read off
  // their site. They know their own phone number better than their old web
  // guy did, and the site is often years out of date.
  const record = { ...scraped }
  const overrides = []
  for (const [k, v] of Object.entries(typed)) {
    if (v === '' || v === undefined || v === null) continue
    if (Array.isArray(v) && v.length === 0) continue
    const had = record[k]
    if (had !== undefined && JSON.stringify(had) !== JSON.stringify(v)) {
      overrides.push(`${k}: kept "${String(v).slice(0, 40)}" from the form, the site said "${String(had).slice(0, 40)}"`)
    }
    record[k] = v
    found[k] = { value: v, from: 'the client typed this on the intake form' }
  }

  // Anything the client already answered is no longer something to ask them.
  const answered = new Set(Object.keys(typed).filter((k) => typed[k] !== '' && typed[k] !== undefined))
  const missing = rawMissing.filter((m) => {
    if (answered.has('owner_phone') && /lead texts/i.test(m)) return false
    if (answered.has('domain') && /own a domain/i.test(m)) return false
    if (answered.has('profile_google') && /review link/i.test(m) && !/rating/i.test(m)) return false
    return true
  })

  const slug = slugify(record.business_name || new URL(startUrl).hostname.replace(/^www\./, ''))
  const out = path.join(ROOT, 'onboarding', 'out', slug)
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, 'record.json'), JSON.stringify({ data: record }, null, 2) + '\n')
  fs.writeFileSync(path.join(out, 'draft-report.json'), JSON.stringify({ source: startUrl, pagesRead: pages.map((p) => p.url), found, missing, photos }, null, 2) + '\n')

  // ── report ──
  console.log(`\ndraft: ${record.business_name || '(no business name found)'}`)
  console.log(`  read      ${pages.length} pages`)
  for (const [field, info] of Object.entries(found)) {
    const value = Array.isArray(info.value) ? `${info.value.length}: ${info.value.slice(0, 4).join(', ')}${info.value.length > 4 ? ' …' : ''}` : String(info.value).slice(0, 90)
    console.log(`  ✓ ${field.padEnd(18)} ${value}`)
    console.log(`    ${''.padEnd(18)} from ${info.from}`)
  }
  if (photos.length) console.log(`  ✓ ${'photos'.padEnd(18)} ${photos.length} candidates (see draft-report.json)`)
  if (overrides.length) {
    console.log('')
    for (const o of overrides) console.log(`  form wins ${o}`)
  }
  console.log('')
  for (const m of missing) console.log(`  ask them  ${m}`)

  console.log(`
wrote onboarding/out/${slug}/record.json

next:
  1. read draft-report.json and fix anything wrong in record.json
  2. pnpm onboard --file onboarding/out/${slug}/record.json --create-project
`)
  if (pages.length <= 1) {
    console.log('note: only the home page was readable. If their site is a JavaScript app there is little to read, and the call has to cover everything.')
  }
  if (!record.business_phone) console.log('note: no phone number found, which usually means the site renders with JavaScript. Check it by hand.')
  void SERVICE_KEYWORDS
}

main().catch((e) => { console.error(`draft failed: ${e.message}`); process.exit(1) })
