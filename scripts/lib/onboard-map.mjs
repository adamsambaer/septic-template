/**
 * Intake record → CMS-shaped bundle. Pure: no network, no filesystem.
 *
 * Takes the `data` of one `client_onboarding` CRM record (what the form on
 * airacquisition.com posts) and composes the same payloads the Sapt content
 * types hold: a site-settings item, a site-photos item, service items, city
 * items, FAQ and process-step items, review items, plus branding colors.
 *
 * Two consumers use the bundle:
 *   1. `mapCms()` turns it straight into a site-config snapshot, so a client
 *      site can be built the minute the form lands, before anyone opens Sapt.
 *   2. The same items are what gets pushed into the client's Sapt project so
 *      the CMS matches the site from day one.
 *
 * Only facts from the record go onto the site. Copy that the client did not
 * write comes from the template with their counties and name filled in, and
 * never contains a claim the record does not support: no license badge
 * without a license number, no "24/7" without the box ticked.
 */
import template from '../../sapt/template-content.json' with { type: 'json' }

/** Form checkbox value → template service key (same keys as template-content.json). */
export const SERVICE_ORDER = ['emergency', 'pumping', 'inspection', 'repair', 'drain_field', 'install']

const str = (v) => (typeof v === 'string' ? v.trim() : '')
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const bool = (v) => v === true || v === 'true' || v === 'on'
const list = (v) => {
  if (Array.isArray(v)) return v.map(str).filter(Boolean)
  return str(v).split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
}
const item = (content, displayOrder = 0) => ({ content, status: 'published', displayOrder, createdAt: '' })
const shortCounty = (c) => c.replace(/\s+County$/i, '')
const joinAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(str(v)) ? str(v).toUpperCase() : '')
const isImageUrl = (u) => /\.(png|jpe?g|webp|svg|gif)(\?|$)/i.test(str(u))

