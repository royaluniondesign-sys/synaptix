import { existsSync, readFileSync } from 'node:fs';

const required = [
  'docs/app-packaging-blueprint.md',
  'docs/feature-platform-map.md',
  'apps/desktop/package.json',
  'apps/desktop/electron-builder.config.cjs',
  'apps/desktop/src/main.ts',
  'apps/mobile/package.json',
  'apps/mobile/app.config.js',
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length) {
  console.error(`Missing app scaffold files:
${missing.join('\n')}`);
  process.exit(1);
}

const readme = readFileSync('README.md', 'utf8');
for (const ref of ['cockpit-desktop-v2.png', 'mobile-companion-v2.png']) {
  if (!readme.includes(ref)) {
    console.error(`README does not reference refreshed media: ${ref}`);
    process.exit(1);
  }
}

const desktop = JSON.parse(readFileSync('apps/desktop/package.json', 'utf8'));
const mobile = JSON.parse(readFileSync('apps/mobile/package.json', 'utf8'));
if (desktop.name !== '@termora/desktop-app') throw new Error('Unexpected desktop package name');
if (mobile.name !== '@termora/mobile-app') throw new Error('Unexpected mobile package name');

console.log('app scaffold contract ok');
