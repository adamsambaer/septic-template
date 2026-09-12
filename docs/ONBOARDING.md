# Client onboarding

The goal: a septic company spends about an hour of their own time, spread over
a few short touches, and ends up with a site, a CRM and text-back automations
running on their own number. Adam's part is a review, not a build.

The shape of it changed on 12 September 2026. The old flow handed the owner a
53-field form. Completion falls off a cliff past about seven fields, and this
buyer is usually 45 to 65 and filling it in on a phone in a truck. So we stopped
asking and started confirming: build a real draft from what they have already
published, then ask them to correct it.

Provisioning follows Sapt's own documented pattern
([Building a client onboarding funnel](https://docs.sapt.ai/docs/mintlify/api/onboarding-funnels)):
one **parent project** (Air Acquisition) holds a **template**; each client is a
**sub-project** stamped from it. Deployment follows Cloudflare's Deploy Button
contract.

## One-time setup

1. **API key.** In [app.sapt.ai](https://app.sapt.ai): avatar (top right) →
   **Account** → **API Keys** → **Create API Key**. Leave **"Use my live
   permissions"** ticked. That is the setting that matters: a key with live
   permissions follows you into projects created later, so it can stamp a
   template onto a brand-new client sub-project and read it back. A fixed-scope
   key can create the sub-project but cannot write into it. Put it in
   `.env.local` as `SAPT_API_KEY`.
2. **Template.** `pnpm sapt-template snapshot` captures the Air Acquisition
   project as a template, tokenises the demo company's strings into
   `{{variables}}`, and strips the agency-only `client_onboarding` type and
   workflows. It prints `SAPT_TEMPLATE_ID` for `.env.local`. Re-run it whenever
   the agency project's content types, workflows or starter content change, then
   delete the old one with `pnpm sapt-template delete <id>`.
3. **This repo on GitHub, public.** The Deploy Button clones from it.

## Per client

```
form (8 fields) ─▶ pnpm draft ─▶ 20-min call ─▶ pnpm onboard ─▶ Deploy ─▶ live
```

1. **Send the link.** They fill in eight fields at airacquisition.com/start
   (`onboarding/index.html`). Two minutes. It lands as a `client_onboarding`
   record on the board as Submitted. The field that earns its place is **their
   current website**, because everything else comes off it.

2. **Draft from their existing site.** Before anyone talks to anyone:

   ```bash
   pnpm draft --record onboarding/out/<slug>/record.json
   ```

   This reads their site and fills in the record: business name, phone, email,
   address, the services they actually offer, counties, towns, their about
   paragraph, their Google, Yelp, BBB and Facebook links, whether they run
   emergency service, and a list of usable photos. Anything the client typed on
   the form outranks anything read off the site, and the script says so when the
   two disagree.

   It prints where every value came from, and an **ask them** list of what it
   could not find. It flags thin results too: finding one town when they serve
   eight is more dangerous than finding none, because nothing else would catch
   it.

   Three rules it follows: nothing is invented, claims are never guessed (a
   licence number is only taken when it is labelled as one), and ratings and
   review counts are never copied off an old site because they go stale
   silently. Those are always asked for.

3. **One recorded call, about twenty minutes.** Work down the `ask them` list.
   Confirm the service list and the towns, get the differentiator in their own
   words, settle who receives the lead texts, take the insurance details, and
   confirm the licence number against the state register. Contractors review for
   factual accuracy, not design, so this is what they are good at.

   Florida septic is the awkward case: it is licensed by the Department of
   Health rather than the usual contractor board, and there is no reliable
   public lookup, so it gets confirmed verbally.

4. **Build it.**

   ```bash
   pnpm onboard <recordId> --create-project
   pnpm verify
   ```

   `onboard` composes the site from the record plus template copy and writes the
   snapshot. With `--create-project` it builds a one-off template (the septic
   template's structure plus starter content composed from the record: their
   settings, only the services they offer, their cities and reviews), stamps it
   onto a new Sapt sub-project with their details filled into every
   `{{variable}}`, deletes the one-off template, re-binds the workflows' Telnyx
   actions, reads the stamped CMS back to prove it landed, seeds the project's
   memory so Sapt's own AI knows who the business is, creates a **Client** role
   and prints an invite link you can text them, and writes the project id onto
   the record.

   Verified end to end on 12 Sep 2026 with a fake client: 47 entities applied,
   0 failures, and `pnpm pull` against the new project returned exactly their
   content.

5. **Photos and local detail.** The remaining manual step. Start with the photos
   the draft found on their old site; once the Telnyx number is live they can
   text better ones. Upload to the project's Assets and Branding, pick them in
   2 · Photos and on each service.

   Then fill **Local detail** on every published city. Two or three sentences
   that are only true of that town, from the client, never invented. City pages
   without it are near-identical to one another, which is the doorway pattern
   Google suppresses. `pnpm pull` names every city that is missing it. See
   [`AI-SEARCH.md`](AI-SEARCH.md).

6. **Deploy.** Click the Deploy to Cloudflare button in the README. Paste the
   client's Project ID and site URL. Then in the new repo's settings add the
   variable `NEXT_PUBLIC_SAPT_PROJECT_ID` and the secret `SAPT_API_KEY` so the
   sync workflow can pull. Run it once and the clone deploys with their CMS.

   Switch on Sapt's analytics for the client in the dashboard at the same time
   (CNAME `m.theirdomain.com` → `ingest.sapt.ai`). There is no API for it. Skip
   it and the site is blind: no pageviews, no phone-click tracking, and nothing
   feeding the attribution that makes the CRM worth paying for.

7. **Go live.** One consolidated round of corrections, then launch: attach the
   domain in Cloudflare, forward their phone to the Telnyx number, save the
   Telnyx key in the client project as credential `telnyx_api_key`, fill
   `{{from_number}}` in the workflows, activate them, move the card to Live.

## The eight questions

Everything here is either impossible to source or needed before we can start.

| Field | Why it has to be asked |
| --- | --- |
| Business name | Confirms the exact spelling, which must match their Google listing character for character. |
| **Current website** | The highest-value field on the form. The whole draft comes from it. |
| Phone customers call | Confirmed, not guessed. |
| Mobile for job alerts | Cannot be inferred, and the automation is useless without it. |
| Their email | For the agreement and their Sapt login. |
| Google Business Profile link | Not for data, which cannot be read out of Google anyway. It is what lets an assistant confirm the site and the listing are one business. |
| Domain | Somebody has to decide whether they own one. Consistently one of the four things that stalls a launch. |
| What they promise that others do not | The only genuinely un-sourceable piece of copy. |

No licence field, no address, no service list, no city list, no reviews, no
photo uploads. All of that is read off their site or settled on the call.

## The automations a client gets

Seven workflows, drafts until the client's Telnyx number is connected. Every
text goes out from `{{from_number}}` with `Authorization: Bearer
{{credentials.telnyx_api_key}}`, a per-project credential, so no key sits in a
workflow or a template.

| Workflow | Trigger | Texts |
| --- | --- | --- |
| New lead → text the owner | lead created, not an emergency | the owner: who, number, what they need, their message |
| Emergency lead alert | lead created, urgency `emergency_now` | the owner: name, number, address, message, "call them now" |
| New lead follow-up | lead created, not an emergency | the lead: now, +15 min, +24 h |
| Missed call text back | Telnyx call webhook | the caller. The `to` placeholder must be checked against a real Telnyx event once a number is connected. |
| Review request after job | job status → Completed | the job's **Customer mobile**: +2 h, +3 d, +7 d, +14 d, with `{{google_review_url}}` |
| Pump-out due reminder | anniversary of `customer.last_serviced` | the customer |
| Reactivation blast | Tuesdays 10:00, customers not opted out | the customer |

## Sapt facts that shape the design

- The public ingest endpoint reads fields only inside `{ "data": { ... } }`. A
  flat body creates an empty record. It is **undocumented but functional**;
  Sapt's own rule is that anything outside the OpenAPI contract can change.
- **Google Business Profile data cannot be read back.** Connecting it enables
  posting and review replies inside Sapt. It does not give you their address,
  hours, photos or reviews. This is why drafts come from the client's own
  website instead. Google's Places terms separately forbid caching their data
  into a CMS, so that route is closed too.
- Sapt has no REST write for CMS content, but templates are writable, so
  `onboard` writes the client's content as starter items of a one-off template
  and applies that.
- Snapshotting with Sapt's `tokenize` option and `starterContent` together fails
  validation. The snapshot script captures plain and tokenises client-side.
- Applying a template whose starter items carry a `publishedAt` string crashes
  every item. The snapshot script blanks the field; items still apply published.
- A template scrubs every workflow HTTP action into
  `__sapt_template_rebind_required__` markers. `scripts/lib/rebind.mjs` fills
  them back from the agency project after apply.
- Sapt agents can be defined but not invoked, and Sapt cannot send SMS. Our
  Telnyx workflows are the only way anything gets texted.
- Only Admin and view-only Member roles exist by default. `onboard` creates the
  restricted **Client** role per project.
- Invitations with `sendEmail:false` return an `acceptUrl` to text instead.
- There is no API to delete an asset, and no API to enable analytics.

## Environment

| Variable | Used by |
| --- | --- |
| `SAPT_API_KEY` | `onboard`, `sapt-template`, `pull`. Create it with live permissions. |
| `SAPT_AGENCY_PROJECT_ID` | `onboard`, `sapt-template`. Defaults to Air Acquisition. |
| `SAPT_TEMPLATE_ID` | `onboard --create-project`. Printed by `sapt-template snapshot`. |
| `SAPT_PULL` | Set to `1` to make a local build pull from Sapt first. Hosted builds always pull when a key is present. |
