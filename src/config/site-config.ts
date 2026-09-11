/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SITE CONFIG — Air Acquisition septic template
 * ───────────────────────────────────────────────────────────────────────────
 * Two layers:
 *
 *   1. `defaults` (this file) — the DEMO company, Coastal Septic Co. Every
 *      value is invented and exists so the template renders, and so the
 *      shape of the config is documented in one place.
 *
 *   2. `site-config.generated.json` — the client. Written by `pnpm pull`
 *      from the client's Sapt project (Branding + the CMS content types
 *      "1 · Site settings" through "8 · Copy & labels"). Gitignored.
 *
 * `siteConfig` is the merge of the two. Components import `siteConfig` and
 * never this file's defaults directly. To stand up a client you do not edit
 * this file: you fill in Sapt and run `pnpm pull`.
 *
 * Copy strings may contain placeholders, filled by `t()` in src/lib/copy.ts:
 * {company} {legalName} {tagline} {phone} {email} {address} {city} {state}
 * {county} {counties} {cities} {count} {rating} {service} {n}
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { deepMerge } from '@/lib/merge'
import generated from './site-config.generated.json'

export const defaults = {
  // ── Identity (Sapt: 1 · Site settings) ───────────────────────────────────
  companyName: 'Coastal Septic Co.',
  legalName: 'Coastal Septic Co. LLC',
  tagline: 'Septic pumping, repair & emergency service',
  phoneNumber: '(954) 555-0142', // DEMO, not a real number
  phoneHref: 'tel:+19545550142',
  email: 'dispatch@coastalseptic.example',
  address: { street: '1420 SW 12th Ave', city: 'Fort Lauderdale', state: 'FL', zip: '33315' },
  siteUrl: 'https://coastalseptic.example',
  theme: 'light' as 'light' | 'dark',

  // ── Brand (Sapt: Branding page → colors named "Primary" and "Emergency") ─
  // Two hex values. The full tint/shade scales are derived in layout.tsx.
  brand: {
    primary: '#E8631A', // buttons, accent words, highlights
    accent: '#C4392C', // emergency strip and badges only
  },

  // Dark surfaces used by the hero, the call band and the footer. Not brand.
  dark: { base: '#14161A', raised: '#1E2126', text: '#F4F5F7', textMuted: '#A8ADB6' },

  // ── Photos (Sapt: Branding logo, Assets, 2 · Photos) ─────────────────────
  // Focal values are CSS object-position: first number left/right, second up/down.
  photos: {
    logo: '/img/logo.png', // dark lockup, light backgrounds
    logoLight: '/img/logo-light.png', // light lockup, dark backgrounds
    hero: '/img/hero.webp',
    heroFocal: { desktop: '50% 50%', mobile: '32% 50%' },
    about: '/img/team.webp',
    aboutFocal: '50% 50%',
    cta: '/img/cta-phone.webp',
    ctaFocal: '40% 40%',
    coverageFocal: '75% 50%', // the coverage band reuses the hero photo
  },

  // ── Which pages exist (Sapt: 1 · Site settings → Pages) ──────────────────
  // Off = 404 + removed from nav, footer and sitemap. Service and city pages
  // come from their collections instead: unpublish an item to remove a page.
  pages: {
    services: true,
    serviceAreas: true,
    about: true,
    reviews: true,
    contact: true,
    privacy: true,
    terms: true,
  },

  // ── Hero ────────────────────────────────────────────────────────────────
  eyebrow: 'Your Local Septic Specialists',
  hero: {
    headline: 'Clean property.',
    headlineAccent: 'Septic done right.',
    subheadline:
      'Pumping, repairs and same-day emergency service across Broward and Palm Beach. Licensed, insured, and we answer the phone.',
    trustPoints: [
      'Same-day emergency callouts',
      'Licensed & insured',
      'Upfront pricing before we start',
      'Family run since 2008',
    ],
  },
  ctaText: 'Get a Free Quote',

  // ── Emergency strip above the nav ────────────────────────────────────────
  emergency: { enabled: true, label: 'Septic emergency?', ctaText: 'Call now' },

  // ── Text-us chat widget (Sapt: 1 · Site settings → Chat widget) ──────────
  // Looks like a chat, starts a text conversation. Off hides the launcher.
  chat: { enabled: true },

  // ── Services (Sapt: 3 · Services, one item per page) ─────────────────────
  services: [
    {
      icon: 'siren',
      title: 'Emergency Septic Service',
      description:
        'Backups, overflows and alarms. We answer after hours and dispatch the same day, because a failing system does not wait for business hours.',
      slug: 'emergency-septic-service',
      formOption: 'backup_emergency',
      intro:
        'A backup does not care what time it is. When sewage is coming up a drain or an alarm is going off, you need a truck moving now and a straight answer on what it will cost.',
      included: [
        'After-hours and weekend callouts',
        'Backup and overflow clearing',
        'Alarm diagnosis on aerobic systems',
        'Emergency pump-out to relieve the system',
        'Temporary fixes to get you through to a permanent repair',
      ],
      process: [
        { title: 'Call, day or night', body: 'Tell us what is happening: backup, overflow, alarm, smell. We ask two or three questions and dispatch.' },
        { title: 'Truck on the way', body: 'You get a text with an arrival window. On a backup the first job is getting the house usable again.' },
        { title: 'Relieve the system', body: 'Usually an emergency pump-out to stop the backup, plus clearing the inlet or outlet if that is what is blocked.' },
        { title: 'Find the cause', body: 'While the tank is open we check the baffles, filter, pump and drain field, so you know whether this was a one-off or a warning.' },
        { title: 'Written next step', body: 'If a repair is needed you get a written price on the spot. If nothing else is wrong, we log the date and text you before the next service is due.' },
      ],
      faqs: [
        { q: 'What counts as a septic emergency?', a: 'Sewage backing up into the house, effluent surfacing in the yard, a high-water alarm, or toilets that will not flush anywhere in the house. Any of those, call now. It gets worse, not better.' },
        { q: 'What should I do while I wait for the truck?', a: 'Stop running water: no laundry, dishwasher or showers. Keep people and pets away from any wet area in the yard. Do not open the tank lid yourself.' },
        { q: 'Will an emergency pump-out fix the problem for good?', a: 'It relieves the immediate backup. If the cause was a full tank, that is the fix. If a pump has failed or the drain field is saturated, pumping buys time, and we tell you what the permanent fix is before we leave.' },
        { q: 'Do you charge more after hours?', a: 'Ask on the call. Whatever the rate is, you hear it before the truck leaves and it does not change on site.' },
      ],
      image: '/img/svc-emergency.webp',
      focal: '40% 50%',
    },
    {
      icon: 'truck',
      title: 'Septic Tank Pumping',
      description:
        'Routine pump-outs for residential and commercial tanks. Most homes need this every three to five years, and we track yours so you never have to remember.',
      slug: 'septic-tank-pumping',
      formOption: 'pump_out',
      intro:
        'Routine pumping is the cheapest thing you will ever do for a septic system. Skip it and the solids reach the drain field, and that is a five-figure repair instead of a few hundred dollars.',
      included: [
        'Full tank pump-out, residential and commercial',
        'Baffle and lid inspection while the tank is open',
        'Solids and sludge level check',
        'Service date logged so we text you when the next one is due',
        'Riser installation if the lid is buried',
      ],
      process: [
        { title: 'Book by phone or form', body: 'Tell us the tank size if you know it and when it was last pumped. If you do not know, we find out on site.' },
        { title: 'Flat price by tank size', body: 'Pump-outs are quoted as a flat rate by tank size before we come. No hourly meter.' },
        { title: 'Locate and open the tank', body: 'We find the lid, uncover it, and note where it is for next time. If it is buried deep we can fit a riser so it never needs digging again.' },
        { title: 'Pump, inspect, close', body: 'Full pump-out, then a check of the baffles, filter and liquid level while the tank is open. Lid back on, yard put back.' },
        { title: 'Reminder before you are due', body: 'Service date logged. You get a text when the next pump-out is coming up, usually three to five years out.' },
      ],
      faqs: [
        { q: 'How often should my tank be pumped?', a: 'Every three to five years for most Florida households. A garbage disposal, a big family or a high water table push it toward three. We log the date and text you when you are due.' },
        { q: 'How long does a pump-out take?', a: 'Usually under an hour once the lid is exposed. Finding a buried lid adds time, which is why a riser pays for itself.' },
        { q: 'Do I need to be home?', a: 'Not if we can reach the tank and you have told us where it is. We text before we arrive and when we are done.' },
        { q: 'What if the tank has not been pumped in ten years?', a: 'We pump it, and we look hard at the drain field, because that is where the solids go when a tank is neglected. You get a straight answer on the field before we leave.' },
      ],
      image: '/img/svc-pumpout.webp',
      focal: '50% 40%',
    },
    {
      icon: 'clipboard-check',
      title: 'Inspections & Real Estate Certs',
      description:
        'Full system inspection with the documentation lenders and buyers require. Scheduled fast so your closing does not slip.',
      slug: 'septic-inspection',
      formOption: 'inspection',
      intro:
        'Lenders, buyers and county programs all want the same thing: proof the system works, in writing, fast. We schedule around your closing date and get the report out the same day we are there.',
      included: [
        'Real estate transaction inspections',
        'Written certification for lenders and buyers',
        'Tank, baffle and drain field condition report',
        'Locating a buried tank when there is no record of it',
        'Fast turnaround to protect a closing date',
      ],
      process: [
        { title: 'Tell us the closing date', body: 'We schedule around it. Most inspections are booked within a couple of days.' },
        { title: 'Locate and open', body: 'We find the tank and any distribution box. If there is no record of the system, we locate it.' },
        { title: 'Inspect and test', body: 'Tank condition, baffles, liquid level, pump and floats if there is a pump, and a load test on the drain field.' },
        { title: 'Written report, same day', body: 'The certification goes to you, and to the lender or agent if you want, the day we are on site.' },
        { title: 'Repairs, if anything fails', body: 'If something needs fixing to pass, you get a written price and we can usually do the work before closing.' },
      ],
      faqs: [
        { q: 'Does a Florida home sale require a septic inspection?', a: 'Not by state law, but most lenders and many buyers require one, and some county programs do. Ask your agent or lender what they want in writing, then send it to us.' },
        { q: 'How long does the inspection take?', a: 'Usually one to two hours on site. The report goes out the same day.' },
        { q: 'Does the tank get pumped during an inspection?', a: 'A proper inspection needs the tank pumped so the walls and baffles can be seen. We quote the inspection and the pump-out together so there is no surprise.' },
        { q: 'What happens if the system fails?', a: 'You get a written list of what failed and what fixing it costs. We do not fail systems to sell repairs, and you are welcome to get a second opinion on our report.' },
      ],
      image: '/img/svc-inspection.webp',
      focal: '35% 45%',
    },
    {
      icon: 'wrench',
      title: 'Repairs',
      description:
        'Pumps, floats, baffles, lids and lines. We diagnose the actual fault instead of quoting a replacement for a part that can be fixed.',
      slug: 'septic-repair',
      formOption: 'repair',
      intro:
        'Most septic problems are one failed part, not a failed system. We diagnose the actual fault and fix that, instead of quoting a full replacement for something a new pump or baffle would solve.',
      included: [
        'Effluent pump and float switch replacement',
        'Baffle repair and replacement',
        'Lid, riser and concrete slab repair',
        'Broken inlet and outlet line repair',
        'Aerobic system component repair',
      ],
      process: [
        { title: 'Describe the symptoms', body: 'Alarm, slow drains, a wet patch, a pump that will not run. The more you tell us, the faster the diagnosis.' },
        { title: 'Diagnose on site', body: 'We open the tank and test the actual parts: pump, floats, baffles, filter, lines. No guessing from the driveway.' },
        { title: 'Written price before we start', body: 'One number for the repair, in writing, before any part is replaced.' },
        { title: 'Fix it', body: 'Most component repairs are done the same visit. Common parts ride on the truck.' },
        { title: 'Test and log', body: 'We run the system to confirm the fix, put the lid back, and log the work so the next tech knows the history.' },
      ],
      faqs: [
        { q: 'Can my system be repaired, or does it have to be replaced?', a: 'Most problems are one failed part. Replacement is only on the table when the tank is structurally failed or the drain field is gone, and we tell you which it is before quoting.' },
        { q: 'Why is my septic alarm going off?', a: 'The high-water alarm means the pump chamber is not draining: a failed pump, a stuck float, a tripped breaker, or a saturated field. Check the breaker first, then call, and stop running water until we arrive.' },
        { q: 'Do you carry parts on the truck?', a: 'Common pumps, floats, baffles and filters, yes. Anything unusual is ordered and fitted on a second visit, with the price agreed first.' },
        { q: 'How do I know a repair is what I actually need?', a: 'You see what we found, with the tank open, before we quote. Get a second opinion if you want one.' },
      ],
      image: '/img/truck.webp',
      focal: '50% 55%',
    },
    {
      icon: 'layers',
      title: 'Drain Field Repair & Replacement',
      description:
        'Saturated or failing drain fields, restored where possible and replaced where it is not. Permitting handled end to end.',
      slug: 'drain-field-repair',
      formOption: 'new_system',
      intro:
        'A saturated drain field is the expensive end of septic work, so it is worth getting the diagnosis right. Some fields can be restored. Others have to be replaced, and we tell you which before any digging starts.',
      included: [
        'Drain field diagnosis and load testing',
        'Restoration where the field can be saved',
        'Full replacement with new gravel and lateral lines',
        'County permitting handled end to end',
        'Yard restored after the work',
      ],
      process: [
        { title: 'Diagnosis first', body: 'Wet ground, backups when it rains, or a failed inspection. We test the field before anyone talks about replacing it.' },
        { title: 'Restore or replace', body: 'Some fields can be restored. Others are done. You get a straight answer and a written price for whichever it is.' },
        { title: 'Permit with the county', body: 'Replacement needs a permit and a site evaluation. We handle both.' },
        { title: 'Build the new field', body: 'Old lines removed, new gravel and laterals set to the approved design, inspected before it is covered.' },
        { title: 'Backfill and restore the yard', body: 'Graded, backfilled and left ready for sod. Service date logged for the tank going forward.' },
      ],
      faqs: [
        { q: 'How do I know my drain field is failing?', a: 'Standing water or unusually green grass over the field, a sewage smell outside, backups after rain or heavy use, or a tank that fills up fast after pumping.' },
        { q: 'Can a drain field be saved?', a: 'Sometimes. A clogged distribution box, a crushed line, or a one-time push of solids from a neglected tank can often be put right. A field that has been saturated for years usually cannot.' },
        { q: 'How long does a replacement take?', a: 'Permitting is the slow part, often a few weeks with the county. The dig itself is usually a few days.' },
        { q: 'Will my yard be destroyed?', a: 'The field area gets dug up, there is no way around that. We keep the footprint to the approved design and leave it graded and ready for sod.' },
      ],
      image: '/img/svc-drainfield.webp',
      focal: '60% 55%',
    },
    {
      icon: 'hard-hat',
      title: 'New System Installation',
      description:
        'Full septic installs for new builds and total replacements, sized to your property and permitted with the county.',
      slug: 'septic-installation',
      formOption: 'new_system',
      intro:
        'New builds, total replacements and system upgrades, sized to the property and permitted with the county. One crew from the first site visit to the final inspection.',
      included: [
        'Site evaluation and soil assessment',
        'System sizing for the household or business',
        'Precast tank installation',
        'Drain field construction',
        'Permits, inspections and county sign-off',
      ],
      process: [
        { title: 'Site visit and soil evaluation', body: 'We look at the lot, the water table and where the house sits, and size the system to the bedrooms and the use.' },
        { title: 'Design and permit', body: 'A system design goes to the county for the permit. We handle the paperwork and the site evaluation.' },
        { title: 'Set the tank', body: 'Precast tank delivered and set by crane, connected to the house line, and checked for level and seal.' },
        { title: 'Build the drain field', body: 'Laterals and gravel to the approved design, then the county inspection before anything is covered.' },
        { title: 'Backfill, start-up and sign-off', body: 'Backfilled, graded and started up. You get the as-built paperwork and the county sign-off for your records.' },
      ],
      faqs: [
        { q: 'How long does a new septic install take?', a: 'Permitting is usually the longest part, often several weeks. The install itself is typically a few days plus the county inspection.' },
        { q: 'What size system do I need?', a: 'Sized by bedroom count and soil under the county rules, not by what is cheapest to put in. We size it right the first time.' },
        { q: 'Do you handle the permits?', a: 'Yes. Design, application, site evaluation and the final inspection.' },
        { q: 'Can I stay in the house during the install?', a: 'For a replacement, usually yes, with limited water use on the day the tank is switched over. We tell you exactly when.' },
      ],
      image: '/img/svc-install.webp',
      focal: '50% 55%',
    },
  ],

  // ── Service area (Sapt: 1 · Site settings + 4 · Cities) ──────────────────
  serviceArea: {
    headline: 'Serving Broward & Palm Beach',
    counties: ['Broward County', 'Palm Beach County'],
    cities: [
      { name: 'Fort Lauderdale', slug: 'fort-lauderdale', county: 'Broward County' },
      { name: 'Pompano Beach', slug: 'pompano-beach', county: 'Broward County' },
      { name: 'Coral Springs', slug: 'coral-springs', county: 'Broward County' },
      { name: 'Davie', slug: 'davie', county: 'Broward County' },
      { name: 'Plantation', slug: 'plantation', county: 'Broward County' },
      { name: 'Parkland', slug: 'parkland', county: 'Broward County' },
      { name: 'Boca Raton', slug: 'boca-raton', county: 'Palm Beach County' },
      { name: 'Delray Beach', slug: 'delray-beach', county: 'Palm Beach County' },
      { name: 'Boynton Beach', slug: 'boynton-beach', county: 'Palm Beach County' },
      { name: 'Wellington', slug: 'wellington', county: 'Palm Beach County' },
    ],
  },

  // ── Trust signals (Sapt: 1 · Site settings → Trust). Only true things. ───
  trust: {
    yearsInBusiness: 18,
    licenseNumber: 'DEMO-0000', // empty hides the badge
    licenseLabel: 'FL Septic Contractor License',
    googleRating: 4.8,
    googleReviewCount: 127, // 0 hides every rating block
    googleReviewUrl: '',
    insured: true,
    emergencyAvailable: true,
  },

  // ── About ────────────────────────────────────────────────────────────────
  about: {
    headline: 'Local, licensed, and actually reachable',
    body:
      'We have pumped, repaired and replaced septic systems across South Florida for nearly two decades. Family run, fully licensed, and small enough that the person who answers the phone is the person who shows up at your property.',
    points: [
      'Straight pricing quoted before we start work',
      'Same crew every visit, so nothing gets lost between jobs',
      'We tell you when a system can be repaired instead of replaced',
    ],
  },

  // ── General process steps (Sapt: 6 · Process steps). Services carry their own. ─
  process: [
    { title: 'Call or send the form', body: 'Tell us what the system is doing. We ask the few questions that decide which truck and crew to send.' },
    { title: 'Know the price before work starts', body: 'Pump-outs are a flat rate by tank size, quoted on the phone. Repairs and installs get a look on site first, then a written number. Nothing starts until you have said yes to it.' },
    { title: 'Locate, open and inspect', body: 'We find the tank, uncover the lid, and check baffles, sludge levels and the drain field while it is open. If we spot a problem, you hear about it before we close it up.' },
    { title: 'Do the work, leave it clean', body: 'Licensed crew, the right equipment, and the yard put back the way we found it.' },
    { title: 'You know when you are due', body: 'We log the service date and text you before the next one is due, so routine service never turns into an emergency.' },
  ],

  // ── General FAQs (Sapt: 5 · FAQs). Services carry their own. ─────────────
  faqs: [
    { q: 'How often does a septic tank need pumping?', a: 'Most Florida households need a pump-out every three to five years. High water tables, a big family, or a garbage disposal push it toward three. We record your last service date and tell you when the next one is due.' },
    { q: 'What are the warning signs my system is failing?', a: 'Slow drains across the whole house, gurgling toilets, a sewage smell in the yard, or grass that is unusually green and wet over the drain field. Any of those means call now rather than next month.' },
    { q: 'How much does a septic pump-out cost?', a: 'It depends on tank size, access, and how long it has been. We quote before we come out, and we do not change the number once we are on site unless we find something and tell you first.' },
    { q: 'Do you handle emergencies after hours?', a: 'Yes. Backups and overflows do not wait for business hours, and neither do we. Call the number on this page and you will reach someone.' },
    { q: 'Can you find my tank if I do not know where it is?', a: 'Yes. Plenty of older properties have a buried lid with no record of it. We locate it, and if it makes sense we fit a riser so it never has to be dug up again.' },
    { q: 'Do you provide inspections for a home sale?', a: 'Yes, including the written documentation lenders and buyers ask for. We schedule these quickly because they usually sit on a closing date.' },
  ],

  // ── Reviews (Sapt: 7 · Reviews). DEMO, invented. Never ship invented reviews. ─
  reviews: [
    { name: 'Marisol R.', city: 'Plantation', service: 'Emergency pump-out', rating: 5, date: 'August 2026', text: 'Called at nine at night with the downstairs bathroom backing up. Someone actually answered and a truck was here before eleven. Priced exactly what they said on the phone.' },
    { name: 'Dave K.', city: 'Coral Springs', service: 'Drain field replacement', rating: 5, date: 'June 2026', text: 'Two other companies told me I needed a whole new system. These guys checked properly and replaced the field only. Saved me thousands and pulled the permits themselves.' },
    { name: 'Angela T.', city: 'Pompano Beach', service: 'Real estate inspection', rating: 5, date: 'May 2026', text: 'Needed a septic cert on a tight closing date. Booked me in two days and had the paperwork to my lender the same afternoon.' },
  ],

  // ── Every fixed string on the site (Sapt: 8 · Copy & labels) ─────────────
  copy: {
    nav: { home: 'Home', services: 'Services', areas: 'Areas We Serve', about: 'About', reviews: 'Reviews', contact: 'Contact', viewAll: 'View all services', call: 'Call' },
    stickyBar: { call: 'Call now', quote: 'Get a quote' },
    chatWidget: {
      openLabel: 'Text us',
      title: 'Let us know if you have any questions',
      greeting: "This text goes straight to my personal phone. I'll make sure to get back to you the second I'm free.",
      nameLabel: 'Your name',
      namePlaceholder: 'First and last name',
      phoneLabel: 'Mobile number',
      phonePlaceholder: '(954) 555-0142',
      messageLabel: 'How can we help?',
      messagePlaceholder: 'e.g. Toilets are backing up in Davie, can you come today?',
      consent: 'By sending you agree to receive text messages from us about your request. Message rates may apply. Reply STOP to opt out.',
      send: 'Send',
      sending: 'Sending',
      thanksTitle: 'Thank you!',
      thanksBody: "Thanks for texting, {name}. I'll text you back at {mobile} as soon as I have a free second.",
      errorMissing: 'Add your name and a mobile number so we can text you back.',
      errorSend: "That didn't send. Call {phone} and we'll take it from there.",
    },
    quoteForm: {
      heading: 'Get a free quote',
      subline: 'Takes 30 seconds. We reply by text, usually within minutes.',
      nameLabel: 'Full name',
      namePlaceholder: 'John Smith',
      phoneLabel: 'Phone',
      serviceLabel: 'What do you need',
      servicePlaceholder: 'Choose one',
      messageLabel: 'Short message about your needs',
      messagePlaceholder: 'e.g. Downstairs bathroom backing up, 123 Main St, Davie',
      consent: 'By providing my number I agree to receive text messages about my request, as described in the',
      consentLink: 'privacy policy',
      consentSuffix: '. Message rates may apply, reply STOP any time.',
      submit: 'Send request',
      sending: 'Sending',
      successTitle: 'Request received',
      successBody: "Check your phone. We'll text you shortly to confirm the details and get you scheduled.",
      successCall: 'Need us sooner? Call now',
      errorMissing: 'Add your name and a phone number so we can reach you.',
      errorSend: "That didn't send. Call {phone} and we'll take it over the phone.",
      // Values are the CRM lead field and must stay. Labels are free.
      serviceOptions: [
        { value: 'backup_emergency', label: 'Backup or overflow (emergency)' },
        { value: 'pump_out', label: 'Routine pump-out' },
        { value: 'inspection', label: 'Inspection / real estate cert' },
        { value: 'repair', label: 'Repair' },
        { value: 'new_system', label: 'New system or drain field' },
        { value: 'unsure', label: 'Not sure — need someone to look' },
      ],
    },
    servicesSection: {
      eyebrow: 'What we do',
      title: 'Professional',
      accent: 'septic services',
      intro: 'Residential and commercial work across {counties}. Same crew, upfront pricing, and a straight answer on what your system actually needs.',
      emergencyBadge: '24/7 Emergency',
      callNow: 'Call now',
      learnMore: 'Learn more',
    },
    aboutSection: { eyebrow: "Who you're calling", title: 'Why homeowners call', yearsLabel: 'Years in South Florida', googleReviews: 'Google reviews', insured: 'Licensed & insured' },
    reviewsSection: {
      eyebrow: 'Reviews', title: 'What neighbours', accent: 'actually say',
      rated: 'Rated {rating} across {count} Google reviews.', basedOn: 'Based on {count} reviews', readAll: 'See all on Google',
      googleReviews: 'Google reviews', postedOn: 'Posted on Google', localTitle: 'From a neighbour in',
    },
    coverage: { eyebrow: 'Service area', title: 'Serving', intro: '{count} cities, same-day service across {counties}. Tap your city for what we do there.', allAreas: 'All areas we serve' },
    ctaBand: {
      eyebrow: 'Talk to a real person',
      title: 'Need it sorted',
      accent: 'today?',
      body: "Call and you'll get someone who works on these systems, not a call centre. We'll tell you what it likely is and what it costs before we come out.",
      callLabel: 'Call now',
      quoteLabel: 'Or get a free quote',
      badge: 'Emergency service 24/7',
      serving: 'Serving',
    },
    process: { eyebrow: 'How it works', title: 'Simple', accent: '{n}-step process', intro: 'No surprises at any stage. Here is exactly what happens from the first call to the next reminder.' },
    faq: { eyebrow: 'FAQ', heading: 'Common questions' },
    footer: {
      servicesHeading: 'Services', companyHeading: 'Company', contactHeading: 'Contact',
      allServices: 'All services', areas: 'Areas we serve', about: 'About us', reviews: 'Reviews', contact: 'Contact',
      serving: 'Serving {counties}.', emergency: 'Emergency service 24/7.', rights: 'All rights reserved.',
      privacy: 'Privacy', terms: 'Terms', licensedInsured: 'Licensed & insured',
    },
    homePage: {
      metaTitle: '{company} | {tagline}',
      metaDescription: '{tagline} in {city} and across {counties}. Licensed, insured, same-day emergency service.',
      keywords: ['septic pumping', 'septic tank service', 'emergency septic', 'drain field repair', 'septic inspection'],
    },
    servicesPage: {
      title: 'Everything a septic system needs',
      intro: 'From a routine pump-out to a full system replacement, one licensed crew across {counties}.',
      metaTitle: 'Septic Services in {counties} | {company}',
      metaDescription: 'Emergency service, pumping, inspections, repairs, drain fields and new installs across {counties}. Licensed, insured, upfront pricing.',
    },
    serviceAreasPage: {
      intro: 'If you are in one of the cities below, we can usually be there the same day. If you are just outside it, call anyway.',
      citiesTitle: 'Cities we',
      citiesAccent: 'serve',
      metaTitle: 'Areas We Serve — {counties} | {company}',
      metaDescription: 'Septic pumping, repair and emergency service across {cities}.',
    },
    cityPage: {
      eyebrow: 'Serving {county}',
      title: 'Septic service in {city}',
      intro: 'Pumping, repairs and same-day emergency callouts for homes and businesses in {city}. We answer the phone, quote before we come, and track when you are next due.',
      servicesTitle: 'Septic services in',
      servicesIntro: 'Everything below is available in {city} and the rest of {county}, with the same crew and the same upfront pricing.',
      nearbyEyebrow: 'Nearby',
      nearbyTitle: 'Also serving',
      faqHeading: 'Common questions',
      metaTitle: 'Septic Pumping & Repair in {city}, {state} | {company}',
      metaDescription: 'Same-day septic service in {city}. Pumping, emergency callouts, inspections, drain field repair and new installs. Licensed and insured, {county}.',
    },
    servicePage: {
      includedLabel: "What's included",
      questionsCta: 'Questions? {phone}',
      processIntro: 'What happens from the first call to the follow-up, step by step.',
      faqHeading: 'Questions about {service}',
      relatedEyebrow: 'Other services',
      relatedTitle: 'Also',
      relatedAccent: 'available',
      metaTitle: '{service} in {city} & {counties} | {company}',
    },
    aboutPage: { eyebrow: 'About', metaTitle: 'About {company} | Licensed Septic Contractor, {city} {state}' },
    reviewsPage: {
      eyebrow: 'Reviews',
      title: "What customers say when we're not in the room",
      intro: "Every review here is from a real job. The link below goes to our Google profile where you can read all of them, including the ones we'd rather you didn't.",
      readOnGoogle: 'Read them all on Google',
      average: 'average across {count} Google reviews',
      metaTitle: 'Reviews | {company}',
    },
    contactPage: {
      eyebrow: 'Contact',
      title: 'Call, text, or send the form',
      intro: "Fastest is the phone. If it's after hours or you'd rather write it down, the form goes straight to our dispatch phone and we text you back.",
      callLabel: 'Call or text', emailLabel: 'Email', basedLabel: 'Based in', hoursLabel: 'Hours',
      hours: 'Emergency service 24/7', officeHours: 'Office hours Mon–Sat, 7am–6pm',
      formHeading: 'Send us the details',
      metaTitle: 'Contact {company} | Call or Request a Quote',
      metaDescription: 'Call {phone} or send the form. Same-day septic service across {counties}.',
    },
    privacyPage: {
      title: 'Privacy policy',
      lastUpdated: 'Last updated: September 2026',
      body: '<h2>Who we are</h2><p>{legalName}, trading as {company}, {address}. You can reach us at {phone} or {email}.</p><h2>What we collect</h2><p>When you call, text, or send a form on this site we collect your name, phone number, service address, and whatever you tell us about the problem. If you become a customer we keep a record of the work done and when it was done, so we can tell you when your next service is due.</p><h2>How we use it</h2><ul><li>To respond to your request and schedule the work</li><li>To send you service updates, appointment confirmations and reminders</li><li>To ask for a review after a job is complete</li><li>To tell you when your system is due for routine service</li></ul><h2>Text messages</h2><p>By providing your phone number and ticking the consent box on our form, you agree to receive text messages from us about your service request. Message frequency varies. Message and data rates may apply. Reply STOP to any message to opt out at any time, or HELP for help. We never sell or share your phone number with third parties for their marketing.</p><h2>Who we share it with</h2><p>Only the services we use to run the business: our customer management system, our messaging provider, and our payment processor. Each is bound to use your data only to provide their service to us. We do not sell your information.</p><h2>Your choices</h2><p>You can ask us to correct or delete your information at any time by contacting us using the details above. You can stop text messages by replying STOP.</p><h2>Cookies and analytics</h2><p>This site uses first-party analytics to understand how it is used. We do not use third-party advertising cookies without your consent.</p>',
    },
    termsPage: {
      title: 'Terms of service',
      lastUpdated: 'Last updated: September 2026',
      body: '<h2>Who these terms cover</h2><p>These terms apply to services provided by {legalName}, trading as {company}, {city}, {state}. By booking work with us you agree to them.</p><h2>Quotes and pricing</h2><p>We quote before we start. If we find something on site that changes the scope, we stop and tell you before continuing. You are never charged for work you did not approve.</p><h2>Scheduling and access</h2><p>You agree to provide safe access to the septic system and to let us know about anything on the property we should be aware of, including pets, buried utilities, and sprinkler lines.</p><h2>Payment</h2><p>Payment is due on completion unless otherwise agreed in writing. We accept card, check, and bank transfer.</p><h2>Workmanship</h2><p>We stand behind our work. If something we did fails because of how we did it, contact us and we will make it right. This does not cover failures caused by misuse, ground conditions, or systems beyond their service life.</p><h2>Limitation of liability</h2><p>Our liability for any claim relating to our services is limited to the amount you paid for the specific service in question.</p><h2>Contact</h2><p>Questions about these terms: {phone}.</p>',
    },
    notFound: { eyebrow: 'Page not found', title: "That page isn't here", body: 'The link may be old or the page may have been removed. The home page has everything we do.', cta: 'Back to home' },
  },

  // ── Sapt wiring: environment, never the CMS ──────────────────────────────
  saptProjectId: '',
  saptBaseUrl: 'https://api.sapt.ai',
}

export type SiteConfig = typeof defaults
export type Service = SiteConfig['services'][number]
export type City = SiteConfig['serviceArea']['cities'][number]

const merged = deepMerge(defaults, generated)

export const siteConfig: SiteConfig = {
  ...merged,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || merged.siteUrl,
  saptProjectId: process.env.NEXT_PUBLIC_SAPT_PROJECT_ID || '',
  saptBaseUrl: process.env.NEXT_PUBLIC_SAPT_BASE_URL || 'https://api.sapt.ai',
}
