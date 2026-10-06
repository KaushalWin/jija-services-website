# Seasonal visual refresh — 2026-10-06

The festival collection now has a celebration banner, four balanced cards, uncropped original artwork, separate view/download links, and a supplies-planning contact action. Existing poster files, products, prices, catalog data, delivery details, and customer feedback are preserved. The general artwork still asks visitors to confirm offers before ordering.

Desktop uses a two-by-two collection with artwork beside the copy. Tablet keeps two columns and stacks each card. Phones show one column. Poster actions have 44px minimum touch targets, visible keyboard focus, accessible names, and reduced-motion support. No new product claims or prices are added.

## Verification

- Anonymous whole-site Playwright fixture checks: **78 passed**, at viewport widths **1440, 1024, 768, 360, 320**.
- Every site image loaded successfully; no page errors or missing assets; no horizontal or section overflow.
- All four original poster paths, view/download destinations, uncropped rendering, and minimum action target sizes checked.
- Existing 37-product catalog checked, including SKU search, product dialog, Escape close, desktop navigation and mobile menu/anchor behavior.
- Existing review browser fixture checks: **17 passed** after this refresh, including safe text, lazy challenge loading, duplicate-submission guard, retained form/key on errors, and successful reset.
- Desktop festival, hero, eco, healthcare, delivery, product range, about, values, and contact captures were visually inspected; festival and healthcare mobile captures were inspected for legibility and clipping.
- Source whitespace check passed. Poster files, product data, and backend source are unchanged by the visual commit.

Reproduce on this Linux host, using a local Node 22 runtime without changing the system runtime:

```
npm exec --yes --package=node@22 -- npm run build
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm exec --yes --package=node@22 -- node tests/visual-site.mjs
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm exec --yes --package=node@22 -- npm run test:ui
```

Evidence stays in ignored `.review-qa/`: `visual-site.log`, `ui-test.log`, `festivals-1440.png`, `festivals-360.png`, `site-top-{width}.png`, and `site-full-1440.png` / `site-full-360.png`. Individual eco, healthcare, packs, range, about, values, and contact captures are also saved as `site-{section}-{width}.png` for 1440/360. The collection and full-page captures omit the sticky navigation only during capture so it does not obscure stitched content; the unmodified navigation is separately tested and visible in top-of-page captures.

These are anonymous local static fixtures, not production end-to-end evidence. No account profile, live review submission, external server, production push, or deployment is used. Browser contexts are temporary and closed, Chromium sandbox remains enabled, and no preview server stays running. Root coordinates real Access configuration, secret provisioning, deployment, and production checks separately.