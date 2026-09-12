import { siteConfig } from '@/config/site-config'
import type { MetadataRoute } from 'next'

/**
 * robots.txt
 *
 * The blanket `*` rule already allows everything, so naming these bots changes
 * nothing technically. It is here so the file is explicit and survives someone
 * later pasting in a restrictive template they found online, which is the
 * common way small sites accidentally disappear from AI answers.
 *
 * The distinction that matters: retrieval crawlers fetch pages to answer a
 * question someone is asking right now, and blocking them removes the site
 * from those answers. Training crawlers only feed model training and blocking
 * them costs no visibility. They are different user agents, and the usual
 * mistake is blocking the first set while meaning to block the second.
 *
 * Retrieval (must stay allowed to be cited):
 *   OAI-SearchBot     ChatGPT search      developers.openai.com/api/docs/bots
 *   ChatGPT-User      ChatGPT on click
 *   PerplexityBot     Perplexity          docs.perplexity.ai
 *   Perplexity-User   Perplexity on click
 *   Claude-SearchBot  Claude web search   support.claude.com
 *   Claude-User       Claude on click
 *   Googlebot         Google + AI Overviews + AI Mode
 *   bingbot           Bing + Copilot (and ChatGPT leans on Bing heavily)
 *
 * Training (allowed here by choice, safe to block without losing citations):
 *   GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, meta-externalagent
 *
 * Note for deployment: a CDN or firewall rule beats anything written here.
 * Cloudflare's bot controls are the thing to check per zone.
 */

const RETRIEVAL = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
  'Googlebot',
  'bingbot',
]

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.siteUrl.replace(/\/$/, '')
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      // Named explicitly so the intent is on the record, not just implied by `*`.
      { userAgent: RETRIEVAL, allow: '/' },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
