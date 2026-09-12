/**
 * Turn the GeoNames US postal file into the lookup the intake form uses.
 *
 *   node scripts/build-zip-data.mjs <path to GeoNames US.txt>
 *
 * The form asks a contractor for one ZIP and offers the towns around it. Doing
 * that with a live API means a key, a CORS story and a page that breaks when
 * someone else's service is down, on the one screen where a lost client is a
 * lost sale. So the data ships with the page.
 *
 * Sharded on the first two digits of the ZIP. A shard carries every ZIP that
 * starts with those digits plus every town within RADIUS miles of any of them,
 * so a ZIP at the edge of a shard still sees its neighbours across the line and
 * the browser only ever fetches one small file.
 *
 * Data: GeoNames postal codes, CC BY 4.0 (https://download.geonames.org/export/zip/).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'onboarding', 'assets', 'towns')
const RADIUS = 35        // miles; about as far as a septic truck goes for routine work
const MAX_TOWNS = 90     // per shard, nearest first

const src = process.argv[2]
if (!src || !fs.existsSync(src)) {
  console.error('usage: node scripts/build-zip-data.mjs <US.txt from GeoNames>')
  process.exit(2)
}

const rows = []
for (const line of fs.readFileSync(src, 'utf8').split('\n')) {
  const c = line.split('\t')
  if (c.length < 11) continue
  const [, zip, place, , state, county, , , , lat, lng] = c
  if (!/^\d{5}$/.test(zip) || !place || !state) continue
  const la = Number(lat), lo = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) continue
  rows.push({ zip, place: place.trim(), state, county: (county || '').trim(), la, lo })
}
console.log(`  read      ${rows.length} postal codes`)

// One entry per town, at the centroid of its ZIPs: a town with eight ZIPs must
// not appear eight times in the picker.
const towns = new Map()
for (const r of rows) {
  const key = `${r.place}|${r.state}`
  const t = towns.get(key) ?? { place: r.place, state: r.state, counties: new Map(), la: 0, lo: 0, n: 0 }
  t.la += r.la; t.lo += r.lo; t.n += 1
  if (r.county) t.counties.set(r.county, (t.counties.get(r.county) ?? 0) + 1)
  towns.set(key, t)
}
for (const t of towns.values()) {
  t.la /= t.n; t.lo /= t.n
  // The county most of the town's ZIPs agree on, not whichever row came first.
  // GeoNames has towns whose outlying ZIP sits in the next county, and taking
  // the first one put Lehigh Acres in Broward instead of Lee.
  t.county = [...t.counties].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? ''
}
const townList = [...towns.values()]
console.log(`  towns     ${townList.length} distinct places`)

const R = 3958.8
const rad = (d) => (d * Math.PI) / 180
function miles(aLa, aLo, bLa, bLo) {
  const dLa = rad(bLa - aLa), dLo = rad(bLo - aLo)
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(aLa)) * Math.cos(rad(bLa)) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const shards = new Map()
for (const r of rows) {
  const k = r.zip.slice(0, 2)
  if (!shards.has(k)) shards.set(k, [])
  shards.get(k).push(r)
}

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

let total = 0
for (const [key, zips] of [...shards].sort()) {
  // A degree of latitude is ~69 miles; longitude shrinks with latitude. Box
  // first so the distance check runs on a handful of candidates, not 30,000.
  const latMin = Math.min(...zips.map((z) => z.la)) - RADIUS / 69
  const latMax = Math.max(...zips.map((z) => z.la)) + RADIUS / 69
  const midLat = (latMin + latMax) / 2
  const lonPad = RADIUS / (69 * Math.max(0.2, Math.cos(rad(midLat))))
  const lonMin = Math.min(...zips.map((z) => z.lo)) - lonPad
  const lonMax = Math.max(...zips.map((z) => z.lo)) + lonPad

  const near = []
  for (const t of townList) {
    if (t.la < latMin || t.la > latMax || t.lo < lonMin || t.lo > lonMax) continue
    let best = Infinity
    for (const z of zips) {
      const d = miles(z.la, z.lo, t.la, t.lo)
      if (d < best) best = d
      if (best <= RADIUS) break
    }
    if (best <= RADIUS) near.push(t)
  }
  near.sort((a, b) => a.place.localeCompare(b.place))
  const kept = near.slice(0, Math.max(MAX_TOWNS, near.length > 400 ? 400 : near.length))

  const shard = {
    // zip → [lat, lng], so the typed ZIP can be placed without another lookup
    z: Object.fromEntries(zips.map((z) => [z.zip, [round(z.la), round(z.lo)]])),
    // [name, county, state, lat, lng]
    t: kept.map((t) => [t.place, t.county, t.state, round(t.la), round(t.lo)]),
  }
  const file = path.join(OUT, `${key}.json`)
  fs.writeFileSync(file, JSON.stringify(shard))
  total += fs.statSync(file).size
}
function round(n) { return Math.round(n * 1e4) / 1e4 }

const files = fs.readdirSync(OUT)
console.log(`  wrote     ${files.length} shards, ${(total / 1024 / 1024).toFixed(2)} MB total`)
console.log(`  biggest   ${(Math.max(...files.map((f) => fs.statSync(path.join(OUT, f)).size)) / 1024).toFixed(0)} KB (what one client downloads)`)
