import { describe, expect, it } from 'vitest'
import { mapCms } from './cms-map.mjs'
import { normalisePhone, onboardingToBundle, slugify } from './onboard-map.mjs'

// What the intake form posts (see onboarding/index.html collect()).
const record = {
  business_name: 'Gulfside Septic LLC',
  legal_name: 'Gulfside Septic Services LLC',
  owner_name: 'Ray Alvarez',
  owner_email: 'ray@gulfsideseptic.com',
  owner_phone: '239-555-0110',
  business_phone: '2395550100',
  email_public: 'office@gulfsideseptic.com',
  address_street: '88 Palm Ave',
  address_city: 'Cape Coral',
  address_state: 'fl',
  address_zip: '33904',
  counties: ['Lee County', 'Collier County'],
  cities: ['Cape Coral', 'Fort Myers', 'Naples (Collier County)'],
  services_offered: ['pumping', 'emergency', 'repair'],
  emergency_24_7: true,
  office_hours: 'Mon–Fri 7am–5pm',
  years_in_business: 9,
  license_number: 'SR0123456',
  insured: true,
  google_review_url: 'https://g.page/r/abc/review',
  google_rating: 4.9,
  google_review_count: 61,
  brand_primary_color: '#1d6fb8',
  logo_url: 'https://cdn.example.com/gulfside-logo.png',
  photos_url: 'https://drive.google.com/drive/folders/xyz',
  about_blurb: 'Family owned since 2017.',
  differentiators: ['We answer the phone', 'Flat pricing'],
  review_1_name: 'Tina M.', review_1_city: 'Cape Coral', review_1_service: 'Pump-out', review_1_text: 'Fast and fair.',
  review_2_name: '', review_2_text: 'orphan text without a name',
  domain: 'https://gulfsideseptic.com/',
  source: 'form',
}

describe('helpers', () => {
  it('normalises US phones to display and E.164', () => {
    expect(normalisePhone('2395550100')).toEqual({ display: '(239) 555-0100', e164: '+12395550100' })
    expect(normalisePhone('+1 (239) 555-0100')).toEqual({ display: '(239) 555-0100', e164: '+12395550100' })
  })
  it('slugifies names', () => {
    expect(slugify('Gulfside Septic LLC')).toBe('gulfside-septic-llc')
  })
})

