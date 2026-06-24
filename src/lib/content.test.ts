import { describe, expect, it, vi } from 'vitest'

vi.mock('./sapt-server', () => ({ cmsGetBySlug: vi.fn(async () => null) }))
vi.mock('@/config/site-config', () => ({ siteConfig: { useCmsContent: false } }))

import { resolveContent } from './content'

describe('resolveContent', () => {
  it('returns the fallback when CMS is disabled', async () => {
    const fallback = { headline: 'Hardcoded' }
    await expect(resolveContent('hero', fallback)).resolves.toEqual(fallback)
  })
})
