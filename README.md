# Sapt Landing + Booking Funnel Template

A polished, mobile-first landing page and booking funnel that's **automatically wired to
[Sapt](https://sapt.ai)** — analytics, lead capture, and CRM — out of the box.

**The only thing you have to configure is your Sapt Project ID.** No SDKs, no backend to
run. Everything talks to Sapt over plain REST plus a single analytics script tag.

## What you get

- 🎯 **Landing page** — hero, services, about, testimonials, CTA
- 📅 **Booking funnel** — service → date → time → details → review → confirm
- 📈 **Analytics** — pageviews, clicks, scroll depth, and every funnel step, tracked automatically
- 🧲 **Lead capture** — completed bookings are saved to your Sapt CRM
- 📱 **Mobile-first** — built and tested for phones

## Quick start (one config value)

```bash
pnpm install
cp .env.local.example .env.local
# edit .env.local and set NEXT_PUBLIC_SAPT_PROJECT_ID
pnpm dev   # http://localhost:2001
```

Get your **Project ID** from the Sapt dashboard. That single value enables analytics, lead
capture, and the booking funnel. See [`SAPT_SETUP_GUIDE.md`](./SAPT_SETUP_GUIDE.md) for the
full integration reference, optional features, and the deploy walkthrough.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SAPT_PROJECT_ID` | ✅ | Analytics, lead capture, booking funnel |
| `NEXT_PUBLIC_SAPT_BASE_URL` | – | API base (default `https://api.sapt.ai`) |
| `NEXT_PUBLIC_SAPT_INGEST_URL` | – | Analytics ingest (default `https://ingest.sapt.ai`) |
| `SAPT_API_KEY` | – | **Server-only.** Enables pulling copy from the Sapt CMS |
| `SAPT_BOOKING_TYPE_SLUG` | – | CRM typed-record slug for bookings (default `booking`) |

Brand the page by editing **`src/config/site-config.ts`**, the brand colors in
`src/app/globals.css` (`@theme`), and the `CONFIGURATION` blocks at the top of each
component.

### Theme & CMS content

Two flags in `src/config/site-config.ts`:

- **`theme`** — `'light'` or `'dark'` (default `'light'`). Controls the light/dark CSS variables
  in `globals.css`.
- **`useCmsContent`** — boolean (default `false`). When `true` and `SAPT_API_KEY` is set, pulls
  section copy from the Sapt CMS instead of the hardcoded `site-config.ts`.

Both default to hardcoded — edit `site-config.ts` and `globals.css` to customize without
touching Sapt.

## How it's wired

Three Sapt touchpoints, nothing else:

1. **Analytics (script)** — `src/components/Analytics.tsx` injects `ingest.sapt.ai/v1/track.js`
   with your Project ID. Auto-tracks pageviews/clicks/scroll; funnel steps and visitor identity
   fire through `src/lib/analytics.ts`.
2. **POST → CRM** — the booking funnel POSTs to `/api/book`, which saves a record to your Sapt
   CRM `booking` object type (`src/lib/sapt-server.ts` → `ingestObject`). **Create the `booking`
   type first** (one call on the Sapt MCP, or by hand — see the setup guide), or bookings can't
   save. Public — needs only the Project ID.
3. **GET → CMS** — off by default (the site renders hardcoded copy). Set `SAPT_API_KEY` and
   `useCmsContent: true` to pull section copy from the CMS (`src/lib/sapt-server.ts` →
   `cmsGetBySlug`, with a hardcoded fallback).

See [`SAPT_SETUP_GUIDE.md`](./SAPT_SETUP_GUIDE.md) for the booking type schema and how to wire
the CMS.

## Content & customization

| File | What to change |
| --- | --- |
| `src/config/site-config.ts` | Company name, tagline, phone, hero copy |
| `src/app/globals.css` (`@theme`) | Brand colors |
| `src/app/layout.tsx` | Page title / metadata |
| `src/components/sections/*` | Hero, Services, About, Testimonials, CTA |
| `src/app/book/page.tsx` | Bookable services, time slots, location |

## Deploy (Cloudflare Workers)

```bash
pnpm deploy:prod
```

Set `NEXT_PUBLIC_SAPT_PROJECT_ID` (and any optional vars) in your Cloudflare/CI environment.
If you use CMS-driven copy at runtime, also add the secret:
`wrangler secret put SAPT_API_KEY`. Bind a domain via a route in `wrangler.jsonc` or the
Cloudflare dashboard. A `workflow_dispatch` GitHub Action is included at
`.github/workflows/deploy.yml`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Local dev server on port 2001 |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm deploy:prod` | Build + deploy to Cloudflare |

## Tech stack

Next.js 15 (App Router) · Tailwind CSS 4 · Cloudflare Workers (OpenNext) · Lucide icons.

## License

MIT — see [`LICENSE`](./LICENSE). Clone it, brand it, ship it.
