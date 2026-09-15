/**
 * Builds a client's Sapt project by itself, and shows you what exists.
 *
 * Two problems this fixes, both raised by Adam on 14 Sep 2026:
 *
 *   1. A form submission used to sit in the CRM until someone ran a command.
 *      Nothing about that is a business: the client has signed up and the
 *      system has done nothing.
 *   2. There was no way to answer "what clients do I have and are their sites
 *      up?" other than from memory. A record of the work has to live somewhere
 *      other than a person's head.
 *
 * A cron, not a webhook. A webhook that misses one event leaves a client
 * half-built forever and nobody finds out; a sweep that runs every couple of
 * minutes picks up anything unbuilt, retries what failed last time, and repairs
 * a record whose project was deleted underneath it. Slower by a minute, correct
 * for as long as it runs.
 *
 * What it does NOT do is build the website. That needs a Next.js build, which
 * cannot run here. The board says so per client rather than letting you assume.
 *
 * Routes
 *   GET /          the board (HTTP basic auth)
 *   POST /run      force a sweep now, same auth
 *
 * Secrets:  SAPT_API_KEY, DASH_PASSWORD
 * Vars:     SAPT_AGENCY_PROJECT_ID, SAPT_TEMPLATE_ID, SITE_HOST_SUFFIX
 */
import { onboardingToBundle } from '../../../scripts/lib/onboard-map.mjs'
import { clientStarterItems } from '../../../scripts/lib/starter-content.mjs'
import { needsRebind, rebindActions } from '../../../scripts/lib/rebind.mjs'
import { fillAddressFromZip } from './zip.js'

const API = 'https://api.sapt.ai'

