'use client'

import { siteConfig } from '@/config/site-config'
import { BadgeCheck, Check, ShieldCheck, Star } from 'lucide-react'

/**
 * About / why choose us.
 *
 * Photo on the left with a hard-edged stat block overlapping it, reasons on
 * the right. Every figure comes from siteConfig.trust. Nothing is invented
 * here, and each block hides itself when its value is empty, so a client
 * without a review count doesn't get a hole in the layout.
 */
export function About() {
  const { about, trust, photos, companyName, copy } = siteConfig
  const c = copy.aboutSection

  return (
    <section id="about" className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Photo */}
          <div className="relative">
            {photos.about ? (
              <img
                src={photos.about}
                alt={`The ${companyName} crew`}
                style={{ objectPosition: photos.aboutFocal || 'center' }}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="aspect-[4/3] w-full bg-neutral-200" />
            )}

            {trust.yearsInBusiness > 0 && (
              <div className="absolute -bottom-6 left-0 max-w-[12rem] bg-primary-500 px-7 py-5 sm:-left-6">
                <span className="block text-4xl font-extrabold leading-none text-white">{trust.yearsInBusiness}+</span>
                <span className="mt-1.5 block text-[11px] font-bold uppercase leading-snug tracking-[0.16em] text-white/85">
                  {c.yearsLabel}
                </span>
              </div>
            )}
          </div>

          {/* Copy */}
          <div className="pt-8 lg:pt-0">
            {c.eyebrow && (
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">{c.eyebrow}</span>
            )}

            <h2 className="mt-4 text-3xl font-extrabold uppercase leading-[0.98] tracking-tight text-text sm:text-4xl">
              {c.title} <span className="text-primary-500">{companyName}</span>
            </h2>

            {about.body && <p className="mt-5 leading-relaxed text-text-muted">{about.body}</p>}

            {about.points.length > 0 && (
              <ul className="mt-8 divide-y-2 divide-border-light border-y-2 border-border-light">
                {about.points.map((text) => (
                  <li key={text} className="flex items-start gap-4 py-4">
                    <Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" strokeWidth={3} />
                    <span className="text-sm font-medium leading-relaxed text-text">{text}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Credentials strip */}
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              {trust.googleReviewCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary-500 text-primary-500" />
                    ))}
                  </div>
                  <span className="text-sm text-text-muted">
                    <strong className="text-text">{trust.googleRating}</strong> · {trust.googleReviewCount} {c.googleReviews}
                  </span>
                </div>
              )}

              {trust.licenseNumber && (
                <span className="flex items-center gap-2 text-sm text-text-muted">
                  <BadgeCheck className="h-4 w-4 text-primary-500" />
                  {trust.licenseLabel} #{trust.licenseNumber}
                </span>
              )}

              {trust.insured && (
                <span className="flex items-center gap-2 text-sm text-text-muted">
                  <ShieldCheck className="h-4 w-4 text-primary-500" />
                  {c.insured}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
