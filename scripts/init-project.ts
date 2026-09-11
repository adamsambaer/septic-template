/**
 * Init Project Script
 *
 * Run inside a fresh checkout of this template, immediately before it is
 * pushed to a client's own repository. Follows the same environment contract
 * as Sapt's funnel-template so Sapt's provisioning can run it unchanged.
 *
 *   1. Stamps `wrangler.jsonc` with a per-client Worker name (and route).
 *   2. Removes the files that exist only for the agency and the template
 *      itself and have no business in a client repo.
 *   3. Stamps the client's brand name, colors and logo into the site snapshot
 *      (src/config/site-config.generated.json), which the site merges over the
 *      demo defaults. `pnpm pull` later replaces the snapshot with the client's
 *      full Sapt project, so nothing here is load-bearing beyond the first deploy.
 *
 * Environment variables:
 * - PROJECT_SLUG   Kebab-case identifier → Worker name "{slug}-site"
 * - ROUTE_PATTERN  (optional) custom domain route, e.g. "www.client.com/*"
 * - ROUTE_ZONE_ID  (optional) Cloudflare zone id for the route
 * - PROJECT_NAME   (optional) client brand name → companyName
 * - BRANDING_JSON  (optional) JSON { colors: [{hex, purpose}], logo?: {url, alt} }.
 *                  Empty or unparseable means: keep the template's defaults.
 *                  A branding problem must never fail provisioning.
 */

import fs from 'fs'
import path from 'path'

const SNAPSHOT_PATH = 'src/config/site-config.generated.json'
const PUBLIC_IMG = 'public/img'

/** Agency tooling and template guards. Not shipped to a client repo. */
const TEMPLATE_ONLY_PATHS = [
  'onboarding',
  'docs/ONBOARDING.md',
  'scripts/onboard.mjs',
  'scripts/lib/onboard-map.mjs',
  'scripts/lib/onboard-map.test.mjs',
  'scripts/sapt-template.mjs',
  'sapt/template-content.json',
]

interface BrandingColor { hex: string; purpose?: string }
interface BrandingPayload { colors?: BrandingColor[]; logo?: { url: string; alt?: string } }

function writeWrangler(root: string, slug: string): void {
  const routePattern = process.env.ROUTE_PATTERN
  const routeZoneId = process.env.ROUTE_ZONE_ID
  const config: Record<string, unknown> = {
    $schema: 'node_modules/wrangler/config-schema.json',
    name: `${slug}-site`,
    main: '.open-next/worker.js',
    compatibility_date: '2026-08-01',
    compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
    build: { command: 'pnpm build && pnpm exec opennextjs-cloudflare build' },
    assets: { directory: '.open-next/assets', binding: 'ASSETS' },
    observability: { enabled: true },
  }
  if (routePattern && routeZoneId) config.routes = [{ pattern: routePattern, zone_id: routeZoneId }]
  fs.writeFileSync(path.join(root, 'wrangler.jsonc'), JSON.stringify(config, null, 2) + '\n')
  console.log(`init-project: wrangler.jsonc → "${slug}-site"`)
}

function parseBranding(json: string): BrandingPayload | null {
  if (!json.trim()) return null
  try {
    const parsed: unknown = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? (parsed as BrandingPayload) : null
  } catch (err) {
    console.warn(`init-project: BRANDING_JSON is not valid JSON, skipping (${(err as Error).message})`)
    return null
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/

async function downloadLogo(root: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get('content-type') || ''
    const ext = type.includes('svg') ? 'svg' : type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('jpeg') ? 'jpg' : path.extname(new URL(url).pathname).replace('.', '') || 'png'
    fs.mkdirSync(path.join(root, PUBLIC_IMG), { recursive: true })
    fs.writeFileSync(path.join(root, PUBLIC_IMG, `client-logo.${ext}`), Buffer.from(await res.arrayBuffer()))
    return `/img/client-logo.${ext}`
  } catch (err) {
    console.warn(`init-project: logo download failed, keeping template logo (${(err as Error).message})`)
    return null
  }
}

async function applyBranding(root: string, branding: BrandingPayload | null, projectName?: string): Promise<void> {
  const file = path.join(root, SNAPSHOT_PATH)
  const snapshot: Record<string, unknown> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8') || '{}') : {}

  if (projectName) snapshot.companyName = projectName

  const colors = branding?.colors ?? []
  const primary = colors.find((c) => c.purpose === 'primary' && HEX.test(c.hex))
  const accent = colors.find((c) => (c.purpose === 'accent' || c.purpose === 'secondary') && HEX.test(c.hex))
  if (primary || accent) {
    snapshot.brand = { ...((snapshot.brand as object) ?? {}), ...(primary && { primary: primary.hex.toUpperCase() }), ...(accent && { accent: accent.hex.toUpperCase() }) }
  }

  if (branding?.logo?.url) {
    const local = await downloadLogo(root, branding.logo.url)
    if (local) snapshot.photos = { ...((snapshot.photos as object) ?? {}), logo: local, logoLight: local }
  }

  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n')
  console.log(`init-project: snapshot updated (${Object.keys(snapshot).join(', ') || 'demo defaults'})`)
}

async function main(): Promise<void> {
  const root = process.cwd()
  writeWrangler(root, process.env.PROJECT_SLUG || 'client')

  for (const rel of TEMPLATE_ONLY_PATHS) fs.rmSync(path.join(root, rel), { recursive: true, force: true })
  console.log(`init-project: removed ${TEMPLATE_ONLY_PATHS.length} template-only path(s)`)

  try {
    await applyBranding(root, parseBranding(process.env.BRANDING_JSON || ''), process.env.PROJECT_NAME)
  } catch (err) {
    console.warn(`init-project: branding failed, keeping template defaults (${(err as Error).message})`)
  }
}

if (process.env.VITEST === 'true') {
  console.log('init-project: skipped (imported by a test)')
} else {
  void main()
}
