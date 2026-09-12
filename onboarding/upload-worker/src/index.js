/**
 * Intake upload endpoint.
 *
 * Why this exists: the intake form is a static page, and Sapt's asset upload
 * needs an API key. A key cannot live in a public page, and the public CRM
 * ingest endpoint only takes JSON, so there is no way for a client to hand us
 * a logo without something in the middle. This is that something: about a
 * hundred lines, one secret, no database.
 *
 * It matters most for the client who has no website. With a website we read
 * their logo and photos straight off it. Without one we have nothing, and the
 * site falls back to the demo company's logo and another company's truck,
 * which is worse than having no image at all.
 *
 * Flow per file: ask Sapt for a presigned URL, PUT the bytes to R2, register
 * the asset, hand the public URL back to the form. The form puts those URLs on
 * the intake record, and `pnpm onboard` feeds them into the client's CMS.
 *
 *   POST /  multipart/form-data
 *     file     one or more files (repeatable)
 *     feature  "branding" for a logo, "cms" for photos. Default "cms".
 *   → { assets: [{ url, filename, mimeType, sizeBytes }] }
 *
 * Deploy:
 *   cd onboarding/upload-worker
 *   npx wrangler secret put SAPT_API_KEY
 *   npx wrangler deploy
 */

const MAX_FILES = 10
const MAX_BYTES = 10 * 1024 * 1024 // per file
const MAX_TOTAL = 30 * 1024 * 1024
const TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif'])

/** Only our own pages may post here. Not airtight, but it stops drive-by use. */
const ALLOWED = [/^https:\/\/(www\.)?airacquisition\.com$/, /^https:\/\/[a-z0-9-]+\.pages\.dev$/, /^http:\/\/localhost:\d+$/]

function cors(origin) {
  const ok = origin && ALLOWED.some((re) => re.test(origin))
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

async function sapt(env, path, init = {}) {
  const res = await fetch(`https://api.sapt.ai${path}`, {
    ...init,
    headers: { Authorization: `ApiKey ${env.SAPT_API_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

const worker = {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    const headers = cors(origin)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return json({ error: 'POST a multipart form' }, 405, headers)
    if (headers['Access-Control-Allow-Origin'] === 'null') return json({ error: 'origin not allowed' }, 403, headers)
    if (!env.SAPT_API_KEY || !env.SAPT_PROJECT_ID) return json({ error: 'upload is not configured' }, 500, headers)

    let form
    try {
      form = await request.formData()
    } catch {
      return json({ error: 'could not read the upload' }, 400, headers)
    }

    const feature = form.get('feature') === 'branding' ? 'branding' : 'cms'
    const files = form.getAll('file').filter((f) => typeof f === 'object' && f.size > 0)

    if (files.length === 0) return json({ error: 'no files' }, 400, headers)
    if (files.length > MAX_FILES) return json({ error: `at most ${MAX_FILES} files at a time` }, 400, headers)

    let total = 0
    for (const f of files) {
      total += f.size
      if (f.size > MAX_BYTES) return json({ error: `${f.name} is over ${MAX_BYTES / 1024 / 1024}MB` }, 400, headers)
      if (!TYPES.has((f.type || '').toLowerCase())) return json({ error: `${f.name} is not an image` }, 400, headers)
    }
    if (total > MAX_TOTAL) return json({ error: 'that is more than 30MB in one go' }, 400, headers)

    try {
      // 1. presign
      const { uploads } = await sapt(env, `/projects/${env.SAPT_PROJECT_ID}/assets/upload-urls`, {
        method: 'POST',
        body: JSON.stringify({
          feature,
          files: files.map((f) => ({ filename: safeName(f.name), mimeType: f.type, sizeBytes: f.size })),
        }),
      })

      // 2. put the bytes straight to R2
      await Promise.all(
        uploads.map((u, i) =>
          fetch(u.uploadUrl, { method: 'PUT', headers: { 'Content-Type': u.mimeType }, body: files[i].stream() }).then((r) => {
            if (!r.ok) throw new Error(`upload of ${u.filename} failed (${r.status})`)
          })
        )
      )

      // 3. register them
      const { assets } = await sapt(env, `/projects/${env.SAPT_PROJECT_ID}/assets`, {
        method: 'POST',
        body: JSON.stringify({
          uploads: uploads.map((u, i) => ({
            itemId: u.itemId,
            filename: u.filename,
            feature,
            sizeBytes: files[i].size,
            r2Key: u.r2Key,
            mimeType: u.mimeType,
            assetType: 'image',
          })),
        }),
      })

      return json({ assets: assets.map((a) => ({ url: a.url, filename: a.filename, mimeType: a.mimeType, sizeBytes: a.sizeBytes })) }, 200, headers)
    } catch (e) {
      // Never leak the key or the upstream body to a public caller.
      console.error('intake upload failed', e.message)
      return json({ error: 'that upload did not go through' }, 502, headers)
    }
  },
}

export default worker

/** Keep the original name recognisable but harmless. */
function safeName(name) {
  const base = String(name || 'upload').split(/[\\/]/).pop()
  return base.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 80) || 'upload'
}
