# Septic site template

One website template, one Sapt project per client. The client's branding,
photos, copy, services, cities, reviews and FAQs live in Sapt. This repo never
changes per client. Each client gets a clone of it, deployed to Cloudflare
Workers with one button, and a scheduled sync keeps the clone in step with
their Sapt project.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adamsambaer/septic-template)

Built for the Air Acquisition $297/month offer: website + missed-call
text-back + follow-up texts + review requests + "you're due" reminders, with
the automation in Sapt on the client's Telnyx number.

The company in the demo, **Coastal Septic Co.**, is invented. Every default in
`src/config/site-config.ts` and every item in the template's Sapt project is
demo data.

## Deploy a client in three steps

1. **Sapt:** create the client's project from the septic template. With the
   intake form this is `pnpm onboard <recordId> --create-project`; by hand it is
   the Air Acquisition project → Snapshots → apply. Either way, note the new
   Project ID.
2. **Click the button above.** Cloudflare copies this repo into your GitHub
   account, asks for the Project ID and the site URL, sets up Workers Builds and
   deploys. Optionally paste a Sapt API key so every build pulls the latest CMS.
3. **Set the sync.** In the new repo's settings add the variable
   `NEXT_PUBLIC_SAPT_PROJECT_ID` and the secret `SAPT_API_KEY`. From then on
   [`sync-sapt.yml`](.github/workflows/sync-sapt.yml) pulls the project every
   six hours (or on demand) and Workers Builds redeploys on the push.

Attach the client's domain to the Worker in the Cloudflare dashboard when they
are ready. That is the whole job per client. Details and the intake flow are in
[`docs/ONBOARDING.md`](docs/ONBOARDING.md).

## How it fits together

```
Sapt client project                          client repo (a clone of this one)
──────────────────────────                   ─────────────────────────────────────
Branding   logo, Primary, Emergency  ─┐
Assets     photos                     ├─▶ pnpm pull ─▶ src/config/site-config.generated.json  (committed)
CMS        8 content types (below)   ─┘                public/img/cms/*                        (committed)
                                                          │
                                                          ▼
                                             site-config.ts = demo defaults ⊕ snapshot
                                                          │
                                                          ▼
                                             pnpm build ─▶ Cloudflare Workers Builds
```

Nothing talks to Sapt at request time except the quote form, which posts leads
to the public ingest endpoint, and the analytics script tag. A clone builds with
no secret at all.

`sapt.manifest.json` declares the CRM types the site and the text-back
workflows need, in the format Sapt's **Project Settings → Funnel → Prepare
project** reads. The full client project (CMS content types, demo content,
workflows, roles) comes from the project template; `pnpm sapt-template snapshot`
captures it with the demo company's strings turned into `{{variables}}`.

## What lives in Sapt

| Type | Items | Controls |
| --- | --- | --- |
| **Branding** (project page) | 1 | Logo, colors named **Primary** and **Emergency**. The site derives every tint and shade from those two. |
| **Assets** | many | Every photo. Upload here, pick in the fields below. |
| **1 · Site settings** | 1 | Identity, contact, address, site URL, theme, emergency strip, text-us chat widget on/off, hero, trust signals, about copy, counties, **which pages exist**, and the listing links / hours / map pin that go into the structured data. |
| **2 · Photos** | 1 | Hero, about, call-band photos and their focal points. Logo fallbacks. |
| **3 · Services** | one per service | Title, slug, kind, form option, card text, page intro, included list, this service's process steps and FAQ, photo. **Each published item is a page.** |
| **4 · Cities** | one per city | Name, slug, county, and **local detail**: the two or three sentences that are only true of that city. Each published item is a city page plus a coverage-band tile. |
| **5 · FAQs (general)** | many | Home, contact, services hub, city pages. |
| **6 · Process steps (general)** | 3 to 5 | Services hub, and any service without its own steps. |
| **7 · Reviews** | many | Home, about, reviews page, and one per city page matched on the City field. |
| **8 · Copy & labels** | 1 | Every other sentence and label, grouped by section and page, including the legal page bodies. Placeholders like `{company}` `{phone}` `{city}` fill automatically. |