class Sapt {
  constructor(key, agency) { this.key = key; this.agency = agency }
  async call(route, init = {}) {
    const res = await fetch(`${API}${route}`, {
      ...init,
      headers: { Authorization: `ApiKey ${this.key}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers || {}) },
    })
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { /* leave null */ }
    if (!res.ok) throw new Error(`${init.method || 'GET'} ${route} → ${res.status}: ${data?.error?.message || data?.error || text.slice(0, 160)}`)
    return data
  }
  records() { return this.call(`/projects/${this.agency}/object-records?typeSlug=client_onboarding&limit=100`).then((r) => r.records ?? r.data ?? []) }
  patch(id, data) { return this.call(`/projects/${this.agency}/object-records/${id}`, { method: 'PATCH', body: JSON.stringify({ data }) }) }
  setStatus(id, status) { return this.call(`/projects/${this.agency}/object-records/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }) }
  projects() { return this.call('/projects').then((r) => r.projects ?? r.data ?? r ?? []) }
  alive(projectId) { return this.call(`/projects/${projectId}`).then(() => true).catch(() => false) }
}

/** Copy the agency's real Telnyx actions over the markers the template scrubbed. */
async function rebindWorkflows(s, projectId, vars) {
  const src = (await s.call(`/projects/${s.agency}/workflows`)).workflows ?? []
  const dst = (await s.call(`/projects/${projectId}/workflows`)).workflows ?? []
  let patched = 0
  for (const w of dst) {
    if (!needsRebind(w.actions)) continue
    const from = src.find((x) => x.name === w.name)
    const { actions, bound } = rebindActions(w.actions, from?.actions ?? [], vars)
    if (!bound.length) continue
    await s.call(`/projects/${projectId}/workflows/${w.id}`, { method: 'PATCH', body: JSON.stringify({ actions }) })
    patched++
  }
  return patched
}

async function seedMemory(s, projectId, bundle) {
  const st = bundle.settings
  const area = (st.areaCounties ?? []).join(', ') || st.addressCity || 'their area'
  const services = (bundle.services ?? []).map((x) => x.content?.title).filter(Boolean).join(', ')
  const entries = [
    { slug: 'brand', title: 'Brand', description: `Who ${st.companyName} is.`,
      content: `# ${st.companyName}\n\nSeptic contractor serving ${area}. Phone ${st.phoneNumber}.\n\n${st.aboutBody ?? ''}` },
    { slug: 'icp', title: 'Customers', description: 'Who calls them.',
      content: `Homeowners on septic across ${area}. They call when something backs up or a pump-out is overdue. Services offered: ${services || 'see the site'}.` },
    { slug: 'strategy', title: 'Strategy', description: 'How the site earns work.',
      content: 'A page per service and a page per town, structured data tying the site to their Google listing, and a review request after every completed job.' },
  ]
  let ok = 0
  for (const e of entries) {
    await s.call(`/projects/${projectId}/memory-entries`, { method: 'POST', body: JSON.stringify(e) }).then(() => ok++).catch(() => {})
  }
  return ok
}

async function inviteClient(s, projectId, email) {
  if (!email) return ''
  const role = (await s.call(`/projects/${projectId}/roles`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Client',
      description: 'The business owner. Edits their own site content and uploads photos. Sees nothing else.',
      permissions: ['cms_items:read', 'cms_items:write', 'assets:manage'],
    }),
  })).data
  const inv = await s.call(`/projects/${projectId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email, projectRoleId: role.id, sendEmail: false }),
  })
  return inv.acceptUrl ?? ''
}

/** Everything the command line used to do, minus the website build. */
async function buildProject(s, env, record) {
  const { data: filled } = await fillAddressFromZip(record.data ?? {})
  const bundle = onboardingToBundle(filled)

  const REQUIRED = { companyName: 'business name', phoneNumber: 'business phone', addressCity: 'city', addressState: 'state' }
  const missing = Object.entries(REQUIRED).filter(([k]) => !String(bundle.settings[k] ?? '').trim()).map(([, why]) => why)
  if (!bundle.slug || missing.length) {
    return { ok: false, reason: `needs ${missing.join(', ') || 'a business name'}`, needsInfo: true }
  }

  const st = bundle.settings
  const variableValues = {
    companyName: st.companyName, legalName: st.legalName, phone: st.phoneNumber, phoneE164: st.phoneE164,
    email: st.email, siteUrl: st.siteUrl || '', street: st.addressStreet, zip: st.addressZip,
    primaryHex: bundle.branding.colors[0].hex, accentHex: bundle.branding.colors[1].hex,
    owner_mobile: bundle.ownerMobile || '',
    google_review_url: st.trustGoogleReviewUrl || '',
  }

  // Sapt has no REST write for CMS items, but a template is just a bundle:
  // base structure plus this client's starter content, applied once, deleted.
  const base = (await s.call(`/projects/${s.agency}/templates/${env.SAPT_TEMPLATE_ID}`)).data.bundle
  const starter = clientStarterItems(base, bundle)
  const temp = (await s.call(`/projects/${s.agency}/templates`, {
    method: 'POST',
    body: JSON.stringify({
      name: `auto ${bundle.slug} ${new Date().toISOString().slice(0, 16)}`,
      description: 'Temporary: the septic template plus this client\'s starter content. Created and deleted by the auto-onboard worker.',
      bundle: { ...base, starterContent: { enabled: true, items: starter.items } },
    }),
  })).data

  let applied
  try {
    applied = await s.call(`/projects/${s.agency}/templates/${temp.id}/apply`, {
      method: 'POST',
      body: JSON.stringify({ name: st.companyName, variableValues }),
    })
  } finally {
    await s.call(`/projects/${s.agency}/templates/${temp.id}`, { method: 'DELETE' }).catch(() => {})
  }

  const projectId = applied.data.project.id
  const report = applied.data.templateApply?.report
  const failures = (report?.failures ?? []).map((f) => `${f.entity} ${f.name}: ${f.error}`)

  const patched = await rebindWorkflows(s, projectId, variableValues).catch(() => 0)
  const memory = await seedMemory(s, projectId, bundle).catch(() => 0)
  const invite = await inviteClient(s, projectId, String(record.data?.owner_email ?? '').trim()).catch(() => '')

  await s.patch(record.id, {
    sapt_project_id: projectId,
    ...(filled.address_city && !record.data?.address_city ? { address_city: filled.address_city } : {}),
    ...(filled.address_state && !record.data?.address_state ? { address_state: filled.address_state } : {}),
  })
  await s.setStatus(record.id, 'building').catch(() => {})

  return {
    ok: true, projectId, invite, patched, memory, failures,
    entities: report?.appliedCount ?? 0,
    items: starter.items.length,
    pages: 8 + bundle.services.length + bundle.cities.length,
  }
}

/** One pass: build anything unbuilt, repair anything whose project vanished. */
async function sweep(env) {
  const s = new Sapt(env.SAPT_API_KEY, env.SAPT_AGENCY_PROJECT_ID)
  const records = await s.records()
  const done = []
  for (const r of records) {
    if (r.status === 'lost') continue
    let pid = String(r.data?.sapt_project_id ?? '').trim()
    if (pid && !(await s.alive(pid))) {
      await s.patch(r.id, { sapt_project_id: '' }).catch(() => {})
      pid = ''
    }
    if (pid) continue
    try {
      const out = await buildProject(s, env, r)
      if (!out.ok) {
        await s.setStatus(r.id, 'needs_info').catch(() => {})
        done.push({ name: r.data?.business_name, ok: false, reason: out.reason })
      } else {
        done.push({ name: r.data?.business_name, ok: true, projectId: out.projectId, entities: out.entities })
      }
    } catch (e) {
      done.push({ name: r.data?.business_name, ok: false, reason: e.message.slice(0, 200) })
    }
  }
  return done
}

// ── the board ───────────────────────────────────────────────────────────
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

async function board(env) {
  const s = new Sapt(env.SAPT_API_KEY, env.SAPT_AGENCY_PROJECT_ID)
  const [records, projects] = await Promise.all([s.records(), s.projects().catch(() => [])])
  const byId = new Map(projects.map((p) => [p.id, p]))

  const rows = await Promise.all(records.map(async (r) => {
    const d = r.data ?? {}
    const pid = String(d.sapt_project_id ?? '').trim()
    const project = pid ? byId.get(pid) : null
    // Only what the record actually records. Guessing the host from the name
    // looked helpful until two clients shared a name and one of them was shown
    // as live off the other's website. A board that guesses is worse than one
    // that says it does not know.
    const url = String(d.site_url ?? '').trim()
    let siteCode = 0
    if (url) {
      siteCode = await fetch(url, { redirect: 'follow' }).then((x) => x.status).catch(() => 0)
    }
    const gaps = []
    if (!pid) gaps.push('no Sapt project yet')
    else if (!project) gaps.push('project id on the record does not resolve')
    if (!url) gaps.push('no website recorded yet')
    else if (siteCode !== 200) gaps.push(`website not answering (${siteCode || 'no response'})`)
    if (!d.logo_url) gaps.push('no logo')
    if (!d.brand_primary_color) gaps.push('no brand colour, site is template orange')
    if (!d.google_review_url) gaps.push('no Google review link, review texts have nowhere to send people')
    if (!d.profile_google) gaps.push('no Google listing link')
    return { r, d, pid, project, url, siteCode, gaps }
  }))

  rows.sort((a, b) => String(b.r.createdAt).localeCompare(String(a.r.createdAt)))
  const liveSites = rows.filter((x) => x.siteCode === 200).length
  const built = rows.filter((x) => x.project).length

  const card = (x) => {
    const { d, pid, project, url, siteCode, gaps } = x
    const when = new Date(x.r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return `
    <article class="client">
      <header>
        <h2>${esc(d.business_name || '(no name)')}</h2>
        <span class="stage s-${esc(x.r.status)}">${esc(x.r.status || 'submitted')}</span>
      </header>
      <p class="meta">${esc(d.business_phone || 'no phone')} · ${esc(d.address_city || '?')}, ${esc(d.address_state || '?')} · in ${when}</p>
      <div class="facts">
        <div><span>Sapt project</span>${project ? `<b class="ok"><a href="https://app.sapt.ai/projects/${esc(pid)}" target="_blank" rel="noopener">${esc(project.name)}</a></b>` : pid ? '<b class="bad">stale id</b>' : '<b class="bad">not built</b>'}</div>
        <div><span>Website</span>${siteCode === 200 ? `<b class="ok"><a href="${esc(url)}" target="_blank" rel="noopener">live</a></b>` : url ? '<b class="bad">down</b>' : '<b class="bad">not built</b>'}</div>
        <div><span>Services</span><b>${(d.services_offered ?? []).length || '—'}</b></div>
        <div><span>Towns</span><b>${(d.cities ?? []).length || '—'}</b></div>
      </div>
      ${gaps.length ? `<ul class="gaps">${gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` : '<p class="clean">Nothing outstanding.</p>'}
    </article>`
  }

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Clients | Air Acquisition</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Outfit:wght@700;800&display=swap">
<style>
:root{--ink:#16181c;--ink2:#41444b;--muted:#6e6b66;--paper:#fbfaf8;--card:#fff;--rule:#e4e2dd;
--ok:#1c6b48;--okbg:#e3f1ea;--bad:#b3382b;--badbg:#fae9e7;--accent:#2456f6;
--display:"Outfit",system-ui,sans-serif;--sans:"DM Sans",system-ui,sans-serif}
@media(prefers-color-scheme:dark){:root{--ink:#f2f1ee;--ink2:#cfcdc8;--muted:#918d86;--paper:#14151a;--card:#1c1e24;--rule:#2e3037;--ok:#6cc79b;--okbg:#16301f;--bad:#f08a7c;--badbg:#361c1b;--accent:#7d9bff}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:400 16px/1.6 var(--sans);padding:0 20px}
.wrap{max-width:860px;margin:0 auto;padding:40px 0 80px}
h1{font-family:var(--display);font-weight:800;letter-spacing:-.03em;font-size:2rem;margin:0}
.sub{color:var(--muted);margin:8px 0 0;font-size:.95rem}
.tally{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0 28px}
.tally b{font-family:var(--display);font-size:1.5rem;display:block;line-height:1}
.tally div{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:12px 16px;min-width:110px}
.tally span{font-size:.78rem;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.client{background:var(--card);border:1px solid var(--rule);border-radius:12px;padding:18px 20px;margin-bottom:12px;min-width:0}
.client header{display:flex;gap:12px;align-items:baseline;justify-content:space-between;flex-wrap:wrap}
.client h2{font-family:var(--display);font-weight:700;font-size:1.18rem;letter-spacing:-.02em;margin:0;min-width:0}
.stage{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;font-weight:600;padding:3px 9px;border-radius:4px;background:var(--rule);color:var(--ink2);white-space:nowrap}
.s-live{background:var(--okbg);color:var(--ok)}.s-needs_info{background:var(--badbg);color:var(--bad)}
.meta{color:var(--muted);font-size:.88rem;margin:6px 0 14px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.facts div{min-width:0}.facts span{display:block;font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}
.facts b{font-weight:600;font-size:.95rem;overflow-wrap:anywhere}
.ok{color:var(--ok)}.bad{color:var(--bad)}
.facts a{color:inherit}
ul.gaps{margin:13px 0 0;padding-left:1.1em;display:grid;gap:5px;font-size:.9rem;color:var(--ink2)}
ul.gaps li::marker{color:var(--bad)}
.clean{margin:13px 0 0;font-size:.9rem;color:var(--ok)}
form{margin-top:30px}button{font:500 .92rem var(--sans);background:var(--ink);color:var(--paper);border:0;border-radius:999px;padding:11px 20px;cursor:pointer}
.empty{background:var(--card);border:1px dashed var(--rule);border-radius:12px;padding:30px;text-align:center;color:var(--muted)}
</style></head><body><div class="wrap">
<h1>Clients</h1>
<p class="sub">Every intake record, whether its Sapt project exists, and whether its website answers. Checked live, just now. Projects build themselves within two minutes of a signup; websites build on the quarter hour.</p>
<div class="tally">
  <div><span>Signed up</span><b>${rows.length}</b></div>
  <div><span>Project built</span><b>${built}</b></div>
  <div><span>Site live</span><b>${liveSites}</b></div>
</div>
${rows.length ? rows.map(card).join('') : '<p class="empty">No intake records yet. The board fills itself the moment someone submits the form.</p>'}
<form method="post" action="/run"><button type="submit">Build anything unbuilt now</button></form>
</div></body></html>`
}

