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

Root deployed the narrow correction and reported final Worker version `6f27b77b-5c68-46c8-81e8-244e3d41672a`. The brief independent live smoke below verifies deployed public CSP and customer functionality. Repeating all 74 dialog opens was unnecessary because the final change only adds analytics CSP origins.

## Root-reported account/admin results and remaining limits

Root separately authenticated to admin with the existing Cloudflare identity and tested desktop Hide/Show/Remove plus mobile Remove on labelled seed records. Root reported correct authenticated actor/reasons in durable audit history and no 360px admin overflow. Root then removed both seeds publicly and confirmed count 0, average null by HTTP. The delegated production browser never opened an account or admin session.

**Public review submission did not complete end-to-end**: actual Managed Turnstile requested the human verification challenge, which was not automated or bypassed. Local Worker/D1 and form fixtures cover challenge validation/submission behavior, but do not establish a successful production human submission.

**Email-code login did not complete end-to-end**: root reported delivery works, but the connector withheld the OTP. Existing Cloudflare identity authentication was used for the admin tests. Root coordinates restoring the intended email-OTP-only Access policy and signing out; this document does not claim that restoration or logout has finished.

## Final release public smoke

Anonymous live desktop1440/mobile360 smoke finished at 2026-10-06T16:10:48.786Z with no route fixtures, account profile, review write, or challenge interaction:

- Homepage returned200 and deployed CSP contains both exact analytics origins. No analytics CSP rejections or JavaScript page errors.
- Public reviewAPI returned200 with `reviews:[]`, `nextCursor:null`, count0 and average null; empty UI state verified at both sizes.
- All37 product cards remain present; all four festival posters loaded; mobile menu/festival navigation works; no horizontal overflow.
- Turnstile stayed unloaded because the review form was not opened. No review POST or account operation occurred.
- **Analytics end-to-end loading remains unverified on this Linux host**: its existing resolver maps both `static.cloudflareinsights.com` and `cloudflareinsights.com` to `0.0.0.0`, and the browser reports `net::ERR_CONNECTION_REFUSED`. A read-only `getent ahostsv4` check confirmed both mappings; `curl` also could not connect. This is a local DNS filter/network block rather than a remaining CSP rejection. No DNS/filter change or bypass was attempted. Local CSP fixtures previously verified allowed origins and blocked unrelated origins.

Final evidence: `.review-qa/production/final-smoke.json`, `.review-qa/production-smoke.log`, `.review-qa/production/final-festivals-360.png`, and `final-reviews-360.png`. The report separately marks `publicSmokePassed:true` and `analyticsEndToEndVerified:false`.

```
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm exec --yes --package=node@22 -- node tests/production-smoke.mjs
```

Public Managed Turnstile human submission and email-OTP completion retain the limitations described above. Root handles final account policy/session state and release push; the delegated browser made no account or DNS changes.
