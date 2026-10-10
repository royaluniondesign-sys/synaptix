// Termora mobile companion scaffold.
// Native builds are intentionally disabled until push/deep-link requirements are implemented.

const pushEnvironment = process.env.TERMORA_IOS_PUSH_ENV === 'production' ? 'production' : 'development';

module.exports = {
  expo: {
    name: 'Termora',
    slug: 'termora-mobile',
    scheme: 'termora',
    version: '0.0.0',
    orientation: 'portrait',
    ios: {
      bundleIdentifier: 'com.termora.mobile',
      entitlements: {
        'aps-environment': pushEnvironment,
      },
    },
    android: {
      package: 'com.termora.mobile',
    },
    plugins: [],
  },
};
