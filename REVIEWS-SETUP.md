# Reviews backend: deployed — see RELEASE-20261006.md

Base website commit: `b14c65a8548a41bcb574a848397e3b5e23ca4781`. Existing products, posters, catalog, contact details and business card are preserved. This release adds public reviews, an authenticated moderation interface, and a festival visual refresh. Current live verification and remaining human-assisted checks are recorded in RELEASE-20261006.md.

## Cloudflare resources

- Existing Worker: `jija-services-website`, confirmed Workers Free by the coordinator.
- D1: `jija-reviews`, binding `REVIEWS_DB`, verified ID `a1b6c740-11a3-4065-af94-e2195a43331d`.
- Turnstile: Managed, only `jijaservices.com` and `www.jijaservices.com`, pre-clearance off; public sitekey is configured. Private secret remains in the existing encrypted vault and must be provisioned into the Worker by the coordinator.
- Access: Zero Trust Free activated with explicit user authorization. Actual issuer and audience are configured for the application covering all of `admin.jijaservices.com`, with the two approved email addresses and One-time PIN only. No custom three-seat account-wide limit exists in the inspected Free settings.
- Worker secrets required: `TURNSTILE_SECRET` and a randomly generated `RATE_LIMIT_SECRET` of at least 32 characters. Never put their values in this repository, shell output, logs, or public variables.

## Deployment checklist (completed; retained for future releases)

1. Verify account, Free Workers plan, hostname routes, database identity, and the Turnstile hostname list again.
2. Configure a self-hosted Access application for the entire admin hostname. Its Allow policy must Include only `jijaservices@gmail.com` and `kaushalkhamar96@gmail.com`, and Require `One-time PIN`. Do not Include OTP alone or add Bypass rules. All admin HTML, JS, CSS and API requests must pass Access.
3. Set the actual HTTPS team issuer (`https://<team>.cloudflareaccess.com`, without a trailing slash) and this application's audience in Wrangler. Provision the two private Worker secrets using the coordinator's approved secret mechanism. Do not retrieve or export browser cookies or session state.
4. Apply `migrations/0001_reviews.sql` to the verified D1 database using the approved Cloudflare deployment workflow. Do not populate it with preview fixtures.
5. Attach `admin.jijaservices.com` to the same Worker only after the Access application is configured. Verify this route's DNS, HTTPS and actual Access login. `workers.dev` and preview URLs are disabled in the proposed config; the Worker additionally denies unknown hosts and all admin paths on the public/main/www hosts.
6. Complete independent source, local-test and visual review. Deployment was completed by the Sol 6.1 coordinator; see the release receipt for evidence and remaining human-assisted checks.

`assets.run_worker_first: true` is deliberate: a path-only rule cannot safely guard the admin hostname's root and every static asset. The Worker verifies Access JWT signature, RS256 algorithm, issuer, audience, expiry, issued-at and the two-email allowlist before asset lookup. Encoded separators, double encodings and admin aliases are denied or normalized before public asset lookup. The conservative setting invokes the Worker for ordinary static page/asset requests too, counting toward Workers Free's 100,000 requests/day and CPU limits. Future routing optimization needs equivalent tested host-aware protection; do not remove this setting just to lower usage.

## Review behavior and limits

- Public GET needs no login or Turnstile. Results are newest first, keyset-paginated, 1–20 per page. Indexed queries and a trigger-maintained singleton summary avoid scanning the entire review table on each page.
- POST validates JSON/body limits, name (1–80), stars (1–5), comment (10–2000), same-origin requests, honeypot and excessive links. Turnstile Siteverify must succeed with an approved hostname and `review` action. The challenge runs only after Write a review is opened.
- Submission UUID plus payload hash prevents duplicate insertions, including concurrent requests. Exact retries return the original ID. Siteverify receives a deterministic UUIDv5 bound to submission UUID, normalized payload hash and token, so retries of the same challenge can use Cloudflare's idempotent verification support. A different payload/token gets a different verification key.
- Accepted reviews publish immediately, including ordinary negative feedback. UI uses `textContent`, never user HTML. Inputs lock during submission, remain intact after errors/outages, and reset only after success.
- Rate reservations first enforce a global 2,000 attempts/day and 30/minute budget, then 5 attempts/10 minutes and 10/hour per HMAC-hashed IP. Caps include failed verification attempts. Exhausted global budgets create no new IP buckets. No raw IP is stored in D1. Expired counter cleanup is bounded to five rows per first accepted minute. These conservative limits keep submission writes comfortably below D1 Free's 100,000 rows/day; they are not a substitute for monitoring account-wide usage, and admin or other workloads share those limits.
- Moderators can show, hide or remove from the public listing, with a required reason, current version and same-origin PATCH. Removal is reversible: the record remains in D1. Visibility change, summary adjustment and the actor/reason audit trigger commit atomically. Stale edits return 409. Ordinary negative reviews should remain visible.
- No timed approval gate or session-revocation policy is implemented by this feature.

## Local verification

Requires Node22+. Use the locally cached official npm Node22 package without changing system Node when necessary:

```sh
npm exec --yes --package=node@22 -- npm ci --ignore-scripts
npm exec --yes --package=node@22 -- npm test
npm exec --yes --package=node@22 -- npm run build
npm exec --yes --package=node@22 -- npx wrangler deploy --dry-run --outdir .worker-dry-run
```

The runtime tests use real workerd and local D1 with generated RSA fixtures and a single-use Turnstile mock. No live accounts, production database, secrets or real challenges are used. Current official Miniflare5 development tooling is an alpha release, used with its documented v4-options converter; earlier stable workerd crashed on this host even with `--version`, whereas the current workerd2026-10-01 runs correctly.

Anonymous fixture UI checks use Playwright. The script supports the repository's installed `playwright` package or a supplied module via `PLAYWRIGHT_MODULE`, and an approved system Chromium via `PLAYWRIGHT_CHROMIUM_PATH`. It launches a fresh temporary browser context with the Chromium sandbox enabled, intercepts requests with local fixtures, closes the browser in `finally`, and starts no preview server. Example using the existing installed runtime:

```sh
PLAYWRIGHT_MODULE=/home/kaushal/.local/share/secretary-browser/node_modules/playwright/index.mjs \
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium \
npm exec --yes --package=node@22 -- npm run test:ui
```

Screenshots are `.review-qa/reviews-desktop.png` (viewport1440), `reviews-mobile.png` (viewport360), and `admin-desktop.png`. Public screenshots isolate the section by hiding sticky navigation only during capture; production CSS is unchanged. All names/comments are explicitly preview fixtures and must never enter the production database.

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Access JWT verification](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Access policy examples](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/), [Turnstile verification and idempotent retries](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Playwright persistent profiles](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context).
