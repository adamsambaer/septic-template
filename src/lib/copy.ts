import { siteConfig } from '@/config/site-config'
import { fill } from './merge'

/**
 * Placeholder values for copy strings.
 *
 * Every string in `siteConfig.copy` may use {company} {legalName} {tagline}
 * {phone} {email} {address} {city} {state} {county} {counties} {cities}
 * {count} {rating} {service} {n}. Pass page-specific values as `extra`
 * (a city page passes its own {city} and {county}; a service page passes
 * {service}).
 */
export function tokens(extra: Record<string, string | number | undefined> = {}) {
  const c = siteConfig
  const { street, city, state, zip } = c.address
  return {
    company: c.companyName,
    legalName: c.legalName,
    tagline: c.tagline,
    phone: c.phoneNumber,
    email: c.email,
    address: `${street}, ${city}, ${state} ${zip}`,
    city,
    state,
    counties: c.serviceArea.counties.join(' and '),
    cities: c.serviceArea.cities.map((x) => x.name).join(', '),
    count: c.trust.googleReviewCount,
    rating: c.trust.googleRating,
    ...extra,
  }
}

/** Fill a copy string with site tokens plus any page-specific extras. */
export function t(template: string, extra?: Record<string, string | number | undefined>) {
  return fill(template, tokens(extra))
}
