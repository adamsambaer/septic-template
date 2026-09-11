import { Footer, Navbar } from '@/components/layout'
import { About, CTA } from '@/components/sections'
import { PageHero, Reviews } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

const { about, photos, pages, copy } = siteConfig
const c = copy.aboutPage

export const metadata: Metadata = {
  title: t(c.metaTitle),
  description: about.body,
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  if (!pages.about) notFound()

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow={c.eyebrow}
          title={about.headline}
          intro={about.body}
          image={photos.cta}
          focal={photos.ctaFocal}
          trail={[{ label: copy.nav.home, href: '/' }, { label: copy.nav.about }]}
          withForm={false}
        />
        <About />
        <Reviews />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
