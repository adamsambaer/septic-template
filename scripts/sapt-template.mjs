/**
 * Manage the septic project template in Sapt.
 *
 *   pnpm sapt-template list                  templates on the agency project
 *   pnpm sapt-template snapshot [name]       capture the agency project as a clean, tokenized template
 *   pnpm sapt-template show <templateId>     print a template's bundle summary
 *   pnpm sapt-template apply <templateId> "<Client name>" [--vars key=value ...]
 *   pnpm sapt-template delete <templateId>
 *
 * `snapshot` does three things Sapt's dashboard button does not:
 *   1. Tokenizes the demo company's strings into {{variables}} (companyName,
 *      phone, phoneE164, email, street, zip, primaryHex, accentHex …), so a
 *      project stamped from the template already reads the client's name and
 *      number everywhere: CMS starter content, branding, workflow bodies.
 *      This happens client-side (scripts/lib/template-tokens.mjs): Sapt's own
 *      `tokenize` option corrupts starter-content dates.
 *   2. Strips agency-only entities that live in the same project but do not
 *      belong on a client: the `client_onboarding` CRM type, its relations and
 *      sidebar section, and any workflow tagged `agency-ops`.
 *   3. Includes CMS starter content, which the default snapshot leaves out.
 *
 * Needs SAPT_API_KEY (agency project) and SAPT_AGENCY_PROJECT_ID (defaults to
 * Air Acquisition). See docs/ONBOARDING.md.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOKENS, residue, stripAgency, stripStarterDates, tokenizeBundle, variableDeclarations } from './lib/template-tokens.mjs'

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

function summarize(bundle) {
  const n = (k) => (Array.isArray(bundle?.[k]) ? bundle[k].length : bundle?.[k] ? 'yes' : 0)
  return {
    objectTypes: (bundle.objectTypes || []).map((t) => t.slug),
    workflows: (bundle.workflows || []).map((w) => w.name),
    contentTypes: (bundle.contentTypes || []).map((t) => t.contentType?.slug ?? t.slug ?? t.name),
    starterContent: bundle.starterContent?.items?.length ?? 0,
    branding: n('branding'), roles: n('roles'), variables: (bundle.variables || []).map((v) => v.name),
  }
}

const [cmd, ...rest] = process.argv.slice(2)

async function main() {
  if (cmd === 'list') {
    const r = await api(`/projects/${agency}/templates`)
    const list = r.data ?? []
    if (!list.length) console.log('(no templates on this project yet)')
    for (const t of list) console.log(`${t.id}  ${t.name}  (${t.updatedAt})`)
    return
  }

  if (cmd === 'show') {
    const r = await api(`/projects/${agency}/templates/${rest[0]}`)
    const t = r.data
    console.log(JSON.stringify({ id: t.id, name: t.name, ...summarize(t.bundle || {}) }, null, 2))
    return
  }

  if (cmd === 'delete') {
    if (!rest[0]) throw new Error('usage: delete <templateId>')
    await api(`/projects/${agency}/templates/${rest[0]}`, { method: 'DELETE' })
    console.log(`deleted ${rest[0]}`)
    return
  }

  if (cmd === 'snapshot') {
    const name = rest[0] || `Septic template ${new Date().toISOString().slice(0, 10)}`
    console.log(`snapshot: capturing ${agency} as "${name}"`)

    // Whatever the Branding page holds right now for Primary / Emergency must
    // become {{primaryHex}} / {{accentHex}} too, or a client stamped from the
    // template inherits the agency demo's colors as literals.
    const tokens = [...TOKENS]
    const live = (await api(`/projects/${agency}/branding`).catch(() => null))?.branding
    for (const [colorName, v] of [['Primary', 'primaryHex'], ['Emergency', 'accentHex']]) {
      const hex = live?.colors?.find((c) => c.name.toLowerCase() === colorName.toLowerCase())?.hex
      if (hex && !tokens.some((t) => t.find.toLowerCase() === hex.toLowerCase())) {
        tokens.push({ find: hex, var: v })
        console.log(`  tokenize Branding ${colorName} ${hex} → {{${v}}}`)
      }
    }

    // 1. Capture everything. No server-side `tokenize`: see template-tokens.mjs.
    const snap = await api(`/projects/${agency}/snapshot`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: 'Septic company site + CRM + text-back automations. Stamped per client with {{variables}}.',
        include: { roles: true, sidebar: true, workflows: true, objectTypes: true, objectRelations: true, crmConfig: true, spineFields: true, contentTypes: true, starterContent: true, branding: true, projectContext: true, agents: true },
        variables: variableDeclarations(TOKENS),
      }),
    })
    const template = snap.data.template
    for (const w of snap.data.warnings ?? []) console.log(`  warning  ${w}`)
    console.log(`  created  ${template.id}`)

    // 2. Tokenize + strip locally, patch the bundle back.
    const { bundle, hits } = tokenizeBundle(template.bundle, tokens)
    const removed = stripAgency(bundle)
    stripStarterDates(bundle)
    await api(`/projects/${agency}/templates/${template.id}`, { method: 'PATCH', body: JSON.stringify({ bundle }) })
    for (const r of removed) console.log(`  removed  ${r}`)
    console.log(`  tokens   ${Object.entries(hits).map(([k, v]) => `${k}×${v}`).join('  ') || 'none hit'}`)

    // 3. Read it back and prove the patch stuck.
    const saved = (await api(`/projects/${agency}/templates/${template.id}`)).data.bundle
    const savedItems = saved.starterContent?.items ?? []
    const datedItems = savedItems.filter((i) => i.publishedAt != null).length
    const placeholders = (JSON.stringify(saved).match(/\{\{[a-zA-Z_]\w*\}\}/g) || []).length
    console.log(`  verified ${savedItems.length} starter items (${datedItems} still dated, want 0), ${placeholders} placeholders in the stored bundle`)
    for (const r of residue(saved)) console.log(`  LEFTOVER ${r.path}: ${r.value}`)
    console.log(JSON.stringify(summarize(saved), null, 2))
    console.log(`\nSAPT_TEMPLATE_ID=${template.id}   ← put this in .env.local`)
    fs.writeFileSync(path.join(ROOT, 'onboarding', 'template-bundle.json'), JSON.stringify(saved, null, 2) + '\n')
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
    console.log(`project ${d.project.id} (${d.project.slug}) — ${d.templateApply?.status}${d.templateApply?.error ? ': ' + d.templateApply.error : ''}`)
    const rep = d.templateApply?.report
    if (rep) {
      console.log(`  applied ${rep.appliedCount}; skipped ${rep.skipped.length}; failures ${rep.failures.length}; missing variables ${rep.missingVariables.join(', ') || 'none'}`)
      for (const f of rep.failures) console.log(`  FAIL ${f.entity} ${f.name}: ${f.error}`)
    }
    return
  }

  console.error('usage: pnpm sapt-template <list|snapshot [name]|show <id>|apply <id> "<name>" [--vars k=v]|delete <id>>')
  process.exit(2)
}

main().catch((e) => { console.error(`sapt-template failed: ${e.message}`); process.exit(1) })
