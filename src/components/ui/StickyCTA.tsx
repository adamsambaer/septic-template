'use client'

import { siteConfig } from '@/config/site-config'
import { cn } from '@/lib/utils'
import { ArrowRight, Phone } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Mobile call bar.
 *
 * Two thumb-sized blocks pinned to the bottom of the screen on phones: call
 * on the left, quote on the right. Desktop hides it because the nav already
 * carries the phone number.
 *
 * It reveals once the hero's own phone button has scrolled away, so the two
 * never sit on screen together. Lives in the root layout, so it's on every
 * page, which is the point: the number is always one thumb away.
 */
export function StickyCTA() {
  const { phoneHref, phoneNumber, pages, copy } = siteConfig
  const [visible, setVisible] = useState(false)

  const onScroll = useCallback(() => {
    setVisible(window.scrollY > window.innerHeight * 0.6)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  return (
    <div
      aria-hidden={!visible}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t-2 border-text bg-text transition-transform duration-300 lg:hidden',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <a
        href={phoneHref}
        tabIndex={visible ? 0 : -1}
        aria-label={`${copy.stickyBar.call} ${phoneNumber}`}
        className="flex items-center justify-center gap-2 whitespace-nowrap bg-primary-500 py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white active:bg-primary-600"
      >
        <Phone className="h-4 w-4" />
        {copy.stickyBar.call}
      </a>
      <Link
        href={pages.contact ? '/contact' : '/#quote'}
        tabIndex={visible ? 0 : -1}
        className="flex items-center justify-center gap-2 whitespace-nowrap py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white active:bg-neutral-800"
      >
        {copy.stickyBar.quote}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
