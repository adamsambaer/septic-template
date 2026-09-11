import { Footer, Navbar } from '@/components/layout'
import { CTA, Services } from '@/components/sections'
import { Faq, PageHero, ProcessSteps } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

const { photos, pages, copy } = siteConfig
const c = copy.servicesPage

export const metadata: Metadata = {
  title: t(c.metaTitle),
  description: t(c.metaDescription),
  alternates: { canonical: '/services' },
}

/** Services hub. Switched off in Sapt → 404 and gone from nav, footer, sitemap. */
export default function ServicesIndex() {
  if (!pages.services || siteConfig.services.length === 0) notFound()

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow={siteConfig.eyebrow}
          title={t(c.title)}
          intro={t(c.intro)}
          image={photos.hero}
          focal={photos.heroFocal.desktop}
          trail={[{ label: copy.nav.home, href: '/' }, { label: copy.nav.services }]}
        />
        <Services />
        <ProcessSteps />
        <Faq />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
