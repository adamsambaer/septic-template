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
import { fillAddressFromZip } from './lib/zip-lookup.mjs'
import { needsRebind, rebindActions } from './lib/rebind.mjs'
import { clientStarterItems } from './lib/starter-content.mjs'

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

/**
 * Sapt scrubs every workflow HTTP action (url, headers, body) from a template
 * and leaves `__sapt_template_rebind_required__` markers behind. Copy the real
 * values from the agency project's workflow of the same name, filling
 * {{owner_mobile}} / {{from_number}} where known. See scripts/lib/rebind.mjs.
 */
async function rebindWorkflows(projectId, vars) {
  const src = (await api(`/projects/${agency}/workflows`)).workflows ?? []
  const dst = (await api(`/projects/${projectId}/workflows`)).workflows ?? []
  let patched = 0
  for (const w of dst) {
    if (!needsRebind(w.actions)) continue
    const from = src.find((x) => x.name === w.name)
    const { actions, bound, unresolved } = rebindActions(w.actions, from?.actions ?? [], vars)
    if (bound.length) {
      await api(`/projects/${projectId}/workflows/${w.id}`, { method: 'PATCH', body: JSON.stringify({ actions }) })
      patched++
    }
    if (unresolved.length) console.log(`  check     workflow "${w.name}": could not re-bind ${unresolved.join(', ')}`)
  }
  console.log(`  workflows ${patched} of ${dst.length} re-bound with the Telnyx actions (all stay drafts until their number is connected)`)
}

/**
 * Give the owner a login that edits their own site and nothing else.
 *
 * Sapt ships only Admin (everything) and Member (read-only), so the useful
 * middle has to be created per project. `sendEmail:false` hands back an accept
 * link instead of mailing it, which matters because these clients answer texts
 * and ignore email.
 */
