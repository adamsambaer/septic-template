/**
 * Site Configuration
 *
 * Single source of truth for landing-page content. Edit these values to brand
 * the template for a client. (If you set SAPT_API_KEY, server components can
 * instead pull copy from the Sapt CMS — see src/lib/sapt-server.ts.)
 */

export const siteConfig = {
  // Company identity - edit these to customize
  companyName: 'Demo Co',
  tagline: 'Your trusted partner',
  phoneNumber: '(555) 123-4567',
  phoneHref: 'tel:+15551234567',
  email: 'info@example.com',

  // Theme: 'light' (default) or 'dark'. Controls the palette in globals.css.
  theme: 'light' as 'light' | 'dark',

  // When true AND SAPT_API_KEY is set, pull section copy from the Sapt CMS,
  // falling back to the hardcoded content below. Default false = hardcoded.
  useCmsContent: false,

  // Hero content (hardcoded fallback; CMS overrides when useCmsContent on).
  hero: {
    headline: 'Transform Your Business',
    headlineAccent: 'With Expert Solutions',
    subheadline:
      'Professional services designed to help you achieve your goals. Experience personalized solutions that deliver real results.',
    trustPoints: ['Free Consultation', '5-Star Reviews', 'Flexible Scheduling'],
  },

  // Hero call-to-action button labels.
  ctaText: 'Get Started',
  secondaryCtaText: 'Learn More',

  // Sapt integration (read from environment — see .env.local.example)
  saptProjectId: process.env.NEXT_PUBLIC_SAPT_PROJECT_ID || '',
  saptBaseUrl: process.env.NEXT_PUBLIC_SAPT_BASE_URL || 'https://api.sapt.ai',
}
