import { Analytics } from '@/components/Analytics'
import { ScrollToTop } from '@/components/ui'
import { siteConfig } from '@/config/site-config'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const title = `${siteConfig.companyName} | ${siteConfig.tagline}`
const description = 'Professional services tailored to your needs. Book your consultation today.'

export const metadata: Metadata = {
  title,
  description,
  keywords: ['services', 'professional', 'consultation'],
  authors: [{ name: siteConfig.companyName }],
  openGraph: {
    title,
    description,
    type: 'website',
    locale: 'en_US',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#3B82F6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme={siteConfig.theme}>
      <body>
        <ScrollToTop />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
