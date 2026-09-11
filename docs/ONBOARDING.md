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

1. **API key.** In [app.sapt.ai](https://app.sapt.ai), in the Air Acquisition
   project: profile (bottom left) → **Account** → **Create API Key**. It starts
   with `sapt_` and is shown once. Put it in `.env.local` as `SAPT_API_KEY`.
2. **Template.** `pnpm sapt-template snapshot` captures the Air Acquisition
   project (CRM types, CMS types and content, workflows, branding) as a template,
   turns the demo company's strings into `{{variables}}`, and strips the
   agency-only `client_onboarding` type and workflows. It prints
   `SAPT_TEMPLATE_ID`; put that in `.env.local` too.
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
   `--create-project` it stamps the template onto a new Sapt sub-project with
   their name, number, address and colors filled into every `{{variable}}`, and
   writes the project id back on the record. It prints a `check` line for
   everything it could not do from the record (photos in a folder, no logo, no
   reviews, cities not tagged with a county).
3. **Finish the CMS.** Cities and reviews from the record are pushed into the new
   project through the Sapt MCP (`onboarding/out/<slug>/cms-bundle.json`). Then
   photos and logo: download from the folder they shared, upload to the project's
   Assets and Branding, pick them in 2 · Photos and on each service.
4. **Deploy.** Click the Deploy to Cloudflare button in the README. Paste the
   client's Project ID and site URL when asked. Cloudflare clones the repo into
   your GitHub, sets up Workers Builds and deploys. Then in the new repo's
   settings add variable `NEXT_PUBLIC_SAPT_PROJECT_ID` and secret `SAPT_API_KEY`
   so the sync workflow can pull. Run it once (Actions → Sync from Sapt → Run)
   and the clone deploys with the client's CMS.
5. **Go live.** Move the card to Client review, send the link. When they say go:
   attach the domain in Cloudflare, forward their phone to the Telnyx number,
   activate the workflows in their project, move the card to Live.

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
| You | Agency contact only. Not on the site. |
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

## Sapt facts that shape the design

- The public ingest endpoint reads fields only inside `{ "data": { ... } }`. A
  flat body creates an empty record. Both forms in this repo wrap correctly.
- Sapt has no REST write for CMS content, only the connector and the dashboard.
  Template variables cover the singleton content at project creation; cities and
  reviews are the one connector step.
- `sapt.manifest.json` is what Sapt's **Project Settings → Funnel → Prepare
  project** reads. It carries the CRM types and brand colors, so a project
  prepared that way can take leads from the site even before the template is
  applied.
- Workflow `send_email` recipients use a `kind` discriminator the docs do not
  list. Notifications go over Telnyx SMS like the lead alerts.

## Environment

| Variable | Used by |
| --- | --- |
| `SAPT_API_KEY` | `onboard`, `sapt-template` (agency project), `pull` (any project the key can read) |
| `SAPT_AGENCY_PROJECT_ID` | `onboard`, `sapt-template`. Defaults to Air Acquisition. |
| `SAPT_TEMPLATE_ID` | `onboard --create-project`. Printed by `sapt-template snapshot`. |
