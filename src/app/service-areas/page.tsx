import { Footer, Navbar } from '@/components/layout'
import { CTA } from '@/components/sections'
import { PageHero, SectionHead } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { ArrowUpRight, MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const { serviceArea, photos, pages, copy } = siteConfig
const c = copy.serviceAreasPage

export const metadata: Metadata = {
  title: t(c.metaTitle),
  description: t(c.metaDescription),
  alternates: { canonical: '/service-areas' },
}

/**
 * Service-areas hub. Every published city links from here, grouped by county,
 * so none of them is an orphan. Switched off in Sapt → 404 everywhere.
 */
export default function ServiceAreas() {
  if (!pages.serviceAreas || serviceArea.cities.length === 0) notFound()

  const byCounty = serviceArea.counties
    .map((county) => ({ county, cities: serviceArea.cities.filter((x) => x.county === county) }))
    .filter((g) => g.cities.length > 0)
  // Cities whose county is not in the list still get shown, under their own heading.
  const known = new Set(serviceArea.counties)
  const orphans = serviceArea.cities.filter((x) => !known.has(x.county))
  if (orphans.length > 0) byCounty.push({ county: orphans[0].county, cities: orphans })

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow={copy.coverage.eyebrow}
          title={serviceArea.headline}
          intro={t(c.intro)}
          image={photos.hero}
          focal={photos.heroFocal.desktop}
          trail={[{ label: copy.nav.home, href: '/' }, { label: copy.nav.areas }]}
        />

        <section className="bg-bg py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHead eyebrow={copy.coverage.eyebrow} title={c.citiesTitle} accent={c.citiesAccent} />
            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              {byCounty.map(({ county, cities }) => (
                <div key={county}>
                  <h3 className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
                    <MapPin className="h-3.5 w-3.5 text-primary-500" />
                    {county}
                  </h3>
                  <ul className="mt-4 grid gap-px bg-border sm:grid-cols-2">
                    {cities.map((city) => (
                      <li key={city.slug}>
                        <Link
                          href={`/service-areas/${city.slug}`}
                          className="group flex items-center justify-between bg-surface px-5 py-4 transition-colors hover:bg-text"
                        >
                          <span className="text-sm font-extrabold uppercase tracking-tight text-text group-hover:text-white">{city.name}</span>
                          <ArrowUpRight className="h-4 w-4 text-primary-500" strokeWidth={2.5} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  )
}
