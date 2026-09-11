// Headless Chrome screenshot via the DevTools protocol.
//
// Why: `chrome --screenshot` clamps the window to ~500px wide on Windows, so
// phone-width captures come out clipped, and it cannot hover. This drives a
// real page through CDP instead: exact viewport, optional device emulation,
// scroll to a selector, hover a selector, then capture.
//
// usage: node scripts/shot.mjs <url> <out.png> [--width N] [--height N] [--mobile]
//        [--scroll "css"] [--hover "css"] [--click "css"] [--full] [--wait ms]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const [url, out, ...rest] = process.argv.slice(2)
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [--width N] [--height N] [--mobile] [--scroll css] [--hover css] [--full] [--wait ms]')
  process.exit(2)
}
const opt = { width: 1440, height: 1000, mobile: false, scroll: '', hover: '', click: '', full: false, wait: 1200 }
for (let i = 0; i < rest.length; i++) {
  const k = rest[i]
  if (k === '--mobile') opt.mobile = true
  else if (k === '--full') opt.full = true
  else if (k.startsWith('--')) opt[k.slice(2)] = /^(width|height|wait)$/.test(k.slice(2)) ? Number(rest[++i]) : rest[++i]
}
if (opt.mobile) {
  if (!rest.includes('--width')) opt.width = 390
  if (!rest.includes('--height')) opt.height = 844
}

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p))
const port = 9222 + Math.floor(Math.random() * 1000)
const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'shot-ud-'))
const proc = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${ud}`,
  `--window-size=${opt.width},${opt.height}`, 'about:blank',
], { stdio: 'ignore' })

const cleanup = () => { try { proc.kill() } catch {} ; try { fs.rmSync(ud, { recursive: true, force: true }) } catch {} }
process.on('exit', cleanup)

// Wait for the debugger endpoint.
let targets
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break } catch { await sleep(200) }
}
const page = targets?.find((t) => t.type === 'page')
if (!page) { console.error('no page target'); process.exit(1) }

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
let id = 0
const pending = new Map()
const events = []
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  else if (msg.method) events.push(msg.method)
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: opt.width, height: opt.height, deviceScaleFactor: opt.mobile ? 2 : 1, mobile: opt.mobile,
})
if (opt.mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true })
await send('Page.navigate', { url })
for (let i = 0; i < 100 && !events.includes('Page.loadEventFired'); i++) await sleep(100)
await sleep(opt.wait)

if (opt.scroll) {
  await evaluate(`document.querySelector(${JSON.stringify(opt.scroll)})?.scrollIntoView({ block: 'start' })`)
  await sleep(400)
}
if (opt.click) {
  const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(opt.click)})?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null })()`)
  if (!box) { console.error('click target not found'); process.exit(1) }
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 })
  await sleep(900)
}
if (opt.hover) {
  const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(opt.hover)})?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null })()`)
  if (!box) { console.error('hover target not found'); process.exit(1) }
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y })
  await sleep(700)
}

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: opt.full })
fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
console.log(`wrote ${out} (${opt.width}x${opt.height}${opt.mobile ? ' mobile' : ''}${opt.hover ? ' hover ' + opt.hover : ''})`)
ws.close()
cleanup()
process.exit(0)
