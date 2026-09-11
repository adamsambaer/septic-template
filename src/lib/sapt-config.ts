/**
 * Sapt configuration
 *
 * Central place that reads Sapt settings from environment variables.
 *
 * The ONLY required value in the browser is the Project ID. The quote form
 * posts leads to Sapt's public ingest with it, and the analytics script tag
 * uses it. Site content is NOT fetched at runtime: `pnpm pull` snapshots the
 * client's Sapt project into site-config.generated.json before the build,
 * using SAPT_API_KEY, which never ships to the browser.
 *
 * Environment variables:
 * - NEXT_PUBLIC_SAPT_PROJECT_ID    (required) your Sapt project UUID
 * - NEXT_PUBLIC_SAPT_BASE_URL      (optional) API base, default https://api.sapt.ai
 * - NEXT_PUBLIC_SAPT_INGEST_URL    (optional) analytics ingest, default https://ingest.sapt.ai
 * - SAPT_API_KEY                   (build-time only) used by scripts/pull-cms.mjs. Never expose.
 */

/** Values that are safe to read in the browser (inlined at build time). */
export interface SaptPublicConfig {
  projectId: string
  baseUrl: string
  ingestUrl: string
}

const DEFAULT_BASE_URL = 'https://api.sapt.ai'
const DEFAULT_INGEST_URL = 'https://ingest.sapt.ai'

/** Read the browser-safe Sapt config. */
export function getSaptPublicConfig(): SaptPublicConfig {
  return {
    projectId: process.env.NEXT_PUBLIC_SAPT_PROJECT_ID ?? '',
    baseUrl: process.env.NEXT_PUBLIC_SAPT_BASE_URL || DEFAULT_BASE_URL,
    ingestUrl: process.env.NEXT_PUBLIC_SAPT_INGEST_URL || DEFAULT_INGEST_URL,
  }
}

/** True when a Project ID is configured. The quote form needs nothing else. */
export function isSaptConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SAPT_PROJECT_ID)
}
