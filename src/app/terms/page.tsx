import { Footer, Navbar } from '@/components/layout'
import { PageHero } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

const { companyName, pages, copy } = siteConfig
const c = copy.termsPage

export const metadata: Metadata = {
  title: `${c.title} | ${companyName}`,
  robots: { index: false },
  alternates: { canonical: '/terms' },
}

/**
 * Terms of service. Body is HTML from Sapt ("8 · Copy & labels → Terms of
 * service page") with {placeholders} filled from the site settings. Plain-
 * English template, not legal advice. Lawyer first.
 */
export default function TermsPage() {
  if (!pages.terms) notFound()

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow="Legal"
          title={c.title}
          trail={[{ label: copy.nav.home, href: '/' }, { label: copy.footer.terms }]}
          withForm={false}
        />
        <section className="bg-bg py-16 lg:py-24">
          <div className="prose-septic mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            {c.lastUpdated && <p className="text-sm text-text-muted">{c.lastUpdated}</p>}
            <div dangerouslySetInnerHTML={{ __html: t(c.body) }} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
