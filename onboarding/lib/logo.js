/**
 * Make a usable lockup out of whatever a contractor uploads.
 *
 * What actually arrives is not a logo file. It is a 1080x1080 social post with
 * an opaque white background and the mark floating in the middle at a third of
 * the width, or a screenshot, or a business card export. Dropped into a header
 * that expects a wide transparent lockup, that renders as a white box.
 *
 * So the picture is measured before it is sent: find the uniform background if
 * there is one, key it out, crop to the mark, and work out whether the mark is
 * light or dark so the dark surfaces know which way to knock it out. Also pull
 * the strongest colour out of it, which is a better first guess at their brand
 * colour than the template's orange.
 *
 * Every function here is pure and takes an ImageData-shaped object, so the same
 * code runs in the browser and under test in node.
 */
(function (root) {
  'use strict'

  var EDGE_TOL = 38        // how far a pixel may sit from the background colour
  var ALPHA_INK = 32       // below this a pixel is not there at all
  var UNIFORM = 0.86       // share of border pixels that must agree on a colour

  function lum(r, g, b) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 }
  function dist(r, g, b, c) { return Math.max(Math.abs(r - c[0]), Math.abs(g - c[1]), Math.abs(b - c[2])) }
  function hex(r, g, b) {
    return '#' + [r, g, b].map(function (n) {
      var s = Math.max(0, Math.min(255, Math.round(n))).toString(16)
      return s.length === 1 ? '0' + s : s
    }).join('').toUpperCase()
  }

  /** Walk the one-pixel frame around the image. */
  function borderPixels(img, fn) {
    var w = img.width, h = img.height, d = img.data
    for (var x = 0; x < w; x++) { fn(d, (x) * 4); fn(d, ((h - 1) * w + x) * 4) }
    for (var y = 1; y < h - 1; y++) { fn(d, (y * w) * 4); fn(d, (y * w + w - 1) * 4) }
  }

  /**
   * @returns {{ kind: 'transparent'|'solid'|'none', color: number[]|null }}
   */
  function background(img) {
    var clear = 0, total = 0, buckets = {}
    borderPixels(img, function (d, i) {
      total++
      if (d[i + 3] < ALPHA_INK) { clear++; return }
      // Coarse buckets so near-identical whites count as the same colour.
      var k = (d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3)
      var b = buckets[k] || (buckets[k] = { n: 0, r: 0, g: 0, b: 0 })
      b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]
    })
    if (!total) return { kind: 'none', color: null }
    if (clear / total >= UNIFORM) return { kind: 'transparent', color: null }
    var best = null
    for (var k in buckets) if (!best || buckets[k].n > best.n) best = buckets[k]
    if (!best || best.n / total < UNIFORM) return { kind: 'none', color: null }
    return { kind: 'solid', color: [best.r / best.n, best.g / best.n, best.b / best.n] }
  }

  /** True when the pixel at offset i is part of the mark rather than the ground. */
  function isInk(d, i, bg) {
    if (d[i + 3] < ALPHA_INK) return false
    if (bg.kind === 'solid') return dist(d[i], d[i + 1], d[i + 2], bg.color) > EDGE_TOL
    return true
  }

  /**
   * Measure an ImageData-shaped object.
   * @returns {{ background: string, trim: {x,y,w,h}|null, ink: 'dark'|'light'|'mixed',
   *             brand: string, inkRatio: number }}
   */
  function analyse(img) {
    var bg = background(img)
    var w = img.width, h = img.height, d = img.data
    var minX = w, minY = h, maxX = -1, maxY = -1, n = 0, lsum = 0
    var hues = {}

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4
        if (!isInk(d, i, bg)) continue
        n++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        var r = d[i], g = d[i + 1], b = d[i + 2]
        lsum += lum(r, g, b)
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b)
        var sat = mx === 0 ? 0 : (mx - mn) / mx
        var L = lum(r, g, b)
        if (sat > 0.28 && L > 0.12 && L < 0.9) {
          var key = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4)
          var e = hues[key] || (hues[key] = { n: 0, r: 0, g: 0, b: 0 })
          e.n++; e.r += r; e.g += g; e.b += b
        }
      }
    }

    if (maxX < 0) return { background: bg.kind, trim: null, ink: 'mixed', brand: '', inkRatio: 0 }

    var meanL = lsum / n
    // "mixed" means no single tone dominates, so flipping it to a silhouette
    // would destroy it. Only a genuinely one-tone mark gets knocked out.
    var lightish = 0, darkish = 0
    for (var y2 = minY; y2 <= maxY; y2++) {
      for (var x2 = minX; x2 <= maxX; x2++) {
        var j = (y2 * w + x2) * 4
        if (!isInk(d, j, bg)) continue
        if (lum(d[j], d[j + 1], d[j + 2]) > 0.55) lightish++; else darkish++
      }
    }
    var ink = 'mixed'
    if (darkish / n > 0.82) ink = 'dark'
    else if (lightish / n > 0.82) ink = 'light'

    var top = null
    for (var key2 in hues) if (!top || hues[key2].n > top.n) top = hues[key2]
    var brand = top && top.n / n > 0.06 ? hex(top.r / top.n, top.g / top.n, top.b / top.n) : ''

    return {
      background: bg.kind,
      backgroundColor: bg.color ? hex(bg.color[0], bg.color[1], bg.color[2]) : '',
      trim: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      ink: ink,
      meanLuminance: meanL,
      brand: brand,
      inkRatio: n / (w * h),
    }
  }

  /**
   * Erase a uniform background in place, so the mark works on any surface.
   * Only when that background is near-white or near-black: keying out a
   * coloured panel would take a deliberate part of the design with it.
   */
  function keyOut(img) {
    var bg = background(img)
    if (bg.kind !== 'solid') return false
    var L = lum(bg.color[0], bg.color[1], bg.color[2])
    if (L < 0.88 && L > 0.12) return false
    var d = img.data
    for (var i = 0; i < d.length; i += 4) {
      var gap = dist(d[i], d[i + 1], d[i + 2], bg.color)
      if (gap <= EDGE_TOL) d[i + 3] = 0
      else if (gap < EDGE_TOL * 2) d[i + 3] = Math.min(d[i + 3], Math.round(255 * (gap - EDGE_TOL) / EDGE_TOL))
    }
    return true
  }

  root.AirLogo = { analyse: analyse, keyOut: keyOut, background: background, hex: hex }
})(typeof window !== 'undefined' ? window : globalThis)
