# Publishing the public site

The site in `site/` is built by CI on every change (`.github/workflows/site.yml`) and kept as a
7-day workflow artifact. Nothing publishes it automatically.

`.github/workflows/pages.yml` publishes it to GitHub Pages when someone runs it by hand.

## One-time setup

1. In the repository, open **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

GitHub Pages is free for public repositories. This repository is public.

## Publish

1. Open **Actions > Publish site (GitHub Pages) > Run workflow** on `main`.
2. When the `Deploy to GitHub Pages` job finishes, its summary shows the URL. For this repository it
   is `https://royaluniondesign-sys.github.io/termora/`.

Re-run the workflow to publish a newer version. Take the site down from **Settings > Pages**.

## Custom domain (optional, later)

Pages supports a custom domain in **Settings > Pages > Custom domain**, with a `CNAME` DNS record
that points to `royaluniondesign-sys.github.io`. GitHub issues the HTTPS certificate. A domain is
the only part that is not free: registering a stable one costs a small yearly fee.

The site and the demo use relative paths, so they work both under `/termora/` and on a custom
domain. This was checked by hand in Chromium under a `/termora/` prefix; there is no automated
sub-path check yet. `scripts/__tests__/site.test.mjs` does check the page for remote requests.

## What the site must not claim

Until a signed release exists, the site must not offer a download or say the desktop builds are
signed or published. `scripts/__tests__/site.test.mjs` enforces this.
