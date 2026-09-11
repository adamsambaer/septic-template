import { Footer, Navbar } from '@/components/layout'
import { PageHero } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

const { companyName, pages, copy } = siteConfig
const c = copy.privacyPage

export const metadata: Metadata = {
  title: `${c.title} | ${companyName}`,
  robots: { index: false },
  alternates: { canonical: '/privacy' },
}

/**
 * Privacy policy.
 *
 * Required before running Meta or Google ads to this site, and required for
 * A2P 10DLC campaign registration, which asks for a privacy policy URL that
 * describes how phone numbers are used and how people opt out of texts.
 *
 * The body is HTML from Sapt ("8 · Copy & labels → Privacy policy page") with
 * {placeholders} filled from the site settings. Plain-English template, not
 * legal advice. Have a lawyer read it before it goes on a real client's site.
 */
export default function PrivacyPage() {
  if (!pages.privacy) notFound()

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow="Legal"
          title={c.title}
          trail={[{ label: copy.nav.home, href: '/' }, { label: copy.footer.privacy }]}
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
