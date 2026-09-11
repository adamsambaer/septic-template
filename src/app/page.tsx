import { Footer, Navbar } from '@/components/layout'
import { About, CTA, Hero, Services } from '@/components/sections'
import { CoverageBand, Faq, Reviews } from '@/components/sections/PageParts'

/**
 * Home.
 *
 * Section order follows what converts for a trade site: hero with the form,
 * services, proof (about + reviews), a dark coverage band to break the run of
 * light sections, FAQ for the pre-emergency searcher, then the closing call.
 */
export default function Home() {
  return (
    <>
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