describe('onboardingToBundle', () => {
  const b = onboardingToBundle(record)

  it('fills settings from facts and template defaults', () => {
    expect(b.slug).toBe('gulfside-septic-llc')
    expect(b.settings.companyName).toBe('Gulfside Septic LLC')
    expect(b.settings.phoneNumber).toBe('(239) 555-0100')
    expect(b.settings.phoneE164).toBe('+12395550100')
    expect(b.settings.addressState).toBe('FL')
    expect(b.settings.siteUrl).toBe('https://gulfsideseptic.com')
    expect(b.settings.heroHeadline).toBe('Clean property.')
    expect(b.settings.areaHeadline).toBe('Serving Lee & Collier')
    expect(b.settings.heroSubheadline).toContain('Lee and Collier')
    expect(b.settings.brandPrimary).toBe('#1D6FB8')
    expect(b.settings.brandAccent).toBe('')
  })

  it('never claims what the record does not support', () => {
    expect(b.settings.heroTrustPoints).toEqual(['Same-day emergency callouts', 'Licensed & insured', 'Upfront pricing before we start', '9+ years in business'])
    const noLicense = onboardingToBundle({ ...record, license_number: '', emergency_24_7: false })
    expect(noLicense.settings.trustLicenseLabel).toBe('')
    expect(noLicense.settings.heroTrustPoints).not.toContain('Licensed & insured')
    expect(noLicense.settings.heroTrustPoints).not.toContain('Same-day emergency callouts')
    expect(noLicense.settings.aboutHeadline).toBe('Local, insured, and actually reachable')
    expect(noLicense.settings.emergencyEnabled).toBe(false)
  })

  it('builds only the ticked services, in template order', () => {
    expect(b.services.map((s) => s.content.slug)).toEqual(['emergency-septic-service', 'septic-tank-pumping', 'septic-repair'])
  })

  it('assigns counties to cities and honours the "(County)" tag', () => {
    expect(b.cities.map((c) => [c.content.slug, c.content.county])).toEqual([
      ['cape-coral', 'Lee County'], ['fort-myers', 'Lee County'], ['naples', 'Collier County'],
    ])
  })

  it('keeps complete reviews only and uses a direct logo link', () => {
    expect(b.reviews).toHaveLength(1)
    expect(b.reviews[0].content.name).toBe('Tina M.')
    expect(b.photos.logo).toEqual({ kind: 'url', url: 'https://cdn.example.com/gulfside-logo.png' })
    expect(b.branding.colors[0]).toEqual({ name: 'Primary', hex: '#1D6FB8' })
    expect(b.notes.some((n) => n.includes('also linked a folder'))).toBe(true)
  })

  it('feeds straight into mapCms and yields a config with the client on it', () => {
    const { config } = mapCms({ ...b, assetBaseUrl: 'https://assets.sapt.ai' })
    expect(config.companyName).toBe('Gulfside Septic LLC')
    expect(config.phoneHref).toBe('tel:+12395550100')
    expect(config.services).toHaveLength(3)
    expect(config.services[0].icon).toBe('siren')
    expect(config.services[1].image).toContain('assets.sapt.ai')
    expect(config.serviceArea.cities).toHaveLength(3)
    expect(config.brand.primary).toBe('#1D6FB8')
    expect(config.brand.accent).toBe('#C4392C')
    expect(config.photos.logo).toBe('https://cdn.example.com/gulfside-logo.png')
    expect(config.trust.licenseNumber).toBe('SR0123456')
    expect(config.copy.aboutSection.yearsLabel).toBe('Years in FL')
  })
})

describe('uploaded logo and photos from the intake form', () => {
  const uploads = {
    business_name: 'Backwater Septic',
    business_phone: '239-555-0144',
    logo_url: 'https://assets.sapt.ai/proj/branding/abc/logo.png',
    photo_urls: [
      'https://assets.sapt.ai/proj/cms/1/truck.jpg',
      'https://assets.sapt.ai/proj/cms/2/crew.jpg',
      'https://assets.sapt.ai/proj/cms/3/tank.jpg',
      'https://assets.sapt.ai/proj/cms/4/extra.jpg',
    ],
  }

  it('uses an uploaded logo for both lockups', () => {
    const b = onboardingToBundle(uploads)
    expect(b.photos.logo).toEqual({ kind: 'url', url: uploads.logo_url })
    expect(b.photos.logoLight).toEqual({ kind: 'url', url: uploads.logo_url })
  })

  it('fills the three big photo slots in order and flags the spares', () => {
    const b = onboardingToBundle(uploads)
    expect(b.photos.hero.url).toContain('truck.jpg')
    expect(b.photos.about.url).toContain('crew.jpg')
    expect(b.photos.cta.url).toContain('tank.jpg')
    expect(b.notes.some((n) => n.includes('1 more photo'))).toBe(true)
  })

  it('says the company name will be set in type when no logo arrives', () => {
    const b = onboardingToBundle({ business_name: 'Backwater Septic', business_phone: '239-555-0144' })
    expect(b.photos.logo).toBeUndefined()
    expect(b.notes.some((n) => n.includes('company name in type'))).toBe(true)
  })

  it('records that they asked for generated imagery', () => {
    const b = onboardingToBundle({ business_name: 'X', business_phone: '239-555-0144', photos_ai: true })
    expect(b.notes.some((n) => n.includes('generated imagery'))).toBe(true)
  })

  it('ignores anything that is not an image url', () => {
    const b = onboardingToBundle({ business_name: 'X', business_phone: '239-555-0144', photo_urls: ['https://drive.google.com/folder/xyz'] })
    expect(b.photos.hero).toBeUndefined()
  })
})
