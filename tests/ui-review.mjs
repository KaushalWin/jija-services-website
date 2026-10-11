// Anonymous local fixtures only. No account profile, preview server, or live API is used.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const publicFixture = [
  { id: '1', display_name: 'Preview fixture — not a real customer', stars: 2, comment: '<img src=x onerror="window.__reviewXss=1"> Preview feedback stays literal, including markup. Ordinary negative reviews remain visible.', owner_reply: '<img src=x onerror="window.__replyXss=1"> A public response fixture.', owner_reply_updated_at: 1700000001, created_at: 1700000000 },
  { id: '2', display_name: 'Second preview fixture', stars: 5, comment: 'Preview text for checking card spacing, rating, and date on small screens.', owner_reply: null, owner_reply_updated_at: null, created_at: 1700000002 }
];
const dist = path.resolve('dist');
await mkdir('.review-qa', { recursive: true });
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : { channel: 'chromium' }), headless: true, chromiumSandbox: true });
let count = 0;
try {
  for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 360, height: 800 }], ['desktop-expired', { width: 1440, height: 1000 }], ['mobile-expired', { width: 360, height: 800 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.clock.install({ time: new Date(label.includes('expired') ? '2026-11-05T12:00:00Z' : '2026-10-15T12:00:00Z') });
    let postCount = 0;
    const posted = [];
    let release;
    let mode = 'hold';
    await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({ contentType: 'text/javascript', body: 'window.turnstile={render:(target,options)=>{document.querySelector(target).textContent="Verification preview (test fixture)"; window.__fixtureOptions=options; options.callback("fixture-token");return 1;},reset:()=>window.__fixtureOptions.callback("fresh-fixture-token")};' }));
    await page.route('https://jijaservices.com/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === '/api/reviews/config') return route.fulfill({ json: { sitekey: 'fixture-only' } });
      if (url.pathname === '/api/reviews') {
        if (request.method() === 'POST') {
          postCount++;
          posted.push({ body: request.postDataJSON(), key: request.headers()['idempotency-key'] });
          if (mode === 'hold') { await new Promise(resolve => { release = resolve; }); return route.fulfill({ status: 429, json: { error: 'Too many attempts. Please try again later.' } }); }
          if (mode === 'abort') return route.abort('failed');
          return route.fulfill({ status: 201, json: { id: 'fixture-created' } });
        }
        return route.fulfill({ json: { reviews: publicFixture, nextCursor: null, summary: { count: 2, average: 3.5 } } });
      }
      const filename = path.resolve(dist, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
      if (!filename.startsWith(dist + path.sep)) return route.fulfill({ status: 404, body: '' });
      try {
        const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf' }[path.extname(filename)] || 'text/plain';
        return route.fulfill({ body: await readFile(filename), contentType: mime });
      } catch { return route.fulfill({ status: 404, body: '' }); }
    });
    await page.goto('https://jijaservices.com/', { waitUntil: 'networkidle' });
    await page.locator('#review-list article').first().waitFor();
    assert.equal(await page.locator('#review-list img').count(), 0);
    assert.equal(await page.evaluate(() => window.__reviewXss), undefined);
    assert.equal(await page.evaluate(() => window.__replyXss), undefined);
    assert.equal(await page.locator('.review-owner-reply-label').first().textContent(), 'Reply from JIJA Services');
    assert.equal((await page.locator('.review-owner-reply').first().textContent()).includes('<img src=x'), true);
    count++;
    assert.equal(await page.locator('script[src*="challenges.cloudflare.com"]').count(), 0); count++;
    await page.locator('#write-review').click();
    await page.locator('#review-name').fill('Preview Customer');
    await page.locator('#review-rating').selectOption('2');
    await page.locator('#review-comment').fill('Preview text entered into the review form. This must survive a failed request.');
    await page.locator('.site-header').evaluate(header => { window.__previewHeader = header; window.__previewHeaderNext = header.nextSibling; header.remove(); });
    await page.locator('#reviews').screenshot({ path: '.review-qa/reviews-' + label + '.png' });
    await page.evaluate(() => { document.body.insertBefore(window.__previewHeader, window.__previewHeaderNext); delete window.__previewHeader; delete window.__previewHeaderNext; });
    await page.getByRole('button', { name: 'Publish review' }).click();
    await page.waitForFunction(() => document.querySelector('#review-name').disabled);
    assert.equal(await page.locator('#review-name').isDisabled(), true); count++;
    await page.locator('#review-form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(postCount, 1); count++;
    release();
    await page.locator('#review-status').filter({ hasText: 'Too many attempts' }).waitFor();
    assert.equal(await page.locator('#review-name').inputValue(), 'Preview Customer');
    assert.equal(await page.locator('#review-rating').inputValue(), '2');
    assert.equal(await page.locator('#review-name').isDisabled(), false); count++;
    mode = 'success';
    await page.getByRole('button', { name: 'Publish review' }).click();
    await page.locator('#review-status').filter({ hasText: 'Your review has been published' }).waitFor();
    assert.equal(posted[1].key, posted[0].key);
    assert.equal(await page.locator('#review-name').inputValue(), ''); count++;
    await page.locator('#review-name').fill('Preserved after outage');
    await page.locator('#review-rating').selectOption('3');
    await page.locator('#review-comment').fill('Network outage fixture text must remain in the form.');
    mode = 'abort';
    await page.getByRole('button', { name: 'Publish review' }).click();
    await page.locator('#review-status').filter({ hasText: 'Could not connect' }).waitFor();
    assert.equal(await page.locator('#review-name').inputValue(), 'Preserved after outage'); count++;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true); count++;
    await context.close();
  }

  const adminReviews = [
    { id: 'new-review', display_name: 'Preview customer with no reply', stars: 3, comment: 'Preview fixture comment for the owner reply editor.', created_at: 1700000100, visibility: 'visible', version: 1, owner_reply: null, owner_reply_updated_at: null },
    { id: 'existing-review', display_name: 'Preview customer with a reply', stars: 4, comment: 'Second preview fixture comment.', created_at: 1700000000, visibility: 'visible', version: 2, owner_reply: 'A reply already published in this fixture.', owner_reply_updated_at: 1700000050 }
  ];
  const replyAudit = [];
  let adminActor = 'owner@example.test';
  let holdNextWrite = false;
  let writeStartedResolve;
  let releaseWriteResolve;
  let failNextWrite = false;
  let failNextList = false;

  async function adminHandler(route) {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/admin/reviews' && request.method() === 'GET') {
      if (failNextList) {
        failNextList = false;
        return route.fulfill({ status: 503, json: { error: 'Temporary review-list refresh failure.' } });
      }
      return route.fulfill({ json: { actor: adminActor, reviews: adminReviews.map(row => ({ ...row })), nextCursor: null } });
    }
    if (url.pathname === '/api/admin/audit') return route.fulfill({ json: { audit: [] } });
    if (url.pathname === '/api/admin/reply-audit') return route.fulfill({ json: { audit: [...replyAudit].reverse() } });
    const match = /^\/api\/admin\/reviews\/([^/]+)\/reply$/.exec(url.pathname);
    if (match && ['PATCH', 'DELETE'].includes(request.method())) {
      const review = adminReviews.find(row => row.id === match[1]);
      const body = request.postDataJSON();
      if (failNextWrite) {
        failNextWrite = false;
        return route.fulfill({ status: 409, json: { error: 'This review changed. Refresh before changing its reply.' } });
      }
      if (holdNextWrite) {
        holdNextWrite = false;
        writeStartedResolve();
        await new Promise(resolve => { releaseWriteResolve = resolve; });
      }
      if (!review || review.version !== body.version) return route.fulfill({ status: 409, json: { error: 'This review changed. Refresh before changing its reply.' } });
      const oldReply = review.owner_reply;
      review.owner_reply = request.method() === 'DELETE' ? null : body.reply.trim();
      review.owner_reply_updated_at = review.owner_reply ? 1700000200 : null;
      review.version++;
      replyAudit.push({ action: oldReply === null ? 'publish' : review.owner_reply === null ? 'remove' : 'edit', actor_email: 'owner@example.test', old_reply: oldReply, new_reply: review.owner_reply, changed_at: 1700000200, review_version: review.version });
      return route.fulfill({ json: { id: review.id, visibility: review.visibility, version: review.version, owner_reply: review.owner_reply, owner_reply_updated_at: review.owner_reply_updated_at } });
    }
    if (url.pathname === '/api/admin/reviews/' + adminReviews[0].id && request.method() === 'PATCH') {
      return route.fulfill({ json: { id: adminReviews[0].id, visibility: 'hidden', version: adminReviews[0].version + 1 } });
    }
    const filename = path.resolve(dist, url.pathname === '/' ? 'admin/index.html' : '.' + url.pathname);
    if (!filename.startsWith(dist + path.sep)) return route.fulfill({ status: 404, body: '' });
    try {
      return route.fulfill({ body: await readFile(filename), contentType: filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : 'text/html' });
    } catch { return route.fulfill({ status: 404, body: '' }); }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.route('https://admin.jijaservices.com/**', adminHandler);
  await page.goto('https://admin.jijaservices.com/', { waitUntil: 'networkidle' });
  const card = page.locator('article[data-review-id="new-review"]');
  await card.waitFor();
  assert.equal(await card.getByRole('heading', { name: 'Reply to customer' }).count(), 1);
  assert.equal(await card.getByRole('heading', { name: 'Review visibility' }).count(), 1);
  assert.equal(await page.locator('.reply-panel img').count(), 0);
  await page.locator('main').screenshot({ path: '.review-qa/admin-desktop.png' });
  count++;

  const draft = '  First response held while the owner edits a newer draft.  ';
  const replyField = card.locator('.reply-panel textarea');
  await replyField.fill(draft);
  holdNextWrite = true;
  const writeStarted = new Promise(resolve => { writeStartedResolve = resolve; });
  await card.getByRole('button', { name: 'Publish reply' }).click();
  await writeStarted;
  await page.locator('#refresh').click();
  const refreshedCard = page.locator('article[data-review-id="new-review"]');
  await refreshedCard.locator('.reply-panel textarea').waitFor();
  assert.equal(await refreshedCard.locator('.reply-panel textarea').inputValue(), draft);
  assert.equal(await refreshedCard.locator('.reply-controls button').evaluateAll(buttons => buttons.every(button => button.disabled)), true);
  assert.equal(await refreshedCard.locator('.moderation-controls button').evaluateAll(buttons => buttons.every(button => button.disabled)), true);
  assert.equal(await refreshedCard.locator('.reply-panel textarea').isDisabled(), false);
  const newerDraft = draft;
  await refreshedCard.locator('.reply-panel textarea').fill(newerDraft);
  releaseWriteResolve();
  await page.locator('#status').filter({ hasText: 'Reply published on the website.' }).waitFor();
  assert.equal(await page.locator('article[data-review-id="new-review"] .reply-panel textarea').inputValue(), newerDraft);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('jija-owner-reply-draft:owner@example.test:new-review')), newerDraft);
  count++;

  const currentCard = page.locator('article[data-review-id="new-review"]');
  assert.equal(await currentCard.getByRole('button', { name: 'Save reply changes' }).isDisabled(), true);
  assert.equal(await currentCard.locator('.reply-panel textarea').inputValue(), newerDraft);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('jija-owner-reply-draft:owner@example.test:new-review')), newerDraft);
  count++;

  const historyCard = page.locator('article[data-review-id="new-review"]');
  await historyCard.getByRole('button', { name: 'View reply history' }).click();
  await historyCard.locator('.reply-panel .history:not([hidden])').waitFor();
  assert.equal(await historyCard.locator('.reply-panel .history img').count(), 0);
  count++;

  page.on('dialog', dialog => dialog.accept());
  failNextList = true;
  await historyCard.getByRole('button', { name: 'Remove reply from website' }).click();
  await page.locator('#status').filter({ hasText: 'This card shows the saved result' }).waitFor();
  const removedCard = page.locator('article[data-review-id="new-review"]');
  assert.equal(await removedCard.locator('.reply-status').textContent().then(text => text.includes('refresh to check the latest details')), true);
  assert.equal(await removedCard.locator('.published-reply').count(), 0);
  assert.equal(await removedCard.getByRole('button', { name: 'Publish reply' }).count(), 1);
  assert.equal((await removedCard.locator('.review-meta').textContent()).includes('On the website'), true);
  count++;

  failNextWrite = true;
  const retryDraft = 'This draft remains here after the server reports an error.';
  await removedCard.locator('.reply-panel textarea').fill(retryDraft);
  await removedCard.getByRole('button', { name: 'Publish reply' }).click();
  await removedCard.locator('.reply-status').filter({ hasText: 'This review changed' }).waitFor();
  assert.equal(await removedCard.locator('.reply-panel textarea').inputValue(), retryDraft);
  await page.locator('#refresh').click();
  await page.locator('article[data-review-id="new-review"] .reply-panel textarea').waitFor();
  assert.equal(await page.locator('article[data-review-id="new-review"] .reply-panel textarea').inputValue(), retryDraft);
  count++;

  adminActor = 'second-owner@example.test';
  await page.locator('#refresh').click();
  await page.locator('#status').filter({ hasText: 'Reviews loaded.' }).waitFor();
  assert.equal(await page.locator('article[data-review-id="new-review"] .reply-panel textarea').inputValue(), '');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('jija-owner-reply-draft:owner@example.test:new-review')), null);
  count++;
  const secondAdminDraft = 'A private draft for the second approved owner.';
  await page.locator('article[data-review-id="new-review"] .reply-panel textarea').fill(secondAdminDraft);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('jija-owner-reply-draft:second-owner@example.test:new-review')), secondAdminDraft);
  await page.locator('#sign-out').evaluate(link => { link.addEventListener('click', event => event.preventDefault(), { once: true }); link.click(); });
  assert.equal(await page.evaluate(() => sessionStorage.getItem('jija-owner-reply-draft:second-owner@example.test:new-review')), null);
  count++;

  const sameTextAcrossOwners = 'Same words, kept for the newly signed-in owner.';
  await page.locator('article[data-review-id="new-review"] .reply-panel textarea').fill(sameTextAcrossOwners);
  holdNextWrite = true;
  const actorWriteStarted = new Promise(resolve => { writeStartedResolve = resolve; });
  await page.locator('article[data-review-id="new-review"]').getByRole('button', { name: 'Publish reply' }).click();
  await actorWriteStarted;
  adminActor = 'owner@example.test';
  await page.locator('#refresh').click();
  await page.locator('#status').filter({ hasText: 'Reviews loaded.' }).waitFor();
  await page.locator('article[data-review-id="new-review"] .reply-panel textarea').fill(sameTextAcrossOwners);
  releaseWriteResolve();
  await page.locator('#status').filter({ hasText: 'Reply published on the website.' }).waitFor();
  assert.equal(await page.locator('article[data-review-id="new-review"] .reply-panel textarea').inputValue(), sameTextAcrossOwners);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('jija-owner-reply-draft:owner@example.test:new-review')), sameTextAcrossOwners);
  count++;
  await page.locator('#sign-out').evaluate(link => { link.addEventListener('click', event => event.preventDefault(), { once: true }); link.click(); });
  assert.equal(await page.evaluate(() => sessionStorage.getItem('jija-owner-reply-draft:owner@example.test:new-review')), null);
  count++;
  await context.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value() { throw new DOMException('blocked', 'SecurityError'); } });
    Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value() { throw new DOMException('blocked', 'SecurityError'); } });
    Object.defineProperty(Storage.prototype, 'removeItem', { configurable: true, value() { throw new DOMException('blocked', 'SecurityError'); } });
    Object.defineProperty(Storage.prototype, 'key', { configurable: true, value() { throw new DOMException('blocked', 'SecurityError'); } });
    Object.defineProperty(Storage.prototype, 'length', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await fallbackPage.route('https://admin.jijaservices.com/**', adminHandler);
  adminActor = 'owner@example.test';
  await fallbackPage.goto('https://admin.jijaservices.com/', { waitUntil: 'networkidle' });
  const fallbackCard = fallbackPage.locator('article[data-review-id="new-review"]');
  await fallbackCard.waitFor();
  const fallbackDraft = 'Kept in this page when browser storage is blocked.';
  await fallbackCard.locator('.reply-panel textarea').fill(fallbackDraft);
  await fallbackCard.locator('.reply-status').filter({ hasText: 'copy it before reloading' }).waitFor();
  await fallbackPage.locator('#refresh').click();
  await fallbackPage.locator('#status').filter({ hasText: 'Reviews loaded.' }).waitFor();
  assert.equal(await fallbackPage.locator('article[data-review-id="new-review"] .reply-panel textarea').inputValue(), fallbackDraft);
  count++;
  adminActor = 'second-owner@example.test';
  await fallbackPage.locator('#refresh').click();
  await fallbackPage.locator('#status').filter({ hasText: 'Reviews loaded.' }).waitFor();
  assert.equal(await fallbackPage.locator('article[data-review-id="new-review"] .reply-panel textarea').inputValue(), 'Same words, kept for the newly signed-in owner.');
  const fallbackNewActorDraft = 'Only for the current approved owner.';
  await fallbackPage.locator('article[data-review-id="new-review"] .reply-panel textarea').fill(fallbackNewActorDraft);
  await fallbackPage.locator('#sign-out').evaluate(link => { link.addEventListener('click', event => event.preventDefault(), { once: true }); link.click(); });
  adminActor = 'owner@example.test';
  await fallbackPage.locator('#refresh').click();
  await fallbackPage.locator('#status').filter({ hasText: 'Reviews loaded.' }).waitFor();
  assert.equal(await fallbackPage.locator('article[data-review-id="new-review"] .reply-panel textarea').inputValue(), 'Same words, kept for the newly signed-in owner.');
  count++;
  await fallbackContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.route('https://admin.jijaservices.com/**', adminHandler);
  await mobilePage.goto('https://admin.jijaservices.com/', { waitUntil: 'networkidle' });
  await mobilePage.locator('#reviews article').first().waitFor();
  assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.equal(await mobilePage.locator('button').evaluateAll(buttons => buttons.filter(button => !button.hidden).every(button => button.getBoundingClientRect().height >= 48)), true);
  await mobilePage.locator('main').screenshot({ path: '.review-qa/admin-mobile.png' });
  count++;
  await mobileContext.close();

  console.log('Anonymous Playwright fixture checks passed: ' + count + '. Desktop1440/mobile360 public and admin screenshots saved in .review-qa/. No preview server was started.');
} finally {
  await browser.close();
}
