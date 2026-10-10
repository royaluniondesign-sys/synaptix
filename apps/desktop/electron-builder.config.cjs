// Termora desktop packaging scaffold.
// This is not wired into CI release yet. It documents the intended artifact contract.

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.termora.app',
  productName: 'Termora',
  directories: {
    output: 'release/desktop',
    buildResources: 'resources'
  },
  files: [
    'dist/**',
    '../../packages/web/dist/**',
    '../../packages/agent/dist/**',
    '../../packages/cli/dist/**',
    '!**/*.map'
  ],
  extraResources: [
    { from: '../../packages/cli/dist', to: 'cli' }
  ],
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.developer-tools'
  },
  win: {
    target: ['nsis']
  },
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Development'
  }
};
