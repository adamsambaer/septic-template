import { Footer, Navbar } from '@/components/layout'
import { CTA } from '@/components/sections'
import { Faq, LocalReview, PageHero, SectionHead } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { ArrowUpRight, MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const { serviceArea, services, companyName, address, trust, photos, pages, copy } = siteConfig
const c = copy.cityPage

export function generateStaticParams() {
  return pages.serviceAreas ? serviceArea.cities.map((x) => ({ city: x.slug })) : []
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params
  const place = serviceArea.cities.find((x) => x.slug === city)
  if (!place) return {}
  const vars = { city: place.name, county: place.county }
  return {
    title: t(c.metaTitle, vars),
    description: t(c.metaDescription, vars),
    alternates: { canonical: `/service-areas/${place.slug}` },
  }
}

/**
 * City page. One template for every published city in Sapt ("4 · Cities").
 *
 * Links up to the areas hub, across to every service page, and sideways to
 * its neighbouring cities. One H1. City in the title tag, H1, intro, and the
 * LocalBusiness schema. No process band and one local review instead of
 * three: the page's job is "they cover my town, here is what they do, here
 * is a neighbour who used them".
 */
export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  if (!pages.serviceAreas) notFound()
  const { city } = await params
  const place = serviceArea.cities.find((x) => x.slug === city)
  if (!place) notFound()

  const vars = { city: place.name, county: place.county }
  const neighbours = serviceArea.cities.filter((x) => x.county === place.county && x.slug !== place.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: companyName,
    telephone: siteConfig.phoneHref.replace('tel:', ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.zip,
    },
    areaServed: { '@type': 'City', name: place.name },
    ...(trust.googleReviewCount > 0 && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: trust.googleRating, reviewCount: trust.googleReviewCount },
    }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main>
        <PageHero
          eyebrow={t(c.eyebrow, vars)}
          title={t(c.title, vars)}
          intro={t(c.intro, vars)}
          image={photos.hero}
          focal={photos.heroFocal.desktop}
          trail={[
            { label: copy.nav.home, href: '/' },
            { label: copy.nav.areas, href: '/service-areas' },
            { label: place.name },
          ]}
        />

        {/* Services available here: links every service page from every city page */}
        {services.length > 0 && (
          <section className="bg-bg py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionHead eyebrow={place.name} title={c.servicesTitle} accent={place.name} intro={t(c.servicesIntro, vars)} />
              <div className="mt-10 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/services/${s.slug}`}
                    className="group flex flex-col justify-between bg-surface p-6 transition-colors hover:bg-text"
                  >
                    <div>
                      <span className="block text-base font-extrabold uppercase leading-tight tracking-tight text-text group-hover:text-white">{s.title}</span>
                      <span className="mt-2 block text-sm leading-relaxed text-text-muted group-hover:text-white/70">{s.description}</span>
                    </div>
                    <span className="mt-6 flex h-7 w-7 items-center justify-center bg-primary-500">
                      <ArrowUpRight className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <LocalReview city={place.name} />
        <Faq heading={t(c.faqHeading, vars)} />

        {/* Neighbouring cities: sideways links so no city page is a dead end */}
        {neighbours.length > 0 && (
          <section className="bg-surface py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionHead eyebrow={c.nearbyEyebrow} title={c.nearbyTitle} accent={place.county} />
              <ul className="mt-8 flex flex-wrap gap-2">
                {neighbours.map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={`/service-areas/${n.slug}`}
                      className="inline-flex items-center gap-2 border-2 border-border px-4 py-2.5 text-sm font-bold text-text transition-colors hover:border-primary-500 hover:bg-primary-500 hover:text-white"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <CTA />
      </main>
      <Footer />
    </>
  )
}

export const dynamicParams = false
