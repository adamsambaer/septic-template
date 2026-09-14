/**
 * ZIP to town and state, for a record that arrived without them.
 *
 * The intake form fills these in as the client types their ZIP, so this only
 * catches older records and anything typed by hand on a call. It reads the same
 * shard files the form uses, served from the form's own host, because a Worker
 * has no filesystem to read them from.
 *
 * Sapt rejects a site-settings item with no city or state, and rejects it in a
 * way that leaves the project created but empty, so it is worth one fetch to
 * avoid.
 */
const SHARDS = 'https://airacq-start.pages.dev/assets/towns'

const cache = new Map()

async function shard(zip) {
  const key = zip.slice(0, 2)
  if (cache.has(key)) return cache.get(key)
  const data = await fetch(`${SHARDS}/${key}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
  cache.set(key, data)
  return data
}

/** @returns {Promise<{ data: object, note: string }>} */
export async function fillAddressFromZip(input) {
  const data = { ...(input ?? {}) }
  const hasCity = String(data.address_city ?? '').trim()
  const hasState = String(data.address_state ?? '').trim()
  if (hasCity && hasState) return { data, note: '' }

  const zip = String(data.address_zip ?? '').replace(/\D/g, '').slice(0, 5)
  if (zip.length !== 5) return { data, note: '' }

  const found = (await shard(zip))?.z?.[zip]
  if (!found) return { data, note: '' }

  const filled = []
  if (!hasCity && found[2]) { data.address_city = found[2]; filled.push('city') }
  if (!hasState && found[3]) { data.address_state = found[3]; filled.push('state') }
  return { data, note: filled.length ? `${filled.join(' and ')} from ZIP ${zip}` : '' }
}
