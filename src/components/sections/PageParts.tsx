'use client'

import { QuoteForm } from '@/components/QuoteForm'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { cn } from '@/lib/utils'
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, Minus, Plus, Star } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/**
 * Shared building blocks for every inner page.
 *
 * Kept in one file because they are always used together and each is small.
 * Square edges and heavy rules throughout to match the home page. Every label
 * comes from siteConfig.copy so a client can rename anything in Sapt.
 */

/* ── Breadcrumb ─────────────────────────────────────────────────────────── */

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/55">
        {trail.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {c.href ? (
              <Link href={c.href} className="transition-colors hover:text-white">{c.label}</Link>
            ) : (
              <span className="text-white">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/* ── Inner page hero ────────────────────────────────────────────────────── */

export function PageHero({
  eyebrow,
  title,
  intro,
  image,
  focal,
  trail,
  withForm = true,
  formService,
}: {
  eyebrow?: string
  title: string
  intro?: string
  image?: string
  focal?: string
  trail: { label: string; href?: string }[]
  withForm?: boolean
  formService?: string
}) {
  const { dark } = siteConfig

  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {image ? (
          <img src={image} alt="" style={{ objectPosition: focal || 'center' }} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: dark.base }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-14 pt-40 sm:px-6 lg:px-8 lg:pb-20 lg:pt-48">
        <div className={cn('grid gap-10', withForm ? 'lg:grid-cols-[1.1fr_0.9fr] lg:gap-14' : 'max-w-3xl')}>
          <div>
            <Breadcrumbs trail={trail} />

            {eyebrow && (
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{eyebrow}</span>
              </div>
            )}

            <h1 className="text-3xl font-extrabold uppercase leading-[0.98] tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
              {title}
            </h1>

            {intro && <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">{intro}</p>}
          </div>

          {withForm && <QuoteForm className="shadow-2xl shadow-black/40" defaultService={formService} />}
        </div>
      </div>
    </section>
  )
}

/* ── Section heading ────────────────────────────────────────────────────── */

export function SectionHead({
  eyebrow,
  title,
  accent,
  intro,
  dark = false,
}: {
  eyebrow?: string
  title: string
  accent?: string
  intro?: string
  dark?: boolean
}) {
  return (
    <div className={cn('border-b-2 pb-8', dark ? 'border-white/20' : 'border-text')}>
      {eyebrow && (
        <span className={cn('text-xs font-bold uppercase tracking-[0.2em]', dark ? 'text-white/60' : 'text-text-muted')}>
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          'mt-4 max-w-3xl text-3xl font-extrabold uppercase leading-[0.98] tracking-tight sm:text-4xl',
          dark ? 'text-white' : 'text-text'
        )}
      >
        {title} {accent && <span className="text-primary-500">{accent}</span>}
      </h2>
      {intro && (
        <p className={cn('mt-4 max-w-2xl leading-relaxed', dark ? 'text-white/70' : 'text-text-muted')}>{intro}</p>
      )}
    </div>
  )
}

/* ── Process track ──────────────────────────────────────────────────────── */

export function ProcessSteps({
  steps = siteConfig.process,
  intro,
}: {
  /** Service pages pass their own steps; the fallback is the general set. */
  steps?: { title: string; body: string }[]
  intro?: string
}) {
  const c = siteConfig.copy.process
  if (steps.length === 0) return null

  return (
    <section className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow={c.eyebrow} title={c.title} accent={t(c.accent, { n: steps.length })} intro={intro ?? c.intro} />

        {/*
          A numbered track. Vertical on mobile with the line down the left,
          horizontal on desktop with the line across the top. The nodes sit on
          the line so the eye reads it as a sequence, not a row of cards.
        */}
        <ol className="relative mt-14 grid gap-10 lg:grid-cols-5 lg:gap-6">
          <div
            aria-hidden="true"
            className="absolute left-[23px] top-0 h-full w-0.5 bg-border lg:left-0 lg:top-[23px] lg:h-0.5 lg:w-full"
          />

          {steps.map((step, i) => {
            const last = i === steps.length - 1
            return (
              <li key={step.title} className="relative pl-16 lg:pl-0 lg:pt-16">
                <span
                  className={cn(
                    'absolute left-0 top-0 flex h-12 w-12 items-center justify-center text-base font-extrabold tabular-nums text-white',
                    last ? 'bg-text' : 'bg-primary-500'
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base font-extrabold uppercase leading-tight tracking-tight text-text">{step.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-text-muted">{step.body}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ── FAQ accordion ──────────────────────────────────────────────────────── */

export function Faq({
  heading,
  items = siteConfig.faqs,
}: {
  heading?: string
  /** Service pages pass their own questions; the fallback is the general set. */
  items?: { q: string; a: string }[]
}) {
  const c = siteConfig.copy.faq
  const [open, setOpen] = useState<number | null>(0)
  if (items.length === 0) return null

  return (
    <section className="bg-bg py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow={c.eyebrow} title={heading ?? c.heading} />
        <dl className="mt-8 border-t-2 border-border-light">
          {items.map((f, i) => (
            <div key={f.q} className="border-b-2 border-border-light">
              <dt>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="text-base font-bold text-text sm:text-lg">{f.q}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary-500">
                    {open === i ? (
                      <Minus className="h-4 w-4 text-white" strokeWidth={3} />
                    ) : (
                      <Plus className="h-4 w-4 text-white" strokeWidth={3} />
                    )}
                  </span>
                </button>
              </dt>
              {open === i && <dd className="pb-6 pr-14 text-sm leading-relaxed text-text-muted">{f.a}</dd>}
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ── Reviews ────────────────────────────────────────────────────────────── */

/** The Google "G". Reviews come from Google, so the section says so. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-label="Google" className={className}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/**
 * Five stars filled to the exact rating. Two rows: a muted base row and a
 * filled row clipped to rating/5, so 4.8 reads as 4.8, not as five.
 */
function Stars({ rating, size = 'h-4 w-4', muted = 'text-black/15', filled = 'text-primary-500' }: { rating: number; size?: string; muted?: string; filled?: string }) {
  const pct = `${Math.max(0, Math.min(5, rating)) * 20}%`
  const row = (cls: string) => Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn(size, 'shrink-0 fill-current', cls)} strokeWidth={0} />)
  return (
    <span className="relative inline-flex" aria-label={`${rating} out of 5`}>
      <span className="flex gap-0.5">{row(muted)}</span>
      <span className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden" style={{ width: pct }}>{row(filled)}</span>
    </span>
  )
}

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

/** Dark summary tile. The number is the proof, so it gets its own block. */
function RatingTile() {
  const { trust, dark, copy } = siteConfig
  const c = copy.reviewsSection
  return (
    <div className="flex flex-col justify-between p-7 text-white" style={{ backgroundColor: dark.base }}>
      <div className="flex items-center gap-2.5">
        <GoogleMark className="h-5 w-5" />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/70">{c.googleReviews}</span>
      </div>
      <div className="mt-10">
        <span className="block text-6xl font-extrabold leading-none tabular-nums">{trust.googleRating.toFixed(1)}</span>
        <div className="mt-4"><Stars rating={trust.googleRating} size="h-5 w-5" muted="text-white/20" /></div>
        <span className="mt-3 block text-sm text-white/65">{t(c.basedOn)}</span>
        {trust.googleReviewUrl && (
          <a
            href={trust.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 bg-primary-500 px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-600"
          >
            {c.readAll}
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </a>
        )}
      </div>
    </div>
  )
}

function ReviewCard({ review, large = false }: { review: (typeof siteConfig.reviews)[number]; large?: boolean }) {
  const { copy } = siteConfig
  return (
    <figure className={cn('flex h-full flex-col border border-border bg-surface', large ? 'p-8 sm:p-10' : 'p-7')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-text text-sm font-extrabold tracking-wide text-white" aria-hidden="true">
            {initials(review.name)}
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-extrabold uppercase tracking-tight text-text">{review.name}</span>
            <span className="block text-xs text-text-muted">
              {review.city}
              {review.date && ` · ${review.date}`}
            </span>
          </div>
        </div>
        <GoogleMark className="h-5 w-5 shrink-0" />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Stars rating={review.rating} />
        <span className="text-xs text-text-muted">{review.service}</span>
      </div>

      <blockquote className={cn('mt-3 leading-relaxed text-text', large ? 'max-w-3xl text-lg sm:text-xl' : 'text-[15px]')}>
        {review.text}
      </blockquote>

      {large && (
        <figcaption className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
          {copy.reviewsSection.postedOn}
        </figcaption>
      )}
    </figure>
  )
}

/**
 * Review slider.
 *
 * A native scroll-snap track, so it is smooth on every device, swipeable on
 * phones, and needs no library. Two cards show at a time on desktop with the
 * next one peeking, which is the cue that it slides. Square arrow controls and
 * a counter sit above the track. It advances on its own every few seconds,
 * pauses while hovered or focused, and stays put for anyone who prefers
 * reduced motion.
 */
function ReviewSlider({ reviews }: { reviews: (typeof siteConfig.reviews) }) {
  const track = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = reviews.length

  const step = useCallback(() => {
    const el = track.current
    if (!el || !el.firstElementChild) return 0
    const card = el.firstElementChild as HTMLElement
    return card.offsetWidth + 16 // gap-4
  }, [])

  const goTo = useCallback((i: number) => {
    const el = track.current
    if (!el) return
    const next = ((i % count) + count) % count
    el.scrollTo({ left: next * step(), behavior: 'smooth' })
  }, [count, step])

  // Keep the counter honest when the user swipes.
  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, step())))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [step])

  // Auto-advance, politely.
  useEffect(() => {
    if (paused || count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => goTo(index + 1), 6000)
    return () => window.clearInterval(id)
  }, [paused, count, index, goTo])

  const atStart = index <= 0
  const atEnd = index >= count - 1
  const btn = 'flex h-11 w-11 items-center justify-center border-2 border-text text-text transition-colors hover:bg-text hover:text-white disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-text'

  return (
    <div
      className="flex min-w-0 flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted tabular-nums">
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => goTo(index - 1)} disabled={atStart} aria-label="Previous review" className={btn}>
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button type="button" onClick={() => goTo(index + 1)} disabled={atEnd} aria-label="Next review" className={btn}>
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <ul
        ref={track}
        className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((r, i) => (
          <li
            key={`${r.name}-${r.city}`}
            className="flex w-[88%] shrink-0 snap-start md:w-[calc(50%-8px)]"
            aria-hidden={Math.abs(i - index) > 1}
          >
            <ReviewCard review={r} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Reviews() {
  const { reviews, trust, copy } = siteConfig
  const c = copy.reviewsSection
  if (reviews.length === 0 && trust.googleReviewCount === 0) return null

  return (
    <section id="reviews" className="bg-bg py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow={c.eyebrow} title={c.title} accent={c.accent} />
        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(260px,0.28fr)_1fr] lg:items-stretch">
          {trust.googleReviewCount > 0 && <RatingTile />}
          {reviews.length > 0 && <ReviewSlider reviews={reviews} />}
        </div>
      </div>
    </section>
  )
}

/**
 * One review for a city page.
 *
 * Ten city pages carrying the same three quotes reads as boilerplate, to a
 * visitor and to Google. One quote that names the city reads as local. Uses
 * the review from that city when there is one, the first review otherwise,
 * and renders nothing when there are no reviews at all.
 */
export function LocalReview({ city }: { city: string }) {
  const { reviews, trust, copy } = siteConfig
  const c = copy.reviewsSection
  const review = reviews.find((r) => r.city === city) ?? reviews[0]
  if (!review) return null
  const isLocal = review.city === city

  return (
    <section className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow={c.eyebrow} title={isLocal ? c.localTitle : c.title} accent={isLocal ? city : c.accent} />
        <div className="mt-10 grid gap-4 lg:grid-cols-[0.3fr_0.7fr]">
          {trust.googleReviewCount > 0 && <RatingTile />}
          <ReviewCard review={review} large />
        </div>
      </div>
    </section>
  )
}

/* ── Coverage band ──────────────────────────────────────────────────────── */

export function CoverageBand() {
  const { serviceArea, photos, dark, pages, copy } = siteConfig
  const c = copy.coverage
  if (!pages.serviceAreas || serviceArea.cities.length === 0) return null

  return (
    <section id="areas" className="relative isolate overflow-hidden text-white" style={{ backgroundColor: dark.base }}>
      {/* Photo bleeds in from the right and fades into the dark ground. */}
      {photos.hero && (
        <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-[55%] lg:block">
          <img src={photos.hero} alt="" className="h-full w-full object-cover" style={{ objectPosition: photos.coverageFocal || 'center' }} />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${dark.base} 0%, ${dark.base}E6 35%, ${dark.base}66 70%, ${dark.base}33 100%)`,
            }}
          />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="lg:max-w-[62%]">
          {c.eyebrow && <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">{c.eyebrow}</span>}
          <h2 className="mt-4 text-3xl font-extrabold uppercase leading-[0.98] tracking-tight sm:text-4xl lg:text-5xl">
            {c.title}{' '}
            <span className="text-primary-500">
              {serviceArea.counties.map((x) => x.replace(/ County$/, '')).join(' & ')}
            </span>
          </h2>
          {c.intro && (
            <p className="mt-4 max-w-xl leading-relaxed text-white/70">
              {t(c.intro, { count: serviceArea.cities.length })}
            </p>
          )}

          <ul className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {serviceArea.cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/service-areas/${city.slug}`}
                  className="group flex items-center justify-between border border-white/15 bg-white/[0.04] px-4 py-3.5 transition-colors hover:border-primary-500 hover:bg-primary-500"
                >
                  <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-tight">
                    <MapPin className="h-3.5 w-3.5 text-primary-500 group-hover:text-white" />
                    {city.name}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-white/40 group-hover:text-white" strokeWidth={2.5} />
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/service-areas"
            className="mt-8 inline-flex items-center gap-2 bg-primary-500 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-600"
          >
            {c.allAreas}
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  )
}
