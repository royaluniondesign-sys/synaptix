// Synaptix desktop packaging config (unsigned).
//
// Packages the directory produced by scripts/stage-app.mjs. No signing,
// notarization or publishing is configured here; scripts/package-desktop-unsigned.mjs
// refuses signing credentials and always passes `--publish never`.

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.synaptix.app',
  productName: 'Synaptix',
  artifactName: 'Synaptix-${version}-${os}-${arch}.${ext}',
  directories: {
    app: 'stage',
    output: 'release/desktop',
    buildResources: 'resources'
  },
  // Native modules must live outside the archive so they can be loaded.
  asar: true,
  asarUnpack: ['**/*.node', '**/node_modules/node-pty/**', '**/node_modules/better-sqlite3/**'],
  npmRebuild: true,
  files: ['**/*', '!**/*.map', '!**/*.md', '!**/test/**', '!**/tests/**'],
  extraResources: [
    { from: 'stage/cli', to: 'cli' }
  ],
  publish: null,
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.developer-tools'
  },
  win: {
    target: ['nsis']
  },
  linux: {
    target: ['AppImage'],
    category: 'Development',
    maintainer: 'Synaptix contributors <noreply@synaptix.dev>',
    synopsis: 'Terminal and agent cockpit'
  }
};
