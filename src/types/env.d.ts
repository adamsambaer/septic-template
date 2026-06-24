/**
 * TypeScript definitions for environment variables.
 * Only NEXT_PUBLIC_SAPT_PROJECT_ID is required; the rest are optional.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // Required — your Sapt project UUID.
    NEXT_PUBLIC_SAPT_PROJECT_ID: string

    // Optional public config.
    NEXT_PUBLIC_SAPT_BASE_URL?: string
    NEXT_PUBLIC_SAPT_INGEST_URL?: string

    // Optional server-only secrets.
    SAPT_API_KEY?: string
    SAPT_BOOKING_TYPE_SLUG?: string
  }
}
