/**
 * Pull a septic company's facts out of their existing website. Pure: no
 * network, no filesystem. The fetching lives in scripts/draft-from-site.mjs.
 *
 * Priority order, most reliable first:
 *   1. JSON-LD LocalBusiness / Organization. Most of these sites are WordPress
 *      with Yoast or RankMath, which publish name, phone, address, hours and
 *      profile links as structured data. When it is there it is exact.
 *   2. Meta tags and tel:/mailto: links.
 *   3. Body text, for the things nobody marks up: counties, cities, licence
 *      numbers, the about paragraph.
 *
 * What it deliberately does NOT extract: star ratings, review counts and
 * review text. A rating copied off an old site is a claim the new site cannot
 * stand behind, and it goes stale silently. Those are always asked for.
 */

/** Which of the six template services a page or heading is talking about. */
export const SERVICE_KEYWORDS = {
  emergency: /emergency|24[\s/-]?7|24 hour|after[\s-]?hours|backed[\s-]?up|backup|back[\s-]?up|overflow/i,
  pumping: /pump(?:ing|[\s-]?out|ed)?\b|clean[\s-]?out|tank cleaning|septic cleaning/i,
  inspection: /inspect|real[\s-]?estate|point[\s-]?of[\s-]?sale|certification|evaluation/i,
  repair: /repair|fix|pump replacement|baffle|riser|lid|alarm/i,
  drain_field: /drain[\s-]?field|drainfield|leach[\s-]?field|leach bed/i,
  install: /install|new system|replace(?:ment)? system|new construction|tank replacement/i,
}

const US_STATES = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC'

/** Visible text of a page. The lazy quantifiers matter: a greedy one eats the page. */
export function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#0?39;|&apos;|&rsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Every JSON-LD object on the page, with @graph flattened out. */
export function jsonLd(html) {
  const out = []
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed
    try { parsed = JSON.parse(m[1].trim()) } catch { continue }
    const push = (node) => {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) return node.forEach(push)
      if (Array.isArray(node['@graph'])) node['@graph'].forEach(push)
      out.push(node)
    }
    push(parsed)
  }
  return out
}

const typeOf = (node) => [].concat(node['@type'] ?? []).join(' ')
const BUSINESS_TYPE = /LocalBusiness|Organization|ProfessionalService|HomeAndConstructionBusiness|Plumber|GeneralContractor|Contractor/i

export function metaTag(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')
  const alt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')
  return (html.match(re) ?? html.match(alt) ?? [])[1] ?? ''
}

const digits = (s) => String(s).replace(/\D/g, '')
export function prettyPhone(raw) {
  const d = digits(raw)
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  if (ten.length !== 10) return ''
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}

function absUrl(src, base) {
  try { return new URL(src, base).toString() } catch { return '' }
}

/**
 * Is this a written sentence or a navigation bar that happened to be wrapped
 * in a <p>? Menus on these sites flatten into things like
 * "TOP-RATED SEPTIC SCHEDULE APPOINTMENT (941) 626-1857 Menu Home Services",
 * which is long enough to pass a length check and useless as an about blurb.
 */
export function looksLikeProse(t) {
  if (/cookie|privacy policy|copyright|all rights reserved|©/i.test(t)) return false
  if (/\b(?:menu|skip to content|toggle navigation|schedule appointment|call now|read more|click here)\b/i.test(t)) return false
  if (/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(t)) return false // nav bars carry the phone number
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length < 22) return false
  const sentences = (t.match(/[.!?](?:\s|$)/g) ?? []).length
  if (sentences < 2) return false
  const capitalised = words.filter((w) => /^[A-Z]/.test(w)).length
  if (capitalised / words.length > 0.42) return false // a list of headings, not prose
  const shouty = words.filter((w) => w.length > 2 && w === w.toUpperCase()).length
  if (shouty / words.length > 0.15) return false
  return true
}

/**
 * @param {{url:string, html:string, anchor?:string}[]} pages  home page first
 * @param {string} startUrl
 */
