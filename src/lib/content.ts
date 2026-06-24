/**
 * Section-content resolver. Hardcoded `site-config` blocks are the default and
 * always render with no credentials. When `useCmsContent` is on AND a key is
 * configured AND a matching CMS item exists, its `content` is merged OVER the
 * fallback (CMS keys win; missing keys keep the hardcoded value).
 */
import { siteConfig } from '@/config/site-config'
import { cmsGetBySlug } from './sapt-server'

export async function resolveContent<T extends Record<string, unknown>>(
  slug: string,
  fallback: T
): Promise<T> {
  if (!siteConfig.useCmsContent) return fallback
  const item = await cmsGetBySlug('section', slug)
  if (!item) return fallback
  return { ...fallback, ...(item.content as Partial<T>) }
}
