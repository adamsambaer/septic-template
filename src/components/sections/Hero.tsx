import { siteConfig } from '@/config/site-config'
import { resolveContent } from '@/lib/content'
import { HeroView } from './Hero.client'

export async function Hero() {
  const content = await resolveContent('hero', siteConfig.hero)
  return <HeroView content={content} />
}
