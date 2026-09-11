import { describe, expect, it } from 'vitest'
import { residue, stripAgency, tokenizeBundle, variableDeclarations } from './template-tokens.mjs'

const bundle = {
  branding: { colors: [{ name: 'Primary', hex: '#e8631a' }, { name: 'Emergency', hex: '#C4392C' }], tagline: 'Coastal Septic Co. since 2009' },
  starterContent: {
    enabled: true,
    items: [
      { contentTypeSlug: 'site-settings', slug: 'default', publishedAt: '2026-09-10T22:39:05.557Z', content: { legalName: 'Coastal Septic Co. LLC', companyName: 'Coastal Septic Co.', phone: '(954) 555-0142', phoneE164: '+19545550142', zip: '33315', note: 'Suite 333150 is not a zip' } },
    ],
  },
  workflows: [
    { name: 'New lead → text the owner', tags: [], steps: [{ body: 'New lead for Coastal Septic Co. Call {{lead.phone}}' }] },
    { name: 'Onboarding submitted → text Adam', tags: ['agency-ops'] },
  ],
  objectTypes: [{ slug: 'lead' }, { slug: 'client_onboarding' }],
  objectRelations: [{ from: 'lead', to: 'customer' }, { from: 'client_onboarding', to: 'person' }],
  sidebar: { sections: [{ title: 'Leads', items: [{ objectTypeSlug: 'lead' }] }, { title: 'Onboarding', items: [{ objectTypeSlug: 'client_onboarding' }] }] },
}

describe('tokenizeBundle', () => {
  const { bundle: out, hits } = tokenizeBundle(structuredClone(bundle))
  const s = out.starterContent.items[0].content

  it('replaces every demo literal, longest first, in string values only', () => {
    expect(s.legalName).toBe('{{legalName}}')
    expect(s.companyName).toBe('{{companyName}}')
    expect(s.phone).toBe('{{phone}}')
    expect(s.phoneE164).toBe('{{phoneE164}}')
    expect(out.workflows[0].steps[0].body).toBe('New lead for {{companyName}} Call {{lead.phone}}')
    expect(Object.keys(s)).toEqual(Object.keys(bundle.starterContent.items[0].content))
  })
  it('matches hex colors case-insensitively and ZIPs only as whole numbers', () => {
    expect(out.branding.colors[0].hex).toBe('{{primaryHex}}')
    expect(out.branding.colors[1].hex).toBe('{{accentHex}}')
    expect(s.zip).toBe('{{zip}}')
    expect(s.note).toBe('Suite 333150 is not a zip')
  })
  it('leaves dates and non-strings alone and counts hits', () => {
    expect(out.starterContent.items[0].publishedAt).toBe('2026-09-10T22:39:05.557Z')
    expect(out.starterContent.enabled).toBe(true)
    expect(hits.companyName).toBe(3) // tagline, settings, workflow body
    expect(hits.legalName).toBe(1)
  })
  it('does not mutate its input', () => {
    expect(bundle.starterContent.items[0].content.companyName).toBe('Coastal Septic Co.')
  })
})

describe('stripAgency', () => {
  const b = structuredClone(bundle)
  const removed = stripAgency(b)
  it('drops the intake type, its relations, its sidebar section and agency-ops workflows', () => {
    expect(b.objectTypes.map((t) => t.slug)).toEqual(['lead'])
    expect(b.objectRelations).toHaveLength(1)
    expect(b.sidebar.sections.map((x) => x.title)).toEqual(['Leads'])
    expect(b.workflows.map((w) => w.name)).toEqual(['New lead → text the owner'])
    expect(removed).toHaveLength(4)
  })
})

describe('residue', () => {
  it('reports leftover demo strings with a path, and nothing once tokenized', () => {
    expect(residue(bundle).map((r) => r.path)).toContain('branding.tagline')
    expect(residue(tokenizeBundle(bundle).bundle)).toEqual([])
  })
})

describe('variableDeclarations', () => {
  it('declares every token once plus the extras, all strings', () => {
    const names = variableDeclarations().map((v) => v.name)
    expect(names).toEqual(['legalName', 'companyName', 'phone', 'phoneE164', 'email', 'siteUrl', 'street', 'zip', 'primaryHex', 'accentHex', 'owner_mobile', 'from_number', 'google_review_url'])
    expect(variableDeclarations().every((v) => v.type === 'string')).toBe(true)
    expect(variableDeclarations().find((v) => v.name === 'companyName').required).toBe(true)
  })
})
