#!/usr/bin/env node
// Assembles the static public site into site-dist/: site/index.html plus the
// browser-only demo (packages/web/dist-demo, built by `npm run build:demo -w @termora/web`).
// It builds files only; it never deploys or uploads anything.

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const out = resolve('site-dist')
const demo = resolve('packages/web/dist-demo')

// Geist and Geist Mono (SIL OFL 1.1, from @fontsource) are served from the site itself,
// so the page makes no requests to font CDNs.
const FONTS = [
  ['geist', 'geist-latin-400-normal.woff2'],
  ['geist', 'geist-latin-500-normal.woff2'],
  ['geist', 'geist-latin-600-normal.woff2'],
  ['geist', 'geist-latin-700-normal.woff2'],
  ['geist-mono', 'geist-mono-latin-400-normal.woff2'],
  ['geist-mono', 'geist-mono-latin-500-normal.woff2'],
]

if (!existsSync(resolve(demo, 'index.html'))) {
  console.error('build-site: packages/web/dist-demo is missing; run `npm run build:demo -w @termora/web` first')
  process.exit(2)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(resolve('site/index.html'), resolve(out, 'index.html'))
cpSync(demo, resolve(out, 'demo'), { recursive: true })
mkdirSync(resolve(out, 'fonts'), { recursive: true })
for (const [pkg, file] of FONTS) {
  const source = resolve('node_modules/@fontsource', pkg, 'files', file)
  if (!existsSync(source)) {
    console.error(`build-site: missing font ${source}; run npm ci`)
    process.exit(2)
  }
  cpSync(source, resolve(out, 'fonts', file))
}
console.log(`build-site: wrote ${out}`)
