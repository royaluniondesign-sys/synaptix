import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Deterministic platform-readiness contract. No network, no dependencies, no
// secrets. It verifies that readiness docs/config placeholders exist and that
// public docs do not make unqualified app-store/platform claims.

const READINESS_DOC = 'docs/platform-readiness-checklist.md'

const REQUIRED_FILES = [
  READINESS_DOC,
  'docs/app-packaging-blueprint.md',
  'docs/feature-platform-map.md',
  'docs/desktop-unsigned-packaging.md',
  'apps/desktop/package.json',
  'apps/desktop/electron-builder.config.cjs',
  'apps/mobile/package.json',
  'apps/mobile/app.config.js',
  'scripts/package-desktop-unsigned.mjs',
  '.github/workflows/ci.yml',
]

// The readiness doc must declare these status categories and cover these
// platform/privacy/release domains.
const REQUIRED_STATUS_TOKENS = ['implemented', 'gated', 'missing']
const REQUIRED_TOPICS = [
  'Electron desktop',
  'PWA',
  'Expo',
  'GitHub Releases',
  'notarization',
  'signing',
  'permissions',
  'data handling',
]
const REQUIRED_ARTIFACTS = ['.dmg', '.zip', 'NSIS', 'AppImage', '.deb', '.apk']
const REQUIRED_DOC_SNIPPETS = [
  'Artifact evidence',
  'check:platform-readiness',
  'Do not claim',
  'Unsigned local artifact',
  '--publish never',
  'pending/manual',
]

// Unqualified positive claims that may only be discussed (as disallowed) inside
// the readiness doc. Anywhere else in public docs is a false-claim failure.
const BANNED_CLAIMS = [
  { pattern: /\bstore[- ]ready\b/i, label: 'store-ready' },
  { pattern: /\b(?:app|play)\s+store\s+ready\b/i, label: 'app store ready' },
  { pattern: /\bsubmission[- ]ready\b/i, label: 'submission-ready' },
  { pattern: /\b(?:fully|already|certified)\s+notarized\b/i, label: 'fully notarized' },
  {
    pattern:
      /\bsigned\s+(?:release|artifact|build|installer)s?\s+(?:is|are|has|have)\s+(?:available|published|shipped)\b/i,
    label: 'signed release available',
  },
]

// Keys that would indicate real signing credentials leaked into config. The
// scaffold must keep placeholders only.
const FORBIDDEN_CONFIG_KEYS = [
  'certificateFile',
  'certificatePassword',
  'certificateSubjectName',
  'appleId',
  'appleIdPassword',
  'teamId',
  'notarize',
  'CSC_LINK',
  'CSC_KEY_PASSWORD',
  'WIN_CSC_LINK',
  'WIN_CSC_KEY_PASSWORD',
]

const problems = []
const fail = (message) => problems.push(message)
const read = (path) => readFileSync(path, 'utf8')
const norm = (text) => text.replace(/\s+/g, '').toLowerCase()
const has = (text, snippet) => norm(text).includes(norm(snippet))

for (const file of REQUIRED_FILES) {
  if (!existsSync(file)) fail(`missing required readiness file: ${file}`)
}

if (existsSync(READINESS_DOC)) {
  const doc = read(READINESS_DOC)
  for (const token of REQUIRED_STATUS_TOKENS) {
    if (!has(doc, token)) fail(`readiness doc missing status category: ${token}`)
  }
  for (const topic of REQUIRED_TOPICS) {
    if (!has(doc, topic)) fail(`readiness doc missing topic: ${topic}`)
  }
  for (const artifact of REQUIRED_ARTIFACTS) {
    if (!has(doc, artifact)) fail(`readiness doc missing artifact type: ${artifact}`)
  }
  for (const snippet of REQUIRED_DOC_SNIPPETS) {
    if (!has(doc, snippet)) fail(`readiness doc missing required section: ${snippet}`)
  }
}

