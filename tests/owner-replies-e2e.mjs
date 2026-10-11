 // Anonymous synthetic-fixture Playwright regression for owner replies.
 // Every request is intercepted; no account profile, preview server, or live API is used.
 import assert from 'node:assert/strict';
 import { readFile, mkdir } from 'node:fs/promises';
 import path from 'node:path';

 const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
 const DIST = path.resolve('dist');
 const ADMIN_HOST = 'admin.jijaservices.com';
 const PUBLIC_HOST = 'jijaservices.com';
 const OUTPUT = path.resolve('.review-qa');
 const MIME = {
   '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
   '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
   '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
   '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf'
 };
 await mkdir(OUTPUT, { recursive: true });

 let checks = 0;
 function check(label, condition) { assert.ok(condition, label); checks++; }
 function equal(label, actual, expected) { assert.equal(actual, expected, label); checks++; }

 const reviewId = '10000000-0000-4000-8000-000000000001';
 const publishedId = '10000000-0000-4000-8000-000000000002';
 const hiddenId = '10000000-0000-4000-8000-000000000003';
 const xssComment = '<img src=x onerror="window.__reviewXss=1"> Literal synthetic review text.';
 const xssReply = '<img src=x onerror="window.__replyXss=1"> Literal synthetic reply text.';

 function makeState(actor = 'qa-owner-a@example.test') {
   return {
     actor,
     rows: [
       { id: reviewId, display_name: 'Synthetic customer A', stars: 3, comment: 'Synthetic feedback for checking the public reply controls.', created_at: 1700000100, visibility: 'visible', version: 1, owner_reply: null, owner_reply_updated_at: null },
       { id: publishedId, display_name: 'Synthetic customer B', stars: 4, comment: 'A second synthetic review with an existing response.', created_at: 1700000000, visibility: 'visible', version: 2, owner_reply: 'A synthetic response already published.', owner_reply_updated_at: 1700000050 },
       { id: hiddenId, display_name: 'Synthetic customer C', stars: 2, comment: 'A hidden synthetic review.', created_at: 1699999900, visibility: 'hidden', version: 3, owner_reply: 'A saved response hidden with its review.', owner_reply_updated_at: 1700000060 }
     ],
     replyAudit: [], moderationAudit: [], requests: [],
     failNextList: false, failNextWrite: null, abortNextWrite: false,
     failListAfterNextReply: false, holdNextWrite: null, holdInitialAll: null
   };
 }

 async function staticFile(route, url, host) {
   let relative = url.pathname === '/'
     ? (host === ADMIN_HOST ? 'admin/index.html' : 'index.html')
     : decodeURIComponent(url.pathname.slice(1));
   const filename = path.resolve(DIST, relative);
   if (!filename.startsWith(DIST + path.sep)) return route.fulfill({ status: 404, body: '' });
   try {
     const body = await readFile(filename);
     return route.fulfill({ body, contentType: MIME[path.extname(filename).toLowerCase()] || 'application/octet-stream' });
   } catch {
     return route.fulfill({ status: 404, body: '' });
   }
 }

 function publicRows(state) {
   return state.rows.filter(row => row.visibility === 'visible').map(row => ({
     id: row.id, display_name: row.display_name, stars: row.stars, comment: row.comment,
     created_at: row.created_at, owner_reply: row.owner_reply, owner_reply_updated_at: row.owner_reply_updated_at
   }));
 }

 async function installRoutes(page, state) {
   await page.route('**/*', async route => {
     const request = route.request();
     const url = new URL(request.url());
     if (url.hostname === 'challenges.cloudflare.com') {
       return route.fulfill({ contentType: 'text/javascript', body: "window.turnstile={render:function(target,options){document.querySelector(target).textContent='Synthetic verification fixture';options.callback('synthetic-only-token');return 1;},reset:function(){}};" });
     }
     if (![ADMIN_HOST, PUBLIC_HOST].includes(url.hostname)) return route.abort('blockedbyclient');

     if (url.hostname === PUBLIC_HOST && url.pathname === '/api/reviews' && request.method() === 'POST') {
       const body = request.postDataJSON();
       state.requests.push({ kind: 'public-review', body, key: request.headers()['idempotency-key'] });
       state.rows.push({ id: '10000000-0000-4000-8000-000000000004', display_name: body.name, stars: body.stars, comment: body.comment, created_at: 1700000300, visibility: 'visible', version: 1, owner_reply: null, owner_reply_updated_at: null });
       return route.fulfill({ status: 201, json: { id: '10000000-0000-4000-8000-000000000004' } });
     }
     if (url.hostname === PUBLIC_HOST && url.pathname === '/api/reviews' && request.method() === 'GET') {
       const reviews = publicRows(state);
       return route.fulfill({ json: { reviews, nextCursor: null, summary: { count: reviews.length, average: reviews.length ? 3.5 : null } } });
     }
     if (url.hostname === PUBLIC_HOST && url.pathname === '/api/reviews/config') {
       return route.fulfill({ json: { sitekey: 'synthetic-only-not-a-real-challenge-key' } });
     }

     if (url.hostname === ADMIN_HOST && url.pathname === '/api/admin/reviews' && request.method() === 'GET') {
       if (state.failNextList) {
         state.failNextList = false;
         return route.fulfill({ status: 503, json: { error: 'Synthetic review-list outage.' } });
       }
       const visibility = url.searchParams.get('visibility') || 'all';
       let rows = state.rows.filter(row => visibility === 'all' || row.visibility === visibility).map(row => ({ ...row }));
       if (visibility === 'all' && state.holdInitialAll) {
         const hold = state.holdInitialAll;
         state.holdInitialAll = null;
         const snapshot = rows;
         hold.started();
         await hold.promise;
         await route.fulfill({ json: { actor: state.actor, reviews: snapshot, nextCursor: null } });
         hold.finished();
         return;
       }
       return route.fulfill({ json: { actor: state.actor, reviews: rows, nextCursor: null } });
     }
     if (url.hostname === ADMIN_HOST && url.pathname === '/api/admin/audit') {
       return route.fulfill({ json: { audit: state.moderationAudit.slice().reverse() } });
     }
     if (url.hostname === ADMIN_HOST && url.pathname === '/api/admin/reply-audit') {
       return route.fulfill({ json: { audit: state.replyAudit.slice().reverse() } });
     }

     if (url.hostname === ADMIN_HOST) {
       const replyMatch = /^\/api\/admin\/reviews\/([^/]+)\/reply$/.exec(url.pathname);
       if (replyMatch && ['PATCH', 'DELETE'].includes(request.method())) {
         const body = request.postDataJSON();
         state.requests.push({ kind: 'reply', method: request.method(), id: replyMatch[1], body });
         if (state.abortNextWrite) {
           state.abortNextWrite = false;
           return route.abort('failed');
         }
         if (state.failNextWrite) {
           const failure = state.failNextWrite;
           state.failNextWrite = null;
           return route.fulfill({ status: failure.status, contentType: failure.contentType || 'application/json', body: failure.contentType === 'text/html' ? '<html>Access sign-in required</html>' : JSON.stringify({ error: failure.message }) });
         }
         if (state.holdNextWrite) {
           const hold = state.holdNextWrite;
           state.holdNextWrite = null;
           hold.started();
           await hold.promise;
         }
         const row = state.rows.find(item => item.id === replyMatch[1]);
         if (!row || row.visibility !== 'visible' || row.version !== body.version) {
           return route.fulfill({ status: 409, json: { error: 'This review changed. Refresh before changing its reply.' } });
         }
         const oldReply = row.owner_reply;
         row.owner_reply = request.method() === 'DELETE' ? null : body.reply.trim();
         row.owner_reply_updated_at = row.owner_reply ? 1700000200 : null;
         row.version += 1;
         state.replyAudit.push({
           action: oldReply === null ? 'publish' : row.owner_reply === null ? 'remove' : 'edit',
           actor_email: state.actor, old_reply: oldReply, new_reply: row.owner_reply,
           changed_at: 1700000200, review_version: row.version
         });
         if (state.failListAfterNextReply) {
           state.failListAfterNextReply = false;
           state.failNextList = true;
         }
         return route.fulfill({ json: { id: row.id, visibility: row.visibility, version: row.version, owner_reply: row.owner_reply, owner_reply_updated_at: row.owner_reply_updated_at } });
       }

       const moderationMatch = /^\/api\/admin\/reviews\/([^/]+)$/.exec(url.pathname);
       if (moderationMatch && request.method() === 'PATCH') {
         const body = request.postDataJSON();
         state.requests.push({ kind: 'moderation', method: request.method(), id: moderationMatch[1], body });
         const row = state.rows.find(item => item.id === moderationMatch[1]);
         const target = { hide: 'hidden', show: 'visible', remove: 'removed' }[body.action];
         if (!row || !target || row.version !== body.version || typeof body.reason !== 'string' || body.reason.trim().length < 3) {
           return route.fulfill({ status: 409, json: { error: 'This review changed. Refresh before changing its visibility.' } });
         }
         const oldVisibility = row.visibility;
         row.visibility = target; row.version += 1;
         state.moderationAudit.push({ actor_email: state.actor, old_visibility: oldVisibility, new_visibility: target, reason: body.reason, changed_at: 1700000201 });
         return route.fulfill({ json: { id: row.id, visibility: row.visibility, version: row.version } });
       }
     }

     if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { error: 'Unknown synthetic fixture endpoint.' } });
     return staticFile(route, url, url.hostname);
   });
 }

 async function openAdmin(page, state) {
   await installRoutes(page, state);
   await page.goto('https://' + ADMIN_HOST + '/', { waitUntil: 'domcontentloaded' });
   await page.locator('article[data-review-id="' + reviewId + '"]').waitFor();
   await page.locator('#status').filter({ hasText: 'Reviews loaded.' }).waitFor();
 }

 async function testResponsiveScreenshots(browserInstance) {
   for (const [label, viewport] of [
     ['1440', { width: 1440, height: 1000 }],
     ['360', { width: 360, height: 850 }],
     ['320', { width: 320, height: 850 }]
   ]) {
     const publicState = makeState();
     publicState.rows[0].owner_reply = 'Thank you for sharing your experience. Our team appreciates your feedback.';
     publicState.rows[0].owner_reply_updated_at = 1700000200;
     publicState.rows[1].comment = xssComment;
     publicState.rows[1].owner_reply = xssReply;
     const publicContext = await browserInstance.newContext({ viewport });
     const publicPage = await publicContext.newPage();
     await installRoutes(publicPage, publicState);
     await publicPage.goto('https://' + PUBLIC_HOST + '/#reviews', { waitUntil: 'domcontentloaded' });
     const publicCard = publicPage.locator('#review-list article').first();
     await publicCard.waitFor();
     await publicCard.scrollIntoViewIfNeeded();
     await publicCard.screenshot({ path: path.join(OUTPUT, 'owner-reply-public-' + label + '.png') });
     equal('public business-reply label at ' + label, await publicCard.locator('.review-owner-reply-label').textContent(), 'Reply from JIJA Services');
     check('public owner reply visible at ' + label, (await publicCard.locator('.review-owner-reply-text').textContent()).includes('Thank you for sharing'));
     equal('public horizontal overflow at ' + label, await publicPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
     const xssCard = publicPage.locator('#review-list article').nth(1);
     equal('literal synthetic comment text at ' + label, await xssCard.locator('.review-comment').textContent(), xssComment);
     equal('literal synthetic reply text at ' + label, await xssCard.locator('.review-owner-reply-text').textContent(), xssReply);
     equal('no injected image in public cards at ' + label, await publicPage.locator('#review-list img').count(), 0);
     check('no XSS handler ran at ' + label, await publicPage.evaluate(() => typeof window.__reviewXss === 'undefined' && typeof window.__replyXss === 'undefined'));
     const cardStyle = await publicCard.evaluate(card => {
       const style = getComputedStyle(card);
       return [parseFloat(style.borderTopWidth), parseFloat(style.borderTopLeftRadius), parseFloat(style.paddingTop)];
     });
     check('original public review-card styling remains at ' + label, cardStyle[0] >= 1 && cardStyle[1] >= 8 && cardStyle[2] >= 16);
     await publicPage.getByRole('button', { name: 'Write a review' }).click();
     const form = publicPage.locator('#review-form');
     await form.waitFor({ state: 'visible' });
     await publicPage.locator('#review-verification').filter({ hasText: 'Synthetic verification fixture' }).waitFor();
     const formStyle = await form.evaluate(element => {
       const style = getComputedStyle(element);
       return [parseFloat(style.paddingTop), parseFloat(style.borderTopWidth), parseFloat(style.borderTopLeftRadius), element.getBoundingClientRect().width];
     });
     check('original public review-form layout remains at ' + label, formStyle[0] >= 16 && formStyle[1] >= 1 && formStyle[2] >= 8 && formStyle[3] <= viewport.width);
     const trap = publicPage.locator('.review-trap');
     check('public honeypot stays visually hidden and out of keyboard order at ' + label,
       await trap.getAttribute('aria-hidden') === 'true' &&
       await trap.locator('input').getAttribute('tabindex') === '-1' &&
       await trap.evaluate(element => element.getBoundingClientRect().left < -9000));
     await form.getByLabel('Name shown publicly').fill('Synthetic visitor');
     await form.getByLabel('Your rating').selectOption('4');
     await form.getByLabel('Your experience').fill('A synthetic review used only for this local browser fixture.');
     await form.getByRole('button', { name: 'Publish review' }).click();
     await publicPage.locator('#review-status').filter({ hasText: 'Your review has been published.' }).waitFor();
     equal('public submission sends synthetic verification token at ' + label, publicState.requests.find(item => item.kind === 'public-review').body.turnstileToken, 'synthetic-only-token');
     equal('public submission leaves honeypot empty at ' + label, publicState.requests.find(item => item.kind === 'public-review').body.company, '');
     await publicContext.close();

     const adminContext = await browserInstance.newContext({ viewport });
     const adminPage = await adminContext.newPage();
     await openAdmin(adminPage, makeState());
     const card = adminPage.locator('article[data-review-id="' + reviewId + '"]');
     equal('Reply heading at ' + label, await card.getByRole('heading', { name: 'Reply to customer' }).count(), 1);
     equal('visibility heading at ' + label, await card.getByRole('heading', { name: 'Review visibility' }).count(), 1);
     check('reply and moderation panels both visible at ' + label, await card.locator('.reply-panel').isVisible() && await card.locator('.moderation-panel').isVisible());
     check('separate reply and visibility actions at ' + label,
       await card.locator('.reply-panel').getByRole('button', { name: 'Publish reply' }).count() === 1 &&
       await card.locator('.moderation-panel').getByRole('button', { name: 'Hide review' }).count() === 1 &&
       await card.locator('.moderation-panel').getByRole('button', { name: 'Remove review from website' }).count() === 1);
     equal('admin horizontal overflow at ' + label, await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
     check('large touch targets at ' + label, await adminPage.locator('button').evaluateAll(buttons => buttons.filter(button => !button.hidden).every(button => button.getBoundingClientRect().height >= 48)));
     await card.screenshot({ path: path.join(OUTPUT, 'owner-reply-admin-' + label + '.png') });
     if (label === '1440') {
       const field = card.getByRole('textbox', { name: 'Your public reply' });
       await field.fill('Synthetic keyboard navigation draft.');
       await field.focus();
       await adminPage.keyboard.press('Tab');
       equal('keyboard moves from reply field to publish action', await adminPage.evaluate(() => document.activeElement.textContent.trim()), 'Publish reply');
       check('moderation purpose is explained separately', (await card.locator('.moderation-note').textContent()).includes('They do not edit your reply'));
       check('reply purpose explains public label', (await card.locator('.reply-panel').textContent()).includes('Reply from JIJA Services'));
     }
     await adminContext.close();
   }
 }

 const browser = await chromium.launch({
   ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : { channel: 'chromium' }),
   headless: true, chromiumSandbox: true
 });
 try {
   await testResponsiveScreenshots(browser);

   // Publish, edit, inspect audit history, then remove a public reply using the synthetic API.
   {
     const state = makeState();
     const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
     const page = await context.newPage();
     await openAdmin(page, state);
     const card = page.locator('article[data-review-id="' + reviewId + '"]');
     const field = card.getByRole('textbox', { name: 'Your public reply' });
     await field.fill('  Thank you for letting us know. We will follow up.  ');
     await card.getByRole('button', { name: 'Publish reply' }).click();
     await page.locator('#status').filter({ hasText: 'Reply published on the website.' }).waitFor();
     equal('published reply persisted', state.rows[0].owner_reply, 'Thank you for letting us know. We will follow up.');
     equal('publish request method', state.requests[0].method, 'PATCH');
     equal('publish uses displayed review version', state.requests[0].body.version, 1);
     equal('publish sends trimmed reply', state.requests[0].body.reply, 'Thank you for letting us know. We will follow up.');
     await card.getByRole('button', { name: 'View reply history' }).click();
     await card.locator('.reply-panel .history:not([hidden])').waitFor();
     check('reply audit says published', (await card.locator('.reply-panel .history').textContent()).includes('published a reply'));
     await field.fill('We appreciate your feedback and are glad we could help.');
     await card.getByRole('button', { name: 'Save reply changes' }).click();
     await page.locator('#status').filter({ hasText: 'Reply updated on the website.' }).waitFor();
     equal('edited reply persisted', state.rows[0].owner_reply, 'We appreciate your feedback and are glad we could help.');
     equal('edit uses updated version', state.requests[1].body.version, 2);
     page.once('dialog', dialog => dialog.accept());
     await page.locator('article[data-review-id="' + reviewId + '"]').getByRole('button', { name: 'Remove reply from website' }).click();
     await page.locator('#status').filter({ hasText: 'Reply removed from the website.' }).waitFor();
     equal('reply removal uses current version', state.requests[2].body.version, 3);
     equal('reply removed from synthetic public state', state.rows[0].owner_reply, null);
     equal('removal leaves review visible', state.rows[0].visibility, 'visible');
     check('three reply audit actions recorded', state.replyAudit.map(entry => entry.action).join(',') === 'publish,edit,remove');
     await context.close();
   }

   // Visibility controls must remain separate and hiding a review also hides its saved reply publicly.
   {
     const state = makeState();
     const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
     const page = await context.newPage();
     await openAdmin(page, state);
     const card = page.locator('article[data-review-id="' + publishedId + '"]');
     await card.getByLabel('Reason for visibility change').fill('Synthetic privacy test');
     await card.locator('.moderation-panel').getByRole('button', { name: 'Hide review' }).click();
     await page.locator('#status').filter({ hasText: 'Review hidden' }).waitFor();
     const hiddenCard = page.locator('article[data-review-id="' + publishedId + '"]');
     check('hiding preserves private saved response', state.rows[1].owner_reply === 'A synthetic response already published.');
     equal('hidden review has no reply editor', await hiddenCard.locator('.reply-panel textarea').count(), 0);
     check('hidden card explains reply is private', (await hiddenCard.locator('.reply-panel').textContent()).includes('saved reply remains private'));
     check('hidden reply excluded from public API fixture', !publicRows(state).some(row => row.id === publishedId));
     await hiddenCard.getByLabel('Reason for visibility change').fill('Synthetic restore test');
     await hiddenCard.locator('.moderation-panel').getByRole('button', { name: 'Restore review to website' }).click();
     await page.locator('#status').filter({ hasText: 'Review restored to the website' }).waitFor();
     check('restored review keeps its saved public reply', (await page.locator('article[data-review-id="' + publishedId + '"] .published-reply').textContent()).includes('A synthetic response already published.'));
     equal('hide and restore were moderation mutations', state.requests.filter(item => item.kind === 'moderation').map(item => item.body.action).join(','), 'hide,show');
     await context.close();
   }

   // Server errors, stale versions, and sign-out must retain/clear drafts in the intended scope.
   {
     const state = makeState();
     const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
     const page = await context.newPage();
     await openAdmin(page, state);
     const card = page.locator('article[data-review-id="' + reviewId + '"]');
     const field = card.getByRole('textbox', { name: 'Your public reply' });
     const draft = 'A synthetic draft kept after a server error.';
     await field.fill(draft);
     state.failNextWrite = { status: 503, message: 'Synthetic temporary outage.' };
     await card.getByRole('button', { name: 'Publish reply' }).click();
     await card.locator('.reply-status').filter({ hasText: 'Synthetic temporary outage.' }).waitFor();
     equal('server error leaves draft in field', await field.inputValue(), draft);
     equal('server error leaves actor-scoped draft', await page.evaluate(id => sessionStorage.getItem('jija-owner-reply-draft:qa-owner-a@example.test:' + id), reviewId), draft);
     state.rows[0].version += 1;
     await page.locator('article[data-review-id="' + reviewId + '"]').getByRole('button', { name: 'Publish reply' }).click();
     await page.locator('.reply-status').filter({ hasText: 'This review changed' }).waitFor();
     equal('stale conflict keeps draft', await page.locator('article[data-review-id="' + reviewId + '"] .reply-panel textarea').inputValue(), draft);
     await page.locator('#refresh').click();
     await page.locator('#status').filter({ hasText: 'Reviews loaded.' }).waitFor();
     equal('refresh after conflict keeps draft', await page.locator('article[data-review-id="' + reviewId + '"] .reply-panel textarea').inputValue(), draft);
     await page.locator('#sign-out').evaluate(link => { link.addEventListener('click', event => event.preventDefault(), { once: true }); link.click(); });
     equal('sign-out clears reply drafts', await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('jija-owner-reply-draft:')).length), 0);
     await context.close();
   }

   // A delayed old filter response must not replace the newer list.
   {
     const state = makeState();
     let signalStarted, signalFinished, release;
     const started = new Promise(resolve => { signalStarted = resolve; });
     const finished = new Promise(resolve => { signalFinished = resolve; });
     const held = new Promise(resolve => { release = resolve; });
     state.holdInitialAll = { started: signalStarted, finished: signalFinished, promise: held };
     const context = await browser.newContext({ viewport: { width: 1000, height: 900 } });
     const page = await context.newPage();
     await installRoutes(page, state);
     await page.goto('https://' + ADMIN_HOST + '/', { waitUntil: 'domcontentloaded' });
     await started;
     await page.selectOption('#visibility', 'visible');
     await page.locator('article[data-review-id="' + reviewId + '"]').waitFor();
     equal('visible filter excludes hidden synthetic review', await page.locator('article[data-review-id="' + hiddenId + '"]').count(), 0);
     release();
     await finished;
     await page.waitForTimeout(100);
     equal('late all-review response cannot overwrite the chosen filter', await page.locator('article[data-review-id="' + hiddenId + '"]').count(), 0);
     equal('late response does not duplicate visible rows', await page.locator('#reviews article[data-review-id="' + reviewId + '"]').count(), 1);
     await context.close();
   }

   // Held save + refresh + identity switch must keep only the new owner’s same-text draft.
   {
     const state = makeState('qa-owner-a@example.test');
     let signalStarted, release;
     const started = new Promise(resolve => { signalStarted = resolve; });
     const held = new Promise(resolve => { release = resolve; });
     state.holdNextWrite = { started: signalStarted, promise: held };
     const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
     const page = await context.newPage();
     await openAdmin(page, state);
     const draft = 'Same synthetic words for a second owner.';
     await page.locator('article[data-review-id="' + reviewId + '"] .reply-panel textarea').fill(draft);
     await page.locator('article[data-review-id="' + reviewId + '"]').getByRole('button', { name: 'Publish reply' }).click();
     await started;
     await page.locator('#refresh').click();
     await page.locator('article[data-review-id="' + reviewId + '"] .reply-panel textarea').waitFor();
     equal('refresh during save leaves one review card', await page.locator('article[data-review-id="' + reviewId + '"]').count(), 1);
     state.actor = 'qa-owner-b@example.test';
     await page.locator('#refresh').click();
     await page.locator('#status').filter({ hasText: 'Reviews loaded.' }).waitFor();
     const newOwnerField = page.locator('article[data-review-id="' + reviewId + '"] .reply-panel textarea');
     await newOwnerField.fill(draft);
     equal('new actor draft stored in own namespace', await page.evaluate(id => sessionStorage.getItem('jija-owner-reply-draft:qa-owner-b@example.test:' + id), reviewId), draft);
     release();
     await page.locator('#status').filter({ hasText: 'Reply published on the website.' }).waitFor();
     equal('old actor completion preserves new actor same-text draft', await page.evaluate(id => sessionStorage.getItem('jija-owner-reply-draft:qa-owner-b@example.test:' + id), reviewId), draft);
     await context.close();
   }

   // A successful write followed by a failed list refresh must still show a saved, editable result.
   {
     const state = makeState();
     state.failListAfterNextReply = true;
     const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
     const page = await context.newPage();
     await openAdmin(page, state);
     const draft = 'A synthetic reply saved before the list refresh fails.';
     await page.locator('article[data-review-id="' + reviewId + '"] .reply-panel textarea').fill(draft);
     await page.locator('article[data-review-id="' + reviewId + '"]').getByRole('button', { name: 'Publish reply' }).click();
     await page.locator('#status').filter({ hasText: 'saved result' }).waitFor();
     check('status explains the save succeeded despite list refresh failure', (await page.locator('#status').textContent()).includes('refresh to check the latest details'));
     equal('server accepted reply before refresh failure', state.rows[0].owner_reply, draft);
     check('saved reply appears in current card after refresh failure',
       (await page.locator('article[data-review-id="' + reviewId + '"] .published-reply').textContent()).includes(draft));
     equal('reply editor remains usable after refresh failure', await page.locator('article[data-review-id="' + reviewId + '"] .reply-panel textarea').isDisabled(), false);
     await page.locator('#refresh').click();
     await page.locator('#status').filter({ hasText: 'Reviews loaded.' }).waitFor();
     check('manual refresh recovers the saved reply', (await page.locator('article[data-review-id="' + reviewId + '"] .published-reply').textContent()).includes(draft));
     await context.close();
   }

   // Denied/quota session storage must not tell staff a reload-safe draft was saved.
   for (const mode of ['quota', 'denied']) {
     const state = makeState();
     const context = await browser.newContext({ viewport: { width: 1000, height: 900 } });
     if (mode === 'quota') {
       await context.addInitScript(() => {
         const original = Storage.prototype.setItem;
         Storage.prototype.setItem = function(key, value) {
           if (String(key).startsWith('jija-owner-reply-draft:')) throw new DOMException('Synthetic quota exceeded', 'QuotaExceededError');
           return original.call(this, key, value);
         };
       });
     } else {
       await context.addInitScript(() => {
         Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('Synthetic storage denied', 'SecurityError'); } });
       });
     }
     const page = await context.newPage();
     await openAdmin(page, state);
     const card = page.locator('article[data-review-id="' + reviewId + '"]');
     await card.locator('.reply-panel textarea').fill('A temporary in-page draft only.');
     const notice = (await card.locator('.reply-status').textContent()) + ' ' + (await card.locator('.reply-draft-note').textContent());
     check(mode + ' storage failure gives an honest copy/reload warning', /only kept on this page|copy.{0,40}reload|lost if you reload/i.test(notice));
     equal(mode + ' storage fallback keeps text in the visible field', await card.locator('.reply-panel textarea').inputValue(), 'A temporary in-page draft only.');
     await context.close();
   }

   // Network and HTML sign-in failures leave the draft editable and visible.
   {
     const state = makeState();
     const context = await browser.newContext({ viewport: { width: 1000, height: 900 } });
     const page = await context.newPage();
     await openAdmin(page, state);
     const card = page.locator('article[data-review-id="' + reviewId + '"]');
     const draft = 'A synthetic draft during sign-in expiry.';
     await card.locator('.reply-panel textarea').fill(draft);
     state.failNextWrite = { status: 403, contentType: 'text/html', message: 'sign in' };
     await card.getByRole('button', { name: 'Publish reply' }).click();
     await card.locator('.reply-status').filter({ hasText: 'sign-in may have expired' }).waitFor();
     equal('HTML auth failure retains draft', await card.locator('.reply-panel textarea').inputValue(), draft);
     state.abortNextWrite = true;
     await card.getByRole('button', { name: 'Publish reply' }).click();
     await card.locator('.reply-status').filter({ hasText: 'Could not connect' }).waitFor();
     equal('network failure retains draft', await card.locator('.reply-panel textarea').inputValue(), draft);
     await context.close();
   }

   console.log('Owner reply fixture E2E passed ' + checks + ' checks. Synthetic screenshots saved to ' + OUTPUT + '. All network requests were intercepted; no signed-in profile or live API was used.');
 } finally {
   await browser.close();
 }