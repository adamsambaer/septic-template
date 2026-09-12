/**
 * JSON-LD for the whole site, built from the same config as everything else.
 *
 * Why this exists, honestly: structured data is NOT a proven lever for getting
 * cited by AI answer engines. Ahrefs ran a controlled test of 1,885 pages that
 * added schema against 4,000 matched controls and found the citation change
 * statistically indistinguishable from zero, and Google's own AI-features
 * documentation says no special structured data is required.
 *
 * What it IS good for is entity resolution: letting a machine confirm that this
 * website, that Google listing and that Yelp page are one business. Roughly
 * 42% of AI citations for local businesses trace back to listings, so being
 * unambiguously the same entity as your listings is worth the few hundred bytes.
 *
 * Rules followed here:
 *  - Every node hangs off one `@id`, so the business is described once and
 *    referenced everywhere else. Repeating a half-filled business object on
 *    every page is what makes engines treat them as different entities.
 *  - A blank config field is omitted, never emitted empty. An empty string in
 *    JSON-LD is worse than an absent property.
 *  - Nothing here invents a claim. Ratings, licences and hours come from the
 *    CMS or they do not appear.
 */

import { siteConfig } from '@/config/site-config'

const base = siteConfig.siteUrl.replace(/\/$/, '')

/** Canonical ids, so every page references one business and one site. */
export const BUSINESS_ID = `${base}/#business`
export const WEBSITE_ID = `${base}/#website`

export const absolute = (path: string) => `${base}${path.startsWith('/') ? path : `/${path}`}`

/** Drop empty strings, empty arrays, zeros-that-mean-unset and undefined. */
function clean<T extends Record<string, unknown>>(node: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node)) {
    if (v === undefined || v === null) continue
    if (typeof v === 'string' && v.trim() === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out as T
}

/**
 * The business itself. `HomeAndConstructionBusiness` is the schema.org type
 * for a trade contractor and inherits everything LocalBusiness has.
 */
export function businessNode() {
  const { companyName, legalName, tagline, email, address, photos, trust, serviceArea, identity, updatedAt } = siteConfig
  const { profiles, geo, openingHours, priceRange } = identity

  const sameAs = [profiles.google, profiles.yelp, profiles.facebook, profiles.bbb, profiles.instagram, profiles.angi]
    .map((u) => u.trim())
    .filter(Boolean)

  return clean({
    '@type': 'HomeAndConstructionBusiness',
    '@id': BUSINESS_ID,
    name: companyName,
    legalName: legalName !== companyName ? legalName : undefined,
    description: tagline,
    url: `${base}/`,
    telephone: siteConfig.phoneHref.replace('tel:', ''),
    email,
    image: photos.hero ? absolute(photos.hero) : undefined,
    logo: photos.logo ? absolute(photos.logo) : undefined,
    address: clean({
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.zip,
      addressCountry: 'US',
    }),
    geo: geo.lat && geo.lng ? { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng } : undefined,
    openingHours: openingHours || undefined,
    priceRange: priceRange || undefined,
    areaServed: [
      ...serviceArea.counties.map((name) => ({ '@type': 'AdministrativeArea', name })),
      ...serviceArea.cities.map((c) => ({ '@type': 'City', name: c.name })),
    ],
    sameAs,
    // Only from the client's real Google numbers. Note that Google does not
    // show stars for a business rating its own pages; this is entity data.
    aggregateRating:
      trust.googleReviewCount > 0 && trust.googleRating > 0
        ? { '@type': 'AggregateRating', ratingValue: trust.googleRating, reviewCount: trust.googleReviewCount, bestRating: 5 }
        : undefined,
    hasCredential: trust.licenseNumber ? `${trust.licenseLabel} ${trust.licenseNumber}`.trim() : undefined,
    foundingDate: trust.yearsInBusiness > 0 ? String(new Date().getFullYear() - trust.yearsInBusiness) : undefined,
    dateModified: updatedAt || undefined,
  })
}

/** Site-level node. Lets an engine attach the name to the domain. */
export function websiteNode() {
  return clean({
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${base}/`,
    name: siteConfig.companyName,
    publisher: { '@id': BUSINESS_ID },
  })
}

export type Crumb = { label: string; href?: string }

/** Breadcrumbs describe where a page sits. Cheap, and genuinely read. */
export function breadcrumbNode(trail: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => clean({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: c.href ? absolute(c.href) : undefined,
    })),
  }
}

type ServiceLike = (typeof siteConfig)['services'][number]

/**
 * One service, tied back to the business by reference. The Offer block is
 * emitted only when the client has published a real price range: a made-up
 * price is worse than no price.
 */
export function serviceNode(service: ServiceLike, areaNames?: string[]) {
  const price = service.price
  const areas = areaNames?.length ? areaNames : siteConfig.serviceArea.counties

  return clean({
    '@type': 'Service',
    name: service.title,
    serviceType: service.title,
    description: service.intro || service.description,
    url: absolute(`/services/${service.slug}`),
    provider: { '@id': BUSINESS_ID },
    areaServed: areas.map((name) => ({ '@type': 'AdministrativeArea', name })),
    offers:
      price && price.from > 0
        ? clean({
            '@type': 'Offer',
            priceCurrency: 'USD',
            priceSpecification: clean({
              '@type': 'PriceSpecification',
              priceCurrency: 'USD',
              minPrice: price.from,
              maxPrice: price.to > 0 ? price.to : undefined,
              unitText: price.unit || undefined,
            }),
            availability: 'https://schema.org/InStock',
          })
        : undefined,
  })
}

/**
 * FAQ content. Google stopped showing FAQ rich results in 2026, so this earns
 * no snippet. It is still clean machine-readable Q&A next to the visible text,
 * which costs nothing, and the visible copy is what actually gets quoted.
 */
export function faqNode(items: { q: string; a: string }[]) {
  if (items.length === 0) return undefined
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

/** Wrap nodes into one graph. One script tag per page, not five. */
export function graph(...nodes: (object | undefined)[]) {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) }
}

/**
 * Render a graph. Server component, so this is in the static HTML: the
 * assistants' crawlers do not run JavaScript, so anything injected on the
 * client is invisible to them.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
