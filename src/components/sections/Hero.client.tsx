'use client'

import { QuoteForm } from '@/components/QuoteForm'
import { siteConfig } from '@/config/site-config'
import { ArrowRight, Check, Phone } from 'lucide-react'
import type { CSSProperties } from 'react'

export interface HeroContent {
  headline: string
  headlineAccent: string
  subheadline: string
  trustPoints: string[]
}

/**
 * Hero — dark, photo-led, form-forward.
 *
 * Structure follows the contractor-site convention: full-bleed job photo,
 * heavy uppercase headline with one accented line, two pill CTAs, and the
 * estimate form floating over the photo on the right.
 *
 * The photo is doing most of the work. Until siteConfig.photos.hero is set, a
 * dark layered gradient stands in so the layout and contrast still read.
 *
 * Phones get a different treatment. Stretching a 2:1 job-site photo over a
 * 1300px-tall portrait hero leaves a 15%-wide sliver of the image on screen,
 * which on a pump truck is a chrome blob. So below lg the photo is confined
 * to a fixed-height band at the top, framed with `photos.heroFocal.mobile`,
 * and fades into the solid dark base that the trust points and form sit on.
 */
export function HeroView({ content }: { content: HeroContent }) {
  const { phoneNumber, phoneHref, eyebrow, photos, dark } = siteConfig

  return (
    <section className="relative isolate overflow-hidden">
      {/* ── Background ── */}
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ backgroundColor: dark.base }}>
        {/* Photo band: fixed height on phones, full bleed from lg up. */}
        <div className="absolute inset-x-0 top-0 h-[600px] lg:h-full">
          {photos.hero ? (
            <img
              src={photos.hero}
              alt=""
              style={
                {
                  '--focal-m': photos.heroFocal.mobile,
                  '--focal-d': photos.heroFocal.desktop,
                } as CSSProperties
              }
              className="h-full w-full object-cover [object-position:var(--focal-m)] lg:[object-position:var(--focal-d)]"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `
                  radial-gradient(120% 90% at 78% 15%, ${dark.raised} 0%, transparent 60%),
                  radial-gradient(90% 70% at 10% 90%, #2A2E35 0%, transparent 55%),
                  linear-gradient(180deg, ${dark.base} 0%, #0E1013 100%)
                `,
              }}
            />
          )}
          {/* Scrims keep the headline readable over any photo the client sends.
              Phones: top-to-bottom, dark under the headline, clearer through
              the middle, then a fade into the solid base below the band.
              Desktop: left-to-right so the copy side is dark and the truck
              side stays visible. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/50 lg:hidden" />
          <div
            className="absolute inset-x-0 bottom-0 h-56 lg:hidden"
            style={{ background: `linear-gradient(to bottom, transparent, ${dark.base})` }}
          />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-black/85 via-black/55 to-black/20 lg:block" />
          <div className="absolute inset-0 hidden bg-gradient-to-t from-black/60 via-transparent to-black/45 lg:block" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-40 sm:px-6 lg:px-8 lg:pb-24 lg:pt-48">
        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* ── Left: the pitch ── */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                {eyebrow}
              </span>
            </div>

            <h1
              className="mt-6 text-[2.6rem] font-extrabold uppercase leading-[0.95] tracking-tight text-white text-balance sm:text-6xl lg:text-[4.25rem]"
              style={{ fontStretch: 'condensed' }}
            >
              {content.headline}
              {/* Second line stays white on purpose: the brand color in the hero
                  belongs to the phone button alone, so the eye lands there. */}
              <span className="mt-1 block">
                {content.headlineAccent}
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">
              {content.subheadline}
            </p>

            {/* Phone is the primary action. The person with a backup wants to
                dial, not fill a form. The form stays alongside for the planner. */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={phoneHref}
                className="inline-flex items-center justify-center gap-3 bg-primary-500 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-600"
              >
                <Phone className="h-4 w-4" />
                {phoneNumber}
              </a>
              <a
                href="#quote"
                className="inline-flex items-center justify-center gap-2 border-2 border-white/30 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-neutral-900"
              >
                {siteConfig.ctaText}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <ul className="mt-12 grid max-w-lg gap-x-8 gap-y-3 sm:grid-cols-2">
              {content.trustPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" strokeWidth={3} />
                  <span className="text-sm font-medium text-white/85">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Right: the estimate card ── */}
          <div id="quote" className="lg:-mt-4">
            <QuoteForm className="shadow-2xl shadow-black/40" />
          </div>
        </div>
      </div>
    </section>
  )
}
