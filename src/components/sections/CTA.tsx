'use client'

import { siteConfig } from '@/config/site-config'
import { ArrowRight, Clock, Phone } from 'lucide-react'
import Link from 'next/link'

/**
 * Closing call band.
 *
 * Split block: job photo on one side, dark panel with the phone number on the
 * other. Square edges, no rounding, no gradients beyond the photo scrim.
 *
 * The phone number is the primary action here, not the form. Someone who has
 * scrolled this far and still hasn't filled anything in is usually the person
 * who would rather just talk to somebody.
 */
export function CTA() {
  const { photos, phoneNumber, phoneHref, companyName, serviceArea, trust, dark, pages, copy } = siteConfig
  const c = copy.ctaBand

  return (
    <section id="contact" className="bg-bg py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden border-2 border-text lg:grid-cols-2">
          {/* Photo */}
          <div className="relative min-h-[280px] lg:min-h-[440px]">
            {photos.cta ? (
              <img
                src={photos.cta}
                alt={`Speak to the team at ${companyName}`}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: photos.ctaFocal || 'center' }}
              />
            ) : (
              <div className="absolute inset-0 bg-neutral-800" />
            )}
            {trust.emergencyAvailable && c.badge && (
              <span className="absolute left-0 top-6 inline-flex items-center gap-2 bg-accent-500 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white">
                <Clock className="h-3.5 w-3.5" />
                {c.badge}
              </span>
            )}
          </div>

          {/* Panel */}
          <div className="flex flex-col justify-center p-8 sm:p-12" style={{ backgroundColor: dark.base }}>
            {c.eyebrow && (
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">{c.eyebrow}</span>
            )}

            <h2 className="mt-5 text-3xl font-extrabold uppercase leading-[0.98] tracking-tight text-white sm:text-4xl">
              {c.title} <span className="text-primary-500">{c.accent}</span>
            </h2>

            {c.body && <p className="mt-4 max-w-md leading-relaxed text-white/70">{c.body}</p>}

            <a
              href={phoneHref}
              className="mt-8 inline-flex items-center gap-4 bg-primary-500 px-6 py-5 transition-colors hover:bg-primary-600"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-white/15">
                <Phone className="h-5 w-5 text-white" />
              </span>
              <span className="text-left">
                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">{c.callLabel}</span>
                <span className="block text-2xl font-extrabold leading-tight text-white">{phoneNumber}</span>
              </span>
            </a>

            <Link
              href={pages.contact ? '/contact' : '/#quote'}
              className="mt-3 inline-flex items-center justify-center gap-2 border-2 border-white/25 px-6 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-neutral-900"
            >
              {c.quoteLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>

            {serviceArea.counties.length > 0 && (
              <p className="mt-6 border-t border-white/15 pt-5 text-xs uppercase tracking-wider text-white/45">
                {c.serving} {serviceArea.counties.join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
