/**
 * Sapt CMS → site config mapper. Pure: no network, no filesystem.
 *
 * Input is what the REST API returns for the eight content types, plus the
 * project branding and the asset base URL. Output is a partial site config in
 * exactly the shape of `src/config/site-config.ts`, with every image as an
 * absolute URL (the pull script downloads those afterwards and rewrites them
 * to local paths).
 *
 * Rules that matter for a real client:
 *  - Singleton fields that carry a *claim* (license, rating, insured, years)
 *    are always emitted, blank when blank, so a demo value can never leak
 *    through the merge onto a client's site.
 *  - Collections replace the defaults entirely. Zero published services means
 *    zero service pages, which is the point.
 *  - Page toggles default to on when the field is missing.
 */

/** Select-field choice ids in Sapt are fixed 8-char codes; map them back. */
export const CHOICES = {
  theme: { themelgt: 'light', themedrk: 'dark' },
  icon: {
    icsiren0: 'siren',
    ictruck0: 'truck',
    icclipbd: 'clipboard-check',
    icwrench: 'wrench',
    iclayers: 'layers',
    ichardht: 'hard-hat',
    icdroplt: 'droplet',
  },
  formOption: {
    fobackup: 'backup_emergency',
    fopumpot: 'pump_out',
    foinspct: 'inspection',
    forepair: 'repair',
    fonewsys: 'new_system',
    founsure: 'unsure',
  },
}

const str = (v) => (typeof v === 'string' ? v.trim() : '')
const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const bool = (v, fallback = false) => (typeof v === 'boolean' ? v : fallback)
const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : [])
const choice = (table, v, fallback) => table[v] ?? (Object.values(table).includes(v) ? v : fallback)

/** Resolve an image field value to an absolute URL, or '' when empty. */
export function imageUrl(value, assetBaseUrl) {
  if (!value || typeof value !== 'object') return ''
  if (value.kind === 'url' && typeof value.url === 'string') return value.url
  if (value.kind === 'r2' && typeof value.key === 'string') {
    return `${assetBaseUrl.replace(/\/$/, '')}/${value.key.replace(/^\//, '')}`
  }
  if (typeof value.url === 'string') return value.url
  return ''
}

/** Sort CMS items by displayOrder, then creation time, and unwrap content. */
function ordered(items) {
  return [...(items ?? [])]
    .filter((i) => i && i.status === 'published' && i.content)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || String(a.createdAt).localeCompare(String(b.createdAt)))
    .map((i) => i.content)
}

function brandColor(branding, names) {
  const colors = branding?.colors ?? []
  for (const n of names) {
    const hit = colors.find((c) => String(c.name ?? '').toLowerCase() === n || String(c.purpose ?? '').toLowerCase() === n)
    if (hit?.hex) return hit.hex
  }
  return ''
}

/**
 * @param {object} input
 * @param {object|null} input.settings   published `site-settings` item content
 * @param {object|null} input.photos     published `site-photos` item content
 * @param {object|null} input.copy       published `site-copy` item content
 * @param {Array} input.services         `service` items (full items, not content)
 * @param {Array} input.cities
 * @param {Array} input.faqs
 * @param {Array} input.steps
 * @param {Array} input.reviews
 * @param {object|null} input.branding   `{ colors, logoUrl, tagline }`
 * @param {string} input.assetBaseUrl
 */
