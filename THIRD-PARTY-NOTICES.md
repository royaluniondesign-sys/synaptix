# Third-party notices

Termora is MIT-licensed (see `LICENSE`). It bundles or loads these third-party assets:

| Asset | Where | License |
| --- | --- | --- |
| Geist, Geist Mono | `@fontsource/geist`, `@fontsource/geist-mono`, bundled into the web build | SIL Open Font License 1.1 |
| Instrument Serif | `@fontsource/instrument-serif`, copied into the public site build | SIL Open Font License 1.1 |
| Fira Code | loaded from Google Fonts by `packages/web/index.html` (Settings view) | SIL Open Font License 1.1 |

Earlier versions bundled font files named Anthropic Sans, Anthropic Mono, Anthropic Serif and Styrene A under `packages/web/public/fonts`. They had no license file and were copied from a vendor CDN, so they were removed. They remain in the git history of commits before this change. Do not reintroduce them.

Dependency licenses are those of the packages listed in `package-lock.json`.
