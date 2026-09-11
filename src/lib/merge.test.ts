import { describe, expect, it } from 'vitest'
import { deepMerge, fill } from './merge'

describe('deepMerge', () => {
  it('merges nested objects and replaces arrays', () => {
    const base = { a: 1, nested: { x: 1, y: 2 }, list: [1, 2, 3] }
    const out = deepMerge(base, { nested: { y: 9 }, list: [7] })
    expect(out).toEqual({ a: 1, nested: { x: 1, y: 9 }, list: [7] })
  })

  it('skips null and undefined so a blank CMS field keeps the default', () => {
    const out = deepMerge({ a: 'keep', b: 'keep' }, { a: null, b: undefined })
    expect(out).toEqual({ a: 'keep', b: 'keep' })
  })

  it('lets an empty string or false win', () => {
    const out = deepMerge({ a: 'demo', b: true }, { a: '', b: false })
    expect(out).toEqual({ a: '', b: false })
  })

  it('returns the base untouched for an empty patch', () => {
    const base = { a: 1 }
    expect(deepMerge(base, {})).toEqual(base)
  })
})

describe('fill', () => {
  it('replaces known placeholders and leaves unknown ones visible', () => {
    expect(fill('Call {phone} in {city}, {nope}', { phone: '555', city: 'Davie' })).toBe(
      'Call 555 in Davie, {nope}'
    )
  })
})
