# Publishing the public site

The site in `site/` is built by CI on every change (`.github/workflows/site.yml`) and kept as a
7-day workflow artifact. Nothing publishes it automatically.

`.github/workflows/pages.yml` publishes it to GitHub Pages. It runs by itself when a change to the
site reaches `main` (files in `site/`, `scripts/build-site.mjs`, the logo, or the workflow itself), and
it can also be started by hand. Changes to the application under `packages/` do not publish anything.
The page tests run first; if they fail, nothing is deployed.

## One-time setup

1. In the repository, open **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

GitHub Pages is free for public repositories. This repository is public.

## Publish

Merge a change to the site into `main`. The `Publish site (GitHub Pages)` workflow starts on its own,
and when its `Deploy to GitHub Pages` job finishes, the summary shows the URL. For this repository it
is `https://royaluniondesign-sys.github.io/synaptix/`.

To publish without changing the site, open **Actions > Publish site (GitHub Pages) > Run workflow**
on `main`. Take the site down from **Settings > Pages**.

## Custom domain (optional, later)

Pages supports a custom domain in **Settings > Pages > Custom domain**, with a `CNAME` DNS record
that points to `royaluniondesign-sys.github.io`. GitHub issues the HTTPS certificate. A domain is
the only part that is not free: registering a stable one costs a small yearly fee.

The site and the demo use relative paths, so they work both under `/synaptix/` and on a custom
domain. This was checked by hand in Chromium under a `/synaptix/` prefix; there is no automated
sub-path check yet. `scripts/__tests__/site.test.mjs` does check the page for remote requests.

## What the site must not claim

Until a signed release exists, the site must not offer a download or say the desktop builds are
signed or published. `scripts/__tests__/site.test.mjs` enforces this.
