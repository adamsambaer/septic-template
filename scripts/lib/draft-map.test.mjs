import { describe, expect, it } from 'vitest'
import { extractRecord, jsonLd, looksLikeProse, metaTag, prettyPhone, textOf } from './draft-map.mjs'

const withLd = `<!doctype html><html><head>
<title>Gulfside Septic | Pumping &amp; Repair</title>
<meta property="og:site_name" content="Gulfside Septic">
<meta property="og:image" content="/img/truck-hero.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"WebSite","name":"ignore me"},
 {"@type":["LocalBusiness","Plumber"],"name":"Gulfside Septic","legalName":"Gulfside Septic LLC",
  "telephone":"+1 239-555-0100","email":"office@gulfside.example",
  "address":{"@type":"PostalAddress","streetAddress":"88 Palm Ave","addressLocality":"Cape Coral","addressRegion":"fl","postalCode":"33904"},
  "openingHours":["Mo-Fr 07:00-18:00","Sa 08:00-14:00"],
  "sameAs":["https://www.facebook.com/gulfside","https://www.yelp.com/biz/gulfside-cape-coral","https://g.page/gulfside"],
  "areaServed":[{"@type":"City","name":"Cape Coral"},{"@type":"City","name":"Naples"}]}]}</script>
</head><body>
<h1>Septic Tank Pumping in Cape Coral</h1>
<h2>Emergency Septic Service</h2>
<h2>Drain Field Repair</h2>
<p>Gulfside Septic has pumped and repaired systems across Lee County and Collier County since 2011. We are fully insured and the person who answers the phone is the person who shows up. Straight pricing, no surprises, and we log every job so you know when you are next due for service.</p>
<p>Short.</p>
<p>We use cookies on this website to improve your experience and for analytics purposes as described in our privacy policy and cookie notice, which you should read.</p>
<img src="/img/logo.png" alt="logo">
<img src="/img/crew-at-work.jpg" alt="Our crew">
<img src="/img/icon-phone.png" alt="">
<script>var junk = "<p>not real markup</p>";</script>
</body></html>`

const noLd = `<html><head><title>Coastal Septic Co. - Broward County Septic</title></head><body>
<a href="tel:+19545550142">Call (954) 555-0142</a>
<a href="mailto:dispatch@coastal.example">Email us</a>
<h2>Septic Inspections</h2>
<p>Licensed and insured. License # SR0011234. Serving Fort Lauderdale, Davie, Plantation and Coral Springs.</p>
<p>Emergency service available 24/7 for backups.</p>
<address>1420 SW 12th Ave, Fort Lauderdale, FL 33315</address>
</body></html>`

const page = (url, html, anchor) => ({ url, html, anchor })

describe('helpers', () => {
  it('strips scripts without eating the page', () => {
    const t = textOf(withLd)
    expect(t).toContain('Gulfside Septic has pumped')
    expect(t).not.toContain('var junk')
    expect(t).not.toContain('not real markup')
  })
  it('reads @graph and skips non-business nodes', () => {
    const nodes = jsonLd(withLd)
    expect(nodes.length).toBeGreaterThan(1)
    expect(nodes.some((n) => n.name === 'Gulfside Septic')).toBe(true)
  })
  it('reads meta tags in either attribute order', () => {
    expect(metaTag(withLd, 'og:site_name')).toBe('Gulfside Septic')
    expect(metaTag('<meta content="x" property="og:title">', 'og:title')).toBe('x')
  })
  it('normalises phone numbers and rejects junk', () => {
    expect(prettyPhone('+1 239-555-0100')).toBe('(239) 555-0100')
    expect(prettyPhone('2395550100')).toBe('(239) 555-0100')
    expect(prettyPhone('555-0100')).toBe('')
  })
})

