/**
 * Runs before every `next build` (npm's `prebuild` hook), locally and on
 * Cloudflare Workers Builds.
 *
 *   1. Makes sure src/config/site-config.generated.json exists ({} = demo).
 *   2. If SAPT_API_KEY and NEXT_PUBLIC_SAPT_PROJECT_ID are both set, pulls
 *      the client's Sapt project into that file so the build ships fresh CMS
 *      content. Without a key it builds from whatever snapshot is committed,
 *      so a Deploy-Button clone works with only the public Project ID.
 *   3. Wipes .next, which Windows needs between standalone builds.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const run = (script) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', script)], { stdio: 'inherit', cwd: ROOT })

run('ensure-generated.mjs')

// .env.local is read by pull-cms itself; here we only need to know whether a key exists.
// Hosted builds (Cloudflare Workers Builds, GitHub Actions) always pull when a key is present.
// A local build pulls only when asked (SAPT_PULL=1): the template repo carries the agency key
// in .env.local, and pulling the demo project over the template's empty snapshot on every
// `pnpm verify` would keep dirtying the repo.
const envLocal = path.join(ROOT, '.env.local')
const localHasKey = fs.existsSync(envLocal) && /^\s*SAPT_API_KEY\s*=\s*\S/m.test(fs.readFileSync(envLocal, 'utf8'))
const hosted = Boolean(process.env.CI || process.env.WORKERS_CI || process.env.CF_PAGES)
const hasKey = Boolean(process.env.SAPT_API_KEY || localHasKey)
if (hasKey && (hosted || process.env.SAPT_PULL === '1')) {
  const r = run('pull-cms.mjs')
  if (r.status !== 0) {
    console.error('prebuild: pull failed and a key was provided, refusing to build stale content')
    process.exit(r.status ?? 1)
  }
} else if (hasKey) {
  console.log('prebuild: local build, not pulling (set SAPT_PULL=1 to pull from Sapt first)')
} else {
  console.log('prebuild: no SAPT_API_KEY, building from the committed snapshot')
}

fs.rmSync(path.join(ROOT, '.next'), { recursive: true, force: true })
