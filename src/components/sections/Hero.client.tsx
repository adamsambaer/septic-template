'use client'

import { siteConfig } from '@/config/site-config'
import { cn } from '@/lib/utils'
import { ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

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

export interface HeroContent {
  headline: string
  headlineAccent: string
  subheadline: string
  trustPoints: string[]
}

export function HeroView({ content }: { content: HeroContent }) {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background decorations (hidden on mobile for performance) */}
      <div className="hidden md:block absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-[500px] h-[600px] bg-primary-200/20 blur-[80px] rounded-full" />
        <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] bg-accent-200/15 blur-[60px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <ScrollReveal>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text leading-tight">
                {content.headline}
                <span className="block text-primary-500">{content.headlineAccent}</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <p className="mt-6 text-lg sm:text-xl text-text-muted max-w-2xl mx-auto lg:mx-0">
                {content.subheadline}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/book"
                  className="btn-primary inline-flex items-center justify-center gap-2 py-4 px-8 rounded-full text-lg"
                >
                  {siteConfig.ctaText}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="#services"
                  className="btn-secondary inline-flex items-center justify-center py-4 px-8 rounded-full text-lg"
                >
                  {siteConfig.secondaryCtaText}
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3">
                {content.trustPoints.map((point) => (
                  <div key={point} className="flex items-center gap-2 text-text-muted">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">{point}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Visual placeholder */}
          <ScrollReveal delay={0.2} className="hidden lg:block">
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* ⬇️ CHANGE THIS: Replace with actual image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-24 h-24 bg-primary-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl">📸</span>
                  </div>
                  <p className="text-primary-700 font-medium">Hero Image</p>
                  <p className="text-primary-600 text-sm mt-1">Replace with client photo</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
