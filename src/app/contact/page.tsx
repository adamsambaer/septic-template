import { QuoteForm } from '@/components/QuoteForm'
import { Footer, Navbar } from '@/components/layout'
import { Faq, PageHero } from '@/components/sections/PageParts'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

const { phoneNumber, phoneHref, email, address, trust, photos, pages, copy } = siteConfig
const c = copy.contactPage

export const metadata: Metadata = {
  title: t(c.metaTitle),
  description: t(c.metaDescription),
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  if (!pages.contact) notFound()

  const tile = 'flex items-start gap-4 bg-surface p-6'
  const icon = 'flex h-10 w-10 shrink-0 items-center justify-center bg-primary-500'
  const label = 'block text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted'

  return (
    <>
      <Navbar />
      <main>
        <PageHero
          eyebrow={c.eyebrow}
          title={t(c.title)}
          intro={t(c.intro)}
          image={photos.cta}
          focal={photos.ctaFocal}
          trail={[{ label: copy.nav.home, href: '/' }, { label: copy.nav.contact }]}
          withForm={false}
        />

        <section className="bg-bg py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              {/* Details */}
              <div className="grid gap-px self-start bg-border">
                <a href={phoneHref} className={`group ${tile} transition-colors hover:bg-text`}>
                  <span className={icon}><Phone className="h-4.5 w-4.5 text-white" /></span>
                  <span>
                    <span className={`${label} group-hover:text-white/60`}>{c.callLabel}</span>
                    <span className="mt-1 block text-xl font-extrabold text-text group-hover:text-white">{phoneNumber}</span>
                  </span>
                </a>

                {email && (
                  <a href={`mailto:${email}`} className={`group ${tile} transition-colors hover:bg-text`}>
                    <span className={icon}><Mail className="h-4.5 w-4.5 text-white" /></span>
                    <span>
                      <span className={`${label} group-hover:text-white/60`}>{c.emailLabel}</span>
                      <span className="mt-1 block break-all text-base font-bold text-text group-hover:text-white">{email}</span>
                    </span>
                  </a>
                )}

                {(address.street || address.city) && (
                  <div className={tile}>
                    <span className={icon}><MapPin className="h-4.5 w-4.5 text-white" /></span>
                    <span>
                      <span className={label}>{c.basedLabel}</span>
                      <span className="mt-1 block text-base font-bold text-text">
                        {address.street}
                        {address.street && <br />}
                        {address.city}, {address.state} {address.zip}
                      </span>
                    </span>
                  </div>
                )}

                <div className={tile}>
                  <span className={icon}><Clock className="h-4.5 w-4.5 text-white" /></span>
                  <span>
                    <span className={label}>{c.hoursLabel}</span>
                    <span className="mt-1 block text-base font-bold text-text">
                      {trust.emergencyAvailable ? c.hours : c.officeHours}
                    </span>
                    {trust.emergencyAvailable && (
                      <span className="mt-0.5 block text-sm text-text-muted">{c.officeHours}</span>
                    )}
                  </span>
                </div>
              </div>

              <QuoteForm heading={c.formHeading} />
            </div>
          </div>
        </section>

        <Faq />
      </main>
      <Footer />
    </>
  )
}
