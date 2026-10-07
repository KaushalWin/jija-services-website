// Anonymous static-site visual and interaction checks; never accesses an account or production.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const dist = path.resolve('dist');
await mkdir('.review-qa', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, chromiumSandbox: true });
let checks = 0;
const expectedPosters = ['festival-summer-v2.webp', 'hot-cups-v2.webp', 'business-v2.webp', 'general-festival-v2.webp'];
const retiredPosters = ['festival-summer-original.jpg', 'hot-cups-original.jpg', 'business-original.jpg', 'festival-sale.jpg'];

try {
  for (const filename of retiredPosters) {
    assert.ok((await readFile('assets/promotions/' + filename)).length > 1000, 'Preserve source artwork');
    await assert.rejects(readFile('dist/assets/promotions/' + filename), { code: 'ENOENT' }, 'Retired priced poster must not be published');
    for (const pageFile of ['dist/index.html', 'dist/pilot-2/index.html']) assert.ok(!(await readFile(pageFile, 'utf8')).includes(filename));
    checks++;
  }
  for (const width of [1440, 1024, 768, 360, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors = []; const missing = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://jijaservices.com/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/reviews') return route.fulfill({ json: { reviews: [], nextCursor: null, summary: { count: 0, average: null } } });
      if (url.pathname === '/api/reviews/config') return route.fulfill({ json: { sitekey: 'fixture-only' } });
      const filename = path.resolve(dist, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
      assert.ok(filename.startsWith(dist + path.sep));
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf' }[path.extname(filename)] || 'text/plain';
      try { return route.fulfill({ body: await readFile(filename), contentType: mime }); }
      catch { missing.push(url.pathname); return route.fulfill({ status: 404, body: '' }); }
    });
    await page.goto('https://jijaservices.com/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.product').count(), 37); checks++;
    await page.screenshot({ path: `.review-qa/site-top-${width}.png` });
    // Load every lazy image so the whole-site scan checks actual original artwork.
    for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
    assert.deepEqual(missing, []); assert.deepEqual(errors, []); checks++;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Horizontal overflow at ${width}`); checks++;
    const overflow = await page.locator('main section').evaluateAll(sections => sections.filter(section => section.getBoundingClientRect().right > innerWidth + 1 || section.getBoundingClientRect().left < -1).map(section => section.id || section.className));
    assert.deepEqual(overflow, [], `Off-screen section at ${width}`); checks++;
    const cards = page.locator('.festival-card'); assert.equal(await cards.count(), 4); checks++;
    assert.doesNotMatch(await page.locator('#seasonal-events').innerText(), /[$€£]|\b(?:price|prices|pricing|sale|savings|limited stock|original)\b/i); checks++;
    for (let i = 0; i < 4; i++) {
      const card = cards.nth(i);
      const image = card.locator('img'); const imageLink = card.locator('.festival-poster-image'); const download = card.locator('a[download]');
      assert.equal(await image.getAttribute('src'), `assets/promotions/${expectedPosters[i]}`);
      assert.equal(await imageLink.getAttribute('href'), await image.getAttribute('src'));
      assert.equal(await download.getAttribute('href'), await image.getAttribute('src'));
      assert.equal(await image.evaluate(element => getComputedStyle(element).objectFit), 'contain');
      const box = await image.boundingBox(); assert.ok(box.width > 100 && box.height >= 280);
      const target = await download.boundingBox(); assert.ok(target.height >= 44); assert.ok((await card.locator(".button").boundingBox()).height >= 44);
      checks++;
    }
    // Capture the collection without a sticky header covering stitched screenshots.
    await page.locator('.site-header').evaluate(header => { window.__header = header; window.__headerNext = header.nextSibling; header.remove(); });
    if ([1440, 360].includes(width)) {
      await page.locator('#seasonal-events').screenshot({ path: `.review-qa/festivals-${width}.png` });
      await page.screenshot({ path: `.review-qa/site-full-${width}.png`, fullPage: true });
      for (const [name, selector] of [['eco', '.eco-solutions'], ['healthcare', '.healthcare-solutions'], ['packs', '.pack-options'], ['range', '.range'], ['about', '.about'], ['values', '.values'], ['contact', '.contact']]) {
        await page.locator(selector).screenshot({ path: `.review-qa/site-${name}-${width}.png` });
      }
    }
    await page.evaluate(() => { document.body.insertBefore(window.__header, window.__headerNext); delete window.__header; delete window.__headerNext; });
    await page.locator('#search').fill('J2667');
    assert.equal(await page.locator('.product').count(), 1); checks++;
    await page.locator('.product-open').click(); await page.locator('#product-dialog').waitFor({ state: 'visible' });
    assert.match(await page.locator('#dialog-title').textContent(), /6-Piece/); checks++;
    assert.equal(await page.locator('#product-dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth), true); checks++;
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#product-dialog').isVisible(), false); checks++;
    await page.locator('#search').fill('');
    if (width <= 900) {
      await page.locator('.menu').click(); assert.equal(await page.locator('.menu').getAttribute('aria-expanded'), 'true'); checks++;
      await page.locator('#nav a[href="#seasonal-events"]').click();
      assert.equal(await page.locator('.menu').getAttribute('aria-expanded'), 'false'); checks++;
      assert.equal(new URL(page.url()).hash, '#seasonal-events'); checks++;
    } else {
      assert.equal(await page.locator('#nav').isVisible(), true); checks++;
      const navBox = await page.locator('#nav').boundingBox(); assert.ok(navBox.x >= 0 && navBox.x + navBox.width <= width); checks++;
    }
    await context.close();
  }
  console.log(`Anonymous whole-site visual checks passed: ${checks}. Viewports 1440/1024/768/360/320. Revised posters, retired-asset exclusion, all images, catalog search/dialog, navigation, and overflow checked. No live account or preview server.`);
} finally { await browser.close(); }