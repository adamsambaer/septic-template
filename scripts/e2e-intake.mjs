/**
 * Drive the live intake form the way a contractor does, and check what it posts.
 *
 *   node scripts/e2e-intake.mjs                    both branches, against the live form
 *   node scripts/e2e-intake.mjs --url <page>       point it somewhere else
 *   node scripts/e2e-intake.mjs --logo <file.png>  use a different logo
 *
 * Nothing is mocked except the final POST of the record, which is captured
 * rather than sent so the CRM does not fill with test cards. The logo upload is
 * real: it goes through the Worker into the asset library, because that is the
 * step that actually breaks.
 *
 * Exit code is 0 only when every check passes.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}
const PAGE = opt('url', 'https://airacq-start.pages.dev/')
const LOGO = opt('logo', '')

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p) => fs.existsSync(p))
if (!chrome) { console.error('no chrome found'); process.exit(2) }

const port = 9400 + Math.floor(Math.random() * 500)
const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-'))
const proc = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, '--window-size=420,900', 'about:blank',
], { stdio: 'ignore' })
const cleanup = () => {
  try { proc.kill() } catch { /* already gone */ }
  try { fs.rmSync(ud, { recursive: true, force: true }) } catch { /* locked */ }
}
process.on('exit', cleanup)

let targets
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break } catch { await sleep(200) }
}
const target = targets?.find((t) => t.type === 'page')
if (!target) { console.error('no page target'); process.exit(2) }

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
let id = 0
const pending = new Map()
const events = []
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  else if (msg.method) events.push(msg.method)
}
const send = (method, params = {}) =>
  new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  const bad = res.result?.exceptionDetails
  if (bad) throw new Error(`${bad.text} ${bad.exception?.description ?? ''}`)
  return res.result?.result?.value
}

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 900, deviceScaleFactor: 1, mobile: true })

async function load() {
  events.length = 0
  await send('Page.navigate', { url: PAGE })
  for (let i = 0; i < 150 && !events.includes('Page.loadEventFired'); i++) await sleep(100)
  await sleep(1200)
}

const logoPath = LOGO || path.join(ROOT, 'onboarding', 'assets', 'logo.png')
const logoB64 = fs.readFileSync(logoPath).toString('base64')
const logoName = path.basename(logoPath)

/** One pass through the form. An empty `site` takes the no-website branch. */
async function run({ site, zip, services }) {
  await load()
  const js = `
  (async function () {
    var out = { steps: [] };
    var f = document.getElementById('f'), n = document.getElementById('next');
    var w = function (ms) { return new Promise(function (r) { setTimeout(r, ms) }) };
    var sent = null;
    var realFetch = window.fetch;
    window.fetch = function (u, o) {
      if (o && typeof o.body === 'string' && String(u).indexOf('client_onboarding') >= 0) {
        try { sent = JSON.parse(o.body).data } catch (e) { /* leave null */ }
        return Promise.resolve({ ok: true, json: function () { return Promise.resolve({}) } });
      }
      return realFetch.apply(window, arguments);
    };
    // No regex here on purpose: this whole block is a template literal, and a
    // backslash class silently loses its backslash on the way through.
    function step() {
      var t = document.getElementById('count').textContent;
      var at = t.indexOf(' of ');
      if (at >= 0) {
        var n2 = parseInt(t.slice(at + 4), 10);
        if (n2 > 0) out.totalSteps = n2;
      }
      return t;
    }
    function errText() { var e = document.getElementById('err'); return e.classList.contains('show') ? e.textContent : ''; }

    f.business_name.value = 'E2E Septic';
    f.current_website.value = ${JSON.stringify(site)};
    f.business_phone.value = '2395550144';
    f.owner_phone.value = '2395550199';
    n.click(); await w(400);
    out.steps.push(step());

    f.owner_email.value = 'e2e@airacquisition.com';
    f.domain.value = 'e2eseptic.com';
    n.click(); await w(400);
    out.steps.push(step());

    n.click(); await w(400);
    out.blockedWithoutLogo = errText();
    out.stepAfterBlockAttempt = step();

    var bin = atob(${JSON.stringify(logoB64)});
    var buf = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    var dt = new DataTransfer();
    dt.items.add(new File([buf], ${JSON.stringify(logoName)}, { type: 'image/png' }));
    var lf = document.getElementById('logoFile');
    lf.files = dt.files; lf.dispatchEvent(new Event('change'));

    for (var t = 0; t < 120; t++) {
      var s = document.querySelector('#logoList span');
      if (s && (s.textContent === 'uploaded' || s.textContent === 'did not send')) break;
      await w(500);
    }
    out.logoStatus = (document.querySelector('#logoList span') || {}).textContent || 'never finished';
    out.logoNote = (document.querySelector('.logonote') || {}).textContent || '';
    out.swatchCount = document.querySelectorAll('.swatch').length;

    document.getElementById('photosAi').checked = true;
    n.click(); await w(1200);
    out.steps.push(step());

    if (${JSON.stringify(!site)}) {
      n.click(); await w(300);
      out.blockedWithoutServices = errText();
      ${JSON.stringify(services)}.forEach(function (v) {
        var el = f.querySelector('input[name=services_offered][value=' + v + ']');
        if (el) el.checked = true;
      });
      n.click(); await w(300);
      out.blockedWithoutZip = errText();
      var z = document.getElementById('zip');
      z.value = ${JSON.stringify(zip)};
      z.dispatchEvent(new Event('input'));
      await w(2500);
      out.townsOffered = document.querySelectorAll('[data-town]').length;
      out.townsTicked = Array.prototype.filter.call(document.querySelectorAll('[data-town]'), function (b) { return b.checked; }).length;
      n.click(); await w(500);
      out.steps.push(step());
    }

    f.differentiators.value = 'We quote before we dig';
    n.click(); await w(2500);
    out.done = document.getElementById('done').classList.contains('show');
    out.finalError = errText();
    out.sent = sent;
    return out;
  })()`
  return evaluate(js)
}

