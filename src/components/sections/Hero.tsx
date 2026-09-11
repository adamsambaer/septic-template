import { siteConfig } from '@/config/site-config'
import { HeroView } from './Hero.client'

/** Hero content comes from the merged config (Sapt "1 · Site settings" → Hero). */
export function Hero() {
  return <HeroView content={siteConfig.hero} />
}
