import { siteConfig } from '@/config/site-config'
import type { MetadataRoute } from 'next'

/**
 * Sitemap built from the same config as the nav, so a page switched off in
 * Sapt or an unpublished service or city never gets submitted to Google.
 * Legal pages are noindex and left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl, pages, services, serviceArea } = siteConfig
  const base = siteUrl.replace(/\/$/, '')
  const at = (p: string) => `${base}${p}`
  const lastModified = new Date()

  const entries: MetadataRoute.Sitemap = [{ url: at('/'), lastModified, priority: 1 }]

  if (pages.services && services.length > 0) entries.push({ url: at('/services'), lastModified, priority: 0.8 })
  for (const s of services) entries.push({ url: at(`/services/${s.slug}`), lastModified, priority: 0.8 })

  if (pages.serviceAreas && serviceArea.cities.length > 0) {
    entries.push({ url: at('/service-areas'), lastModified, priority: 0.7 })
    for (const c of serviceArea.cities) entries.push({ url: at(`/service-areas/${c.slug}`), lastModified, priority: 0.7 })
  }

  if (pages.about) entries.push({ url: at('/about'), lastModified, priority: 0.5 })
  if (pages.reviews) entries.push({ url: at('/reviews'), lastModified, priority: 0.5 })
  if (pages.contact) entries.push({ url: at('/contact'), lastModified, priority: 0.6 })

  return entries
}
