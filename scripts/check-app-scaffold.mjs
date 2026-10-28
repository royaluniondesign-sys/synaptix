import { existsSync, readFileSync } from 'node:fs';

const required = [
  'docs/app-packaging-blueprint.md',
  'docs/feature-platform-map.md',
  'apps/desktop/package.json',
  'apps/desktop/electron-builder.config.cjs',
  'apps/desktop/src/main.ts',
  'apps/mobile/package.json',
  'apps/mobile/app.config.js',
  'apps/mobile/README.md',
  'apps/mobile/tsconfig.json',
  'apps/mobile/vitest.config.ts',
  'apps/mobile/src/mobile-companion/index.ts',
  'apps/mobile/src/mobile-companion/pairing.ts',
  'apps/mobile/src/mobile-companion/secure-storage.ts',
  'apps/mobile/src/mobile-companion/push.ts',
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length) {
  console.error(`Missing app scaffold files:
${missing.join('\n')}`);
  process.exit(1);
}

const readme = readFileSync('README.md', 'utf8');
for (const ref of ['claude-code-demo.gif']) {
  if (!readme.includes(ref)) {
    console.error(`README does not reference refreshed media: ${ref}`);
    process.exit(1);
  }
}

const desktop = JSON.parse(readFileSync('apps/desktop/package.json', 'utf8'));
const mobile = JSON.parse(readFileSync('apps/mobile/package.json', 'utf8'));
if (desktop.name !== '@synaptix/desktop-app') throw new Error('Unexpected desktop package name');
if (mobile.name !== '@synaptix/mobile-app') throw new Error('Unexpected mobile package name');

// Mobile phase 1: native builds stay gated. These assertions stop the scaffold
// from silently growing a real native build, a signing credential, or a runtime
// dependency on Expo/React Native before the pairing/push contracts are wired.
if (mobile.dependencies && Object.keys(mobile.dependencies).length > 0) {
  throw new Error('mobile scaffold must not declare runtime dependencies while native builds are gated');
}
for (const [name, command] of Object.entries(mobile.scripts ?? {})) {
  if (/eas build|expo build|expo run|prebuild|gradle|xcodebuild/i.test(String(command))) {
    throw new Error(`mobile script "${name}" looks like an enabled native/store build`);
  }
}
for (const target of ['android', 'ios']) {
  const command = String(mobile.scripts?.[target] ?? '');
  if (!/not enabled/i.test(command)) {
    throw new Error(`mobile "${target}" script must stay a gated no-op`);
  }
}

const mobileConfig = readFileSync('apps/mobile/app.config.js', 'utf8');
if (!/aps-environment/.test(mobileConfig)) {
  throw new Error('mobile app config must keep the aps-environment push placeholder');
}
if (!/version:\s*'0\.0\.0'/.test(mobileConfig)) {
  throw new Error('mobile app config must stay at version 0.0.0 while gated');
}
for (const forbidden of [
  'googleServicesFile',
  'privateKey',
  'pushToken',
  'certificateFile',
  'certificatePassword',
  'CSC_LINK',
]) {
  if (mobileConfig.includes(forbidden)) {
    throw new Error(`mobile app config must not contain secret/build key: ${forbidden}`);
  }
}

const companionDir = 'apps/mobile/src/mobile-companion';
const contractExports = {
  'pairing.ts': ['parsePairingUrl', 'buildPairingUrl', 'redactPairing'],
  'secure-storage.ts': ['interface SecureStorage', 'createMemorySecureStorage'],
  'push.ts': ['PushPermissionState', 'describePushReadiness', 'applyPushPermission'],
};
for (const [file, symbols] of Object.entries(contractExports)) {
  const source = readFileSync(`${companionDir}/${file}`, 'utf8');
  for (const symbol of symbols) {
    if (!source.includes(symbol)) {
      throw new Error(`mobile companion ${file} is missing contract symbol: ${symbol}`);
    }
  }
  if (/from\s+['"]react-native['"]|from\s+['"]expo/.test(source)) {
    throw new Error(`mobile companion ${file} must stay free of native runtime imports`);
  }
}

const mobileReadme = readFileSync('apps/mobile/README.md', 'utf8');
for (const term of ['pairing', 'secure storage', 'push', 'gated']) {
  if (!mobileReadme.toLowerCase().includes(term)) {
    throw new Error(`mobile README must document: ${term}`);
  }
}

console.log('app scaffold contract ok');
