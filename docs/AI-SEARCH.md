# Being found by AI assistants

What this template does so a client gets named when somebody asks ChatGPT,
Perplexity, Gemini, Claude or Google's AI "who do I call for septic in my town",
and, just as importantly, what it deliberately does not do.

Researched September 2026 across the academic work, the large vendor studies and
the platform documentation. Claims below are labelled by how much evidence sits
behind them. Where reputable sources disagree, the disagreement is reported
rather than averaged.

## The short version

There is no separate AI ranking algorithm to game. Google says so outright in
its own AI-features documentation, and the independent analyses agree. Three
things genuinely decide whether an assistant can name a business: the page must
be readable without JavaScript, the crawlers must be allowed in, and the copy
must contain specific quotable facts rather than marketing air.

Most of what is sold as "AI SEO" fails on contact with the data. That is worth
knowing both so we do not build it and so we can answer a client who has been
pitched it.

## What the template does

### Static HTML on every page — strong evidence

Vercel measured a month of crawler traffic: 569 million fetches from ChatGPT's
crawlers and 370 million from Claude's, with no evidence of JavaScript execution
by either. They fetch script files and read them as text. Only Google and Bing
render pages.

Every page here is prerendered at build time, so the full copy, phone number and
headings are in the HTML. A competitor on a client-rendered page builder can
rank on Google and still be invisible to ChatGPT, Claude and Perplexity. This is
the single largest edge the template has, and the easiest to lose: never move
page copy behind a client-side fetch.

### robots.txt names the retrieval crawlers — strong evidence

Retrieval crawlers answer a question somebody is asking right now. Training
crawlers only feed model training. They are different user agents and blocking
the wrong set is the common way a small site disappears from AI answers.

Allowed and named in `src/app/robots.ts`: `OAI-SearchBot`, `ChatGPT-User`,
`PerplexityBot`, `Perplexity-User`, `Claude-SearchBot`, `Claude-User`,
`Googlebot`, `bingbot`. The blanket `*` rule already covers them; naming them
makes the intent durable.

A CDN or firewall rule beats anything robots.txt says. Check Cloudflare's bot
controls per zone when a client site goes live.

### One JSON-LD graph per page — moderate evidence, for entity resolution only

`src/lib/schema.tsx` describes the business once, under one `@id`, and every
page references it rather than repeating a half-filled copy. It carries the
address, hours, map pin, price range, areas served and the `sameAs` links to the
client's Google, Yelp, BBB and Facebook records.

Be honest about why: Ahrefs ran a controlled test of 1,885 pages that added
schema against 4,000 matched controls and found the citation change
statistically indistinguishable from zero. Google states no special structured
data is required for AI features. What schema is good for is letting an engine
confirm the website and the listings are the same business, and roughly 42% of
AI citations for local businesses come from listings, so that link is worth
making. It is hygiene, not a lever, and should never be sold as one.

### Specific numbers in the copy — strong evidence

The one peer-reviewed study in this field tested nine content tactics across
about ten thousand queries against live generative engines. The three best were
all evidence-based: adding quotations, adding statistics, and citing named
sources, worth up to roughly 40% more visibility. Keyword stuffing was the one
tactic that reliably hurt, the opposite of how classic search behaved.

In practice: "a 1,000 gallon tank serving four people needs pumping every two
and a half to three years" beats "tanks should be pumped periodically". The CMS
field descriptions push clients toward this.

### No prices, deliberately

"How much does X cost" is one of the most common things people put to an
assistant, and pages carrying a real range do get quoted. This template still
does not publish prices, and that is a considered trade, not an oversight.

Publishing a number invites price shopping, which is the opposite of what a
contractor wants from a website whose job is to get the phone to ring. A range
wide enough to be safe reads as a guess, and the person who has to defend it is
standing in a driveway, not sitting at a keyboard. Almost nobody in the trade
does it, and the clients we sell to do not want it.

The queries are not lost entirely: a service FAQ can answer what moves a price
without naming one, which is the part people actually want and the part that
holds up when quoted. That costs nothing and commits to nothing.

