'use client'

import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { ArrowUpRight, Phone } from 'lucide-react'
import Link from 'next/link'

/**
 * Services: stacked cards, photo on top, copy underneath.
 *
 * One card per published service in Sapt. Every card is the same shape:
 * photo block, then a white copy block with the title, one sentence, and an
 * action row pinned to the bottom so the "Learn more" rows line up across
 * the grid regardless of description length.
 *
 * Square corners throughout. Hover: the card lifts 4px on a two-layer shadow
 * and the title takes the brand color. Nothing else moves.
 *
 * Crops are tuned per photo via `focal` (a CSS object-position value) so a
 * client's own photos can be framed without touching this file.
 */
export function Services() {
  const { services, phoneHref, copy } = siteConfig
  const c = copy.servicesSection
  if (services.length === 0) return null

  return (
    <section id="services" className="bg-bg py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b-2 border-text pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            {c.eyebrow && (
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">{c.eyebrow}</span>
            )}
            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold uppercase leading-[0.98] tracking-tight text-text sm:text-4xl lg:text-5xl">
              {c.title} <span className="text-primary-500">{c.accent}</span>
            </h2>
          </div>
          {c.intro && <p className="max-w-sm text-sm leading-relaxed text-text-muted">{t(c.intro)}</p>}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => {
            const isEmergency = service.icon === 'siren'

            return (
              <Link
                key={service.slug}
                href={isEmergency ? phoneHref : `/services/${service.slug}`}
                className="group flex transform-gpu flex-col border border-border bg-surface transition-[transform,box-shadow] duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(20,22,26,0.06),0_22px_40px_-18px_rgba(20,22,26,0.4)] active:translate-y-0 active:shadow-none"
              >
                {/* Photo */}
                <div className="relative aspect-[4/3] overflow-hidden bg-neutral-900">
                  {service.image && (
                    <img
                      src={service.image}
                      alt={service.title}
                      loading={i < 3 ? 'eager' : 'lazy'}
                      style={{ objectPosition: service.focal || 'center' }}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {isEmergency && c.emergencyBadge && (
                    <span className="absolute left-0 top-4 inline-flex items-center bg-accent-500 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white">
                      {c.emergencyBadge}
                    </span>
                  )}
                </div>

                {/* Copy */}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-extrabold uppercase leading-[1.05] tracking-tight text-text transition-colors duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:text-primary-500">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">{service.description}</p>

                  {/* Action row, pinned to the bottom so every card's row aligns */}
                  <span className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs font-bold uppercase tracking-[0.14em] text-text">
                    <span className="pt-2">{isEmergency ? c.callNow : c.learnMore}</span>
                    <span className="mt-2 flex h-7 w-7 items-center justify-center bg-primary-500">
                      {isEmergency ? (
                        <Phone className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                      )}
                    </span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
