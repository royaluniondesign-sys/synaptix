#!/usr/bin/env node
// Runs every scripts/__tests__/*.test.mjs with the Node test runner. Node 20
// does not expand globs passed to `node --test`, so the files are listed here.

import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const dir = resolve(import.meta.dirname, '__tests__')
const files = readdirSync(dir).filter((name) => name.endsWith('.test.mjs')).sort().map((name) => join(dir, name))
if (files.length === 0) {
  console.error('no script tests found')
  process.exit(1)
}
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' })
process.exit(result.status ?? 1)
