#!/usr/bin/env node
// Layout check for the web cockpit, run against the browser-only demo build
// (packages/web/dist-demo, produced by `npm --prefix packages/web run build:demo`).
//
// For a desktop and a phone viewport it asserts that:
//   - the page never scrolls sideways,
//   - on a phone, content below the first screen can be scrolled to,
//   - no uncaught script error occurs,
//   - the simulated terminal opens from "new terminal".
// Screenshots are written to the output directory for inspection.
//
// Needs Playwright with a Chromium browser. In CI: `npm i --no-save playwright`
// and `npx playwright install --with-deps chromium`. Locally, point
// PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE at an existing install.

import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'packages', 'web', 'dist-demo')
const outDir = resolve(process.argv[2] ?? join(root, 'web-layout-shots'))

if (!existsSync(join(dist, 'index.html'))) {
  console.error('check-web-layout: build the demo first: npm --prefix packages/web run build:demo')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' }
const server = createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://x').pathname
  const file = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`)
  if (!file.startsWith(dist) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file))
})
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
const base = `http://127.0.0.1:${server.address().port}/`

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] })
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }

const viewports = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'phone', width: 390, height: 844, mobile: true },
]

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)))
  await page.goto(base, { waitUntil: 'load' })
  await page.getByText('Agent registry').first().waitFor({ timeout: 15_000 }).catch(() => check(false, `${vp.name}: dashboard did not render`))

  // Compare with the configured width, not window.innerWidth: in mobile
  // emulation the layout viewport grows to fit overly wide content.
  const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  check(contentWidth <= vp.width + 1, `${vp.name}: content is ${contentWidth}px wide in a ${vp.width}px viewport`)

  if (vp.mobile) {
    // Scroll with a real wheel event: setting scrollTop from script also works
    // on overflow:hidden elements, so it would not prove the user can scroll.
    const geometry = await page.evaluate(() => {
      const el = document.querySelector('.tm-orca-grid')
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return { client: el.clientHeight, scrollHeight: el.scrollHeight, x: rect.left + rect.width / 2, y: rect.top + Math.min(rect.height / 2, 300) }
    })
    check(geometry !== null, 'phone: scroll container .tm-orca-grid not found')
    if (geometry) {
      check(geometry.scrollHeight > geometry.client + 100, `phone: content (${geometry.scrollHeight}px) is not taller than the container (${geometry.client}px)`)
      await page.mouse.move(geometry.x, geometry.y)
      await page.mouse.wheel(0, 600)
      await page.waitForTimeout(300)
      const scrolled = await page.evaluate(() => document.querySelector('.tm-orca-grid')?.scrollTop ?? 0)
      check(scrolled > 0, 'phone: the content area does not scroll with the wheel')
    }
  }
  await page.screenshot({ path: join(outDir, `${vp.name}-dashboard.png`) })

  await page.getByRole('button', { name: /new terminal/i }).first().click()
  const opened = await page.getByText(/zsh \d/).first().waitFor({ timeout: 10_000 }).then(() => true, () => false)
  check(opened, `${vp.name}: "new terminal" did not open a session`)
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(outDir, `${vp.name}-terminal.png`) })

  check(errors.length === 0, `${vp.name}: uncaught errors: ${errors.join(' | ')}`)
  await context.close()
}

await browser.close()
server.close()

if (failures.length > 0) {
  console.error('web layout check failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log(`web layout check ok (${viewports.map((vp) => vp.name).join(', ')}); screenshots in ${outDir}`)
