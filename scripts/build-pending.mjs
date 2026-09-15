/**
 * Build and deploy the website for every client who does not have one yet.
 *
 *   node scripts/build-pending.mjs            do the work
 *   node scripts/build-pending.mjs --dry      say what it would do
 *   node scripts/build-pending.mjs --only <recordId>
 *   node scripts/build-pending.mjs --force    rebuild even if the site answers
 *
 * The auto-onboard Worker creates each client's Sapt project within a couple of
 * minutes of them signing up. It cannot build their website, because that needs
 * a Next.js build. This is the other half, and it runs in GitHub Actions on a
 * schedule so nobody has to remember it.
 *
 * The one thing that must not go wrong: NEXT_PUBLIC_SAPT_PROJECT_ID has to be
 * the client's own project at build time, because that is where the quote form
 * posts leads. Build it empty and the site looks perfect and silently drops
 * every lead. So it is set per client here, and read back off the deployed page
 * afterwards to prove it landed.
 *
 * Env: SAPT_API_KEY, SAPT_AGENCY_PROJECT_ID, CLOUDFLARE_API_TOKEN,
 *      CLOUDFLARE_ACCOUNT_ID, SITE_HOST_SUFFIX
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

for (const file of ['.env', '.env.local']) {
  const p = path.join(ROOT, file)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

const args = process.argv.slice(2)
const has = (f) => args.includes(`--${f}`)
const val = (f) => { const i = args.indexOf(`--${f}`); return i >= 0 ? args[i + 1] : '' }

const DRY = has('dry')
const FORCE = has('force')
const ONLY = val('only')
const AGENCY = process.env.SAPT_AGENCY_PROJECT_ID || 'e07c4bff-37e8-46e3-96eb-f1c0c13b095c'
const SUFFIX = process.env.SITE_HOST_SUFFIX || '.adamsambaer.workers.dev'
const KEY = process.env.SAPT_API_KEY
if (!KEY) { console.error('SAPT_API_KEY is missing'); process.exit(2) }

async function api(route, init = {}) {
  const res = await fetch(`https://api.sapt.ai${route}`, {
    ...init,
    headers: { Authorization: `ApiKey ${KEY}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers || {}) },
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* leave null */ }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${route} → ${res.status}: ${data?.error?.message || text.slice(0, 160)}`)
  return data
}

const slugify = (s) => String(s ?? '').toLowerCase().normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 54)

const answers = (url) => fetch(url, { redirect: 'follow' }).then((r) => r.status === 200).catch(() => false)

// npx is a .cmd shim on Windows, and since Node 20 a .cmd cannot be executed
// without a shell. CI is Linux and takes the direct path; only a local run on
// Adam's machine goes through cmd, where every argument here is ours.
const WIN = process.platform === 'win32'

function run(cmd, cmdArgs, env = {}) {
  return execFileSync(cmd, cmdArgs, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    ...(WIN && cmd !== 'node' ? { shell: true } : {}),
  })
}

const records = (await api(`/projects/${AGENCY}/object-records?typeSlug=client_onboarding&limit=100`)).records ?? []

// A worker name is global to the account, so two clients called the same thing
// would silently overwrite one another's website. Whoever recorded the name
// first keeps it; the next one gets their record id on the end.
const claimed = new Map()
for (const r of records) {
  const host = String(r.data?.site_url ?? '').replace(/^https?:\/\//, '').split('.')[0]
  if (host) claimed.set(host, r.id)
}
function workerName(record) {
  const base = slugify(record.data?.business_name)
  if (!base) return ''
  const owner = claimed.get(base)
  if (!owner || owner === record.id) return base
  return `${base}-${String(record.id).slice(0, 4)}`
}

const todo = []
for (const r of records) {
  if (ONLY && r.id !== ONLY) continue
  if (r.status === 'lost') continue
  const pid = String(r.data?.sapt_project_id ?? '').trim()
  const name = String(r.data?.business_name ?? '').trim()
  if (!pid) continue                                    // the Worker has not built their project yet
  if (!name) continue
  const url = String(r.data?.site_url ?? '').trim()
  if (url && !FORCE && (await answers(url))) continue    // already live
  todo.push(r)
}

if (!todo.length) {
  console.log('Nothing to build. Every client with a Sapt project has a website that answers.')
  process.exit(0)
}

console.log(`${todo.length} site(s) to build:\n`)
const failures = []

for (const record of todo) {
  const name = record.data.business_name
  const pid = record.data.sapt_project_id
  const worker = workerName(record)
  const url = `https://${worker}${SUFFIX}`
  console.log(`── ${name}`)
  console.log(`   project ${pid}`)
  console.log(`   worker  ${worker}`)

  if (DRY) { console.log('   (dry run)\n'); continue }

  try {
    // 1. Turn the intake record into this client's site config, and pull down
    //    their logo and photos so the build has them locally.
    run('node', ['scripts/onboard.mjs', record.id])

    const snapshot = path.join(ROOT, 'src', 'config', 'site-config.generated.json')
    const config = JSON.parse(fs.readFileSync(snapshot, 'utf8'))
    if (!config.companyName) throw new Error('the snapshot came out empty')

    // 2. Build and deploy. wrangler.jsonc's build hook runs next build and the
    //    OpenNext step, so this one command does the whole thing.
    run('npx', ['wrangler', 'deploy', '--name', worker], {
      NEXT_PUBLIC_SAPT_PROJECT_ID: pid,
      NEXT_PUBLIC_SITE_URL: url,
    })

    // 3. Prove it. A site that renders but posts leads nowhere looks fine and
    //    loses every enquiry, so check the client's project id actually
    //    shipped. Cloudflare serves the previous version for a few seconds
    //    after a deploy, so this polls rather than asking once: checking too
    //    early reads the old build and reports a good deploy as broken.
    let carries = false
    for (let i = 0; i < 24 && !carries; i++) {
      carries = await fetch(url).then((r) => (r.ok ? r.text() : '')).then((t) => t.includes(pid)).catch(() => false)
      if (!carries) await new Promise((r) => setTimeout(r, 5000))
    }
    if (!carries) {
      const up = await answers(url)
      throw new Error(up
        ? 'the page never showed the client project id, so its quote form would drop every lead'
        : `deployed but ${url} never answered`)
    }

    await api(`/projects/${AGENCY}/object-records/${record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: { site_url: url } }),
    })
    await api(`/projects/${AGENCY}/object-records/${record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'review' }),
    }).catch(() => {})

    console.log(`   live    ${url}\n`)
  } catch (e) {
    const why = String(e.stderr || e.message || e).split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 400)
    console.error(`   FAILED  ${why}\n`)
    failures.push({ name, why })
  }
}

// Leave the repo as it was: the generated snapshot belongs to whichever client
// was built last, and committing that would put one client's site in the
// template everyone else builds from.
try {
  run('git', ['checkout', '--', 'src/config/site-config.generated.json'])
  fs.rmSync(path.join(ROOT, 'public', 'img', 'cms'), { recursive: true, force: true })
} catch { /* a dirty tree is not worth failing the run over */ }

if (failures.length) {
  console.error(`${failures.length} of ${todo.length} failed:`)
  for (const f of failures) console.error(`  ${f.name}: ${f.why}`)
  process.exit(1)
}
console.log(`Built ${todo.length} site(s).`)
