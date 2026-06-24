'use client'

import { siteConfig } from '@/config/site-config'
import { cn } from '@/lib/utils'
import { Menu, X, Phone } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

const NAV_LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#about', label: 'About' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#contact', label: 'Contact' },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 20)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-surface md:bg-surface/95 md:backdrop-blur-md shadow-sm py-3'
          : 'bg-surface md:bg-surface/80 md:backdrop-blur-sm py-4'
      )}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo / Company Name — edit `companyName` in site-config.ts, or
              swap this span for an <img> if you have a logo file. */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-text">{siteConfig.companyName}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text-muted hover:text-primary-500 transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href={siteConfig.phoneHref}
              className="flex items-center gap-2 text-text-muted hover:text-primary-500 transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span className="font-medium">{siteConfig.phoneNumber}</span>
            </a>
            <Link
              href="/book"
              className="btn-primary py-2.5 px-6 rounded-full"
            >
              Book Now
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-text"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
            isMobileMenuOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
          )}
        >
          <div className="flex flex-col gap-4 pb-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="text-text-muted hover:text-primary-500 transition-colors font-medium py-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border">
              <a
                href={siteConfig.phoneHref}
                className="flex items-center gap-2 text-text-muted mb-4"
              >
                <Phone className="h-4 w-4" />
                <span className="font-medium">{siteConfig.phoneNumber}</span>
              </a>
              <Link
                href="/book"
                onClick={closeMobileMenu}
                className="btn-primary block text-center py-3 px-6 rounded-full"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