async function inviteClient(projectId, email) {
  if (!email) return console.log('  invite    no owner email on the record, skipped')
  const role = (await api(`/projects/${projectId}/roles`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Client',
      description: 'The business owner. Can edit their own site content and upload photos. Sees nothing else.',
      permissions: ['cms_items:read', 'cms_items:write', 'assets:manage'],
    }),
  })).data
  const inv = await api(`/projects/${projectId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email, projectRoleId: role.id, sendEmail: false }),
  })
  if (inv.acceptUrl) {
    console.log(`  invite    text this to ${email}:`)
    console.log(`            ${inv.acceptUrl}`)
  } else {
    console.log(`  invite    ${inv.action} for ${email}${inv.reason ? ` (${inv.reason})` : ''}`)
  }
}

/**
 * Seed the project's memory so Sapt's own AI features know who this business
 * is from the first message, instead of writing generic septic copy.
 * Reserved slugs: brand, icp, strategy.
 */
async function seedMemory(projectId, bundle, record) {
  const s = bundle.settings
  const d = record.data ?? {}
  const area = (s.areaCounties ?? []).join(', ') || s.addressCity || 'their area'
  const services = (bundle.services ?? []).map((x) => x.content?.title).filter(Boolean).join(', ')
  const entries = [
    {
      slug: 'brand',
      title: 'Brand',
      description: `Who ${s.companyName} is and how they talk.`,
      content: [
        `# ${s.companyName}`,
        s.legalName && s.legalName !== s.companyName ? `Legal entity: ${s.legalName}.` : '',
        `Septic contractor serving ${area}. Phone ${s.phoneNumber}.`,
        s.aboutBody ? `\n## In their words\n${s.aboutBody}` : '',
        (d.differentiators ?? []).length ? `\n## What they promise\n${(d.differentiators ?? []).map((x) => `- ${x}`).join('\n')}` : '',
        '\n## Voice',
        'Plain, direct, contractor-grade. Short sentences. Never salesy, never corporate.',
        'Never claim a licence, rating, guarantee or price that is not on record for this client.',
      ].filter(Boolean).join('\n'),
    },
    {
      slug: 'icp',
      title: 'Who they sell to',
      description: 'The homeowner on the other end of the phone.',
      content: [
        '# Customers',
        `Homeowners and small commercial properties on septic in ${area}.`,
        'Two moods, and they are very different:',
        '- **Emergency.** Something is backing up or an alarm is going off. They want a truck today and a straight answer on cost. Speed beats everything.',
        '- **Maintenance.** A pump-out is due, or a home sale needs an inspection. Price and trust matter more than speed.',
        services ? `\nServices offered: ${services}.` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      slug: 'strategy',
      title: 'How we grow this account',
      description: 'What the Air Acquisition package does for them.',
      content: [
        '# Strategy',
        'The site exists to make the phone ring. Every page pushes a call or the quote form.',
        'Leads land in the CRM and text the owner within seconds. Emergencies get their own alert.',
        'Rebooking is the engine: the pump-out reminder and the reactivation sweep bring back past customers, which is cheaper than buying new ones.',
        'Reviews are requested automatically after a completed job, which feeds both Google and the AI assistants.',
      ].join('\n'),
    },
  ]
  let ok = 0
  for (const e of entries) {
    try { await api(`/projects/${projectId}/memory-entries`, { method: 'POST', body: JSON.stringify(e) }); ok++ }
    catch (err) { console.log(`  check     memory "${e.slug}" not written: ${err.message}`) }
  }
  console.log(`  memory    seeded ${ok}/${entries.length} entries (brand, customers, strategy)`)
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
  const fromZip = fillAddressFromZip(record.data)
  if (fromZip.note) console.log(`  address   ${fromZip.note}`)
  const bundle = onboardingToBundle(fromZip.data)
  if (!bundle.slug) throw new Error('record has no business_name')

  // Sapt rejects a settings item that is missing a required field, and it
  // rejects it silently enough that the project gets created with no settings
  // at all. A clear stop here beats a half-built project nobody notices.
  const REQUIRED = {
    companyName: 'business name',
    phoneNumber: 'business phone',
    addressCity: 'city (from their ZIP, their website, or the first town they serve)',
    addressState: 'state (two letters)',
  }
  const missing = Object.entries(REQUIRED).filter(([k]) => !String(bundle.settings[k] ?? '').trim())
  if (missing.length) {
    console.error(`\nonboard: record ${record.id ?? ''} cannot build a site yet. Missing:`)
    for (const [k, why] of missing) console.error(`  ${k.padEnd(13)} ${why}`)
    console.error('\nFill these on the record in Sapt, or re-run after `pnpm draft <their site>`, then try again.')
    process.exit(1)
  }
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
    // The id stamped on the record is a claim, not a fact: a project can be
    // deleted after a failed run, and trusting the stamp then skips the create
    // and leaves the client with no project at all.
    if (projectId) {
      const live = await api(`/projects/${projectId}`).then(() => true).catch(() => false)
      if (!live) {
        console.log(`  project   ${projectId} on the record is gone; creating a fresh one`)
        projectId = ''
      }
    }
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
          owner_mobile: bundle.ownerMobile || '',
          google_review_url: s.trustGoogleReviewUrl || '',
        }
        // Stamp THEIR content, not the demo's. Sapt has no REST write for CMS
        // items, but a template is just a bundle: base structure + this
        // client's starter items, saved as a one-off template, applied, deleted.
        const base = (await api(`/projects/${agency}/templates/${templateId}`)).data.bundle
        const starter = clientStarterItems(base, bundle)
        notes.push(...starter.notes)
        const temp = (await api(`/projects/${agency}/templates`, {
          method: 'POST',
          body: JSON.stringify({
            name: `onboard ${bundle.slug} ${new Date().toISOString().slice(0, 16)}`,
            description: "Temporary: the septic template with this client's starter content. Created and deleted by pnpm onboard.",
            bundle: { ...base, starterContent: { enabled: true, items: starter.items } },
          }),
        })).data
        let r
        try {
          r = await api(`/projects/${agency}/templates/${temp.id}/apply`, { method: 'POST', body: JSON.stringify({ name: s.companyName, variableValues }) })
        } finally {
          await api(`/projects/${agency}/templates/${temp.id}`, { method: 'DELETE' }).catch((e) => console.log(`  check     temporary template ${temp.id} was not deleted: ${e.message}`))
        }
        console.log(`  content   ${starter.items.length} starter items composed from the record: ${bundle.services.length} services, ${bundle.cities.length} cities, ${bundle.reviews.length} reviews, ${bundle.faqs.length} FAQs, ${bundle.steps.length} steps`)
        projectId = r.data.project.id
        const rep = r.data.templateApply?.report
        console.log(`  project   created ${projectId} (${r.data.project.slug}) from template: ${r.data.templateApply?.status}${r.data.templateApply?.error ? ' ' + r.data.templateApply.error : ''}`)
        if (rep) {
          console.log(`  applied   ${rep.appliedCount} entities; skipped ${rep.skipped?.length ?? 0}; failures ${rep.failures?.length ?? 0}`)
          if (rep.missingVariables?.length) console.log(`  check     template variables left unfilled: ${rep.missingVariables.join(', ')}`)
          for (const f of rep.failures ?? []) console.log(`  FAIL      ${f.entity} ${f.name}: ${f.error}`)
        }
        await rebindWorkflows(projectId, variableValues)
        // Read the stamped CMS back: proves the variables landed and that this key can see the new project.
        const stamped = await api(`/projects/${projectId}/cms/content/site-settings?status=published`).catch((e) => ({ error: e.message }))
        const c = stamped?.items?.[0]?.content
        console.log(`  cms       ${c ? `stamped "${c.companyName}" ${c.phoneNumber}` : `could not read the new project back (${stamped?.error ?? 'no items'})`}`)
        await seedMemory(projectId, bundle, record).catch((e) => console.log(`  check     memory seeding failed: ${e.message}`))
        await inviteClient(projectId, String(record.data?.owner_email ?? '').trim()).catch((e) => console.log(`  check     client invite failed: ${e.message}`))
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
  2. photos + logo          download from the folder they shared, upload to Assets / Branding in project ${projectId || '<client project id>'}, pick them in 2 · Photos
  3. .env.local             NEXT_PUBLIC_SAPT_PROJECT_ID=${projectId || '<client project id>'}  NEXT_PUBLIC_SITE_URL=${config.siteUrl || '<domain>'}
  4. pnpm deploy:prod       then move the card to Client review
`)
}

main().catch((e) => { console.error(`onboard failed: ${e.message}`); process.exit(1) })
