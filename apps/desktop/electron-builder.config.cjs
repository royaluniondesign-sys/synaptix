// Termora desktop packaging config (unsigned).
//
// Packages the directory produced by scripts/stage-app.mjs. No signing,
// notarization or publishing is configured here; scripts/package-desktop-unsigned.mjs
// refuses signing credentials and always passes `--publish never`.

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.termora.app',
  productName: 'Termora',
  artifactName: 'Termora-${version}-${os}-${arch}.${ext}',
  directories: {
    app: 'stage',
    output: 'release/desktop',
    buildResources: 'resources'
  },
  // asar is off for the first artifacts: the agent resolves the web UI relative
  // to its own files and node-pty ships a helper binary that must be executable.
  asar: false,
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
    maintainer: 'Termora contributors <noreply@termora.dev>',
    synopsis: 'Terminal and agent cockpit'
  }
};
