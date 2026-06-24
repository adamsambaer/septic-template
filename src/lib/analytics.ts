'use client'

/**
 * Client-side analytics helpers (no SDK)
 *
 * The Sapt tracking script (`ingest.sapt.ai/v1/track.js`, injected by
 * <Analytics />) exposes a global `window.sapt` with `track` and `identify`.
 * It already auto-tracks pageviews, clicks, scroll depth, form submits, and
 * UTM/click-IDs. These wrappers add funnel-step events and visitor identity,
 * and degrade silently if the script hasn't loaded (e.g. no Project ID).
 */

interface SaptGlobal {
  track: (name: string, properties?: Record<string, unknown>) => void
  identify: (traits: Record<string, string>) => void
  getVisitorId?: () => string | undefined
}

declare global {
  interface Window {
    sapt?: SaptGlobal
  }
}

/** Fire a custom analytics event. No-op if the tracker isn't loaded. */
export function track(name: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    window.sapt?.track(name, properties)
  } catch {
    /* analytics must never break the UI */
  }
}

/** Associate the current visitor with identity traits (email, name, phone). */
export function identify(traits: Record<string, string | undefined>): void {
  if (typeof window === 'undefined') return
  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(traits)) {
    if (typeof v === 'string' && v.trim()) clean[k] = v.trim()
  }
  if (Object.keys(clean).length === 0) return
  try {
    window.sapt?.identify(clean)
  } catch {
    /* ignore */
  }
}

/** The Sapt visitor id (cookie), if the tracker has set it. */
export function getVisitorId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.sapt?.getVisitorId?.()
  } catch {
    return undefined
  }
}

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
] as const

/** Read UTM / click-id params from the current URL, for lead attribution. */
export function readUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const out: Record<string, string> = {}
  for (const key of UTM_KEYS) {
    const value = params.get(key)
    if (value) out[key] = value
  }
  return out
}
