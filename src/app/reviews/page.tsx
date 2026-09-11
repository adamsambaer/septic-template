import { Footer, Navbar } from '@/components/layout'
import { CTA } from '@/components/sections'
import { PageHero, Reviews } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { ExternalLink, Star } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

const { trust, photos, pages, copy } = siteConfig
const c = copy.reviewsPage

export const metadata: Metadata = {
  title: t(c.metaTitle),
  description: trust.googleReviewCount > 0 ? t(copy.reviewsSection.rated) : t(c.intro),
  alternates: { canonical: '/reviews' },
}

/** Reviews page. Links out to the real Google profile rather than pretending the on-page quotes are the whole story. */
export default function ReviewsPage() {
  if (!pages.reviews) notFound()

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow={c.eyebrow}
          title={t(c.title)}
          intro={t(c.intro)}
          image={photos.about}
          focal={photos.aboutFocal}
          trail={[{ label: copy.nav.home, href: '/' }, { label: copy.nav.reviews }]}
          withForm={false}
        />

        {trust.googleReviewUrl && trust.googleReviewCount > 0 && (
          <section className="border-b-2 border-text bg-surface">
            <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <div className="flex items-center gap-4">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary-500 text-primary-500" />
                  ))}
                </div>
                <span className="text-sm text-text-muted">
                  <strong className="text-lg text-text">{trust.googleRating}</strong> {t(c.average)}
                </span>
              </div>
              <a
                href={trust.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-text px-5 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-500"
              >
                {c.readOnGoogle}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </section>
        )}

        <Reviews />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
