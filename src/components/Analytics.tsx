import Script from 'next/script'
import { getSaptPublicConfig } from '@/lib/sapt-config'

/**
 * Injects the Sapt analytics tracking script.
 *
 * A single script tag — no SDK. It auto-tracks pageviews, clicks, scroll depth,
 * form submits, and UTM/click-IDs, and exposes `window.sapt.track / identify`
 * (see `src/lib/analytics.ts`). Renders nothing when no Project ID is set, so
 * the template stays runnable before configuration.
 */
export function Analytics() {
  const { projectId, ingestUrl } = getSaptPublicConfig()
  if (!projectId) return null

  return (
    <Script
      src={`${ingestUrl}/v1/track.js`}
      data-project={projectId}
      strategy="afterInteractive"
    />
  )
}