function unauthorized() {
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Air Acquisition", charset="UTF-8"' },
  })
}

function authed(request, env) {
  const h = request.headers.get('Authorization') || ''
  if (!h.startsWith('Basic ')) return false
  let decoded = ''
  try { decoded = atob(h.slice(6)) } catch { return false }
  const pass = decoded.slice(decoded.indexOf(':') + 1)
  // Constant-time-ish: compare full length rather than bailing on first mismatch.
  const want = env.DASH_PASSWORD ?? ''
  if (!want || pass.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < want.length; i++) diff |= pass.charCodeAt(i) ^ want.charCodeAt(i)
  return diff === 0
}

const worker = {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sweep(env).then((d) => {
      for (const x of d) console.log(x.ok ? `built ${x.name} → ${x.projectId} (${x.entities} entities)` : `skipped ${x.name}: ${x.reason}`)
    }).catch((e) => console.error('sweep failed', e.message)))
  },

  async fetch(request, env) {
    const url = new URL(request.url)
    if (!env.SAPT_API_KEY || !env.DASH_PASSWORD) return new Response('not configured', { status: 500 })
    if (!authed(request, env)) return unauthorized()

    if (request.method === 'POST' && url.pathname === '/run') {
      const done = await sweep(env).catch((e) => [{ ok: false, name: 'sweep', reason: e.message }])
      const body = done.length
        ? done.map((d) => (d.ok ? `built ${d.name}` : `skipped ${d.name}: ${d.reason}`)).join('\n')
        : 'nothing to build'
      return new Response(body + '\n\ngo back to see the board', { headers: { 'Content-Type': 'text/plain' } })
    }

    return new Response(await board(env), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  },
}

export default worker
