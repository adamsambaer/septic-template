/**
 * Sapt server-side REST client (no SDK)
 *
 * Two plain `fetch` calls, imported ONLY from server code (route handlers and
 * server components):
 *
 *   1. POST → CRM   — save a record to a CRM object type you created (booking).
 *                     Public: needs only the Project ID.
 *   2. GET  → CMS   — read content by slug. Requires `SAPT_API_KEY`; returns
 *                     null when no key is set (the site uses hardcoded copy).
 *
 * Analytics is the third Sapt touchpoint and is a script tag, not a fetch —
 * see `src/components/Analytics.tsx`.
 */

import { getSaptServerConfig } from './sapt-config'

// ============================================================================
// SHARED
// ============================================================================

interface SaptResult<T> {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

async function saptFetch<T>(
  url: string,
  init: RequestInit & { apiKey?: string } = {}
): Promise<SaptResult<T>> {
  const { apiKey, headers, ...rest } = init
  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `ApiKey ${apiKey}` } : {}),
        ...headers,
      },
    })

    const text = await res.text()
    const data = text ? (JSON.parse(text) as T) : null

    if (!res.ok) {
      const err =
        (data as { error?: string } | null)?.error || `Request failed (${res.status})`
      return { ok: false, status: res.status, data, error: err }
    }
    return { ok: true, status: res.status, data }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// ============================================================================
// 1. POST → CRM (public, Project ID only)
// ============================================================================
//
// Saves a record to a CRM object type. The type must already exist in your
// project with `isPublicIngestable: true` — create it once (see
// SAPT_SETUP_GUIDE.md; an agent on the Sapt MCP can do it in one call). Posts
// before the type exists return an error, so the booking funnel surfaces a
// clear "create the type" message instead of silently dropping the lead.

export interface IngestObjectInput {
  /** The record fields, validated against the type's schema. */
  data?: Record<string, unknown>
  /** Optional idempotency key (unique per type). */
  externalId?: string
}

/** POST /public/projects/{projectId}/objects/{typeSlug} */
export async function ingestObject(typeSlug: string, input: IngestObjectInput) {
  const { baseUrl, projectId } = getSaptServerConfig()
  return saptFetch<{ success: boolean; recordId: string }>(
    `${baseUrl}/public/projects/${projectId}/objects/${typeSlug}`,
    { method: 'POST', body: JSON.stringify(input) }
  )
}

// ============================================================================
// 2. GET → CMS (requires SAPT_API_KEY) — optional, off until a key is set
// ============================================================================
//
// The template renders hardcoded copy from `site-config.ts` by default. Set
// `SAPT_API_KEY` and flip `useCmsContent` to pull section copy from the Sapt
// CMS instead (see `src/lib/content.ts`). With no key this returns null and
// the hardcoded fallback is used — so the site always renders.

export interface CMSContentItem {
  id: string
  slug: string
  name: string
  status: 'draft' | 'published' | 'archived'
  content: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Fetch a single published CMS item by slug. Returns null when no API key is
 * configured or the item doesn't exist.
 * GET /projects/{projectId}/cms/content/{contentTypeSlug}/{slug}
 */
export async function cmsGetBySlug(
  contentTypeSlug: string,
  itemSlug: string
): Promise<CMSContentItem | null> {
  const { baseUrl, projectId, apiKey } = getSaptServerConfig()
  if (!apiKey) return null

  const res = await saptFetch<{ item: CMSContentItem }>(
    `${baseUrl}/projects/${projectId}/cms/content/${contentTypeSlug}/${itemSlug}`,
    { apiKey, next: { revalidate: 300 } } as RequestInit & { apiKey: string }
  )
  return res.data?.item ?? null
}
