import { Footer, Navbar } from '@/components/layout'
import { CTA } from '@/components/sections'
import { Faq, PageHero, ProcessSteps, SectionHead } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { ArrowUpRight, Check, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const { services, companyName, serviceArea, address, dark, phoneHref, copy } = siteConfig
const c = copy.servicePage

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const service = services.find((s) => s.slug === slug)
  if (!service) return {}
  const title = t(c.metaTitle, { service: service.title })
  return {
    title,
    description: service.intro,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: { title, description: service.intro, images: service.image ? [service.image] : [] },
  }
}

/**
 * Service page.
 *
 * One skeleton, one page per published service in Sapt ("3 · Services").
 * Unpublish the item and this page, its card, nav entry and footer link go.
 *
 * One H1 per page, breadcrumbs, the service's own process track and FAQ, and
 * a related-services strip so every service page links to every other.
 */
export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = services.find((s) => s.slug === slug)
  if (!service) notFound()

  const related = services.filter((s) => s.slug !== service.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.intro,
    serviceType: service.title,
    provider: {
      '@type': 'LocalBusiness',
      name: companyName,
      telephone: phoneHref.replace('tel:', ''),
      address: {
        '@type': 'PostalAddress',
        streetAddress: address.street,
        addressLocality: address.city,
        addressRegion: address.state,
        postalCode: address.zip,
      },
    },
    areaServed: serviceArea.counties.map((x) => ({ '@type': 'AdministrativeArea', name: x })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main>
        <PageHero
          eyebrow={siteConfig.eyebrow}
          title={service.title}
          intro={service.intro}
          image={service.image}
          focal={service.focal}
          formService={service.formOption}
          trail={[
            { label: copy.nav.home, href: '/' },
            ...(siteConfig.pages.services ? [{ label: copy.nav.services, href: '/services' }] : []),
            { label: service.title },
          ]}
        />

        {/* What's included: one framed block, dark spec panel + white checklist */}
        <section className="bg-bg py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid overflow-hidden border-2 border-text lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-between p-8 text-white sm:p-10" style={{ backgroundColor: dark.base }}>
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">{c.includedLabel}</span>
                  <h2 className="mt-4 text-3xl font-extrabold uppercase leading-[0.98] tracking-tight sm:text-4xl">{service.title}</h2>
                  <p className="mt-5 max-w-md leading-relaxed text-white/70">{service.description}</p>
                </div>
                <a
                  href={phoneHref}
                  className="mt-10 inline-flex items-center gap-3 self-start border-2 border-white/25 px-5 py-3.5 text-xs font-extrabold uppercase tracking-[0.14em] transition-colors hover:bg-white hover:text-neutral-900"
                >
                  <Phone className="h-4 w-4" />
                  {t(c.questionsCta)}
                </a>
              </div>

              <ul className="divide-y-2 divide-border-light bg-surface">
                {service.included.map((item) => (
                  <li key={item} className="flex items-start gap-4 px-6 py-5 sm:px-8">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-primary-500">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-text">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <ProcessSteps steps={service.process.length > 0 ? service.process : undefined} intro={c.processIntro} />
        <Faq
          heading={t(c.faqHeading, { service: service.title.toLowerCase() })}
          items={service.faqs.length > 0 ? service.faqs : undefined}
        />

        {/* Related services: the cross-linking that makes every page reachable */}
        {related.length > 0 && (
          <section className="bg-surface py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionHead eyebrow={c.relatedEyebrow} title={c.relatedTitle} accent={c.relatedAccent} />
              <div className="mt-10 grid gap-px border-2 border-text bg-border sm:grid-cols-2 lg:grid-cols-5">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/services/${r.slug}`}
                    className="group flex items-center justify-between gap-4 bg-surface px-5 py-4 transition-colors hover:bg-text"
                  >
                    <span className="text-sm font-extrabold uppercase leading-tight tracking-tight text-text group-hover:text-white">{r.title}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-primary-500">
                      <ArrowUpRight className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                    </span>
                  </Link>
                ))}
              </div>
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
