'use client'

import { siteConfig } from '@/config/site-config'
import { cn } from '@/lib/utils'
import { ArrowRight, CheckCircle, Phone } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

const CTA_TITLE = 'Ready to Get Started?'
const CTA_ACCENT = 'Book Your Free Consultation'
const CTA_DESCRIPTION = 'Take the first step today. Our team is ready to help you achieve your goals with personalized solutions.'

const BENEFITS = [
  'Free initial consultation',
  'Same-week appointments',
  'Flexible payment options',
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

export function CTA() {
  return (
    <section id="contact" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Section divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Background accents (desktop only) */}
      <div className="hidden md:block absolute -left-20 top-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary-400/10 rounded-full blur-[80px]" />
      <div className="hidden md:block absolute -right-20 bottom-0 w-[250px] h-[250px] bg-accent-400/8 rounded-full blur-[60px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <ScrollReveal>
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text mb-6">
                {CTA_TITLE}
                <span className="block text-primary-500">{CTA_ACCENT}</span>
              </h2>
              <p className="text-xl text-text-muted mb-8 leading-relaxed">
                {CTA_DESCRIPTION}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/book"
                  className="btn-primary inline-flex items-center justify-center gap-3 text-lg py-4 px-8 rounded-full"
                >
                  Book Online
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href={siteConfig.phoneHref}
                  className="inline-flex items-center justify-center gap-2 text-text-muted font-medium hover:text-primary-500 transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  or call {siteConfig.phoneNumber}
                </a>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-text-muted text-sm">
                {BENEFITS.map((benefit, index) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{benefit}</span>
                    {index < BENEFITS.length - 1 && (
                      <div className="hidden sm:block w-1 h-1 bg-text-light rounded-full ml-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Visual placeholder */}
          <ScrollReveal delay={0.2}>
            <div className="relative aspect-[4/3] max-w-sm lg:max-w-lg mx-auto">
              {/* ⬇️ CHANGE THIS: Replace with actual image */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-primary-100 to-accent-100 overflow-hidden shadow-xl flex items-center justify-center"
                style={{
                  borderRadius: '45% 55% 40% 60% / 50% 45% 55% 50%',
                }}
              >
                <div className="text-center p-8">
                  <div className="w-24 h-24 bg-primary-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl">📞</span>
                  </div>
                  <p className="text-primary-700 font-medium">Contact Image</p>
                  <p className="text-primary-600 text-sm mt-1">Office or team photo</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
