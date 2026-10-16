# Brand

The public site, the README and the app share one look. Change it here first, then in the places listed below.

## Colours

| Token | Value | Use |
| --- | --- | --- |
| Violet | `#7170ff` | Primary colour. Backgrounds of blocks, accents, the logo tile. |
| Violet, light | `#9a99ff` | Accent text on black (7.9:1). |
| Violet, deep | `#4a48d8` | Accent text on white (6:1). |
| Black | `#09090b` | The app background, text on light, borders. |
| White | `#fafafa` | Text on black, light backgrounds. |

Large display text on white may use `#5f5df0` (4.4:1). Violet with black text is 5.2:1; violet with white text is 3.7:1, so use it only for large type.

## Fonts

Instrument Serif for display headings, Geist for text, Geist Mono for labels and code. All three are SIL OFL 1.1 and come from the `@fontsource` packages. The public site serves them itself; it makes no requests to font CDNs.

## Logo

`assets/termora-logo.svg`: a T whose crossbar ends in a prompt arrow, with a cursor block beside the stem. It is the source for `packages/web/public/termora-logo.svg`, the PWA icons (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) and `apps/desktop/resources/icon.png`. Use it on violet or on white. Do not recolour it or add effects.

## Banner

`assets/termora-banner.png` (2560 × 1280) is rendered from `assets/banner-source.html`. It is also the right size for the GitHub social preview, which only a repository admin can set under Settings → General → Social preview.

To render it, run Playwright against the source file and screenshot the page at 1280 × 640 with a device scale factor of 2. Fonts load from `node_modules`, so run `npm ci` first.

## Where it is used

- `site/index.html`: colours and fonts as CSS variables.
- `packages/web/src/index.css`: the app's palette.
- `README.md`: banner and badge colours.
- `packages/web/public/manifest.json` and `packages/web/index.html`: theme and background colour `#09090b`.