describe('looksLikeProse', () => {
  it('rejects a flattened navigation bar', () => {
    // This is a real failure: the first run on a live site picked this up as the about blurb.
    expect(looksLikeProse('TOP-RATED SEPTIC SCHEDULE APPOINTMENT (941) 626-1857 Menu Home Services Septic Pumping Septic Repair Drain Field About Contact Us Areas We Serve Free Quote')).toBe(false)
  })
  it('rejects headline soup and shouting', () => {
    expect(looksLikeProse('Septic Pumping Septic Repair Drain Field Replacement New Installations Emergency Service Inspections Commercial Residential Grease Traps Lift Stations')).toBe(false)
    expect(looksLikeProse('WE ARE THE BEST SEPTIC COMPANY IN THE WHOLE OF FLORIDA AND WE WILL ALWAYS TREAT YOU RIGHT EVERY SINGLE TIME YOU CALL US OK')).toBe(false)
  })
  it('accepts a real paragraph', () => {
    expect(looksLikeProse('We have pumped and repaired septic systems across the county for nearly two decades. The person who answers the phone is the person who shows up at your property. We quote before we start, and the number does not change once we are on site.')).toBe(true)
  })
  it('rejects boilerplate and anything too short', () => {
    expect(looksLikeProse('This site uses cookies to improve your experience. Read our privacy policy for more information about how we handle your data and your rights.')).toBe(false)
    expect(looksLikeProse('We pump septic tanks. Call us today.')).toBe(false)
  })
})

describe('extractRecord with structured data', () => {
  const { record, found, photos, missing } = extractRecord(
    [page('https://gulfside.example/', withLd, 'home')],
    'https://gulfside.example'
  )

  it('takes identity, contact and address from JSON-LD', () => {
    expect(record.business_name).toBe('Gulfside Septic')
    expect(record.legal_name).toBe('Gulfside Septic LLC')
    expect(record.business_phone).toBe('(239) 555-0100')
    expect(record.email_public).toBe('office@gulfside.example')
    expect(record.address_street).toBe('88 Palm Ave')
    expect(record.address_city).toBe('Cape Coral')
    expect(record.address_state).toBe('FL')
    expect(record.address_zip).toBe('33904')
    expect(record.office_hours).toContain('Mo-Fr 07:00-18:00')
  })
  it('picks the listing links apart by platform', () => {
    expect(record.profile_facebook).toContain('facebook.com')
    expect(record.profile_yelp).toContain('yelp.com')
    expect(record.profile_google).toContain('g.page')
  })
  it('reads areaServed as the city list', () => {
    expect(record.cities).toEqual(['Cape Coral', 'Naples'])
  })
  it('detects only the services the headings actually name', () => {
    expect(record.services_offered).toEqual(expect.arrayContaining(['pumping', 'emergency', 'drain_field']))
    expect(record.services_offered).not.toContain('install')
  })
  it('reads counties and years in business from the prose', () => {
    expect(record.counties).toEqual(expect.arrayContaining(['Lee County', 'Collier County']))
    expect(record.years_in_business).toBe(new Date().getFullYear() - 2011)
    expect(record.insured).toBe(true)
  })
  it('picks a real about paragraph, not boilerplate', () => {
    expect(record.about_blurb).toContain('pumped and repaired')
    expect(record.about_blurb).not.toContain('cookies')
  })
  it('keeps content photos and drops logos and icons', () => {
    const urls = photos.map((p) => p.url)
    expect(urls.some((u) => u.includes('crew-at-work'))).toBe(true)
    expect(urls.some((u) => u.includes('logo'))).toBe(false)
    expect(urls.some((u) => u.includes('icon-phone'))).toBe(false)
    expect(urls.some((u) => u.includes('truck-hero'))).toBe(true)
  })
  it('records where every value came from', () => {
    expect(found.business_phone.from).toMatch(/JSON-LD/)
    expect(Object.keys(found).length).toBeGreaterThan(10)
  })
  it('never invents a rating, and always asks for one', () => {
    expect(record.google_rating).toBeUndefined()
    expect(record.google_review_count).toBeUndefined()
    expect(missing.join(' ')).toMatch(/rating/i)
    expect(missing.join(' ')).toMatch(/insurance/i)
    expect(missing.join(' ')).toMatch(/lead texts/i)
  })
})