What must never happen is putting a price in the HTML or the structured data
without showing it to visitors. Hidden text and markup for content a reader
cannot see are both explicit spam-policy violations, and Google and Bing both
called out serving crawlers a different version of a page in February 2026. It
is visible and honest, or it is absent. Here it is absent.

### Local detail per city — strong evidence on the risk

Google's March 2026 core update targeted scaled content abuse, and sites
publishing large numbers of near-identical city pages reported traffic drops of
50 to 80 percent. In May 2026 Google extended its spam policies to cover AI
Overviews and AI Mode explicitly. The penalty is usually quiet suppression
rather than a manual action, which makes it easy to miss.

Measured on this template's own build, two city pages with no local detail share
about 96.5% of their words: everything differs only by the city name and
whichever local review happens to be attached. That is the doorway pattern.

The `notes` field on each city ("Local detail") is the fix, and `pnpm pull`
prints a warning naming every city that has none. Fill it or unpublish the city.
Two or three honest sentences about how the crew covers that town is enough. Do
not invent civic facts on a client's behalf.

### Freshness — moderate evidence

`pnpm pull` records the newest CMS edit as `updatedAt` and emits it as
`dateModified`. Several independent analyses agree recently updated pages earn
more citations, though their specific multipliers differ enough not to repeat.
Multiple sources also warn that bumping a date without changing the content is
detectable and counterproductive, so this value is derived from real edits.

## What the template deliberately does not do

| Not built | Why |
| --- | --- |
| `llms.txt` | Ahrefs checked 137,000 domains: 97% of published files received zero requests in a month. Google has said it does not support it and has no plans to. |
| Author byline schema as an AI feature | Seer Interactive ran a real treatment-and-control test on 123 pages. Effect on Google AI Overview citations was statistically zero. Bing citations did roughly double, so it is not worthless, just not what it is sold as. |
| A separate markdown version for AI crawlers | Google and Bing both publicly called this cloaking in February 2026. |
| Review stars from our own schema | Google has excluded self-serving review markup from rich results since 2019. The aggregate rating we emit is entity data, and will never render as stars. |
| FAQ rich-result chasing | Google removed FAQ rich results from Search in 2026. The Q&A content still matters because the visible text is what gets quoted; the markup earns no snippet. |

## What the website cannot do

Roughly 86% of AI citations for local businesses trace to brand-controlled
sources, split about 44% the company's own site and 42% business listings. The
listings half is not in this repo. For home services specifically, Yelp leads by
a wide margin, with BBB and Angi behind it, and the engines differ: Google's AI
Mode and Perplexity lean on Yelp, while ChatGPT cites BBB more.

So per client, outside the site: consistent name, address and phone across
Google Business Profile, Bing Places, Apple Business Connect, Yelp, Angi, BBB
and Facebook, and steady review velocity rather than batches. The review-request
workflow already handles the Google half automatically.

## Honest expectations

AI referrals are around a fifth of a percent of all web traffic industry-wide.
Google Maps and the local pack still drive the overwhelming majority of leads
for a septic company. Cited brands churn 40 to 60 percent month to month, so
nobody can guarantee placement.

The reason to build this in anyway is that it costs almost nothing: the work
that improves AI visibility is the same work that improves ordinary local
search. It is not a separate service line, it is a reason not to lose.

## Per-client checklist

1. Fill **Local detail** on every published city, or unpublish the city.
2. Fill the **listing links** in Site settings: Google, Yelp, BBB, Facebook.
3. Fill **opening hours**, the **map pin** and **price range** in Site settings.
4. Put **real numbers that are not prices** in the service intros and FAQs:
   tank sizes, pumping intervals, response times, years in business. This is
   the one content lever with a peer-reviewed study behind it.
5. Register the site in **Bing Webmaster Tools**, not just Google Search
   Console. Bing feeds Copilot and ChatGPT leans on it.
6. Check **Cloudflare bot controls** on the client's zone after go-live.
7. Run `pnpm pull` and read the warnings. It names every gap above.
