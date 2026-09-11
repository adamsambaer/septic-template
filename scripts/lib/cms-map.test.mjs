import { describe, expect, it } from 'vitest'
import { CHOICES, imageUrl, mapCms } from './cms-map.mjs'

// Shapes copied from real Sapt responses on 10 Sep 2026.
const ASSET_BASE = 'https://assets.sapt.ai'
const item = (content, displayOrder = 0, status = 'published') => ({ content, displayOrder, status, createdAt: '2026-09-10T00:00:00Z' })

const settings = {
  companyName: 'Coastal Septic Co.', legalName: 'Coastal Septic Co. LLC', tagline: 'Septic pumping', phoneNumber: '(954) 555-0142', phoneE164: '+19545550142',
  email: 'x@y.example', addressStreet: '1420 SW 12th Ave', addressCity: 'Fort Lauderdale', addressState: 'FL', addressZip: '33315', siteUrl: 'https://coastalseptic.example',
  theme: 'themelgt', emergencyEnabled: true, emergencyLabel: 'Septic emergency?', emergencyCtaText: 'Call now', eyebrow: 'Eyebrow', heroHeadline: 'Clean property.', heroHeadlineAccent: 'Septic done right.',
  heroSubheadline: 'Sub', heroTrustPoints: ['A', 'B'], ctaText: 'Get a Free Quote', trustYears: 18, trustLicenseLabel: 'FL License', trustGoogleRating: 4.8, trustGoogleReviewCount: 127,
  trustInsured: true, trustEmergencyAvailable: true, aboutHeadline: 'About', aboutBody: 'Body', aboutPoints: ['P1'], areaHeadline: 'Serving Broward', areaCounties: ['Broward County'],
  pageServices: true, pageServiceAreas: true, pageAbout: true, pageReviews: false, pageContact: true, pagePrivacy: true, pageTerms: true,
}

const base = {
  settings,
  photos: { hero: { kind: 'r2', key: 'proj/cms/1/hero.webp' }, heroFocalMobile: '32% 50%' },
  copy: { nav: { services: 'Services' } },
  services: [
    item({ title: 'Pumping', slug: 'pumping', icon: 'ictruck0', formOption: 'fopumpot', description: 'd', intro: 'i', included: ['a'], process: [{ title: 'S1', body: 'b' }], faqs: [{ question: 'Q', answer: 'A' }], image: { kind: 'r2', key: 'proj/cms/2/p.webp' }, focal: '50% 40%' }, 2),
    item({ title: 'Emergency', slug: 'emergency', icon: 'icsiren0', formOption: 'fobackup', description: 'd', intro: 'i', included: ['a'] }, 1),
    item({ title: 'Draft', slug: 'draft', icon: 'icwrench', formOption: 'forepair', description: 'd', intro: 'i' }, 3, 'draft'),
  ],
  cities: [item({ name: 'Davie', slug: 'davie', county: 'Broward County' }, 2), item({ name: 'Plantation', slug: 'plantation', county: 'Broward County' }, 1)],
  faqs: [item({ question: 'Q1', answer: 'A1' })],
  steps: [item({ title: 'Step', body: 'B' })],
  reviews: [item({ name: 'M', city: 'Plantation', service: 'Pump-out', rating: 5, text: 'Great' })],
  branding: { colors: [{ name: 'Primary', hex: '#E8631A' }, { name: 'Emergency', hex: '#C4392C' }], logoUrl: 'https://assets.sapt.ai/proj/branding/logo.png', tagline: 'x' },
  assetBaseUrl: ASSET_BASE,
}

describe('imageUrl', () => {
  it('resolves r2 keys against the asset base and passes url kinds through', () => {
    expect(imageUrl({ kind: 'r2', key: 'a/b.webp' }, ASSET_BASE)).toBe('https://assets.sapt.ai/a/b.webp')
    expect(imageUrl({ kind: 'url', url: 'https://x/y.png' }, ASSET_BASE)).toBe('https://x/y.png')
    expect(imageUrl(null, ASSET_BASE)).toBe('')
  })
})

describe('mapCms', () => {
  const { config, notes } = mapCms(base)

  it('maps identity and derives the dialable href from E.164', () => {
    expect(config.companyName).toBe('Coastal Septic Co.')
    expect(config.phoneHref).toBe('tel:+19545550142')
    expect(config.address.city).toBe('Fort Lauderdale')
    expect(config.theme).toBe('light')
  })

  it('emits blank claims as blank so demo values cannot leak', () => {
    expect(config.trust.licenseNumber).toBe('')
    expect(config.trust.googleReviewUrl).toBe('')
    expect(config.trust.googleReviewCount).toBe(127)
  })

  it('reads page toggles with missing ones defaulting to on', () => {
    expect(config.pages.reviews).toBe(false)
    expect(config.pages.about).toBe(true)
    const { config: c2 } = mapCms({ ...base, settings: { ...settings, pageAbout: undefined } })
    expect(c2.pages.about).toBe(true)
  })

  it('takes brand colors from Branding by name when settings have no override', () => {
    expect(config.brand).toEqual({ primary: '#E8631A', accent: '#C4392C' })
    const { config: c2 } = mapCms({ ...base, settings: { ...settings, brandPrimary: '#123456' } })
    expect(c2.brand.primary).toBe('#123456')
  })

  it('uses the Branding logo for both logo slots unless Photos overrides them', () => {
    expect(config.photos.logo).toBe('https://assets.sapt.ai/proj/branding/logo.png')
    expect(config.photos.logoLight).toBe('https://assets.sapt.ai/proj/branding/logo.png')
    expect(config.photos.hero).toBe('https://assets.sapt.ai/proj/cms/1/hero.webp')
    expect(config.photos.heroFocal).toEqual({ mobile: '32% 50%' })
    expect(config.photos.about).toBeUndefined()
    expect(notes.some((n) => n.startsWith('photos.about'))).toBe(true)
  })

  it('orders collections by displayOrder, drops unpublished, maps choice ids', () => {
    expect(config.services.map((s) => s.slug)).toEqual(['emergency', 'pumping'])
    expect(config.services[0].icon).toBe('siren')
    expect(config.services[0].formOption).toBe('backup_emergency')
    expect(config.services[1].faqs).toEqual([{ q: 'Q', a: 'A' }])
    expect(config.services[1].image).toBe('https://assets.sapt.ai/proj/cms/2/p.webp')
    expect(config.serviceArea.cities.map((c) => c.slug)).toEqual(['plantation', 'davie'])
    expect(config.serviceArea.counties).toEqual(['Broward County'])
    expect(config.reviews[0].rating).toBe(5)
  })

  it('emits empty collections when nothing is published, so pages disappear', () => {
    const { config: c2 } = mapCms({ ...base, services: [], cities: [] })
    expect(c2.services).toEqual([])
    expect(c2.serviceArea.cities).toEqual([])
  })

  it('has a mapping for every select choice id the content types define', () => {
    expect(Object.keys(CHOICES.icon)).toHaveLength(7)
    expect(Object.keys(CHOICES.formOption)).toHaveLength(6)
  })
})
