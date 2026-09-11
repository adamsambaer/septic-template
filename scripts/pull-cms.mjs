/**
 * Pull the client's site out of Sapt and snapshot it for the build.
 *
 *   pnpm pull
 *
 * Reads the project named by NEXT_PUBLIC_SAPT_PROJECT_ID with SAPT_API_KEY
 * (a project service-account key with CMS, asset and branding read access),
 * fetches Branding + the eight CMS content types, downloads every referenced
 * image into public/img/cms/, and writes src/config/site-config.generated.json.
 * `site-config.ts` merges that file over the demo defaults at build time, so
 * nothing on Cloudflare talks to Sapt at request time.
 *
 * Both outputs are gitignored: the repo is the template, the snapshot is the
 * client. Run this before every build for a client site.
 *
 * Exit codes: 0 pulled, 1 misconfigured or a fetch failed. It never writes a
 * half-finished snapshot.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mapCms } from './lib/cms-map.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_JSON = path.join(ROOT, 'src', 'config', 'site-config.generated.json')
const OUT_IMG_DIR = path.join(ROOT, 'public', 'img', 'cms')

// ── env: process.env wins, then .env.local, then .env ──
function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const p = path.join(ROOT, file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m || line.trim().startsWith('#')) continue
      const value = m[2].replace(/^["']|["']$/g, '')
      if (process.env[m[1]] === undefined) process.env[m[1]] = value
    }
  }
}
loadEnv()

const projectId = process.env.NEXT_PUBLIC_SAPT_PROJECT_ID
const apiKey = process.env.SAPT_API_KEY
const baseUrl = (process.env.NEXT_PUBLIC_SAPT_BASE_URL || 'https://api.sapt.ai').replace(/\/$/, '')

if (!projectId || !apiKey) {
  console.error(`
pull-cms: missing configuration.
  NEXT_PUBLIC_SAPT_PROJECT_ID  ${projectId ? 'ok' : 'MISSING'}
  SAPT_API_KEY                 ${apiKey ? 'ok' : 'MISSING'}

Create a service-account API key in the Sapt dashboard for the client's project
(read access to CMS, assets and branding), put both values in .env.local, and
run again. Until then the site builds with the demo content in site-config.ts.
`)
  process.exit(1)
}

async function api(route) {
  const res = await fetch(`${baseUrl}${route}`, { headers: { Authorization: `ApiKey ${apiKey}`, Accept: 'application/json' } })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* leave null */ }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || text.slice(0, 200) || res.statusText
    throw new Error(`${route} → ${res.status}: ${msg}`)
  }
  return data
}

async function listAll(typeSlug) {
  const items = []
  for (let offset = 0; ; offset += 100) {
    const page = await api(`/projects/${projectId}/cms/content/${typeSlug}?status=published&limit=100&offset=${offset}`)
    items.push(...(page.items ?? []))
    if (items.length >= (page.total ?? 0) || (page.items ?? []).length === 0) break
  }
  return items
}

async function single(typeSlug) {
  const items = await listAll(typeSlug)
  const hit = items.find((i) => i.slug === 'default') ?? items[0]
  return hit?.content ?? null
}

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`image ${url} → ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const ext = (path.extname(new URL(url).pathname) || '.' + (res.headers.get('content-type')?.split('/')[1]?.split(';')[0] || 'bin')).toLowerCase()
  const name = path.basename(new URL(url).pathname, path.extname(new URL(url).pathname)).replace(/[^a-z0-9-]/gi, '-').slice(0, 60)
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 8)
  const file = `${name}-${hash}${ext}`
  fs.writeFileSync(path.join(OUT_IMG_DIR, file), buf)
  return { local: `/img/cms/${file}`, bytes: buf.length }
}

async function main() {
  console.log(`pull-cms: project ${projectId} via ${baseUrl}`)

  const [cfg, brandingRes, settings, photos, copy, services, cities, faqs, steps, reviews] = await Promise.all([
    api(`/projects/${projectId}/cms/config`),
    api(`/projects/${projectId}/branding`).catch((e) => { console.warn(`  branding: ${e.message} (continuing without it)`); return null }),
    single('site-settings'),
    single('site-photos'),
    single('site-copy'),
    listAll('service'),
    listAll('city'),
    listAll('faq'),
    listAll('process-step'),
    listAll('review'),
  ])

  const assetBaseUrl = cfg?.assetBaseUrl || 'https://assets.sapt.ai'
  const { config, notes } = mapCms({
    settings, photos, copy, services, cities, faqs, steps, reviews,
    branding: brandingRes?.branding ?? null, assetBaseUrl,
  })

  // ── images: download and rewrite to local paths ──
  fs.rmSync(OUT_IMG_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUT_IMG_DIR, { recursive: true })
  const cache = new Map()
  const localise = async (url) => {
    if (!url) return url
    if (!cache.has(url)) cache.set(url, download(url))
    return (await cache.get(url)).local
  }
  for (const key of ['logo', 'logoLight', 'hero', 'about', 'cta']) {
    if (config.photos?.[key]) config.photos[key] = await localise(config.photos[key])
  }
  for (const svc of config.services ?? []) {
    if (svc.image) svc.image = await localise(svc.image)
    else delete svc.image // let the merge fall back to the demo photo for this slug
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(config, null, 2) + '\n')

  // ── summary ──
  const counts = {
    services: config.services?.length ?? 0,
    cities: config.serviceArea?.cities?.length ?? 0,
    faqs: config.faqs?.length ?? 0,
    steps: config.process?.length ?? 0,
    reviews: config.reviews?.length ?? 0,
    images: cache.size,
  }
  console.log(`  company   ${config.companyName ?? '(demo)'}`)
  console.log(`  brand     primary ${config.brand?.primary ?? '(demo)'}  accent ${config.brand?.accent ?? '(demo)'}`)
  console.log(`  pages     ${Object.entries(config.pages ?? {}).filter(([, v]) => v === false).map(([k]) => k + ' OFF').join(', ') || 'all on'}`)
  console.log(`  content   ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`)
  for (const n of notes) console.log(`  fallback  ${n}`)
  console.log(`  wrote     ${path.relative(ROOT, OUT_JSON)} and ${counts.images} files in public/img/cms/`)
}

main().catch((e) => {
  console.error(`pull-cms failed: ${e.message}`)
  process.exit(1)
})
