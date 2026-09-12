import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

/**
 * OpenNext → Cloudflare Workers.
 *
 * The incremental cache is not optional here, and leaving it out fails in a
 * way that is easy to miss. Without it every *prerendered dynamic* route is
 * served as a 404 on Workers, while every plain static route keeps working.
 * So the home page, /services and /service-areas all look fine, and every
 * single service page and city page is gone. Found on the first real deploy:
 * `/` returned 200 and `/services/septic-tank-pumping` returned 404, even
 * though the build had written septic-tank-pumping.html.
 *
 * `staticAssetsIncrementalCache` reads those prerendered pages straight out of
 * the Worker's own static assets. It is the right pick for this template
 * specifically because these sites never revalidate at runtime: content
 * changes in Sapt, the sync workflow rebuilds, and the new pages ship with the
 * next deploy. It also needs no R2 bucket or KV namespace, so a client site
 * deploys from the button with nothing extra to provision.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
})
