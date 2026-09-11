/**
 * Turn one intake record into a client site.
 *
 *   pnpm onboard <recordId>                       fetch the record from the agency project
 *   pnpm onboard --file onboarding/out/x/record.json   use a saved record instead
 *   add --create-project                           also create the client's Sapt sub-project
 *
 * What it does:
 *   1. Reads the `client_onboarding` record (REST, agency project, SAPT_API_KEY).
 *   2. Composes the CMS bundle from it (scripts/lib/onboard-map.mjs): settings,
 *      services they offer, cities, reviews, brand colors, plus template copy.
 *   3. Writes onboarding/out/<slug>/ with record.json, cms-bundle.json and the
 *      site snapshot, then copies the snapshot to src/config/site-config.generated.json
 *      and downloads any direct image links, so `pnpm verify` builds their site now.
 *   4. With --create-project: POST /projects/{agency}/subprojects with the
 *      template id and their brand colors, then writes the new project id back
 *      onto the record.
 *
 * Then: push cms-bundle.json into the client's project (Claude on the Sapt MCP
 * does this in one go: "push onboarding/out/<slug>/cms-bundle.json"), set the
 * client's NEXT_PUBLIC_SAPT_PROJECT_ID, `pnpm verify`, deploy.
 *
 * Env: SAPT_API_KEY (agency key), SAPT_AGENCY_PROJECT_ID (defaults to Air
 * Acquisition), SAPT_TEMPLATE_ID (for --create-project), NEXT_PUBLIC_SAPT_BASE_URL.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mapCms } from './lib/cms-map.mjs'
import { onboardingToBundle } from './lib/onboard-map.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AGENCY_DEFAULT = 'e07c4bff-37e8-46e3-96eb-f1c0c13b095c'

// ── args ──
const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : undefined }
const recordId = args.find((a) => !a.startsWith('--') && /^[0-9a-f-]{36}$/i.test(a))
const fromFile = flag('--file')
const createProject = Boolean(flag('--create-project'))
if (!recordId && !fromFile) {
  console.error('usage: pnpm onboard <recordId> [--create-project]   |   pnpm onboard --file record.json')
  process.exit(2)
}

// ── env ──
for (const file of ['.env', '.env.local']) {
  const p = path.join(ROOT, file)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const baseUrl = (process.env.NEXT_PUBLIC_SAPT_BASE_URL || 'https://api.sapt.ai').replace(/\/$/, '')
const agency = process.env.SAPT_AGENCY_PROJECT_ID || AGENCY_DEFAULT
const apiKey = process.env.SAPT_API_KEY

async function api(route, init = {}) {
  if (!apiKey) throw new Error('SAPT_API_KEY missing (needed to read the record / create the project)')
  const res = await fetch(`${baseUrl}${route}`, { ...init, headers: { Authorization: `ApiKey ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers || {}) } })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* leave null */ }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${route} → ${res.status}: ${data?.error?.message || data?.error || text.slice(0, 200)}`)
  return data
}

async function download(url, dir) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const ext = (path.extname(new URL(url).pathname) || '.png').toLowerCase()
  const file = `${path.basename(new URL(url).pathname, ext).replace(/[^a-z0-9-]/gi, '-').slice(0, 40)}-${createHash('sha1').update(url).digest('hex').slice(0, 8)}${ext}`
  fs.writeFileSync(path.join(dir, file), buf)
  return `/img/cms/${file}`
}

async function main() {
  // 1. record
  let record
  if (fromFile) {
    record = JSON.parse(fs.readFileSync(path.resolve(ROOT, String(fromFile)), 'utf8'))
    record = record.record ?? record
  } else {
    record = (await api(`/projects/${agency}/object-records/${recordId}`)).record
  }
  if (record.typeSlug && record.typeSlug !== 'client_onboarding') throw new Error(`record ${record.id} is a ${record.typeSlug}, not client_onboarding`)

  // 2. bundle + snapshot
  const bundle = onboardingToBundle(record.data)
  if (!bundle.slug) throw new Error('record has no business_name')
  const { config, notes } = mapCms({ ...bundle, assetBaseUrl: 'https://assets.sapt.ai' })

  // 3. write outputs
  const out = path.join(ROOT, 'onboarding', 'out', bundle.slug)
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, 'record.json'), JSON.stringify(record, null, 2) + '\n')
  fs.writeFileSync(path.join(out, 'cms-bundle.json'), JSON.stringify({ projectName: bundle.settings.companyName, ...bundle, notes: undefined }, null, 2) + '\n')

  const imgDir = path.join(ROOT, 'public', 'img', 'cms')
  fs.rmSync(imgDir, { recursive: true, force: true })
  fs.mkdirSync(imgDir, { recursive: true })
  for (const key of ['logo', 'logoLight']) {
    if (config.photos?.[key]?.startsWith('http')) {
      try { config.photos[key] = await download(config.photos[key], imgDir) } catch (e) { notes.push(`${key}: could not download (${e.message}); demo logo kept`); delete config.photos[key] }
    }
  }
  for (const svc of config.services ?? []) {
    if (svc.image?.startsWith('http')) {
      try { svc.image = await download(svc.image, imgDir) } catch { delete svc.image }
    }
  }
  const snapshot = JSON.stringify(config, null, 2) + '\n'
  fs.writeFileSync(path.join(out, 'site-config.generated.json'), snapshot)
  fs.writeFileSync(path.join(ROOT, 'src', 'config', 'site-config.generated.json'), snapshot)

  // 4. optional: the client's Sapt project
  let projectId = record.data?.sapt_project_id || ''
  if (createProject) {
    if (projectId) {
      console.log(`  project   already exists: ${projectId} (skipping create)`)
    } else {
      const templateId = process.env.SAPT_TEMPLATE_ID
      if (templateId) {
        // Sapt's documented funnel: stamp the template onto a new sub-project,
        // filling the {{variables}} the snapshot declared (scripts/sapt-template.mjs).
        const s = bundle.settings
        const variableValues = {
          companyName: s.companyName, legalName: s.legalName, phone: s.phoneNumber, phoneE164: s.phoneE164,
          email: s.email, siteUrl: config.siteUrl || '', street: s.addressStreet, zip: s.addressZip,
          primaryHex: bundle.branding.colors[0].hex, accentHex: bundle.branding.colors[1].hex,
        }
        const r = await api(`/projects/${agency}/templates/${templateId}/apply`, { method: 'POST', body: JSON.stringify({ name: s.companyName, variableValues }) })
        projectId = r.data.project.id
        const rep = r.data.templateApply?.report
        console.log(`  project   created ${projectId} (${r.data.project.slug}) from template: ${r.data.templateApply?.status}`)
        if (rep) {
          if (rep.missingVariables?.length) console.log(`  check     template variables left unfilled: ${rep.missingVariables.join(', ')}`)
          for (const f of rep.failures ?? []) console.log(`  FAIL      ${f.entity} ${f.name}: ${f.error}`)
        }
      } else {
        console.log('  project   no SAPT_TEMPLATE_ID, creating a bare sub-project (run `pnpm sapt-template snapshot` to fix this for next time)')
        const body = {
          name: bundle.settings.companyName,
          branding: { colors: bundle.branding.colors, fontStyle: 'bold' },
          urls: config.siteUrl ? [{ name: 'website', url: config.siteUrl }] : [],
          metadata: { onboardingRecordId: record.id || '', template: 'septic' },
        }
        const created = await api(`/projects/${agency}/subprojects`, { method: 'POST', body: JSON.stringify(body) })
        projectId = created.project.id
        console.log(`  project   created ${projectId} (${created.project.slug})`)
      }
      if (record.id) await api(`/projects/${agency}/object-records/${record.id}`, { method: 'PATCH', body: JSON.stringify({ data: { sapt_project_id: projectId } }) })
    }
  }

  // 5. summary
  console.log(`onboard: ${bundle.settings.companyName}`)
  console.log(`  wrote     onboarding/out/${bundle.slug}/ and src/config/site-config.generated.json`)
  console.log(`  services  ${config.services.map((s) => s.slug).join(', ') || 'none'}`)
  console.log(`  cities    ${config.serviceArea.cities.map((c) => c.name).join(', ') || 'none'}`)
  console.log(`  brand     ${config.brand.primary ?? '(demo)'} / ${config.brand.accent ?? '(demo)'}`)
  for (const n of [...bundle.notes, ...notes]) console.log(`  check     ${n}`)
  console.log(`
next:
  1. pnpm verify            builds their site from the snapshot just written
  2. push the CMS           "push onboarding/out/${bundle.slug}/cms-bundle.json into project ${projectId || '<client project id>'}" (Sapt MCP)
  3. .env.local             NEXT_PUBLIC_SAPT_PROJECT_ID=${projectId || '<client project id>'}  NEXT_PUBLIC_SITE_URL=${config.siteUrl || '<domain>'}
  4. pnpm deploy:prod       then move the card to Client review
`)
}

main().catch((e) => { console.error(`onboard failed: ${e.message}`); process.exit(1) })
