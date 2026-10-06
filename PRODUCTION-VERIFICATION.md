# Production public-site verification — 2026-10-06

Independent anonymous browser run against https://jijaservices.com finished at 2026-10-06T16:00:37Z. No route fixtures, account profile, review writes, or Turnstile solving were used. Root reported Worker version `6f53e78b-16de-49ab-bbca-de420a83501b`; this browser run independently verifies the live behavior, not the version identifier.

## Independent live results

**104 checks passed** at 1440px desktop and 360px mobile:

- All 37 product dialogs opened at each width (74 opens total), with correct product titles, loaded artwork, no dialog horizontal overflow, and Escape close.
- All main-site images loaded. No horizontal/section overflow, JavaScript page errors, unexpected failed requests, or writes to the website occurred.
- Desktop/mobile festival navigation, menu collapse, SKU search, and PPE category filtering passed.
- Four original poster downloads, catalog PDF, and business-card PDF returned 200 with correct MIME and bytes matching the original checkout SHA-256 hashes.
- Review API returned 200. The recorded snapshot contained two root-created labelled test reviews, average 3; root was concurrently running seeded moderation tests. The first desktop page had loaded the earlier empty state. These are temporary test records, not customer testimonials.
- Live analytics script was injected by Cloudflare and was blocked by public CSP. This optional analytics failure was separately classified; customer functionality passed.

Evidence: `.review-qa/production/report.json`, `.review-qa/production-site.log`, and `.review-qa/production/{site-top,site-full,festivals,reviews,product-modal}-{1440,360}.png`. Collection/full-page captures temporarily omit the sticky header to avoid obscuring stitched images; top captures and navigation checks use the original page.

Reproduce the live read-only run (does not submit reviews or solve challenges):

```
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm exec --yes --package=node@22 -- node tests/production-site.mjs
```

## Narrow analytics correction

Only public `index.html` CSP adds `https://static.cloudflareinsights.com` to `script-src` and `https://cloudflareinsights.com` to `connect-src`. Admin CSP and Worker authorization remain unchanged. This retains the existing Cloudflare analytics integration without allowing wildcards or unrelated origins.

Official source: https://developers.cloudflare.com/fundamentals/reference/policies-compliances/content-security-policies/ (Web Analytics entries).

Local anonymous CSP browser fixture passed: exact analytics script/report origins are allowed; unrelated script and connect origins remain blocked; Turnstile remains lazy. Existing review browser tests passed 17 checks after this correction. Logs: `.review-qa/csp-analytics.log`, `.review-qa/ui-test.log`.

```
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm exec --yes --package=node@22 -- node tests/csp-analytics.mjs
```

At this evidence commit, the narrow correction is ready for root deployment; it is not yet independently verified live. After deployment, only a relevant analytics/API/page smoke check is needed; repeating all 74 dialog opens is unnecessary unless new changes warrant it.

## Root-reported account/admin results and remaining limits

Root separately authenticated to admin with the existing Cloudflare identity and tested desktop Hide/Show/Remove plus mobile Remove on labelled seed records. Root reported correct authenticated actor/reasons in durable audit history and no 360px admin overflow. Root then removed both seeds publicly and confirmed count 0, average null by HTTP. The delegated production browser never opened an account or admin session.

**Public review submission did not complete end-to-end**: actual Managed Turnstile requested the human verification challenge, which was not automated or bypassed. Local Worker/D1 and form fixtures cover challenge validation/submission behavior, but do not establish a successful production human submission.

**Email-code login did not complete end-to-end**: root reported delivery works, but the connector withheld the OTP. Existing Cloudflare identity authentication was used for the admin tests. Root coordinates restoring the intended email-OTP-only Access policy and signing out; this document does not claim that restoration or logout has finished.