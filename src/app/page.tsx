import { Footer, Navbar } from '@/components/layout'
import { About, CTA, Hero, Services } from '@/components/sections'
import { CoverageBand, Faq, Reviews } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { JsonLd, businessNode, faqNode, graph, websiteNode } from '@/lib/schema'

/**
 * Home.
 *
 * Section order follows what converts for a trade site: hero with the form,
 * services, proof (about + reviews), a dark coverage band to break the run of
 * light sections, FAQ for the pre-emergency searcher, then the closing call.
 *
 * The JSON-LD graph is the canonical description of the business: every other
 * page references it by id rather than repeating a half-filled copy of it.
 */
export default function Home() {
  return (
    <>
      <JsonLd data={graph(businessNode(), websiteNode(), faqNode(siteConfig.faqs))} />
      <Navbar />
      <main>
        <Hero />
        <Services />
        <About />
        <Reviews />
        <CoverageBand />
        <Faq />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
