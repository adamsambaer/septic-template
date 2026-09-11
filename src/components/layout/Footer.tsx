import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import { Mail, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'

/**
 * Footer.
 *
 * Every live page is linked from here, including every published service and
 * the service-areas hub, so nothing on the site is more than one click from
 * anywhere. Pages switched off in Sapt drop out of the lists.
 */
export function Footer() {
  const {
    companyName, legalName, tagline, phoneNumber, phoneHref, email, address,
    services, serviceArea, trust, photos, dark, pages, copy,
  } = siteConfig
  const f = copy.footer
  const year = new Date().getFullYear()

  const companyLinks = [
    pages.services && services.length > 0 && { href: '/services', label: f.allServices },
    pages.serviceAreas && serviceArea.cities.length > 0 && { href: '/service-areas', label: f.areas },
    pages.about && { href: '/about', label: f.about },
    pages.reviews && { href: '/reviews', label: f.reviews },
    pages.contact && { href: '/contact', label: f.contact },
  ].filter((l): l is { href: string; label: string } => Boolean(l))

  return (
    <footer style={{ backgroundColor: dark.base }} className="text-white">
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-16 sm:px-6 lg:px-8 lg:pb-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            {photos.logoLight ? (
              <img src={photos.logoLight} alt={companyName} className="h-9 w-auto" />
            ) : (
              <span className="text-xl font-extrabold uppercase tracking-tight">{companyName}</span>
            )}
            {tagline && <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">{tagline}.</p>}

            <a
              href={phoneHref}
              className="mt-6 inline-flex items-center gap-3 bg-primary-500 px-5 py-4 transition-colors hover:bg-primary-600"
            >
              <Phone className="h-4 w-4" />
              <span className="text-base font-extrabold">{phoneNumber}</span>
            </a>

            {trust.licenseNumber && (
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                {trust.licenseLabel} #{trust.licenseNumber}
                {trust.insured && ` · ${f.licensedInsured}`}
              </p>
            )}
          </div>

          {/* Services */}
          {services.length > 0 && (
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/50">{f.servicesHeading}</h4>
              <ul className="mt-5 space-y-2.5">
                {services.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/services/${s.slug}`}
                      className="text-sm font-medium text-white/80 transition-colors hover:text-primary-500"
                    >
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Company */}
          {companyLinks.length > 0 && (
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/50">{f.companyHeading}</h4>
              <ul className="mt-5 space-y-2.5">
                {companyLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm font-medium text-white/80 transition-colors hover:text-primary-500">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/50">{f.contactHeading}</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/80">
              <li>
                <a href={phoneHref} className="flex items-center gap-2.5 hover:text-primary-500">
                  <Phone className="h-4 w-4 shrink-0 text-primary-500" />
                  {phoneNumber}
                </a>
              </li>
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="flex items-center gap-2.5 break-all hover:text-primary-500">
                    <Mail className="h-4 w-4 shrink-0 text-primary-500" />
                    {email}
                  </a>
                </li>
              )}
              {(address.street || address.city) && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                  <span>
                    {address.street}
                    {address.street && <br />}
                    {address.city}, {address.state} {address.zip}
                  </span>
                </li>
              )}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-white/45">
              {serviceArea.counties.length > 0 && t(f.serving)}
              {trust.emergencyAvailable && ` ${f.emergency}`}
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/45">
            &copy; {year} {legalName}. {f.rights}
          </p>
          {(pages.privacy || pages.terms) && (
            <div className="flex gap-6 text-xs font-semibold uppercase tracking-wider text-white/45">
              {pages.privacy && (
                <Link href="/privacy" className="hover:text-white">{f.privacy}</Link>
              )}
              {pages.terms && (
                <Link href="/terms" className="hover:text-white">{f.terms}</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
