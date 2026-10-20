#!/usr/bin/env node
// synaptix CLI — query and manage a running synaptix agent from the terminal.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { run } from './run.js'

/** Reads the version from package.json so it can never drift from the package. */
function readVersion(): string {
  try {
    const pkgPath = join(import.meta.dirname, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

process.exitCode = await run(process.argv.slice(2), { version: readVersion() })
