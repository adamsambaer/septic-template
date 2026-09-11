import { describe, expect, it } from 'vitest'
import { onboardingToBundle } from './onboard-map.mjs'
import { clientStarterItems } from './starter-content.mjs'

const base = {
  contentTypes: [{ contentType: { slug: 'site-settings', schema: { companyName: {}, phoneNumber: {}, areaCounties: {}, theme: {}, heroHeadline: {} } } }],
  starterContent: {
    enabled: true,
    items: [
      { contentTypeSlug: 'site-settings', slug: 'default', name: 'Site settings', content: { companyName: '{{companyName}}', phoneNumber: '{{phone}}', areaCounties: ['Broward County'], theme: 'themedrk', heroHeadline: 'Clean property.' }, status: 'published', displayOrder: 0, tags: [], publishedAt: null },
      { contentTypeSlug: 'site-photos', slug: 'default', name: 'Photos', content: { hero: { kind: 'r2', key: 'demo/hero.webp' } }, status: 'published', displayOrder: 0, tags: [], publishedAt: null },
      { contentTypeSlug: 'site-copy', slug: 'default', name: 'Copy & labels', content: { aboutSection: { yearsLabel: 'Years in business', heading: 'About' }, nav: { home: 'Home' } }, status: 'published', displayOrder: 0, tags: [], publishedAt: null },
      { contentTypeSlug: 'city', slug: 'davie', name: 'Davie', content: { name: 'Davie', slug: 'davie', county: 'Broward County' }, status: 'published', displayOrder: 1, tags: [], publishedAt: null },
      { contentTypeSlug: 'service', slug: 'septic-installation', name: 'Septic Installation', content: { slug: 'septic-installation', title: 'Septic Installation' }, status: 'published', displayOrder: 6, tags: [], publishedAt: null },
    ],
  },
}

const record = {
  business_name: 'Gulfside Septic', business_phone: '239-555-0100', address_state: 'FL', counties: ['Lee County', 'Collier County'],
  cities: ['Cape Coral (Lee County)', 'Naples (Collier County)'], services_offered: ['pumping', 'repair'], emergency_24_7: false, insured: true,
  office_hours: 'Mon-Sat 7am-6pm',
  review_1_name: 'Marta K.', review_1_city: 'Cape Coral', review_1_service: 'Pumping', review_1_text: 'Great.',
  review_2_name: 'Marta K.', review_2_city: 'Cape Coral', review_2_service: 'Repair', review_2_text: 'Great again.',
}

describe('clientStarterItems', () => {
  const client = onboardingToBundle(record)
  const { items, notes } = clientStarterItems(base, client)
  const of = (t) => items.filter((i) => i.contentTypeSlug === t)

  it('replaces the demo collections with the record, keeping template FAQs and steps', () => {
    expect(of('city').map((i) => i.slug)).toEqual(['cape-coral', 'naples'])
    expect(of('city')[1].content.county).toBe('Collier County')
    expect(of('service').map((i) => i.slug)).toEqual(['septic-tank-pumping', 'septic-repair'])
    expect(items.some((i) => i.slug === 'septic-installation' || i.slug === 'davie')).toBe(false)
    expect(of('faq').length).toBeGreaterThan(0)
    expect(of('process-step')[0].name).toMatch(/^1\. /)
  })
  it('stamps the settings over the template, limited to schema keys, with counties and no placeholders', () => {
    const s = of('site-settings')[0].content
    expect(s.companyName).toBe('Gulfside Septic')
    expect(s.phoneNumber).toBe('(239) 555-0100')
    expect(s.areaCounties).toEqual(['Lee County', 'Collier County'])
    expect(s.theme).toBe('themelgt') // the canonical template content wins over the demo item
    expect(JSON.stringify(s)).not.toContain('{{')
    expect(Object.keys(s).sort()).toEqual(['areaCounties', 'companyName', 'heroHeadline', 'phoneNumber', 'theme'])
    expect(notes[0]).toMatch(/not stamped/)
  })
  it('keeps the demo photos and merges copy tweaks into the template copy', () => {
    expect(of('site-photos')[0].content.hero.key).toBe('demo/hero.webp')
    const copy = of('site-copy')[0].content
    expect(copy.aboutSection.yearsLabel).toBe('Years in FL')
    expect(copy.aboutSection.heading).toBe('About')
    expect(copy.contactPage.officeHours).toBe('Office hours Mon-Sat 7am-6pm')
    expect(copy.nav.home).toBe('Home')
  })
  it('gives every item the bundle item shape with unique slugs and null dates', () => {
    for (const i of items) {
      expect(i).toMatchObject({ status: 'published', tags: [], publishedAt: null })
      expect(typeof i.slug).toBe('string')
      expect(typeof i.name).toBe('string')
    }
    expect(of('review').map((i) => i.slug)).toEqual(['marta-k-cape-coral', 'marta-k-cape-coral-2'])
    const keys = items.map((i) => `${i.contentTypeSlug}/${i.slug}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
