/**
 * Manage the septic project template in Sapt.
 *
 *   pnpm sapt-template list                  templates on the agency project
 *   pnpm sapt-template snapshot [name]       capture the agency project as a clean, tokenized template
 *   pnpm sapt-template show <templateId>     print a template's bundle summary
 *   pnpm sapt-template apply <templateId> "<Client name>" [--vars key=value ...]
 *
 * `snapshot` does three things Sapt's dashboard button does not:
 *   1. Tokenizes the demo company's strings into {{variables}} (companyName,
 *      phone, phoneE164, email, street, city, state, zip, primaryHex,
 *      accentHex), so a project stamped from the template already reads the
 *      client's name and number everywhere: CMS starter content, branding,
 *      workflow message bodies.
 *   2. Strips agency-only entities that live in the same project but do not
 *      belong on a client: the `client_onboarding` CRM type and any workflow
 *      tagged `agency-ops`.
 *   3. Includes CMS starter content, which the default snapshot leaves out.
 *
 * Needs SAPT_API_KEY (agency project) and SAPT_AGENCY_PROJECT_ID (defaults to
 * Air Acquisition). See docs/ONBOARDING.md.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AGENCY_DEFAULT = 'e07c4bff-37e8-46e3-96eb-f1c0c13b095c'

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
if (!apiKey) { console.error('SAPT_API_KEY missing. Create one at app.sapt.ai → profile → Account → Create API Key and put it in .env.local.'); process.exit(1) }

async function api(route, init = {}) {
  const res = await fetch(`${baseUrl}${route}`, { ...init, headers: { Authorization: `ApiKey ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' } })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* leave null */ }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${route} → ${res.status}: ${data?.error?.message || data?.error || text.slice(0, 300)}`)
  return data
}

/** The demo company's literals → template variables. Order matters: longer, more specific strings first. */
export const TOKENS = [
  { find: 'Coastal Septic Co. LLC', var: 'legalName', label: 'Legal business name', example: 'Gulfside Septic LLC' },
  { find: 'Coastal Septic Co.', var: 'companyName', label: 'Company name', example: 'Gulfside Septic', required: true },
  { find: '(954) 555-0142', var: 'phone', label: 'Phone, as displayed', example: '(239) 555-0100', required: true },
  { find: '+19545550142', var: 'phoneE164', label: 'Phone, dialable (+1…)', example: '+12395550100', required: true },
  { find: 'dispatch@coastalseptic.example', var: 'email', label: 'Public email', example: 'office@client.com' },
  { find: 'https://coastalseptic.example', var: 'siteUrl', label: 'Site URL', example: 'https://www.client.com' },
  { find: '1420 SW 12th Ave', var: 'street', label: 'Street address', example: '88 Palm Ave' },
  { find: '33315', var: 'zip', label: 'ZIP', example: '33904' },
  { find: '#E8631A', var: 'primaryHex', label: 'Primary brand color', example: '#1D6FB8' },
  { find: '#C4392C', var: 'accentHex', label: 'Emergency color', example: '#C4392C' },
]

const AGENCY_TYPE_SLUGS = new Set(['client_onboarding'])
const AGENCY_TAG = 'agency-ops'

function stripAgency(bundle) {
  const removed = []
  if (Array.isArray(bundle.objectTypes)) {
    bundle.objectTypes = bundle.objectTypes.filter((t) => { const hit = AGENCY_TYPE_SLUGS.has(t.slug); if (hit) removed.push(`objectType ${t.slug}`); return !hit })
  }
  if (Array.isArray(bundle.objectRelations)) {
    bundle.objectRelations = bundle.objectRelations.filter((r) => !JSON.stringify(r).includes('client_onboarding'))
  }
  if (Array.isArray(bundle.workflows)) {
    bundle.workflows = bundle.workflows.filter((w) => { const hit = (w.tags || []).includes(AGENCY_TAG) || w.triggerTypeSlug === 'client_onboarding'; if (hit) removed.push(`workflow ${w.name}`); return !hit })
  }
  return removed
}

function summarize(bundle) {
  const n = (k) => (Array.isArray(bundle?.[k]) ? bundle[k].length : bundle?.[k] ? 'yes' : 0)
  return {
    objectTypes: (bundle.objectTypes || []).map((t) => t.slug),
    workflows: (bundle.workflows || []).map((w) => w.name),
    contentTypes: (bundle.contentTypes || []).map((t) => t.slug ?? t.name),
    starterContent: bundle.starterContent?.items?.length ?? 0,
    branding: n('branding'), roles: n('roles'), variables: (bundle.variables || []).map((v) => v.name),
  }
}

const [cmd, ...rest] = process.argv.slice(2)

async function main() {
  if (cmd === 'list') {
    const r = await api(`/projects/${agency}/templates`)
    const list = r.data ?? r.templates ?? r
    for (const t of list) console.log(`${t.id}  ${t.name}  (${t.updatedAt})`)
    return
  }

  if (cmd === 'show') {
    const r = await api(`/projects/${agency}/templates/${rest[0]}`)
    const t = r.data ?? r.template ?? r
    console.log(JSON.stringify({ id: t.id, name: t.name, ...summarize(t.bundle || {}) }, null, 2))
    return
  }

  if (cmd === 'snapshot') {
    const name = rest[0] || `Septic template ${new Date().toISOString().slice(0, 10)}`
    console.log(`snapshot: capturing ${agency} as "${name}"`)
    const snap = await api(`/projects/${agency}/snapshot`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: 'Septic company site + CRM + text-back automations. Stamped per client with {{variables}}.',
        include: { roles: true, sidebar: true, workflows: true, objectTypes: true, objectRelations: true, crmConfig: true, spineFields: true, contentTypes: true, starterContent: true, branding: true, projectContext: true, agents: true },
        tokenize: TOKENS.map(({ find, var: v }) => ({ find, var: v })),
        variables: TOKENS.map(({ var: v, label, example, required }) => ({ name: v, label, type: 'string', example, required: Boolean(required) })),
      }),
    })
    const template = snap.data?.template ?? snap.template
    for (const w of snap.data?.warnings ?? []) console.log(`  warning  ${w}`)
    console.log(`  created  ${template.id}`)

    // Fetch the full bundle, strip agency entities, patch it back.
    const full = await api(`/projects/${agency}/templates/${template.id}`)
    const bundle = (full.data ?? full.template ?? full).bundle
    const removed = stripAgency(bundle)
    if (removed.length) {
      await api(`/projects/${agency}/templates/${template.id}`, { method: 'PATCH', body: JSON.stringify({ bundle }) })
      for (const r of removed) console.log(`  removed  ${r}`)
    }
    console.log(JSON.stringify(summarize(bundle), null, 2))
    console.log(`\nSAPT_TEMPLATE_ID=${template.id}   ← put this in .env.local`)
    fs.writeFileSync(path.join(ROOT, 'onboarding', 'template-bundle.json'), JSON.stringify(bundle, null, 2) + '\n')
    console.log('  wrote    onboarding/template-bundle.json (local copy for inspection, gitignored)')
    return
  }

  if (cmd === 'apply') {
    const [templateId, clientName] = rest
    if (!templateId || !clientName) throw new Error('usage: apply <templateId> "<Client name>" [--vars key=value ...]')
    const variableValues = {}
    const vi = rest.indexOf('--vars')
    if (vi >= 0) for (const kv of rest.slice(vi + 1)) { const [k, ...v] = kv.split('='); variableValues[k] = v.join('=') }
    const r = await api(`/projects/${agency}/templates/${templateId}/apply`, { method: 'POST', body: JSON.stringify({ name: clientName, variableValues }) })
    const d = r.data
    console.log(`project ${d.project.id} (${d.project.slug}) — ${d.templateApply?.status}`)
    const rep = d.templateApply?.report
    if (rep) {
      console.log(`  applied ${rep.appliedCount}; failures ${rep.failures.length}; missing variables ${rep.missingVariables.join(', ') || 'none'}`)
      for (const f of rep.failures) console.log(`  FAIL ${f.entity} ${f.name}: ${f.error}`)
    }
    return
  }

  console.error('usage: pnpm sapt-template <list|snapshot [name]|show <id>|apply <id> "<name>" [--vars k=v]>')
  process.exit(2)
}

main().catch((e) => { console.error(`sapt-template failed: ${e.message}`); process.exit(1) })
