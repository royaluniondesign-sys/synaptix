import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Deterministic platform-readiness contract. No network, no dependencies, no
// secrets. It verifies that readiness docs/config placeholders exist and that
// public docs do not make unqualified app-store/platform claims.

const READINESS_DOC = 'docs/platform-readiness-checklist.md'
const EVIDENCE_MANIFEST = 'docs/release-evidence-manifest.json'

const REQUIRED_FILES = [
  READINESS_DOC,
  EVIDENCE_MANIFEST,
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
  'No artifact is supported until its evidence row is satisfied',
]

// Fields every release-evidence manifest row must carry. The manifest is the
// machine-readable source of truth for desktop/mobile artifact evidence; the
// readiness doc must stay in sync with it and may not claim support early.
const REQUIRED_EVIDENCE_FIELDS = [
  'id',
  'artifact',
  'surface',
  'statusCategory',
  'evidenceRequired',
  'nextEvidenceCommand',
  'expectedObservation',
  'evidenceSatisfied',
  'supported',
]
const ALLOWED_SURFACES = ['desktop', 'mobile', 'cli']

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
    required: ['appId', 'productName', 'dmg', 'zip', 'nsis', 'AppImage'],
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

// --- Release evidence manifest -------------------------------------------
// Desktop/mobile artifacts each need a structured evidence row. The manifest
// holds that data (fields, status category, command); the readiness doc must
// list every row and keep the "no support until evidence" policy. This keeps
// future docs from overclaiming artifacts before evidence exists.
const splitMarkdownRow = (line) => {
  const cells = []
  let current = ''
  let escaped = false
  for (const char of line.trim().replace(/^\|/, '').replace(/\|$/, '')) {
    if (escaped) {
      current += char
      escaped = false
    } else if (char === '\\') {
      escaped = true
    } else if (char === '|') {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

const evidenceRows = (doc) => {
  const lines = doc.split('\n')
  const start = lines.findIndex((line) => /^##\s+Artifact evidence checklist/i.test(line))
  if (start === -1) return null
  const rows = []
  let headers = null
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (/^##\s+/.test(line)) break
    if (!line.trim().startsWith('|')) continue
    const cells = splitMarkdownRow(line)
    const first = cells[0]?.trim()
    if (!first) continue
    if (/^:?-+:?$/.test(first.replace(/ /g, ''))) continue
    if (/^artifact$/i.test(first)) {
      headers = cells.map((cell) => norm(cell))
      continue
    }
    if (!headers) continue
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
    rows.push(row)
  }
  return rows
}

const normArtifact = (value) => norm(value).replace(/`/g, '')
const boolString = (value) => String(value).toLowerCase()

if (existsSync(EVIDENCE_MANIFEST)) {
  let manifest
  try {
    manifest = JSON.parse(read(EVIDENCE_MANIFEST))
  } catch (error) {
    fail(`${EVIDENCE_MANIFEST} is not valid JSON: ${error.message}`)
  }

  if (manifest) {
    const doc = existsSync(READINESS_DOC) ? read(READINESS_DOC) : ''
    if (!has(manifest.policy ?? '', 'No artifact is supported until its evidence row is satisfied')) {
      fail(`${EVIDENCE_MANIFEST} policy must state no artifact is supported before evidence`)
    }
    for (const category of REQUIRED_STATUS_TOKENS) {
      if (!(manifest.statusCategories ?? []).includes(category)) {
        fail(`${EVIDENCE_MANIFEST} statusCategories missing: ${category}`)
      }
    }

    const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : []
    if (artifacts.length === 0) {
      fail(`${EVIDENCE_MANIFEST} must declare a non-empty "artifacts" array`)
    }

    const manifestArtifacts = new Set()
    for (const entry of artifacts) {
      const label = entry?.id || '(missing id)'
      for (const field of REQUIRED_EVIDENCE_FIELDS) {
        if (entry?.[field] === undefined || entry[field] === '') {
          fail(`evidence "${label}" missing field: ${field}`)
        }
      }
      if (!ALLOWED_SURFACES.includes(entry?.surface)) {
        fail(`evidence "${label}" has unknown surface: ${entry?.surface}`)
      }
      if (!REQUIRED_STATUS_TOKENS.includes(entry?.statusCategory)) {
        fail(`evidence "${label}" has unknown status category: ${entry?.statusCategory}`)
      }
      if (entry?.evidenceSatisfied === false && entry?.supported === true) {
        fail(`evidence "${label}" claims support without satisfied evidence`)
      }
      if (entry?.supported === true && !entry?.evidenceUri) {
        fail(`evidence "${label}" marked supported without an evidenceUri`)
      }
      if (entry?.artifact) manifestArtifacts.add(normArtifact(entry.artifact))
      if (doc && entry?.artifact && !has(doc, entry.artifact)) {
        fail(`readiness doc does not mention artifact row: ${entry?.artifact}`)
      }
      if (doc && entry?.nextEvidenceCommand && !has(doc, entry.nextEvidenceCommand)) {
        fail(`readiness doc does not mention evidence command for "${label}": ${entry?.nextEvidenceCommand}`)
      }
    }

    if (doc) {
      const rows = evidenceRows(doc)
      if (rows === null) {
        fail('readiness doc is missing the "Artifact evidence checklist" table')
      } else {
        const byArtifact = new Map(artifacts.map((entry) => [normArtifact(entry.artifact), entry]))
        const seen = new Set()
        const requiredColumns = [
          'artifact',
          'status',
          'evidencerequiredbeforeclaimingsupport',
          'nextevidencecommand',
          'expectedobservation',
          'evidencesatisfied',
          'supported',
        ]
        for (const row of rows) {
          for (const column of requiredColumns) {
            if (!(column in row)) fail(`artifact evidence table missing column: ${column}`)
          }
          const artifactKey = normArtifact(row.artifact)
          const entry = byArtifact.get(artifactKey)
          if (!entry) {
            fail(`artifact evidence row "${row.artifact}" is not tracked in ${EVIDENCE_MANIFEST}`)
            continue
          }
          seen.add(artifactKey)
          const comparisons = [
            ['status', entry.statusCategory],
            ['evidencerequiredbeforeclaimingsupport', entry.evidenceRequired],
            ['nextevidencecommand', entry.nextEvidenceCommand],
            ['expectedobservation', entry.expectedObservation],
            ['evidencesatisfied', boolString(entry.evidenceSatisfied)],
            ['supported', boolString(entry.supported)],
          ]
          for (const [column, expected] of comparisons) {
            if (norm(row[column]) !== norm(expected)) {
              fail(
                `artifact evidence row "${entry.id}" column "${column}" differs from ${EVIDENCE_MANIFEST}`,
              )
            }
          }
        }
        for (const artifact of manifestArtifacts) {
          if (!seen.has(artifact)) {
            fail(`${EVIDENCE_MANIFEST} artifact "${artifact}" missing from readiness table`)
          }
        }
      }
    }
  }
}

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
