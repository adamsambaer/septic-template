'use client'

import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

/* ════════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ────────────────────────────────────────────────────────────────────────────
   Update the CTA text and link as needed.
   ════════════════════════════════════════════════════════════════════════════ */

// ⬇️ CHANGE THIS: Button text
const CTA_TEXT = 'Book Now'

export function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false)

  const handleScroll = useCallback(() => {
    // Show after scrolling past ~80% of viewport height (past hero)
    const scrollThreshold = window.innerHeight * 0.8
    setIsVisible(window.scrollY > scrollThreshold)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial state
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div
      style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      className={cn(
        'fixed right-6 z-40 transition-all duration-300',
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <Link
        href="/book"
        className="btn-primary flex items-center gap-2 py-3.5 px-8 rounded-full shadow-lg text-base font-semibold"
      >
        <Calendar className="h-5 w-5" />
        {CTA_TEXT}
      </Link>
    </div>
  )
}
