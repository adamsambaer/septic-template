import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

// The browser loads this as a plain script; here we evaluate it against a fake
// global so the page and the tests share one copy of the logic.
let AirLogo
beforeAll(() => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const src = fs.readFileSync(path.join(here, 'logo.js'), 'utf8')
  const scope = {}
  new Function('window', src).call(scope, scope)
  AirLogo = scope.AirLogo
})

/** Build an ImageData-shaped object from a paint callback. */
function img(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = paint(x, y) ?? [0, 0, 0, 0]
      const i = (y * w + x) * 4
      data[i] = px[0]; data[i + 1] = px[1]; data[i + 2] = px[2]; data[i + 3] = px[3]
    }
  }
  return { width: w, height: h, data }
}

const WHITE = [255, 255, 255, 255]
const BLACK = [20, 20, 20, 255]
const CLEAR = [0, 0, 0, 0]
const inBox = (x, y, b) => x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3]

describe('the social-post logo everyone actually uploads', () => {
  // 100x100 opaque white, dark mark 30 wide sitting in the middle.
  const square = () => img(100, 100, (x, y) => (inBox(x, y, [35, 45, 30, 12]) ? BLACK : WHITE))

  it('sees the opaque white ground', () => {
    expect(AirLogo.analyse(square()).background).toBe('solid')
    expect(AirLogo.analyse(square()).backgroundColor).toBe('#FFFFFF')
  })

  it('crops to the mark instead of keeping the padding', () => {
    expect(AirLogo.analyse(square()).trim).toEqual({ x: 35, y: 45, w: 30, h: 12 })
  })

  it('calls the mark dark, which is what decides the knockout direction', () => {
    expect(AirLogo.analyse(square()).ink).toBe('dark')
  })

  it('erases the white ground so it works on a dark header', () => {
    const d = square()
    expect(AirLogo.keyOut(d)).toBe(true)
    expect(d.data[3]).toBe(0)                                  // corner is now clear
    const mark = (45 * 100 + 40) * 4
    expect(d.data[mark + 3]).toBe(255)                          // mark survives
  })
})

describe('a real transparent lockup', () => {
  const lockup = () => img(80, 40, (x, y) => (inBox(x, y, [10, 12, 60, 16]) ? BLACK : CLEAR))

  it('is left alone', () => {
    const a = AirLogo.analyse(lockup())
    expect(a.background).toBe('transparent')
    expect(a.ink).toBe('dark')
    expect(a.trim).toEqual({ x: 10, y: 12, w: 60, h: 16 })
    expect(AirLogo.keyOut(lockup())).toBe(false)
  })
})

describe('a white mark meant for dark backgrounds', () => {
  const white = () => img(80, 40, (x, y) => (inBox(x, y, [10, 12, 60, 16]) ? WHITE : CLEAR))

  it('is called light, so it gets knocked out the other way', () => {
    expect(AirLogo.analyse(white()).ink).toBe('light')
  })
})

describe('colour', () => {
  it('pulls the brand colour out of the mark', () => {
    const blue = [23, 85, 122, 255]
    const d = img(60, 60, (x, y) => (inBox(x, y, [10, 10, 40, 40]) ? blue : WHITE))
    expect(AirLogo.analyse(d).brand).toBe('#1755 7A'.replace(' ', ''))
  })

  it('says nothing rather than guessing from a black and white mark', () => {
    const d = img(60, 60, (x, y) => (inBox(x, y, [10, 10, 40, 40]) ? BLACK : WHITE))
    expect(AirLogo.analyse(d).brand).toBe('')
  })

  it('will not key out a deliberate coloured panel', () => {
    const d = img(60, 60, (x, y) => (inBox(x, y, [20, 20, 20, 20]) ? WHITE : [23, 85, 122, 255]))
    expect(AirLogo.keyOut(d)).toBe(false)
  })
})

describe('a photo, which has no uniform ground at all', () => {
  it('is not trimmed or keyed', () => {
    const noise = img(60, 60, (x, y) => [(x * 7) % 256, (y * 11) % 256, (x * y) % 256, 255])
    const a = AirLogo.analyse(noise)
    expect(a.background).toBe('none')
    expect(AirLogo.keyOut(noise)).toBe(false)
  })
})
