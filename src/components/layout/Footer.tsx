import { siteConfig } from '@/config/site-config'
import { Mail, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'

const CONTACT_INFO = {
  phone: siteConfig.phoneNumber,
  phoneHref: siteConfig.phoneHref,
  email: siteConfig.email,
  address: '123 Main Street, Suite 100',
  city: 'Your City, ST 12345',
}

const BUSINESS_HOURS = [
  { days: 'Monday - Friday', hours: '9:00 AM - 6:00 PM' },
  { days: 'Saturday', hours: '10:00 AM - 4:00 PM' },
  { days: 'Sunday', hours: 'Closed' },
]

const QUICK_LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#about', label: 'About Us' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '/book', label: 'Book Appointment' },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-text text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand & Description */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <span className="text-xl font-bold text-white">{siteConfig.companyName}</span>
            </div>
            <p className="text-gray-400 mb-6">
              Professional services tailored to your needs. Experience the difference quality makes.
            </p>
            <Link
              href="/book"
              className="btn-primary inline-block py-2.5 px-6 rounded-full"
            >
              Book Now
            </Link>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Contact Us</h4>
            <ul className="space-y-3 text-gray-400">
              <li>
                <a
                  href={CONTACT_INFO.phoneHref}
                  className="flex items-center gap-2 hover:text-primary-400 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {CONTACT_INFO.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="flex items-center gap-2 hover:text-primary-400 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {CONTACT_INFO.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <span>
                  {CONTACT_INFO.address}
                  <br />
                  {CONTACT_INFO.city}
                </span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Business Hours</h4>
            <ul className="space-y-2 text-gray-400">
              {BUSINESS_HOURS.map((item) => (
                <li key={item.days}>
                  <span className="block text-white text-sm">{item.days}</span>
                  <span className="text-sm">{item.hours}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} {siteConfig.companyName}. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="#" className="hover:text-primary-400 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-primary-400 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