CRM: `lead` (the quote form and the chat widget post here, publicly ingestable),
`customer` and `job` (the reminder and review workflows run off these). Every
lead texts the owner and texts the visitor back over Telnyx; nothing goes to email.

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SAPT_PROJECT_ID` | Deploy Button prompt, repo variable | The client's Sapt project. Where the form posts, what `pull` reads. |
| `NEXT_PUBLIC_SITE_URL` | Deploy Button prompt | Canonical URLs, Open Graph, sitemap. Overrides the CMS value. |
| `SAPT_API_KEY` | repo secret, optional Worker secret | Build-time only. Lets `pull` read the project. Never shipped to the browser. Create it in Sapt with **Use my live permissions** ticked so it also covers client projects made later. |
| `NEXT_PUBLIC_SAPT_BASE_URL` | optional | API base, default `https://api.sapt.ai` |
| `NEXT_PUBLIC_SAPT_INGEST_URL` | optional | Analytics ingest, default `https://ingest.sapt.ai` |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 2001 |
| `pnpm pull` | Snapshot the client's Sapt project into the repo |
| `pnpm verify` | Typecheck, lint with zero warnings, production build. **The done gate.** |
| `pnpm draft <url>` | Read a client's existing website into an intake record, so they do not have to type it. Agency tooling. |
| `pnpm onboard <recordId> [--create-project]` | Intake record → client site (+ their Sapt project). Agency tooling. |
| `pnpm sapt-template <list\|snapshot\|show\|apply>` | Manage the septic template in Sapt. Agency tooling. |
| `pnpm init-project` | Stamp a per-client Worker name, brand and logo into a fresh clone. |
| `pnpm test` | Unit tests for the merge, the CMS mapper and the onboarding mapper |
| `pnpm shot <url> <out.png> [--mobile] [--hover css]` | Trustworthy screenshots via the DevTools protocol |
| `pnpm build` / `pnpm deploy` | Production build / build and deploy to Cloudflare Workers |

`prebuild` runs before every build: it guarantees the snapshot file exists and,
when `SAPT_API_KEY` is present, pulls the latest Sapt content first. Nothing is
done until `pnpm verify` exits 0.

## Repo map

| Path | What |
| --- | --- |
| `src/config/site-config.ts` | Demo defaults and the shape of everything. Merged with the snapshot. |
| `src/config/site-config.generated.json` | The client snapshot. `{}` in the template, real content in a client repo. |
| `sapt.manifest.json` | CRM types and brand colors for Sapt's Prepare-project step. |
| `sapt/template-content.json` | The template's CMS content, used by the onboarding mapper. |
| `scripts/` | `pull-cms`, `onboard`, `sapt-template`, `init-project`, `shot`, `prebuild`. |
| `onboarding/index.html` | The agency intake form for airacquisition.com. Not shipped to clients. |
| `src/components/`, `src/app/` | The site. No client text inside. |

Design rules: square corners everywhere, heavy uppercase headings, one brand
color, one emergency color. The phone number is always the primary action.

## Being found by AI assistants

Everything here is built in, not an add-on. What the evidence actually supports,
and what it does not, is in [`docs/AI-SEARCH.md`](docs/AI-SEARCH.md).

| What | Why it matters |
| --- | --- |
| Every page is static HTML | ChatGPT, Claude and Perplexity crawlers do not run JavaScript. A site whose copy only appears after JS is invisible to them. This is the one thing most contractor sites get wrong. |
| `robots.txt` names the retrieval crawlers | `OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot`, `bingbot` and friends, so a later copy-pasted robots file cannot quietly remove the site from answers. |
| One JSON-LD graph per page | The business is described once, by `@id`, and every page references it. Listing links (`sameAs`), hours, map pin and price range let an engine confirm the site and the client's Google and Yelp records are one business. |
| Specific numbers in the copy | The one content change with a peer-reviewed study behind it. Tank sizes, intervals and response times get quoted back; vague marketing copy does not. Prices are deliberately not published, see the doc. |
| Local detail per city | City pages that differ only by a swapped name are the doorway pattern Google spent 2026 suppressing. `pnpm pull` warns for every city with nothing local on it. |

Structured data is hygiene, not a magic lever: a controlled study of ~1,900
pages found adding schema changed AI citations by a statistically
indistinguishable amount. It is here for entity resolution, which is worth the
few hundred bytes. There is deliberately no `llms.txt`; 97% of published ones
are never requested by anything.

## Tech stack

Next.js 15 (App Router) · Tailwind CSS 4 · Cloudflare Workers (OpenNext) · Lucide icons ·
Sapt for CMS, CRM and automation · Telnyx for the number.

## License

MIT, see [`LICENSE`](./LICENSE).
