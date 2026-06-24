'use client'

import { cn } from '@/lib/utils'
import { Quote, Star } from 'lucide-react'
import { useEffect, useRef } from 'react'

/* ════════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ────────────────────────────────────────────────────────────────────────────
   Update these values with real client testimonials.
   ════════════════════════════════════════════════════════════════════════════ */

// ⬇️ CHANGE THIS: Section header
const SECTION_TITLE = 'What Our Clients Say'
const SECTION_SUBTITLE = 'Real stories from real people who have experienced our services.'

// ⬇️ CHANGE THIS: Client testimonials
const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    title: 'Business Owner',
    quote: 'Absolutely incredible experience! The team was professional, knowledgeable, and delivered results beyond my expectations. Highly recommend to anyone.',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    title: 'Marketing Director',
    quote: 'Working with this team transformed our approach completely. Their expertise and dedication to our success made all the difference.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    title: 'Entrepreneur',
    quote: 'From the first consultation to the final result, everything was seamless. The personalized attention and care they provide is unmatched.',
    rating: 5,
  },
]

function ScrollReveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (window.innerWidth < 768) {
      element.classList.add('animate-visible')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('animate-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn('animate-fade-up', className)}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  )
}

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 lg:py-32">
      {/* Section divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Background accent (desktop only) */}
      <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-200/10 blur-[80px] rounded-full" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text">
            {SECTION_TITLE}
          </h2>
          <p className="mt-4 text-lg text-text-muted max-w-2xl mx-auto">
            {SECTION_SUBTITLE}
          </p>
        </ScrollReveal>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <ScrollReveal key={testimonial.name} delay={index * 0.1}>
              <div className="card-hover bg-surface rounded-2xl p-8 border border-border-light relative">
                {/* Quote icon */}
                <Quote className="absolute top-6 right-6 h-8 w-8 text-primary-100" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-accent-400 text-accent-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-text-muted leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  {/* Avatar placeholder */}
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-lg">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-text">{testimonial.name}</p>
                    <p className="text-sm text-text-muted">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
