// Anonymous local fixture review. No account profile, server, or live API is used.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const fixture = [{ id: '1', display_name: 'Preview fixture — not a real customer', stars: 2, comment: '<img src=x onerror="window.__reviewXss=1"> Preview feedback stays literal, including markup. Ordinary negative reviews remain visible.', created_at: 1700000000 }, { id: '2', display_name: 'Second preview fixture', stars: 5, comment: 'Preview text for checking card spacing, rating, and date on small screens.', created_at: 1700000001 }];
const dist = path.resolve('dist'); await mkdir('.review-qa', { recursive: true });
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : { channel: 'chromium' }), headless: true, chromiumSandbox: true });
let count = 0;
try {
  for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 360, height: 800 }], ['desktop-expired', { width: 1440, height: 1000 }], ['mobile-expired', { width: 360, height: 800 }]]) {
    const context = await browser.newContext({ viewport }); const page = await context.newPage(); await page.clock.install({time:new Date(label.includes("expired") ? "2026-11-05T12:00:00Z" : "2026-10-15T12:00:00Z")});
    let postCount = 0; const posted = []; let release; let mode = 'hold';
    await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({ contentType: 'text/javascript', body: 'window.turnstile={render:(target,options)=>{document.querySelector(target).textContent="Verification preview (test fixture)"; window.__fixtureOptions=options; options.callback("fixture-token");return 1;},reset:()=>window.__fixtureOptions.callback("fresh-fixture-token")};' }));
    await page.route('https://jijaservices.com/**', async route => {
      const request = route.request(); const url = new URL(request.url());
      if (url.pathname === '/api/reviews/config') return route.fulfill({ json: { sitekey: 'fixture-only' } });
      if (url.pathname === '/api/reviews') {
        if (request.method() === 'POST') {
          postCount++; posted.push({ body: request.postDataJSON(), key: request.headers()['idempotency-key'] });
          if (mode === 'hold') { await new Promise(resolve => { release = resolve; }); return route.fulfill({ status: 429, json: { error: 'Too many attempts. Please try again later.' } }); }
          if (mode === 'abort') return route.abort('failed');
          return route.fulfill({ status: 201, json: { id: 'fixture-created' } });
        }
        return route.fulfill({ json: { reviews: fixture, nextCursor: null, summary: { count: 2, average: 3.5 } } });
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
    assert.equal(await page.locator('#review-list img').count(), 0); assert.equal(await page.evaluate(() => window.__reviewXss), undefined); count++;
    assert.equal(await page.locator('script[src*="challenges.cloudflare.com"]').count(), 0); count++;
    await page.locator('#write-review').click();
    await page.locator('#review-name').fill('Preview Customer'); await page.locator('#review-rating').selectOption('2'); await page.locator('#review-comment').fill('Preview text entered into the review form. This must survive a failed request.');
    // Isolate the section in the screenshot: its sticky navigation otherwise covers the stitched capture.
    await page.locator('.site-header').evaluate(header => { window.__previewHeader = header; window.__previewHeaderNext = header.nextSibling; header.remove(); });
    await page.locator('#reviews').screenshot({ path: `.review-qa/reviews-${label}.png` });
    await page.evaluate(() => { document.body.insertBefore(window.__previewHeader, window.__previewHeaderNext); delete window.__previewHeader; delete window.__previewHeaderNext; });
    await page.getByRole('button', { name: 'Publish review' }).click();
    await page.waitForFunction(() => document.querySelector('#review-name').disabled);
    assert.equal(await page.locator('#review-name').isDisabled(), true); count++;
    await page.locator('#review-form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(postCount, 1); count++;
    release(); await page.locator('#review-status').filter({ hasText: 'Too many attempts' }).waitFor();
    assert.equal(await page.locator('#review-name').inputValue(), 'Preview Customer'); assert.equal(await page.locator('#review-rating').inputValue(), '2'); assert.equal(await page.locator('#review-name').isDisabled(), false); count++;
    mode = 'success'; await page.getByRole('button', { name: 'Publish review' }).click();
    await page.locator('#review-status').filter({ hasText: 'Your review has been published' }).waitFor();
    assert.equal(posted[1].key, posted[0].key); assert.equal(await page.locator('#review-name').inputValue(), ''); count++;
    await page.locator('#review-name').fill('Preserved after outage'); await page.locator('#review-rating').selectOption('3'); await page.locator('#review-comment').fill('Network outage fixture text must remain in the form.');
    mode = 'abort'; await page.getByRole('button', { name: 'Publish review' }).click();
    await page.locator('#review-status').filter({ hasText: 'Could not connect' }).waitFor();
    assert.equal(await page.locator('#review-name').inputValue(), 'Preserved after outage'); count++;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true); count++;
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const page = await context.newPage();
  await page.route('https://admin.jijaservices.com/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/admin/reviews') return route.fulfill({ json: { reviews: fixture.map((review, index) => ({ ...review, visibility: index ? 'hidden' : 'visible', version: 1 })), nextCursor: null } });
    if (url.pathname === '/api/admin/audit') return route.fulfill({ json: { audit: [] } });
    const filename = url.pathname === '/' ? 'dist/admin/index.html' : 'dist' + url.pathname;
    return route.fulfill({ body: await readFile(filename), contentType: filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : 'text/html' });
  });
  await page.goto('https://admin.jijaservices.com/', { waitUntil: 'networkidle' }); await page.locator('#reviews article').first().waitFor();
  assert.equal(await page.locator('#reviews img').count(), 0); count++;
  await page.locator('main').screenshot({ path: '.review-qa/admin-desktop.png' }); await context.close();
  console.log(`Anonymous Playwright fixture checks passed: ${count}. Desktop1440/mobile360/admin screenshots saved in .review-qa/. No preview server was started.`);
} finally { await browser.close(); }
