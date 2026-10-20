// Synaptix mobile companion scaffold.
// Native builds are intentionally disabled until push/deep-link requirements are implemented.

const pushEnvironment = process.env.SYNAPTIX_IOS_PUSH_ENV === 'production' ? 'production' : 'development';

module.exports = {
  expo: {
    name: 'Synaptix',
    slug: 'synaptix-mobile',
    scheme: 'synaptix',
    version: '0.0.0',
    orientation: 'portrait',
    ios: {
      bundleIdentifier: 'com.synaptix.mobile',
      entitlements: {
        'aps-environment': pushEnvironment,
      },
    },
    android: {
      package: 'com.synaptix.mobile',
    },
    plugins: [],
  },
};
