import { describe, expect, it } from 'vitest'
import { fillAddressFromZip, lookupZip } from './zip-lookup.mjs'

describe('zip lookup', () => {
  it('resolves a real ZIP to its town and state', () => {
    expect(lookupZip('48823')).toEqual({ city: 'East Lansing', state: 'MI' })
    expect(lookupZip('33904')).toEqual({ city: 'Cape Coral', state: 'FL' })
  })

  it('shrugs at nonsense instead of throwing', () => {
    expect(lookupZip('')).toBeNull()
    expect(lookupZip('abc')).toBeNull()
    expect(lookupZip('00000')).toBeNull()
    expect(lookupZip(undefined)).toBeNull()
  })

  it('fills only what is missing and says what it did', () => {
    const { data, note } = fillAddressFromZip({ address_zip: '48823' })
    expect(data.address_city).toBe('East Lansing')
    expect(data.address_state).toBe('MI')
    expect(note).toContain('48823')
  })

  it('never overwrites what the client actually told us', () => {
    const { data, note } = fillAddressFromZip({ address_zip: '48823', address_city: 'Okemos', address_state: 'MI' })
    expect(data.address_city).toBe('Okemos')
    expect(note).toBe('')
  })
})
