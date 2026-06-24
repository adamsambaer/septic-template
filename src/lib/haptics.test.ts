import { describe, expect, it } from 'vitest'
import { haptic } from './haptics'

describe('haptic', () => {
  it('never throws in a non-browser environment (no navigator.vibrate)', () => {
    expect(() => haptic()).not.toThrow()
    expect(() => haptic('success')).not.toThrow()
  })
})
