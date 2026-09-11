import { describe, expect, it } from 'vitest'
import { MARKER, needsRebind, rebindActions } from './rebind.mjs'

const src = [
  { kind: 'http', method: 'POST', url: 'https://api.telnyx.com/v2/messages', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer {{credentials.telnyx_api_key}}' }, body: { kind: 'json', template: '{"from":"{{from_number}}","to":"{{owner_mobile}}","text":"New lead {{record.full_name}}"}' } },
  { kind: 'delay', minutes: 5 },
  { kind: 'http', method: 'POST', url: 'https://api.telnyx.com/v2/messages', body: { kind: 'json', template: '{"from":"{{from_number}}","to":"{{record.phone}}","text":"Thanks"}' } },
]
const dst = [
  { kind: 'http', method: 'POST', url: `${MARKER}actions[0].http.url`, headers: { 'Content-Type': 'application/json', Authorization: `${MARKER}actions[0].http.headers.Authorization` }, body: { kind: 'json', template: `${MARKER}actions[0].http.body.template` } },
  { kind: 'delay', minutes: 5 },
  { kind: 'http', method: 'POST', url: `${MARKER}actions[2].http.url`, body: { kind: 'json', template: `${MARKER}actions[2].http.body.template` } },
]

describe('rebindActions', () => {
  it('copies url, headers and body by action index, filling template variables', () => {
    const { actions, bound, unresolved } = rebindActions(dst, src, { owner_mobile: '+12395550110', from_number: '+12395550199' })
    expect(actions[0].url).toBe('https://api.telnyx.com/v2/messages')
    expect(actions[0].headers.Authorization).toBe('Bearer {{credentials.telnyx_api_key}}') // credential refs stay refs
    expect(actions[0].body.template).toBe('{"from":"+12395550199","to":"+12395550110","text":"New lead {{record.full_name}}"}')
    expect(actions[2].body.template).toBe('{"from":"+12395550199","to":"{{record.phone}}","text":"Thanks"}')
    expect(actions[1]).toEqual({ kind: 'delay', minutes: 5 })
    expect(bound).toHaveLength(5)
    expect(unresolved).toEqual([])
    expect(needsRebind(actions)).toBe(false)
  })
  it('leaves unknown variables as placeholders so they stay visible', () => {
    const { actions } = rebindActions(dst, src, {})
    expect(actions[0].body.template).toContain('{{owner_mobile}}')
    expect(actions[0].body.template).toContain('{{from_number}}')
  })
  it('reports markers it cannot resolve and leaves them in place', () => {
    const { actions, unresolved } = rebindActions(dst, [src[0]], {})
    expect(unresolved).toEqual(['actions[2].http.url', 'actions[2].http.body.template'])
    expect(actions[2].url).toBe(`${MARKER}actions[2].http.url`)
    expect(needsRebind(actions)).toBe(true)
  })
  it('does not mutate its inputs', () => {
    rebindActions(dst, src, { owner_mobile: 'x' })
    expect(dst[0].url).toBe(`${MARKER}actions[0].http.url`)
    expect(src[0].body.template).toContain('{{owner_mobile}}')
  })
})
