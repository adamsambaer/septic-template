/**
 * Init Project Script
 *
 * Optional helper to stamp wrangler.jsonc with a project-specific worker name
 * (and, if provided, a custom route). Safe to run by hand or from an
 * orchestrator. Nothing here is required for a basic deploy.
 *
 * Environment variables:
 * - PROJECT_SLUG   Kebab-case identifier → worker name "{slug}-landing"
 * - ROUTE_PATTERN  (optional) custom domain route, e.g. "site.example.com/*"
 * - ROUTE_ZONE_ID  (optional) Cloudflare zone id for the route
 */

import fs from 'fs'
import path from 'path'

const projectSlug = process.env.PROJECT_SLUG || 'sapt'
const routePattern = process.env.ROUTE_PATTERN
const routeZoneId = process.env.ROUTE_ZONE_ID

const wranglerConfig: Record<string, unknown> = {
  $schema: 'node_modules/wrangler/config-schema.json',
  name: `${projectSlug}-landing`,
  main: '.open-next/worker.js',
  compatibility_date: '2025-03-01',
  compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
  assets: {
    directory: '.open-next/assets',
    binding: 'ASSETS',
  },
}

if (routePattern && routeZoneId) {
  wranglerConfig.routes = [{ pattern: routePattern, zone_id: routeZoneId }]
}

const outputPath = path.join(process.cwd(), 'wrangler.jsonc')
fs.writeFileSync(outputPath, JSON.stringify(wranglerConfig, null, 2))

console.log(`Generated wrangler.jsonc for "${projectSlug}-landing"`)
