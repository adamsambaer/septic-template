'use client'

import { siteConfig } from '@/config/site-config'
import { cn } from '@/lib/utils'
import { ChevronDown, Menu, Phone, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type NavLink = { label: string; href: string; children?: { label: string; href: string }[] }

/**
 * Top-level nav, built from the config so a page that is switched off in
 * Sapt disappears from here too, and every published service gets a dropdown
 * entry. Nothing is hardcoded: labels come from copy.nav.
 */
function buildLinks(): NavLink[] {
  const { services, serviceArea, pages, copy } = siteConfig
  const links: (NavLink | false)[] = [
    pages.services &&
      services.length > 0 && {
        label: copy.nav.services,
        href: '/services',
        children: services.map((s) => ({ label: s.title, href: `/services/${s.slug}` })),
      },
    pages.serviceAreas && serviceArea.cities.length > 0 && { label: copy.nav.areas, href: '/service-areas' },
    pages.about && { label: copy.nav.about, href: '/about' },
    pages.reviews && { label: copy.nav.reviews, href: '/reviews' },
    pages.contact && { label: copy.nav.contact, href: '/contact' },
  ]
  return links.filter((l): l is NavLink => Boolean(l))
}

const LINKS = buildLinks()

/**
 * Navbar.
 *
 * Transparent over the dark hero, then solid once scrolled so it stays legible
 * against light sections. The phone number is a permanent element rather than a
 * nav link. On a septic site it is the primary conversion, not a menu item.
 */
export function Navbar() {
  const { companyName, phoneNumber, phoneHref, photos, emergency, copy } = siteConfig
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled || open ? 'border-b border-border bg-surface/95 backdrop-blur' : 'bg-transparent'
      )}
    >
      {/* Emergency strip. The one place the accent red is used: it means
          "right now". Not dismissible. Nobody gets to hide the emergency number. */}
      {emergency.enabled && (
        <a
          href={phoneHref}
          className="flex items-center justify-center gap-2 bg-accent-500 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-accent-600 sm:text-xs"
        >
          <span className="text-white/80">{emergency.label}</span>
          <span>{emergency.ctaText}</span>
          <span className="hidden sm:inline">· {phoneNumber}</span>
        </a>
      )}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center" aria-label={`${companyName} ${copy.nav.home}`}>
          {photos.logo ? (
            // Two real lockups rather than a CSS filter: a filter would also
            // flip the brand color inside the mark. A client who uploaded one
            // logo has no second lockup, so there the filter is the only thing
            // standing between their dark mark and an invisible header.
            <img
              src={scrolled || open ? photos.logo : photos.logoLight}
              alt={companyName}
              className={cn(
                'h-8 w-auto sm:h-9',
                photos.logoLightKnockout && !scrolled && !open && 'brightness-0 invert'
              )}
            />
          ) : (
            <span
              className={cn(
                'text-lg font-extrabold uppercase tracking-tight',
                scrolled || open ? 'text-text' : 'text-white'
              )}
            >
              {companyName}
            </span>
          )}
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => {
            const linkClass = cn(
              'inline-flex items-center gap-1.5 text-sm font-semibold transition-colors',
              scrolled || open ? 'text-text-muted hover:text-text' : 'text-white/80 hover:text-white'
            )

            if (!l.children) {
              return (
                <Link key={l.href} href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              )
            }

            return (
              <div
                key={l.href}
                className="relative"
                onMouseEnter={() => setMenu(l.href)}
                onMouseLeave={() => setMenu(null)}
              >
                <Link
                  href={l.href}
                  className={linkClass}
                  aria-expanded={menu === l.href}
                  aria-haspopup="true"
                  onFocus={() => setMenu(l.href)}
                >
                  {l.label}
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', menu === l.href && 'rotate-180')}
                  />
                </Link>

                {menu === l.href && (
                  // Padded wrapper keeps the hover bridge intact across the gap.
                  <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-4">
                    <div className="w-72 border-2 border-text bg-surface shadow-2xl shadow-black/20">
                      {l.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          className="block border-b border-border-light px-5 py-3.5 text-sm font-semibold text-text transition-colors last:border-0 hover:bg-primary-500 hover:text-white"
                        >
                          {c.label}
                        </Link>
                      ))}
                      <Link
                        href={l.href}
                        className="block bg-text px-5 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-500"
                      >
                        {copy.nav.viewAll}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={phoneHref}
            className="inline-flex items-center gap-2 bg-primary-500 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-primary-600 sm:px-5 sm:text-sm"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">{phoneNumber}</span>
            <span className="sm:hidden">{copy.nav.call}</span>
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className={cn(
              'flex h-11 w-11 items-center justify-center border-2 lg:hidden',
              scrolled || open ? 'border-border text-text' : 'border-white/30 text-white'
            )}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-border bg-surface px-4 py-3 lg:hidden">
          {LINKS.map((l) => (
            <div key={l.href} className="border-b border-border-light last:border-0">
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-base font-extrabold uppercase tracking-tight text-text"
              >
                {l.label}
              </Link>
              {l.children && (
                <div className="border-l-2 border-primary-500 pb-3 pl-4">
                  {l.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={() => setOpen(false)}
                      className="block py-2 text-sm font-medium text-text-muted"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      )}
    </header>
  )
}
