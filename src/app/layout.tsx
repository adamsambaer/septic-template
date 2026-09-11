import { Analytics } from '@/components/Analytics'
import { ScrollToTop, StickyCTA } from '@/components/ui'
import { siteConfig } from '@/config/site-config'
import { t } from '@/lib/copy'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const { companyName, brand, address, serviceArea, copy } = siteConfig

const title = t(copy.homePage.metaTitle)
const description = t(copy.homePage.metaDescription)

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title,
  description,
  keywords: [...copy.homePage.keywords, address.city, ...serviceArea.counties],
  authors: [{ name: companyName }],
  openGraph: { title, description, type: 'website', locale: 'en_US', siteName: companyName },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: brand.primary,
}

/**
 * Per-client brand palette.
 *
 * Two hex values in the config (from the client's Sapt Branding page) become
 * complete tint and shade scales here, so rebranding is editing two colors and
 * nothing else. Tints mix toward white on light themes and toward black on
 * dark, so a pale shade like primary-100 stays a usable background in both.
 */
function brandPalette() {
  const { primary, accent } = brand
  const mix = (color: string, pct: number, toward: 'white' | 'black') =>
    `color-mix(in srgb, ${color} ${pct}%, ${toward})`

  return `
:root {
  --color-primary-50:  ${mix(primary, 6, 'white')};
  --color-primary-100: ${mix(primary, 14, 'white')};
  --color-primary-200: ${mix(primary, 26, 'white')};
  --color-primary-300: ${mix(primary, 45, 'white')};
  --color-primary-400: ${mix(primary, 78, 'white')};
  --color-primary-500: ${primary};
  --color-primary-600: ${mix(primary, 84, 'black')};
  --color-primary-700: ${mix(primary, 70, 'black')};
  --color-primary-800: ${mix(primary, 56, 'black')};
  --color-primary-900: ${mix(primary, 44, 'black')};

  --color-accent-50:  ${mix(accent, 6, 'white')};
  --color-accent-100: ${mix(accent, 14, 'white')};
  --color-accent-200: ${mix(accent, 26, 'white')};
  --color-accent-300: ${mix(accent, 45, 'white')};
  --color-accent-400: ${mix(accent, 78, 'white')};
  --color-accent-500: ${accent};
  --color-accent-600: ${mix(accent, 84, 'black')};
}

[data-theme='dark'] {
  --color-primary-50:  ${mix(primary, 10, 'black')};
  --color-primary-100: ${mix(primary, 18, 'black')};
  --color-primary-200: ${mix(primary, 30, 'black')};
  --color-primary-300: ${mix(primary, 50, 'black')};

  --color-accent-50:  ${mix(accent, 10, 'black')};
  --color-accent-100: ${mix(accent, 18, 'black')};
  --color-accent-200: ${mix(accent, 30, 'black')};
  --color-accent-300: ${mix(accent, 50, 'black')};
}
`.trim()
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={siteConfig.theme}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandPalette() }} />
      </head>
      <body>
        <ScrollToTop />
        {children}
        <StickyCTA />
        <Analytics />
      </body>
    </html>
  )
}
