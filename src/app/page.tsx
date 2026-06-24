import { Footer, Navbar } from '@/components/layout'
import { About, CTA, Hero, Services, Testimonials } from '@/components/sections'
import { StickyCTA } from '@/components/ui'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Services />
        <About />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
      <StickyCTA />
    </>
  )
}
