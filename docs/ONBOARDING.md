# Client onboarding

The goal: a septic company fills in one form, and a site with their name, number,
services, cities, colors and reviews exists the same day, in their own Sapt
project with the CMS and the text-back automations ready, deployed to Cloudflare
from a clone of this repo. Adam's part is a review, not a build.

This follows Sapt's own documented pattern for agencies
([Building a client onboarding funnel](https://docs.sapt.ai/docs/mintlify/api/onboarding-funnels)):
one **parent project** (Air Acquisition) owns billing and holds a **template**;
each client is a **sub-project** stamped from that template. Deployment follows
Cloudflare's Deploy Button contract, the same one Sapt's own
[funnel-template](https://github.com/sapt-ai-org/funnel-template) uses.

## One-time setup

1. **API key.** In [app.sapt.ai](https://app.sapt.ai): avatar (top right) →
   **Account** → **API Keys** → **Create API Key**. Leave **"Use my live
   permissions"** ticked. That is the one setting that matters: a key with live
   permissions follows you into every project you create later, so it can stamp
   a template onto a brand-new client sub-project and read it back. A key with a
   fixed project scope can create the sub-project but cannot write into it
   (verified 11 Sep 2026: every content item and workflow failed with
   "create an API key that includes this scope"). The key starts with `sapt_`
   and is shown once. Put it in `.env.local` as `SAPT_API_KEY`.
2. **Template.** `pnpm sapt-template snapshot` captures the Air Acquisition
   project (CRM types, CMS types and content, workflows, branding) as a template,
   turns the demo company's strings into `{{variables}}`, and strips the
   agency-only `client_onboarding` type and workflows. It prints
   `SAPT_TEMPLATE_ID`; put that in `.env.local` too. Re-run it whenever the
   agency project's content types, workflows or starter content change; it
   replaces nothing by itself, so delete the old template
   (`pnpm sapt-template delete <id>`) once the new one is in `.env.local`.
3. **This repo on GitHub, public.** The Deploy Button clones from it. The README
   button points at `github.com/adamsambaer/septic-template`.

## Per client

```
form lands ─▶ pnpm onboard <id> --create-project ─▶ Deploy Button ─▶ sync
```

1. **Send the link.** The client fills in the intake form
   (`onboarding/index.html`, hosted at airacquisition.com/start). It posts one
   record to the `client_onboarding` type in Air Acquisition and shows up on the
   board as Submitted.
2. **Build.** In Claude Code, in this repo: "onboard <business name>". Claude runs

   ```bash
   pnpm onboard <recordId> --create-project
   pnpm verify
   ```

   `onboard` composes the site from the record plus template copy and writes the
   snapshot, so the site builds with their content right away. With
   `--create-project` it builds a one-off template (the septic template's
   structure plus starter content composed from the record: their settings,
   only the services they offer, their cities and reviews, the template's FAQ
   and steps), stamps it onto a new Sapt sub-project with name, number,
   address, colors and Google review link filled into every `{{variable}}`,
   deletes the one-off template, re-binds the workflows' Telnyx actions (Sapt
   scrubs every HTTP url, header and body out of a template, so `onboard`
   copies them back from the agency project by workflow name, filling
   `{{owner_mobile}}` and `{{google_review_url}}`), reads the stamped CMS back
   to prove it landed, and writes the project id onto the record. It prints a
   `check` line for everything it could not do from the record (photos in a
   folder, no logo, no reviews, cities not tagged with a county).

   Verified end to end on 12 Sep 2026 with a fake client: 47 entities applied,
   0 failures, and `pnpm pull` against the new project returned their 4
   services, 4 cities, 2 reviews and colors.
3. **Photos and logo.** The only manual step. Download from the folder they
   shared, upload to the project's Assets and Branding, pick them in 2 · Photos
   and on each service. Until then the demo photos show.
4. **Deploy.** Click the Deploy to Cloudflare button in the README. Paste the
   client's Project ID and site URL when asked. Cloudflare clones the repo into
   your GitHub, sets up Workers Builds and deploys. Then in the new repo's
   settings add variable `NEXT_PUBLIC_SAPT_PROJECT_ID` and secret `SAPT_API_KEY`
   so the sync workflow can pull. Run it once (Actions → Sync from Sapt → Run)
   and the clone deploys with the client's CMS.
5. **Go live.** Move the card to Client review, send the link. When they say go:
   attach the domain in Cloudflare, forward their phone to the Telnyx number,
   save the Telnyx key in the client project as credential `telnyx_api_key`,
   fill `{{from_number}}` in the workflows with their Telnyx number, activate the
   workflows, move the card to Live.

After that, every edit in Sapt reaches the site on the next sync (every six
hours, or on demand), and the code stays one repo for everyone.

"pnpm" is the command runner for this repo. Adam never needs to type these;
Claude runs them, or the workflow does.

## What the form asks for, and why

Only facts. The template supplies the copy, and the mapper fills their name,
counties and cities into it. Anything the record does not support is left off:
no license badge without a license number, no "24/7" unless the box is ticked,
no rating block without a review count, no invented reviews.

| Section | Feeds |
| --- | --- |
| The company | Identity, contact, address, page titles, legal pages |
| You | Agency contact only. Not on the site. Owner mobile receives the lead alerts. |
| Where you work | Counties and one page per city. Tag cities `Naples (Collier County)` when there is more than one county. |
| What you do | Which of the six template services get built. Emergency toggles the strip. |
| Proof | License, insured, Google rating and count, the review link the texts send people to |
| Brand & photos | Colors go to Branding. Logo and photos come as links to a shared folder. |
| In your words | About body and the three reasons list |
| Three reviews | Verbatim from Google, with name and city so city pages can pick a local one |
| Domain | Site URL, and where to point it |

The record field names are the CRM schema. To add a field: add it to the type in
Sapt first (unknown keys land in pending fields), then to
`scripts/lib/onboard-map.mjs` if the site should use it.

## The automations a client gets

Seven workflows, all drafts until the client's Telnyx number is connected. Every
text goes out from `{{from_number}}` with `Authorization: Bearer
{{credentials.telnyx_api_key}}`, a per-project credential, so no key ever sits
in a workflow or a template.

| Workflow | Trigger | Texts |
| --- | --- | --- |
| New lead → text the owner | lead created, not an emergency | the owner: who, number, what they need, their message |
| Emergency lead alert | lead created, urgency `emergency_now` | the owner: name, number, address, message, "call them now" |
| New lead follow-up | lead created, not an emergency | the lead: now, +15 min, +24 h |
| Missed call text back | Telnyx call webhook | the caller. The `to` placeholder must be checked against a real Telnyx event once a number is connected. |
| Review request after job | job status → Completed | the job's **Customer mobile** field: +2 h, +3 d, +7 d, +14 d, with `{{google_review_url}}` |
| Pump-out due reminder | anniversary of `customer.last_serviced` | the customer |
| Reactivation blast | Tuesdays 10:00, customers not opted out | the customer |

Jobs carry `customer_name` and `customer_phone` fields for this reason: a job's
texts need a number, and the record itself is the only thing a workflow can
read for certain.

## Sapt facts that shape the design

- The public ingest endpoint reads fields only inside `{ "data": { ... } }`. A
  flat body creates an empty record. List fields (`counties`, `cities`,
  `differentiators`, `services_offered`) must be arrays; the form splits them.
- Sapt has no REST write for CMS content, only the connector and the dashboard.
  Templates are writable though (`POST /projects/{id}/templates` takes a whole
  bundle), so `onboard` writes the client's content as starter items of a
  one-off template and applies that (`scripts/lib/starter-content.mjs`).
- Snapshotting with Sapt's own `tokenize` option and `starterContent` together
  fails validation (it corrupts every item's `publishedAt`). The snapshot script
  captures plain and tokenizes client-side (`scripts/lib/template-tokens.mjs`).
- Applying a template whose starter items carry a `publishedAt` string crashes
  every item ("toISOString is not a function"). The snapshot script blanks the
  field; items still apply as published.
- A template scrubs every workflow HTTP action into
  `__sapt_template_rebind_required__` markers. `scripts/lib/rebind.mjs` fills
  them back from the agency project after apply.
- `sapt.manifest.json` is what Sapt's **Project Settings → Funnel → Prepare
  project** reads. It carries the CRM types and brand colors, so a project
  prepared that way can take leads from the site even before the template is
  applied.
- Workflow `send_email` recipients use a `kind` discriminator the docs do not
  list. Notifications go over Telnyx SMS like the lead alerts.
- `POST /projects/{id}/workflows/test-run` rejects every body shape tried
  (wants an undocumented `workflowId`). Placeholders were not verifiable
  offline; `{{record.<field>}}` and `{{credentials.<name>}}` are the only two
  seen working in Sapt's own examples.

## Environment

| Variable | Used by |
| --- | --- |
| `SAPT_API_KEY` | `onboard`, `sapt-template` (agency project), `pull` (any project the key can read). Create it with live permissions. |
| `SAPT_AGENCY_PROJECT_ID` | `onboard`, `sapt-template`. Defaults to Air Acquisition. |
| `SAPT_TEMPLATE_ID` | `onboard --create-project`. Printed by `sapt-template snapshot`. |
| `SAPT_PULL` | Set to `1` to make a local `pnpm build` / `pnpm verify` pull from Sapt first. Cloudflare builds (where `CI` is set) always pull when a key is present. |