export function slugify(s) {
  return str(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

/** "(954) 555-0142" → { display: "(954) 555-0142", e164: "+19545550142" } */
export function normalisePhone(raw) {
  const digits = str(raw).replace(/\D/g, '')
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (ten.length !== 10) return { display: str(raw), e164: digits ? `+${digits}` : '' }
  return { display: `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`, e164: `+1${ten}` }
}

export function onboardingToBundle(data) {
  const d = data ?? {}
  const notes = []
  const t = template.settings

  const name = str(d.business_name)
  const counties = list(d.counties)
  const countiesShort = counties.map(shortCounty)
  const phone = normalisePhone(d.business_phone)
  const emergency = bool(d.emergency_24_7)
  const insured = bool(d.insured)
  const license = str(d.license_number)
  const years = num(d.years_in_business)
  const state = str(d.address_state).toUpperCase().slice(0, 2)
  const domain = str(d.domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  if (!name) notes.push('business_name is empty; the record is not usable')
  if (!phone.e164) notes.push('business_phone could not be normalised; check it')
  if (counties.length === 0) notes.push('no counties given; area headline and copy will be generic')

  // ── Trust points: only what the record supports ──
  const trustPoints = []
  if (emergency) trustPoints.push('Same-day emergency callouts')
  if (license && insured) trustPoints.push('Licensed & insured')
  else if (insured) trustPoints.push('Fully insured')
  trustPoints.push('Upfront pricing before we start')
  if (years > 0) trustPoints.push(`${years}+ years in business`)

  const areaPhrase = countiesShort.length ? joinAnd(countiesShort) : 'your area'
  const subheadline = emergency
    ? `Pumping, repairs and same-day emergency service across ${areaPhrase}. ${license && insured ? 'Licensed, insured, and we answer the phone.' : 'We answer the phone.'}`
    : `Septic pumping, repairs and inspections across ${areaPhrase}. ${license && insured ? 'Licensed, insured, and we answer the phone.' : 'We answer the phone.'}`

  const aboutBody = str(d.about_blurb) ||
    `${name} pumps, repairs and replaces septic systems across ${areaPhrase}. Small enough that the person who answers the phone is the person who shows up at your property.`
  const differentiators = list(d.differentiators)

  const settings = {
    ...t,
    companyName: name,
    legalName: str(d.legal_name) || name,
    phoneNumber: phone.display,
    phoneE164: phone.e164,
    email: str(d.email_public),
    addressStreet: str(d.address_street),
    addressCity: str(d.address_city),
    addressState: state,
    addressZip: str(d.address_zip),
    siteUrl: domain ? `https://${domain}` : '',
    brandPrimary: hex(d.brand_primary_color),
    brandAccent: hex(d.brand_accent_color),
    emergencyEnabled: emergency,
    heroSubheadline: subheadline,
    heroTrustPoints: trustPoints.slice(0, 4),
    trustYears: years,
    trustLicenseNumber: license,
    trustLicenseLabel: license ? str(d.license_label) || t.trustLicenseLabel : '',
    trustGoogleRating: num(d.google_rating),
    trustGoogleReviewCount: num(d.google_review_count),
    trustGoogleReviewUrl: str(d.google_review_url),
    trustInsured: insured,
    trustEmergencyAvailable: emergency,
    aboutHeadline: license ? t.aboutHeadline : 'Local, insured, and actually reachable',
    aboutBody,
    aboutPoints: differentiators.length ? differentiators.slice(0, 3) : t.aboutPoints,
    areaHeadline: countiesShort.length ? `Serving ${countiesShort.join(' & ')}` : `Serving ${str(d.address_city) || 'the area'}`,
    areaCounties: counties,
  }
  if (!str(d.google_review_url)) notes.push('no Google review link: the review-request texts have nowhere to send people')
  if (num(d.google_review_count) === 0) notes.push('no Google review count: rating blocks hidden')

  // ── Photos: the form collects links to folders, not files ──
  const photos = {}
  const logo = str(d.logo_url)
  if (isImageUrl(logo)) photos.logo = { kind: 'url', url: logo }
  else notes.push(logo ? `logo_url is a folder or page (${logo}); download the file and upload it to Branding` : 'no logo link; upload to Branding')
  if (str(d.photos_url)) notes.push(`photos are at ${str(d.photos_url)}; upload the best ones to Assets and pick them in Photos and on each service`)
  else notes.push('no photos link; demo photos will show until real ones are uploaded')

  // ── Services: template content filtered by what they offer, in template order ──
  const offered = new Set(list(d.services_offered))
  const services = SERVICE_ORDER.filter((k) => offered.has(k)).map((k, i) => item(template.services[k], i + 1))
  if (services.length === 0) notes.push('no services ticked; the site will have no service pages')
  if (offered.has('emergency') !== emergency) notes.push('emergency service ticked but 24/7 not (or vice versa); check which is true')

  // ── Cities: county assignment when more than one county ──
  const cityNames = list(d.cities)
  const cities = cityNames.map((c, i) => {
    const m = c.match(/^(.+?)\s*\((.+)\)$/) // "Davie (Broward County)" form
    const cityName = m ? m[1].trim() : c
    const county = m ? m[2].trim() : counties[0] || ''
    return item({ name: cityName, slug: slugify(cityName), county }, i + 1)
  })
  if (counties.length > 1 && !cityNames.some((c) => /\(.+\)$/.test(c))) {
    notes.push(`${counties.length} counties but cities were not tagged with one; all assigned to ${counties[0]}. Fix in Cities.`)
  }

  // ── Reviews: only complete ones ──
  const reviews = [1, 2, 3]
    .map((n) => ({ name: str(d[`review_${n}_name`]), city: str(d[`review_${n}_city`]), service: str(d[`review_${n}_service`]), rating: 5, date: '', text: str(d[`review_${n}_text`]) }))
    .filter((r) => r.text && r.name)
    .map((r, i) => item(r, i + 1))
  if (reviews.length === 0) notes.push('no reviews given; pull three from their Google profile')

  const faqs = template.faqs.map((f, i) => item(f, i + 1))
  const steps = template.steps.map((s, i) => item(s, i + 1))

  // ── Copy tweaks that depend on facts ──
  const copy = { aboutSection: { yearsLabel: state ? `Years in ${state}` : 'Years in business' } }
  if (str(d.office_hours)) copy.contactPage = { officeHours: `Office hours ${str(d.office_hours)}` }

  const branding = {
    colors: [
      { name: 'Primary', hex: hex(d.brand_primary_color) || '#E8631A' },
      { name: 'Emergency', hex: hex(d.brand_accent_color) || '#C4392C' },
    ],
    logoUrl: isImageUrl(logo) ? logo : '',
    tagline: t.tagline,
  }

  return {
    slug: slugify(name),
    settings, photos, copy, services, cities, faqs, steps, reviews, branding,
    ownerMobile: normalisePhone(d.owner_phone).e164,
    notes,
  }
}
