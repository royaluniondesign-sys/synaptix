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
