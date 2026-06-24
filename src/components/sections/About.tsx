'use client'

import { siteConfig } from '@/config/site-config'
import { cn } from '@/lib/utils'
import { Award, Clock, Heart, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'

const ABOUT_TITLE = `Why Choose ${siteConfig.companyName}`
const ABOUT_SUBTITLE = 'Trusted by Thousands'
const ABOUT_DESCRIPTION = `We're dedicated to providing exceptional service and results that exceed expectations. With years of experience and a commitment to excellence, we've helped countless clients achieve their goals.

Our team combines expertise with a personalized approach, ensuring every client receives the attention and care they deserve.`

// Key stats/features
const STATS = [
  { icon: Users, value: '5,000+', label: 'Happy Clients' },
  { icon: Award, value: '15+', label: 'Years Experience' },
  { icon: Heart, value: '98%', label: 'Satisfaction Rate' },
  { icon: Clock, value: '24/7', label: 'Support Available' },
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

export function About() {
  return (
    <section id="about" className="relative py-24 lg:py-32 bg-surface">
      {/* Section divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image placeholder */}
          <ScrollReveal className="order-2 lg:order-1">
            <div className="relative aspect-[4/3] max-w-lg mx-auto">
              {/* ⬇️ CHANGE THIS: Replace with actual image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-accent-100 rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-24 h-24 bg-primary-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl">👤</span>
                  </div>
                  <p className="text-primary-700 font-medium">About Image</p>
                  <p className="text-primary-600 text-sm mt-1">Team or founder photo</p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <ScrollReveal>
              <p className="text-primary-500 font-semibold mb-2">{ABOUT_SUBTITLE}</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text mb-6">
                {ABOUT_TITLE}
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="prose prose-lg text-text-muted">
                {ABOUT_DESCRIPTION.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
                ))}
              </div>
            </ScrollReveal>

            {/* Stats */}
            <ScrollReveal delay={0.2}>
              <div className="grid grid-cols-2 gap-6 mt-10">
                {STATS.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <stat.icon className="h-6 w-6 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text">{stat.value}</p>
                      <p className="text-sm text-text-muted">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}