export function mapCms(input) {
  const { settings: s, photos: p, copy, branding, assetBaseUrl } = input
  const out = {}
  const notes = []

  // ── Identity, contact, trust, about, hero: complete objects, blanks win ──
  if (s) {
    const e164 = str(s.phoneE164)
    out.companyName = str(s.companyName)
    out.legalName = str(s.legalName) || str(s.companyName)
    out.tagline = str(s.tagline)
    out.phoneNumber = str(s.phoneNumber)
    out.phoneHref = e164 ? `tel:${e164}` : `tel:${str(s.phoneNumber).replace(/[^\d+]/g, '')}`
    out.email = str(s.email)
    out.address = { street: str(s.addressStreet), city: str(s.addressCity), state: str(s.addressState), zip: str(s.addressZip) }
    if (str(s.siteUrl)) out.siteUrl = str(s.siteUrl)
    out.theme = choice(CHOICES.theme, s.theme, 'light')
    out.emergency = { enabled: bool(s.emergencyEnabled), label: str(s.emergencyLabel), ctaText: str(s.emergencyCtaText) }
    out.chat = { enabled: bool(s.chatEnabled, true) }
    out.eyebrow = str(s.eyebrow)
    out.ctaText = str(s.ctaText)
    out.hero = {
      headline: str(s.heroHeadline),
      headlineAccent: str(s.heroHeadlineAccent),
      subheadline: str(s.heroSubheadline),
      trustPoints: list(s.heroTrustPoints),
    }
    out.trust = {
      yearsInBusiness: num(s.trustYears),
      licenseNumber: str(s.trustLicenseNumber),
      licenseLabel: str(s.trustLicenseLabel),
      googleRating: num(s.trustGoogleRating),
      googleReviewCount: num(s.trustGoogleReviewCount),
      googleReviewUrl: str(s.trustGoogleReviewUrl),
      insured: bool(s.trustInsured),
      emergencyAvailable: bool(s.trustEmergencyAvailable),
    }
    out.about = { headline: str(s.aboutHeadline), body: str(s.aboutBody), points: list(s.aboutPoints) }
    out.serviceArea = { headline: str(s.areaHeadline), counties: list(s.areaCounties) }
    out.pages = {
      services: bool(s.pageServices, true),
      serviceAreas: bool(s.pageServiceAreas, true),
      about: bool(s.pageAbout, true),
      reviews: bool(s.pageReviews, true),
      contact: bool(s.pageContact, true),
      privacy: bool(s.pagePrivacy, true),
      terms: bool(s.pageTerms, true),
    }
  } else {
    notes.push('site-settings: no published item, demo identity kept')
  }

  // ── Brand colors: settings override → Branding page → default ──
  const primary = str(s?.brandPrimary) || brandColor(branding, ['primary'])
  const accent = str(s?.brandAccent) || brandColor(branding, ['emergency', 'accent'])
  out.brand = {}
  if (primary) out.brand.primary = primary
  else notes.push('brand.primary: nothing in settings or Branding, demo orange kept')
  if (accent) out.brand.accent = accent
  else notes.push('brand.accent: nothing in settings or Branding, demo red kept')

  // ── Photos: Branding logo → photos item → default ──
  const brandLogo = str(branding?.logoUrl)
  const photos = {}
  const slot = (key, value, label) => {
    const url = imageUrl(value, assetBaseUrl)
    if (url) photos[key] = url
    else notes.push(`photos.${label ?? key}: empty, demo photo kept`)
  }
  const logo = imageUrl(p?.logo, assetBaseUrl) || brandLogo
  const logoLight = imageUrl(p?.logoLight, assetBaseUrl) || brandLogo
  if (logo) photos.logo = logo
  else notes.push('photos.logo: no Branding logo and no Photos override, demo logo kept')
  if (logoLight) photos.logoLight = logoLight
  else notes.push('photos.logoLight: no Branding logo and no Photos override, demo logo kept')
  slot('hero', p?.hero)
  slot('about', p?.about)
  slot('cta', p?.cta)
  if (str(p?.heroFocalDesktop) || str(p?.heroFocalMobile)) {
    photos.heroFocal = {}
    if (str(p?.heroFocalDesktop)) photos.heroFocal.desktop = str(p.heroFocalDesktop)
    if (str(p?.heroFocalMobile)) photos.heroFocal.mobile = str(p.heroFocalMobile)
  }
  if (str(p?.aboutFocal)) photos.aboutFocal = str(p.aboutFocal)
  if (str(p?.ctaFocal)) photos.ctaFocal = str(p.ctaFocal)
  if (str(p?.coverageFocal)) photos.coverageFocal = str(p.coverageFocal)
  out.photos = photos

  // ── Copy: partial merge is fine, every string is generic ──
  if (copy) out.copy = copy
  else notes.push('site-copy: no published item, default labels kept')

  // ── Collections: replace entirely ──
  out.services = ordered(input.services).map((c) => ({
    icon: choice(CHOICES.icon, c.icon, 'droplet'),
    title: str(c.title),
    description: str(c.description),
    slug: str(c.slug),
    formOption: choice(CHOICES.formOption, c.formOption, 'unsure'),
    intro: str(c.intro),
    included: list(c.included),
    process: (Array.isArray(c.process) ? c.process : []).map((x) => ({ title: str(x?.title), body: str(x?.body) })).filter((x) => x.title),
    faqs: (Array.isArray(c.faqs) ? c.faqs : []).map((x) => ({ q: str(x?.question), a: str(x?.answer) })).filter((x) => x.q),
    image: imageUrl(c.image, assetBaseUrl),
    focal: str(c.focal) || '50% 50%',
  })).filter((x) => x.slug && x.title)

  const cities = ordered(input.cities).map((c) => ({ name: str(c.name), slug: str(c.slug), county: str(c.county) })).filter((x) => x.slug && x.name)
  out.serviceArea = { ...(out.serviceArea ?? {}), cities }

  out.faqs = ordered(input.faqs).map((c) => ({ q: str(c.question), a: str(c.answer) })).filter((x) => x.q)
  out.process = ordered(input.steps).map((c) => ({ title: str(c.title), body: str(c.body) })).filter((x) => x.title)
  out.reviews = ordered(input.reviews).map((c) => ({
    name: str(c.name), city: str(c.city), service: str(c.service), rating: Math.min(5, Math.max(1, num(c.rating, 5))), date: str(c.date), text: str(c.text),
  })).filter((x) => x.text)

  // Services with no image fall back to the demo photo for that slug, if any.
  for (const svc of out.services) {
    if (!svc.image) notes.push(`services.${svc.slug}.image: empty, demo photo kept if the slug matches one`)
  }

  return { config: out, notes }
}
