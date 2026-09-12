import { Footer, Navbar } from '@/components/layout'
import { CTA } from '@/components/sections'
import { Faq, PageHero, ProcessSteps, SectionHead } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { JsonLd, breadcrumbNode, businessNode, faqNode, graph, serviceNode } from '@/lib/schema'
import { ArrowUpRight, Check, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const { services, dark, phoneHref, copy } = siteConfig
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
  const faqs = service.faqs.length > 0 ? service.faqs : siteConfig.faqs
  const price = service.price
  const factors = service.costFactors ?? []

  const trail = [
    { label: copy.nav.home, href: '/' },
    ...(siteConfig.pages.services ? [{ label: copy.nav.services, href: '/services' }] : []),
    { label: service.title },
  ]

  return (
    <>
      <JsonLd data={graph(businessNode(), serviceNode(service), breadcrumbNode(trail), faqNode(faqs))} />
      <Navbar />
      <main>
        <PageHero
          eyebrow={siteConfig.eyebrow}
          title={service.title}
          intro={service.intro}
          image={service.image}
          focal={service.focal}
          formService={service.formOption}
          trail={trail}
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

        {/* Typical cost.
            "How much does X cost" is one of the queries people most often put
            to an assistant, and the pages that get quoted back are the ones
            carrying a real range plus the factors behind it. Nothing renders
            until the client publishes a price in Sapt, because inventing a
            number on their behalf is worse than having none. */}
        {price && price.from > 0 && (
          <section className="bg-surface py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionHead
                eyebrow={c.costEyebrow}
                title={t(c.costTitle, { service: service.title.toLowerCase() })}
                accent={siteConfig.address.state}
              />
              <div className="mt-10 grid border-2 border-text lg:grid-cols-[0.9fr_1.1fr]">
                <div className="p-8 text-white sm:p-10" style={{ backgroundColor: dark.base }}>
                  <span className="block text-5xl font-extrabold uppercase leading-none tracking-tight sm:text-6xl">
                    ${price.from}
                    {price.to > price.from && <>–${price.to}</>}
                  </span>
                  {price.unit && (
                    <span className="mt-4 block text-xs font-bold uppercase tracking-[0.2em] text-white/60">{price.unit}</span>
                  )}
                  {price.note && <p className="mt-5 max-w-md leading-relaxed text-white/70">{price.note}</p>}
                  <p className="mt-8 border-t border-white/20 pt-5 text-sm leading-relaxed text-white/60">{t(c.costDisclaimer)}</p>
                </div>
                {factors.length > 0 && (
                  <div className="bg-surface p-8 sm:p-10">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">{c.costFactorsLabel}</span>
                    <ul className="mt-6 divide-y-2 divide-border-light border-t-2 border-border-light">
                      {factors.map((f) => (
                        <li key={f} className="flex items-start gap-4 py-4">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-primary-500">
                            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                          </span>
                          <span className="text-sm font-medium leading-relaxed text-text">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

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
