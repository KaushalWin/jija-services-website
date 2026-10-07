# Public storefront autumn/Halloween release QA

Prepared in `/home/kaushal/telegram-codex-workspace/jija-reviews-20261006` on baseline `82b5ac2`. Implementation only; no deploy, push, credentials or account operations by this agent.

## Final behavior

- Public storefront uses navy, warm ivory, dark burnt orange and forest-green brand accents. Original logo, 37 products/specifications/photos, delivery terms and customer contact information remain intact. Autumn SVG leaves, bats and a corner web decorate the theme; actual product photographs retain their original colors.
- Hero uses the approved Halloween artwork with readable HTML copy. Mobile places the artwork in a separate panel beneath the copy. A prominent Supplies for Every Occasion banner immediately follows the hero, before Packaging & Delivery; its artwork opens the full PNG.
- Retail card has an orange Best price badge with reserved label space, including at 320px. Halloween poster leads the five-poster collection and has a WebP view plus PDF download. Retired priced JPGs remain source-only and are excluded from the published build.
- Synchronous external `seasonal-theme.js` runs before the stylesheets. Active interval is `[2026-10-07T15:20:00Z, 2026-11-04T15:30:00Z)`. All themed presentation is scoped to the document attribute. Original hero text/artwork and baseline styling return at expiry, including already-open tabs; visibility changes recheck the clock. The Halloween poster remains in the collection afterward. Without JavaScript, the original hero/default styling is used.
- Public theme includes navigation, packs, eco/healthcare, product ranges/catalog/dialog, about/values/marketplaces, reviews/form, contact and footer. Private admin styling and review backend/auth are unchanged.

## Executed local verification

- `npm exec --yes --package=node@22 -- npm run build`: passed.
- `npm exec --yes --package=node@22 -- node tests/visual-site.mjs`: **212 assertions passed** at 1440/1024/768/360/320. Checked all visible images, missing assets/JS errors, overflow, menu/anchors, search, all 37 dialogs each desktop/mobile, dialog close, five poster view/download targets and touch heights, PNG/PDF signatures, retired-asset exclusion, banner placement/size, badge/text collision, representative AA contrast samples, reduced motion, active theme, post-expiry defaults, live expiry and pre-start transition.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm exec --yes --package=node@22 -- node tests/ui-review.mjs`: **33 fixture assertions passed**. Themed and expired desktop/mobile review forms retain literal XSS-looking text, lazy challenge loading, disable inputs during POST, prevent duplicate submission, preserve text on errors/outages, reuse submission identity for retries and reset on success. These are local fixtures, not real reviews or challenge bypasses.
- `node --check seasonal-theme.js`, `git diff --check`, final build asset/bootstrap ordering and sequential poster numbering: passed.
- Chromium sandbox remained enabled. No preview server was started. No production writes, real review submission, CAPTCHA interaction or account operations occurred.

## Visual self-review and independent review inputs

Actual local rendered screenshots are under `.review-qa/` (ignored artifacts):

- `site-top-{1440,1024,768,360,320}.png`, `site-full-{1440,360}.png`
- `occasion-banner-{1440,360}.png`, `retail-badge-{1440,360}.png`, `halloween-card-{1440,360}.png`, `festivals-{1440,360}.png`
- `site-{eco,healthcare,packs,range,about,values,contact}-{1440,360}.png`
- `dialog-{1440,1024,768,360,320}.png`
- `reviews-{desktop,mobile,desktop-expired,mobile-expired}.png`
- `default-expired-{1440,1024,768,360,320}.png`
- Logs: `halloween-visual.log`, `halloween-reviews-ui.log`.

Self-review found and fixed poster numbering after moving Halloween first. Public imagery, typography, photo panels, cards, controls and lower-page colors look coherent. Full `site-packs-360.png` verifies complete cards; one isolated element capture can show a stitched screenshot crop despite correct DOM geometry. No remaining core functionality issue found. Root independent visual review and production anonymous checks remain release steps.

## Source ownership

Agent-owned implementation: `index.html`, `styles.css`, `seasonal.css`, `seasonal-theme.js`, `assets/seasonal/autumn-corner.svg`, `scripts/build-static.sh`, `.gitattributes`, `tests/{visual-site,ui-review,production-site,production-smoke}.mjs`, this evidence note.

Root-provided assets: revised business banner PNG, Halloween hero WebP, Halloween poster WebP/PDF, and updated business-card PNG/PDF. These were preserved. Review backend/auth source was not changed. No agent commit or staging occurred; root handles the final combined asset review, commit and deployment.