const failures = []
const check = (label, ok, detail) => {
  if (!ok) failures.push(`${label} — ${detail}`)
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`)
}

console.log(`\ne2e against ${PAGE}`)
console.log(`logo: ${logoName} (${(fs.statSync(logoPath).size / 1024).toFixed(0)} KB)\n`)

console.log('no website, the branch that has to ask for everything:')
const bare = await run({ site: '', zip: '33904', services: ['pumping', 'repair', 'emergency'] })
check('step 3 blocks without a logo', /need your logo/i.test(bare.blockedWithoutLogo ?? ''), `error was "${bare.blockedWithoutLogo}"`)
check('and stays on step 3', /3 of 5/.test(bare.stepAfterBlockAttempt ?? ''), `was on ${bare.stepAfterBlockAttempt}`)
check('the logo reaches the asset library', bare.logoStatus === 'uploaded', String(bare.logoStatus))
check('the logo gets cleaned up', /cropped|background/i.test(bare.logoNote ?? ''), `note was "${bare.logoNote}"`)
check('a colour is offered', (bare.swatchCount ?? 0) >= 6, `${bare.swatchCount} swatches`)
check('the form is five steps', bare.totalSteps === 5, `counter said ${bare.totalSteps}`)
check('blocks with no service ticked', /at least one service/i.test(bare.blockedWithoutServices ?? ''), `"${bare.blockedWithoutServices}"`)
check('blocks with no ZIP', /ZIP/i.test(bare.blockedWithoutZip ?? ''), `"${bare.blockedWithoutZip}"`)
check('the ZIP offers real towns', (bare.townsOffered ?? 0) >= 8, `${bare.townsOffered} offered`)
check('and pre-ticks the close ones', (bare.townsTicked ?? 0) >= 4 && bare.townsTicked <= bare.townsOffered, `${bare.townsTicked} ticked`)
check('it submits', bare.done === true, `final error "${bare.finalError}"`)

const b = bare.sent ?? {}
check('record carries the logo', typeof b.logo_url === 'string' && b.logo_url.startsWith('https://'), String(b.logo_url))
check('record says whether to silhouette it', typeof b.logo_knockout === 'boolean', String(b.logo_knockout))
check('record carries the three services', Array.isArray(b.services_offered) && b.services_offered.length === 3, JSON.stringify(b.services_offered))
check('towns arrive tagged with a county', Array.isArray(b.cities) && b.cities.some((c) => /\(.+County\)/.test(c)), JSON.stringify((b.cities ?? []).slice(0, 2)))
check('counties arrive', Array.isArray(b.counties) && b.counties.length > 0, JSON.stringify(b.counties))
check('the ZIP fills their own address', b.address_city === 'Cape Coral' && b.address_state === 'FL', `${b.address_city} / ${b.address_state}`)
check('the ZIP itself is kept', b.address_zip === '33904', String(b.address_zip))
check('ticking emergency sets the 24/7 flag', b.emergency_24_7 === true, String(b.emergency_24_7))

console.log('\nwith a website, where we read their site instead of asking:')
const withSite = await run({ site: 'https://example.com', zip: '', services: [] })
check('the form is four steps', withSite.totalSteps === 4, `counter said ${withSite.totalSteps}`)
check('the logo is optional', withSite.blockedWithoutLogo === '', `error was "${withSite.blockedWithoutLogo}"`)
check('it submits', withSite.done === true, `final error "${withSite.finalError}"`)

const w2 = withSite.sent ?? {}
check('no services are invented', w2.services_offered === undefined, JSON.stringify(w2.services_offered))
check('no towns are invented', w2.cities === undefined, JSON.stringify(w2.cities))
check('their website is kept', w2.current_website === 'https://example.com', String(w2.current_website))

ws.close()
cleanup()

console.log('')
if (failures.length) {
  console.error(`${failures.length} check(s) failed:`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log('all checks passed')
process.exit(0)
