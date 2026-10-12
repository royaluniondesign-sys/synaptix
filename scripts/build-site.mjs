#!/usr/bin/env node
// Assembles the static public site into site-dist/: site/index.html plus the
// browser-only demo (packages/web/dist-demo, built by `npm run build:demo -w @termora/web`).
// It builds files only; it never deploys or uploads anything.

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const out = resolve('site-dist')
const demo = resolve('packages/web/dist-demo')

if (!existsSync(resolve(demo, 'index.html'))) {
  console.error('build-site: packages/web/dist-demo is missing; run `npm run build:demo -w @termora/web` first')
  process.exit(2)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(resolve('site/index.html'), resolve(out, 'index.html'))
cpSync(demo, resolve(out, 'demo'), { recursive: true })
console.log(`build-site: wrote ${out}`)
