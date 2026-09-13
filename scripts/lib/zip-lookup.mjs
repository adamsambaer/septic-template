/**
 * ZIP → town and state, from the same data the intake form uses.
 *
 * The form fills the client's own city and state from the ZIP as they type, but
 * records submitted before that existed, or built by hand, only carry the ZIP.
 * Sapt requires a city and state on the site settings, so rather than stop a
 * perfectly good record we look the ZIP up here too.
 *
 * Kept out of onboard-map.mjs on purpose: that module is pure, and this reads
 * a file.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIR = path.join(ROOT, 'onboarding', 'assets', 'towns')

/** @returns {{ city: string, state: string } | null} */
export function lookupZip(zip) {
  const z = String(zip ?? '').replace(/\D/g, '').slice(0, 5)
  if (z.length !== 5) return null
  const file = path.join(DIR, `${z.slice(0, 2)}.json`)
  if (!fs.existsSync(file)) return null
  try {
    const entry = JSON.parse(fs.readFileSync(file, 'utf8')).z?.[z]
    if (!entry) return null
    return { city: entry[2] ?? '', state: entry[3] ?? '' }
  } catch {
    return null
  }
}

/** Fill address_city / address_state from address_zip when they are missing. */
export function fillAddressFromZip(data) {
  const d = { ...(data ?? {}) }
  if (String(d.address_city ?? '').trim() && String(d.address_state ?? '').trim()) return { data: d, note: '' }
  const hit = lookupZip(d.address_zip)
  if (!hit) return { data: d, note: '' }
  const filled = []
  if (!String(d.address_city ?? '').trim() && hit.city) { d.address_city = hit.city; filled.push('city') }
  if (!String(d.address_state ?? '').trim() && hit.state) { d.address_state = hit.state; filled.push('state') }
  return { data: d, note: filled.length ? `${filled.join(' and ')} taken from ZIP ${d.address_zip}: ${hit.city}, ${hit.state}` : '' }
}
