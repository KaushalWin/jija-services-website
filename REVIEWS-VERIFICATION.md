# Review feature verification — 2026-10-06

Prepared on branch `reviews-backend` in `/home/kaushal/telegram-codex-workspace/jija-reviews-20261006`, from website-only base `b14c65a8548a41bcb574a848397e3b5e23ca4781`. No push or production deployment was performed.

- Real workerd2026-10-01 and local D1: **20/20 tests passed**, 3.514 seconds. Log: `.review-qa/worker-test.log`.
- Anonymous Playwright/Chromium browser: **17 fixture assertions passed**, using desktop1440 and mobile360. Log: `.review-qa/ui-test.log`.
- Wrangler4.147.0 deployment **dry run passed**: 64 static files, Worker52.04KiB (gzip14.44KiB). Log: `.review-qa/wrangler-dry-run.log`. No remote deployment or remote database operation.
- npm dependency audit: **0 vulnerabilities** after updating the official development runtime.
- Current website product script, main stylesheet, catalog, product/PPE images, original posters and business-card assets are unchanged from the base commit. Public HTML changes are limited to reviews navigation/section, its scripts/styles and CSP permissions required by the API and submission-only Turnstile.

The runtime suite covers public static access; public listing without Turnstile; immediate negative-review publication; exact/concurrent idempotency; one-use challenge tokens, safe validation retries and cross-payload replay rejection; verification failure, wrong hostname/action and outage; atomic per-IP limits; malformed/body-size/honeypot/origin checks; literal HTML/SQL-looking input; indexed keyset pagination; protected admin HTML/JS/CSS/API; both approved emails; forged/wrong-signature/issuer/audience/expired/no-expiry tokens; email-header forgery; main/www/workers.dev plus encoded/case/backslash/dot/double-encoding aliases; atomic visibility/audit/summary and stale-version rejection; capped global/day requests creating no new IP counters; and missing-configuration denial while the public website remains available.

The browser suite covers safe text rendering, lazy verification loading, locked inputs during pending submission, duplicate-event prevention, retry key and payload retention after429, reset after success, payload retention after network outage, and no horizontal overflow. The UI checks discovered and fixed verification callbacks clearing submission feedback during reset. All preview reviews are explicit fixtures. The temporary anonymous browser closes in `finally`; no preview server or account browser is used.

Visual artifacts (ignored by Git and excluded from static build):

- `.review-qa/reviews-desktop.png`
- `.review-qa/reviews-mobile.png`
- `.review-qa/admin-desktop.png`

Independent review is still required. Actual Access onboarding/application/issuer/AUD, secret provisioning, real domain routing, production D1 migration, real challenge behavior, Free-plan live usage/CPU limits and authenticated moderator login are not verified by local fixtures. Access configuration remains empty and denies administrator access. The coordinator has an outstanding user decision about Access checkout terms/overage authorization. Production must remain on the current website-only release until that configuration and the separate release checks are complete.

## Owner replies source verification — 2026-10-11

This branch adds source-only owner replies to visible reviews. The separate owner-reply migration has not been applied to production, and no deployment, Cloudflare account action, production admin login, or secret access was performed.

- Local workerd and D1 runtime tests: **24/24 passed**. Coverage includes both approved administrator identities in the protected list response, publish/edit/remove, hidden/restored review semantics, stale and concurrent writes, reply-versus-moderation version races, atomic rollback when the reply-audit trigger fails, and migration preservation of existing review rows and summary.
- Anonymous Playwright fixtures: **45 checks passed** across desktop and mobile viewports. Coverage includes safe public reply rendering, independent reply/moderation controls, actor-scoped session drafts, account switching while a save is in flight, same-card mutation locking during refresh, storage-denied in-memory draft recovery, and recovery when a successful write is followed by a failed list refresh.
- The public review stylesheet was preserved and extended with reply styles. Screenshots were regenerated locally; all fixture names and text remain synthetic.

The admin list contract returns { actor, reviews, nextCursor, summary }, with actor set from the verified Access email and each row including reply text and its update time. The protected reply endpoints PATCH and DELETE /api/admin/reviews/:id/reply require Access and same-origin writes, compare the current review version, and return { id, visibility, version, owner_reply, owner_reply_updated_at }. GET /api/admin/reply-audit?reviewId=... returns private audit entries to an authenticated administrator.
