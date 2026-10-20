import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8')
const text = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')

test('the page loads nothing from other sites', () => {
  assert.doesNotMatch(html, /<script/i, 'no scripts')
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i, 'no remote stylesheets or fonts')
  assert.doesNotMatch(html, /(?:src|srcset)=["']https?:/i, 'no remote images or frames')
  assert.doesNotMatch(html, /@import|url\(\s*["']?https?:/i, 'no remote CSS')
})

test('the demo is embedded and labelled as simulated', () => {
  assert.match(html, /<iframe[^>]+src="demo\/"/)
  assert.match(text, /simulated backend/i)
})

test('no pricing, release or signing claims before there is evidence', () => {
  assert.doesNotMatch(text, /[$€£]\s?\d|\bpric(e|es|ing)\b|\bper (month|year|seat)\b|\bfree trial\b|\bpro plan\b/i)
  assert.doesNotMatch(text, /\b(?:now )?available (?:for|on) (?:download|mac|windows|linux)\b/i)
  assert.doesNotMatch(html, /href="[^"]*\/releases\/download\//i)
  for (const match of text.matchAll(/\b(\w+)\s+(?:and\s+)?(signed|notarized)\b/gi)) {
    assert.match(match[1], /^(un|not|no)$/i, `"${match[0]}" must be negated`)
  }
  assert.match(text, /unsigned/i)
  assert.match(text, /not published as a release/i)
})

test('the privacy section discloses the default public tunnel', () => {
  assert.match(text, /TUNNEL=local/)
  assert.match(text, /public tunnel/i)
})

test('no machine names or paths', () => {
  assert.doesNotMatch(html, /\/home\/\w+|\/Users\/\w+|\bm4-1\b|\bM16\b/)
})

test('capabilities named on the page exist in the registry', () => {
  const registry = readFileSync(new URL('../../packages/agent/src/agent-registry.ts', import.meta.url), 'utf8')
  for (const id of ['claude', 'codex', 'opencode', 'hermes', 'aider', 'gemini', 'goose']) {
    assert.match(registry, new RegExp(`id: '${id}'`))
  }
})

test('every font the page references is copied by the build script', () => {
  const build = readFileSync(new URL('../build-site.mjs', import.meta.url), 'utf8')
  const used = [...html.matchAll(/url\("fonts\/([^"]+\.woff2)"\)/g)].map((match) => match[1])
  assert.ok(used.length >= 4, 'expected the page to reference its font files')
  for (const file of used) assert.ok(build.includes(`'${file}'`), `${file} is not in build-site.mjs`)
})

test('the Pages workflow publishes only for site changes on main and holds no secrets', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/pages.yml', import.meta.url), 'utf8')
  const triggers = workflow.slice(workflow.indexOf('\non:'), workflow.indexOf('\nconcurrency:'))
  assert.match(triggers, /workflow_dispatch:/)
  assert.match(triggers, /push:\s+branches: \[main\]/, 'only pushes to main may publish')
  assert.match(triggers, /- 'site\/\*\*'/)
  assert.doesNotMatch(triggers, /\b(pull_request|schedule|release):/, 'a PR, a timer or a release must never publish')
  assert.doesNotMatch(triggers, /packages\//, 'application changes must not publish the site')
  assert.doesNotMatch(workflow, /secrets\./, 'GitHub Pages deploys with the built-in token; no secrets needed')
})

test('the page uses the project logo and the build script copies it', () => {
  const build = readFileSync(new URL('../build-site.mjs', import.meta.url), 'utf8')
  assert.match(html, /src="synaptix-logo\.svg"/)
  assert.match(html, /rel="icon" href="synaptix-logo\.svg"/)
  assert.ok(build.includes("'assets/synaptix-logo.svg'"), 'build-site.mjs must copy assets/synaptix-logo.svg')
})

test('no unprovable superlatives, and every difference states its cost', () => {
  // The page says outright that it is NOT claiming exclusivity; that negated sentence is the one allowed use.
  const claims = text.replace(/not a claim that nobody else/i, '')
  assert.doesNotMatch(claims, /\b(?:the only|the first|no other|nobody else|best-in-class|the best|fastest|better than|unlike)\b/i, 'comparative claims need evidence this page cannot give')
  assert.match(text, /What it costs/)
  assert.match(text, /not a claim that nobody else/i)
})
