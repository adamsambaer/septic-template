'use client'

import { siteConfig } from '@/config/site-config'
import { cn } from '@/lib/utils'
import { Briefcase, HeartPulse, Lightbulb, Shield, Sparkles, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'

const SECTION_TITLE = 'Our Services'
const SECTION_SUBTITLE = `Comprehensive solutions from ${siteConfig.companyName} designed to meet your unique needs and exceed your expectations.`

// Service offerings (customize per-client or via CMS)
const SERVICES = [
  {
    icon: HeartPulse,
    title: 'Service One',
    description: 'Detailed description of this service and how it benefits the customer. Highlight key features.',
  },
  {
    icon: Lightbulb,
    title: 'Service Two',
    description: 'Detailed description of this service and how it benefits the customer. Highlight key features.',
  },
  {
    icon: Users,
    title: 'Service Three',
    description: 'Detailed description of this service and how it benefits the customer. Highlight key features.',
  },
  {
    icon: Briefcase,
    title: 'Service Four',
    description: 'Detailed description of this service and how it benefits the customer. Highlight key features.',
  },
  {
    icon: Shield,
    title: 'Service Five',
    description: 'Detailed description of this service and how it benefits the customer. Highlight key features.',
  },
  {
    icon: Sparkles,
    title: 'Service Six',
    description: 'Detailed description of this service and how it benefits the customer. Highlight key features.',
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

export function Services() {
  return (
    <section id="services" className="relative py-24 lg:py-32">
      {/* Section divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text">
            {SECTION_TITLE}
          </h2>
          <p className="mt-4 text-lg text-text-muted max-w-2xl mx-auto">
            {SECTION_SUBTITLE}
          </p>
        </ScrollReveal>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES.map((service, index) => (
            <ScrollReveal key={service.title} delay={index * 0.1}>
              <div className="card-hover bg-surface rounded-2xl p-8 border border-border-light">
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                  <service.icon className="h-7 w-7 text-primary-500" />
                </div>
                <h3 className="text-xl font-semibold text-text mb-3">
                  {service.title}
                </h3>
                <p className="text-text-muted leading-relaxed">
                  {service.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