// Scan public markdown for unqualified claims. The readiness doc is the one
// place allowed to name these phrases, because it documents them as disallowed.
const collectMarkdown = (dir) => {
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue
      out.push(...collectMarkdown(path))
    } else if (entry.endsWith('.md')) {
      out.push(path)
    }
  }
  return out
}

const markdownTargets = [
  'README.md',
  'ROADMAP.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs',
  'apps',
].filter((path) => existsSync(path))

const scanned = []
for (const target of markdownTargets) {
  if (target.endsWith('.md')) {
    scanned.push(target)
  } else {
    scanned.push(...collectMarkdown(target))
  }
}

for (const file of scanned) {
  if (file === READINESS_DOC) continue
  const text = read(file)
  for (const rule of BANNED_CLAIMS) {
    if (rule.pattern.test(text)) {
      fail(
        `unqualified claim "${rule.label}" found in ${file}; add artifact evidence or qualify it`,
      )
    }
  }
}

const checkConfig = (path, { required, forbidden }, label) => {
  if (!existsSync(path)) return
  const text = read(path)
  for (const key of required) {
    if (!has(text, key)) fail(`${label} missing placeholder: ${key}`)
  }
  for (const key of forbidden) {
    if (has(text, key)) fail(`${label} must not contain signed/secret key: ${key}`)
  }
}

checkConfig(
  'apps/desktop/electron-builder.config.cjs',
  {
    required: ['appId', 'productName', 'dmg', 'zip', 'nsis', 'AppImage', 'deb'],
    forbidden: FORBIDDEN_CONFIG_KEYS,
  },
  'electron-builder config',
)

checkConfig(
  'apps/mobile/app.config.js',
  {
    required: ['bundleIdentifier', 'package', 'aps-environment'],
    forbidden: ['googleServicesFile', 'pushToken', 'privateKey'],
  },
  'mobile app config',
)

// The unsigned packaging helper must stay dry-run by default and must never
// sign, notarize, or publish. If it stops passing --publish never or starts
// accepting credentials, readiness claims become unsafe.
const UNSIGNED_HELPER = 'scripts/package-desktop-unsigned.mjs'
if (existsSync(UNSIGNED_HELPER)) {
  const helper = read(UNSIGNED_HELPER)
  const helperInvariants = [
    "'--publish','never'",
    'CSC_IDENTITY_AUTO_DISCOVERY',
    "'--run'",
    'SIGNING_ENV_KEYS',
    'PUBLISH_ENV_KEYS',
    'pending/manual',
    'process.exit(2)',
    "spawnSync('npx'",
  ]
  for (const snippet of helperInvariants) {
    if (!has(helper, snippet)) fail(`unsigned helper missing guardrail: ${snippet}`)
  }
  if (/secrets\./i.test(helper)) fail('unsigned helper must not reference secrets.*')
}

if (existsSync('apps/desktop/package.json')) {
  try {
    const desktopPkg = JSON.parse(read('apps/desktop/package.json'))
    const scripts = desktopPkg.scripts ?? {}
    const unsignedScripts = Object.entries(scripts).filter(([name]) =>
      name.startsWith('package:unsigned'),
    )
    if (unsignedScripts.length === 0) {
      fail('desktop package.json must expose package:unsigned scripts')
    }
    for (const [name, command] of unsignedScripts) {
      if (!String(command).includes('package-desktop-unsigned.mjs')) {
        fail(`desktop script "${name}" must call scripts/package-desktop-unsigned.mjs`)
      }
    }
  } catch (error) {
    fail(`could not read apps/desktop/package.json scripts: ${error.message}`)
  }
}

if (existsSync('.github/workflows/ci.yml')) {
  const ci = read('.github/workflows/ci.yml')
  if (ci.includes('secrets.'))
    fail('PR CI must not reference signing secrets; keep them gated to release workflows')
  if (!has(ci, 'check:platform-readiness')) fail('CI must run npm run check:platform-readiness')
}

if (problems.length > 0) {
  const detail = problems.map((problem) => `- ${problem}`).join('\n')
  console.error(`Platform readiness contract failed:\n${detail}`)
  process.exit(1)
}

console.log('platform readiness contract ok')
