// The cockpit must only show state the backend reported. These checks read the
// web source and ROADMAP.md; they fail if sample data or an out-of-date
// capability table sneaks back in.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..', '..')
const webSrc = join(root, 'packages', 'web', 'src')

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (name === '__tests__') return []
    return statSync(full).isDirectory() ? walk(full) : /\.(tsx?|css)$/.test(name) ? [full] : []
  })

test('web source contains no machine names or invented agent state', () => {
  const forbidden = ['/home/rud', 'RUD-SERVER', 'rud-server', 'Linux Hermes', 'Hermes · thinking', 'orchestrating layout']
  const offenders = walk(webSrc).flatMap((file) => {
    const text = readFileSync(file, 'utf8')
    return forbidden.filter((needle) => text.includes(needle)).map((needle) => `${file}: ${needle}`)
  })
  assert.deepEqual(offenders, [])
})

test('capability names match rows of the ROADMAP capability table', () => {
  const model = readFileSync(join(webSrc, 'lib', 'cockpit-model.ts'), 'utf8')
  const roadmap = readFileSync(join(root, 'ROADMAP.md'), 'utf8')
  const names = [...model.matchAll(/\{ name: '([^']+)', state:/g)].map((match) => match[1])
  assert.ok(names.length >= 15, 'expected the full capability list')
  for (const name of names) assert.ok(roadmap.includes(`| ${name} |`), `ROADMAP.md has no row for "${name}"`)
})