export function extractRecord(pages, startUrl) {
  const found = {}
  const record = {}
  const note = (field, value, from) => {
    if (value === '' || value === undefined || value === null) return
    if (Array.isArray(value) && value.length === 0) return
    record[field] = value
    found[field] = { value, from }
  }

  const home = pages[0]
  const host = (() => { try { return new URL(startUrl).hostname.replace(/^www\./, '') } catch { return '' } })()
  const allText = pages.map((p) => textOf(p.html)).join('\n')

  // ── 1. structured data ───────────────────────────────────────────────────
  let biz = null
  let bizPage = ''
  for (const p of pages) {
    const hit = jsonLd(p.html).find((n) => BUSINESS_TYPE.test(typeOf(n)))
    if (hit) { biz = hit; bizPage = p.url; break }
  }

  if (biz) {
    note('business_name', String(biz.name ?? '').trim(), `JSON-LD on ${bizPage}`)
    if (biz.legalName) note('legal_name', String(biz.legalName).trim(), `JSON-LD on ${bizPage}`)
    const phone = prettyPhone(biz.telephone ?? '')
    if (phone) note('business_phone', phone, `JSON-LD on ${bizPage}`)
    if (typeof biz.email === 'string' && biz.email.includes('@')) note('email_public', biz.email.replace(/^mailto:/, ''), `JSON-LD on ${bizPage}`)
    const a = biz.address && typeof biz.address === 'object' ? biz.address : null
    if (a) {
      note('address_street', String(a.streetAddress ?? '').trim(), `JSON-LD on ${bizPage}`)
      note('address_city', String(a.addressLocality ?? '').trim(), `JSON-LD on ${bizPage}`)
      note('address_state', String(a.addressRegion ?? '').trim().toUpperCase().slice(0, 2), `JSON-LD on ${bizPage}`)
      note('address_zip', String(a.postalCode ?? '').trim(), `JSON-LD on ${bizPage}`)
    }
    const hours = [].concat(biz.openingHours ?? []).filter((h) => typeof h === 'string')
    if (hours.length) note('office_hours', hours.join(', '), `JSON-LD on ${bizPage}`)
    const same = [].concat(biz.sameAs ?? []).filter((u) => typeof u === 'string')
    for (const [field, re] of [
      ['profile_google', /google\.com\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|g\.page/i],
      ['profile_yelp', /yelp\.com/i],
      ['profile_facebook', /facebook\.com/i],
      ['profile_bbb', /bbb\.org/i],
    ]) {
      const hit = same.find((u) => re.test(u))
      if (hit) note(field, hit, `JSON-LD sameAs on ${bizPage}`)
    }
    const areas = [].concat(biz.areaServed ?? [])
      .map((x) => (typeof x === 'string' ? x : x?.name))
      .filter((x) => typeof x === 'string' && x.trim())
    if (areas.length) note('cities', [...new Set(areas.map((s) => s.trim()))].slice(0, 24), `JSON-LD areaServed on ${bizPage}`)
  }

  // ── 2. meta + links, to fill what structured data missed ─────────────────
  if (!record.business_name) {
    const n = metaTag(home.html, 'og:site_name') || (home.html.match(/<title[^>]*>([^<]+)/i) ?? [])[1] || ''
    const cleaned = n.split(/[|–—]|(?: - )/)[0].replace(/\s+/g, ' ').trim()
    note('business_name', cleaned, `page title on ${home.url}`)
  }
  if (!record.business_phone) {
    for (const p of pages) {
      const tel = (p.html.match(/href=["']tel:([^"']+)["']/i) ?? [])[1]
      const phone = prettyPhone(tel ?? '')
      if (phone) { note('business_phone', phone, `tel: link on ${p.url}`); break }
    }
  }
  if (!record.business_phone) {
    const m = allText.match(/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/)
    if (m) note('business_phone', prettyPhone(m[0]), 'phone number in the page text')
  }
  if (!record.email_public) {
    for (const p of pages) {
      const mail = (p.html.match(/href=["']mailto:([^"'?]+)["']/i) ?? [])[1]
      if (mail && mail.includes('@')) { note('email_public', mail.trim(), `mailto: link on ${p.url}`); break }
    }
  }
  for (const [field, re] of [
    ['profile_google', /https?:\/\/(?:www\.)?(?:g\.page|maps\.app\.goo\.gl)\/[^\s"'<>]+/i],
    ['profile_yelp', /https?:\/\/(?:www\.)?yelp\.com\/biz\/[^\s"'<>]+/i],
    ['profile_facebook', /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i],
    ['profile_bbb', /https?:\/\/(?:www\.)?bbb\.org\/[^\s"'<>]+/i],
  ]) {
    if (record[field]) continue
    for (const p of pages) {
      const hit = (p.html.match(re) ?? [])[0]
      if (hit) { note(field, hit.replace(/["'<>].*$/, ''), `link on ${p.url}`); break }
    }
  }

  // ── 3. address from text, when there was no structured data ──────────────
  if (!record.address_city) {
    const m = allText.match(new RegExp(`([A-Z][A-Za-z.'-]+(?: [A-Z][A-Za-z.'-]+){0,2}),\\s*(${US_STATES})\\s+(\\d{5})`))
    if (m) {
      note('address_city', m[1], 'address in the page text')
      note('address_state', m[2], 'address in the page text')
      note('address_zip', m[3], 'address in the page text')
    }
  }

  // ── 4. services: which of the six they actually talk about ───────────────
  // A service counts when a heading or a page title names it, not when the
  // word appears once in a footer.
  const headings = []
  for (const p of pages) {
    for (const m of p.html.matchAll(/<h[1-3][^>]*>([\s\S]{0,160}?)<\/h[1-3]>/gi)) headings.push(textOf(m[1]))
    if (p.anchor) headings.push(p.anchor)
    try { headings.push(decodeURIComponent(new URL(p.url).pathname).replace(/[-/]+/g, ' ')) } catch { /* ignore */ }
  }
  const headingText = headings.join(' | ')
  const services = Object.entries(SERVICE_KEYWORDS).filter(([, re]) => re.test(headingText)).map(([k]) => k)
  if (services.length) note('services_offered', services, 'headings and page names')

  // ── 5. counties and cities ───────────────────────────────────────────────
  const counties = [...new Set([...allText.matchAll(/\b([A-Z][a-z]+(?:[- ][A-Z][a-z]+)?)\s+County\b/g)].map((m) => `${m[1]} County`))]
  if (counties.length) note('counties', counties.slice(0, 8), 'county names in the page text')

  if (!record.cities) {
    const cities = new Set()
    const add = (raw) => {
      const c = String(raw).replace(/\s+/g, ' ').trim().replace(/[.,]$/, '')
      if (!/^[A-Z][A-Za-z.'-]*(?: [A-Z][A-Za-z.'-]*){0,2}$/.test(c)) return
      if (c.length < 4 || c.length > 34) return
      if (/\b(?:County|Florida|Service|Septic|Tank|Pumping|Repair|Home|About|Contact|Areas?|Menu|Call|Us|We|Our|The|And|More|Free|Now)\b/i.test(c)) return
      cities.add(c)
    }
    // "Serving Davie, Plantation and Coral Springs"
    for (const m of allText.matchAll(/\b(?:serving|service areas?|we serve|areas we serve|proudly serve[sd]?)\b[:\s]+([^.!?]{10,260})/gi)) {
      for (const part of m[1].split(/,|\band\b|\||\//)) add(part.replace(/\b(?:county|areas?|florida|fl)\b/gi, '').replace(/[^A-Za-z .'-]/g, ' '))
    }
    // "Punta Gorda, FL" anywhere in the text, which is how most of them write it
    for (const m of allText.matchAll(new RegExp(`\\b([A-Z][A-Za-z.'-]+(?: [A-Z][A-Za-z.'-]+){0,2}),\\s*(?:${US_STATES}|Florida)\\b`, 'g'))) add(m[1])
    // link anchors: city pages are usually a nav list of plain town names
    for (const p of pages) {
      for (const m of p.html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,60}?)<\/a>/gi)) {
        const href = m[1].toLowerCase()
        const anchor = textOf(m[2])
        if (/area|location|city|cities|serving|we-serve/.test(href)) add(anchor.replace(/,?\s*(?:FL|Florida)$/i, ''))
      }
      // and the URLs themselves: /service-area/davie, /locations/plantation-fl
      try {
        const seg = decodeURIComponent(new URL(p.url).pathname).split('/').filter(Boolean)
        if (seg.length >= 2 && /area|location|city|cities|serving/i.test(seg[seg.length - 2])) {
          add(seg[seg.length - 1].replace(/-(fl|florida)$/i, '').replace(/-/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase()))
        }
      } catch { /* ignore */ }
    }
    if (cities.size) note('cities', [...cities].slice(0, 24), 'service-area wording, city links and "Town, FL" in the text')
  }

  // ── 6. claims: only when the page says it in so many words ───────────────
  if (/\b(?:24[\s/-]?7|24 hours a day|emergency service|emergency septic)\b/i.test(allText)) {
    note('emergency_24_7', true, 'the site says it offers emergency service')
  }
  if (/\b(?:fully )?insured\b/i.test(allText)) note('insured', true, 'the site says insured')

  const lic = allText.match(/\b(?:lic(?:ense|ence)?|registration|reg\.?)\s*(?:#|no\.?|number)?\s*[:#-]?\s*([A-Z]{1,4}[-\s]?\d[\dA-Z-]{3,})/i)
  if (lic) {
    note('license_number', lic[1].replace(/\s+/g, ''), 'a labelled licence number in the page text')
    note('license_label', 'Verify with the state before publishing', 'flagged for checking')
  }

  const since = allText.match(/\b(?:since|established|est\.?|serving .{0,40}? since)\s+((?:19|20)\d{2})\b/i)
  if (since) {
    const years = new Date().getFullYear() - Number(since[1])
    if (years > 0 && years < 120) note('years_in_business', years, `the site says "since ${since[1]}"`)
  } else {
    const yrs = allText.match(/\b(\d{1,3})\+?\s*years?\s+(?:of\s+)?(?:experience|in business|serving)/i)
    if (yrs && Number(yrs[1]) < 120) note('years_in_business', Number(yrs[1]), 'the site claims years of experience')
  }

  // ── 7. about paragraph ───────────────────────────────────────────────────
  const aboutPage = pages.find((p) => /about|our-story|who-we-are/i.test(p.url)) ?? home
  const paras = [...aboutPage.html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => textOf(m[1]))
  const blurb = paras.filter((t) => t.length >= 140 && t.length <= 700).filter(looksLikeProse).sort((a, b) => b.length - a.length)[0]
  if (blurb) note('about_blurb', blurb.slice(0, 600), `a paragraph on ${aboutPage.url}`)

  // ── 8. identity ──────────────────────────────────────────────────────────
  note('domain', host, 'the site itself')
  note('current_website', startUrl, 'the site itself')

  // ── 9. photo candidates, biggest-looking first ───────────────────────────
  const photos = []
  const seenPhoto = new Set()
  for (const p of pages) {
    for (const m of p.html.matchAll(/<img\b[^>]*?src=["']([^"']+)["'][^>]*>/gi)) {
      const url = absUrl(m[1], p.url)
      if (!url || seenPhoto.has(url)) continue
      if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue
      if (/logo|icon|favicon|sprite|badge|avatar|placeholder|spacer|pixel|emoji/i.test(url)) continue
      if (/\b(?:1|16|24|32|48|64)x(?:1|16|24|32|48|64)\b/.test(url)) continue
      seenPhoto.add(url)
      const alt = (m[0].match(/alt=["']([^"']*)["']/i) ?? [])[1] ?? ''
      photos.push({ url, alt, page: p.url })
    }
  }
  const og = metaTag(home.html, 'og:image')
  if (og && !seenPhoto.has(absUrl(og, home.url))) photos.unshift({ url: absUrl(og, home.url), alt: 'og:image', page: home.url })

  // ── 10. what it could not get ────────────────────────────────────────────
  const missing = []
  const need = {
    business_name: 'business name',
    business_phone: 'main phone number',
    address_city: 'city',
    address_state: 'state',
    services_offered: 'which services they offer',
    cities: 'the towns they cover',
    counties: 'counties',
  }
  for (const [k, label] of Object.entries(need)) if (!record[k]) missing.push(`${label} (nothing usable on the site)`)
  // Finding a thin list is more dangerous than finding none, because nothing
  // flags it and the site ships with one city page. Say so out loud.
  if (record.cities && record.cities.length < 3) {
    missing.push(`only ${record.cities.length} town${record.cities.length === 1 ? '' : 's'} found (${record.cities.join(', ')}); confirm the real list, a one-town coverage map is almost always wrong`)
  }
  if (record.services_offered && record.services_offered.length < 2) {
    missing.push(`only ${record.services_offered.length} service detected (${record.services_offered.join(', ')}); confirm what they actually offer`)
  }
  missing.push('the mobile that should receive new lead texts')
  missing.push('Google rating and review count, and their review link (never copied from an old site, it goes stale)')
  missing.push('certificate of insurance')
  missing.push('whether they own a domain or we register one')
  if (record.license_number) missing.push(`confirm licence ${record.license_number} is current, and who issued it`)
  else missing.push('licence number, if they hold one')

  return { record, found, missing, photos: photos.slice(0, 40) }
}