describe('extractRecord without structured data', () => {
  const { record } = extractRecord(
    [
      page('https://coastal.example/', noLd, 'home'),
      page('https://coastal.example/service-area/pompano-beach-fl', '<h1>Pompano Beach</h1>', 'Pompano Beach'),
    ],
    'https://coastal.example'
  )

  it('falls back to the title, tel: and mailto:', () => {
    expect(record.business_name).toBe('Coastal Septic Co.')
    expect(record.business_phone).toBe('(954) 555-0142')
    expect(record.email_public).toBe('dispatch@coastal.example')
  })
  it('reads the address out of the text', () => {
    expect(record.address_city).toBe('Fort Lauderdale')
    expect(record.address_state).toBe('FL')
    expect(record.address_zip).toBe('33315')
  })
  it('reads cities from serving-wording and from city page URLs', () => {
    expect(record.cities).toEqual(expect.arrayContaining(['Fort Lauderdale', 'Davie', 'Plantation', 'Coral Springs']))
    expect(record.cities).toEqual(expect.arrayContaining(['Pompano Beach']))
  })
  it('takes a licence number only when it is labelled, and flags it for checking', () => {
    expect(record.license_number).toBe('SR0011234')
    expect(record.license_label).toMatch(/verify/i)
  })
  it('sets the emergency flag from explicit 24/7 wording', () => {
    expect(record.emergency_24_7).toBe(true)
  })
})

describe('city extraction the way real sites write it', () => {
  const nav = `<html><body>
    <h1>Septic Service in Southwest Florida</h1>
    <p>Our primary area of service is Punta Gorda, FL and the surrounding communities.</p>
    <nav><a href="/service-areas/port-charlotte/">Port Charlotte</a>
         <a href="/service-areas/north-port/">North Port, FL</a>
         <a href="/service-areas/">Areas We Serve</a>
         <a href="/services/septic-pumping/">Septic Pumping</a></nav>
  </body></html>`
  const { record } = extractRecord([page('https://elrod.example/', nav, 'home')], 'https://elrod.example')

  it('finds towns from "Town, FL" and from service-area links', () => {
    expect(record.cities).toEqual(expect.arrayContaining(['Punta Gorda', 'Port Charlotte', 'North Port']))
  })
  it('does not mistake navigation labels or services for towns', () => {
    expect(record.cities).not.toContain('Areas We Serve')
    expect(record.cities).not.toContain('Septic Pumping')
    expect(record.cities.every((c) => !/County|Florida/.test(c))).toBe(true)
  })
})

describe('thin results are flagged, not passed off as complete', () => {
  it('flags a one-town coverage list for confirmation', () => {
    const html = '<html><body><h1>Septic Pumping</h1><p>We work in Punta Gorda, FL and nearby.</p></body></html>'
    const { record, missing } = extractRecord([page('https://x.example/', html)], 'https://x.example')
    expect(record.cities).toEqual(['Punta Gorda'])
    expect(missing.join(' ')).toMatch(/only 1 town found/)
  })
  it('flags a single detected service', () => {
    const html = '<html><body><h1>Septic Pumping</h1><p>Tanks pumped.</p></body></html>'
    const { missing } = extractRecord([page('https://y.example/', html)], 'https://y.example')
    expect(missing.join(' ')).toMatch(/only 1 service detected/)
  })
})

describe('extractRecord on a page with nothing on it', () => {
  it('returns no invented values and lists everything as missing', () => {
    const { record, missing } = extractRecord([page('https://empty.example/', '<html><body></body></html>')], 'https://empty.example')
    expect(record.business_phone).toBeUndefined()
    expect(record.services_offered).toBeUndefined()
    expect(record.domain).toBe('empty.example')
    expect(missing.length).toBeGreaterThan(5)
  })
})
