/**
 * Stage the client intake form for hosting.
 *
 *   node scripts/build-intake.mjs            → onboarding/dist/
 *
 * `onboarding/` also holds the upload Worker's source, saved client bundles and
 * the template snapshot, none of which belong on a public page. This copies out
 * just the page and its images, so the folder can be handed to Cloudflare Pages
 * (or dropped into airacquisition.com at any path) without leaking the rest.
 *
 * Asset paths in the page are relative on purpose: the same folder works at a
 * domain root, at /start, or on a pages.dev preview, with no rewriting.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'onboarding')
const OUT = path.join(SRC, 'dist')

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true })

const page = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8')

// A page that cannot reach its endpoints is worse than no page: it takes the
// client's details and drops them. Fail the build instead.
for (const attr of ['data-endpoint', 'data-upload']) {
  const m = page.match(new RegExp(attr + '="(https://[^"]+)"'))
  if (!m) throw new Error(`${attr} is missing or not https`)
  console.log(`  ${attr.replace('data-', '').padEnd(9)} ${m[1]}`)
}
for (const m of page.matchAll(/(?:src|href)="\/(?!\/)/g)) {
  throw new Error(`root-absolute asset path at index ${m.index}; use a relative one so the page works at any path`)
}

fs.writeFileSync(path.join(OUT, 'index.html'), page)
for (const f of fs.readdirSync(path.join(SRC, 'assets'))) {
  fs.copyFileSync(path.join(SRC, 'assets', f), path.join(OUT, 'assets', f))
}
// Nothing here should ever be indexed; the form is for people we send it to.
fs.writeFileSync(path.join(OUT, '_headers'), '/*\n  X-Robots-Tag: noindex\n')
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n')

console.log(`  staged    onboarding/dist (${fs.readdirSync(path.join(OUT, 'assets')).length} assets)`)
