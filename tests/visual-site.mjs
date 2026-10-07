// Anonymous static-site visual and interaction checks; never accesses an account or production.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const dist = path.resolve('dist');
await mkdir('.review-qa', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, chromiumSandbox: true });
let checks = 0;
const expectedPosters = ['halloween-v2.webp', 'festival-summer-v2.webp', 'hot-cups-v2.webp', 'business-v2.webp', 'general-festival-v2.webp'];
const retiredPosters = ['festival-summer-original.jpg', 'hot-cups-original.jpg', 'business-original.jpg', 'festival-sale.jpg'];

try {
  assert.ok((await readFile('dist/assets/promotions/business-v2.png')).subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  assert.equal((await readFile('dist/assets/promotions/halloween-v2.pdf')).subarray(0, 5).toString(), '%PDF-'); checks++;
  for (const filename of retiredPosters) {
    assert.ok((await readFile('assets/promotions/' + filename)).length > 1000, 'Preserve source artwork');
    await assert.rejects(readFile('dist/assets/promotions/' + filename), { code: 'ENOENT' }, 'Retired priced poster must not be published');
    for (const pageFile of ['dist/index.html', 'dist/pilot-2/index.html']) assert.ok(!(await readFile(pageFile, 'utf8')).includes(filename));
    checks++;
  }
  for (const width of [1440, 1024, 768, 360, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); await page.clock.install({ time: new Date('2026-10-15T12:00:00Z') }); const errors = []; const missing = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://jijaservices.com/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/reviews') return route.fulfill({ json: { reviews: [], nextCursor: null, summary: { count: 0, average: null } } });
      if (url.pathname === '/api/reviews/config') return route.fulfill({ json: { sitekey: 'fixture-only' } });
      const filename = path.resolve(dist, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
      assert.ok(filename.startsWith(dist + path.sep));
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf', '.svg': 'image/svg+xml' }[path.extname(filename)] || 'text/plain';
      try { return route.fulfill({ body: await readFile(filename), contentType: mime }); }
      catch { missing.push(url.pathname); return route.fulfill({ status: 404, body: '' }); }
    });
    await page.goto('https://jijaservices.com/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.product').count(), 37); checks++;
    assert.equal(await page.locator('html').getAttribute('data-seasonal-theme'),'halloween'); assert.match(await page.locator('h1').innerText(), /spooktacular/); assert.equal(await page.locator('.hero-art').isVisible(),false); checks++;
    await page.screenshot({ path: `.review-qa/site-top-${width}.png` });
    // Load every lazy image so the whole-site scan checks actual original artwork.
    for (const image of await page.locator('img:visible').all()) await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => Array.from(document.images).filter(image => image.getClientRects().length).every(image => image.complete && image.naturalWidth > 0));
    assert.deepEqual(missing, []); assert.deepEqual(errors, []); checks++;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Horizontal overflow at ${width}`); checks++;
    const overflow = await page.locator('main section').evaluateAll(sections => sections.filter(section => section.getBoundingClientRect().right > innerWidth + 1 || section.getBoundingClientRect().left < -1).map(section => section.id || section.className));
    assert.deepEqual(overflow, [], `Off-screen section at ${width}`); checks++;
    const banner = page.locator('#occasion-supplies');
    assert.equal(await page.evaluate(() => { const hero = document.querySelector('.hero'); const banner = document.querySelector('#occasion-supplies'); const packs = document.querySelector('#packaging-delivery'); return Boolean(hero.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING) && Boolean(banner.compareDocumentPosition(packs) & Node.DOCUMENT_POSITION_FOLLOWING); }), true);
    const bannerImage = await banner.locator('img').boundingBox(); assert.ok(bannerImage.width >= width * (width <= 700 ? .7 : .4));
    assert.equal(await banner.locator('.occasion-visual>a').getAttribute('href'), 'assets/promotions/business-v2.png'); checks++;
    const badge = await page.locator('.pack-best-price').boundingBox();
    const retailText = await page.locator('.retail-highlight .pack-label').evaluate(element => { const range = document.createRange(); range.selectNodeContents(element); const rect = range.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; });
    const quantity = await page.locator('.retail-highlight>b').boundingBox();
    const intersects = (a,b) => a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
    assert.equal(intersects(badge,retailText), false, `Badge overlaps Retail text at ${width}`);
    assert.equal(intersects(badge,quantity), false, `Badge overlaps 50 quantity at ${width}`); checks++;
    const cards = page.locator('.festival-card'); assert.equal(await cards.count(), 5); checks++;
    assert.doesNotMatch(await page.locator('#seasonal-events').innerText(), /[$€£]|\b(?:price|prices|pricing|sale|savings|limited stock|original)\b/i); checks++;
    for (let i = 0; i < expectedPosters.length; i++) {
      const card = cards.nth(i);
      const image = card.locator('img'); const imageLink = card.locator('.festival-poster-image'); const download = card.locator('a[download]');
      assert.equal(await image.getAttribute('src'), `assets/promotions/${expectedPosters[i]}`);
      assert.equal(await imageLink.getAttribute('href'), await image.getAttribute('src'));
      assert.equal(await download.getAttribute('href'), i === 0 ? 'assets/promotions/halloween-v2.pdf' : await image.getAttribute('src'));
      assert.equal(await image.evaluate(element => getComputedStyle(element).objectFit), 'contain');
      const box = await image.boundingBox(); assert.ok(box.width > 100 && box.height >= 280);
      const target = await download.boundingBox(); assert.ok(target.height >= 44); assert.ok((await card.locator(".button").boundingBox()).height >= 44);
      checks++;
    }
    // Capture the collection without a sticky header covering stitched screenshots.
    await page.locator('.site-header').evaluate(header => { window.__header = header; window.__headerNext = header.nextSibling; header.remove(); });
    if ([1440, 360].includes(width)) {
      await page.locator('#seasonal-events').screenshot({ path: `.review-qa/festivals-${width}.png` });
      await page.locator('#occasion-supplies').screenshot({ path: `.review-qa/occasion-banner-${width}.png` });
      await page.locator('#packaging-delivery').screenshot({ path: `.review-qa/retail-badge-${width}.png` });
      await page.locator('.festival-card-halloween').screenshot({ path: `.review-qa/halloween-card-${width}.png` });
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
    await page.locator('#product-dialog').screenshot({path: `.review-qa/dialog-${width}.png`});
    assert.ok((await page.locator('.dialog-close').boundingBox()).height>=44); checks++;
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#product-dialog').isVisible(), false); checks++;
    await page.locator('#search').fill('');
    if ([1440,360].includes(width)) {
      for(let i=0;i<37;i++) {
        await page.locator('.product-open').nth(i).click();
        await page.locator('#product-dialog').waitFor({state:'visible'});
        assert.ok((await page.locator('#dialog-title').innerText()).trim().length>2);
        assert.equal(await page.locator('#product-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth),true);
        await page.locator('.dialog-close').click();
        assert.equal(await page.locator('#product-dialog').isVisible(),false); checks++;
      }
    }
    const contrast = await page.evaluate(()=>{
      const luminance = rgb => rgb.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      const rgb = s=>(s.match(/[\d.]+/g)||[]).map(Number);
      return ['.hero h1','.hero .eyebrow','.hero .primary','.nav-cta','.occasion-copy p:not(.eyebrow)','.pack-copy p:not(.eyebrow)','.pack-best-price','.healthcare-solutions .safety-note','.product .meta','.festival-download','.contact-actions a'].map(selector=>{
        const el=document.querySelector(selector);const st=getComputedStyle(el); let parent=el,bg;
        while(parent){bg=rgb(getComputedStyle(parent).backgroundColor);if(bg.length===3||bg[3]>0)break;parent=parent.parentElement}
        const fg=luminance(rgb(st.color)),back=luminance(bg);return {selector,ratio:(Math.max(fg,back)+.05)/(Math.min(fg,back)+.05)};
      });
    });
    for(const item of contrast) assert.ok(item.ratio>=4.5, `Contrast ${item.selector}: ${item.ratio}`); checks++;

    if (width <= 900) {
      await page.locator('.menu').click(); assert.equal(await page.locator('.menu').getAttribute('aria-expanded'), 'true'); checks++;
      await page.locator('#nav a[href="#seasonal-events"]').click();
      assert.equal(await page.locator('.menu').getAttribute('aria-expanded'), 'false'); checks++;
      assert.equal(new URL(page.url()).hash, '#seasonal-events'); checks++;
    } else {
      assert.equal(await page.locator('#nav').isVisible(), true); checks++;
      const navBox = await page.locator('#nav').boundingBox(); assert.ok(navBox.x >= 0 && navBox.x + navBox.width <= width); checks++;
    }
    await page.clock.setSystemTime(new Date('2026-11-05T12:00:00Z'));
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('html').getAttribute('data-seasonal-theme'),null); assert.match(await page.locator('h1').innerText(),/World of/); assert.doesNotMatch(await page.locator('h1').innerText(),/spooktacular/); assert.equal(await page.locator('.hero-art').isVisible(),true); assert.equal(await page.locator('.halloween-hero-scene').isVisible(),false); assert.equal(await page.locator('.festival-card-halloween a[download]').getAttribute('href'),'assets/promotions/halloween-v2.pdf'); checks++;
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true); checks++;
    await page.evaluate(()=>scrollTo(0,0)); await page.screenshot({path: `.review-qa/default-expired-${width}.png`});
    // Verify already-open tabs actually restore copy/art as the deadline passes.
    await page.clock.setSystemTime(new Date('2026-11-04T15:29:59Z')); await page.reload({waitUntil:'networkidle'});
    await page.clock.runFor(1500);
    assert.equal(await page.locator('html').getAttribute('data-seasonal-theme'),null); assert.match(await page.locator('h1').innerText(),/World of/); checks++;
    await page.clock.setSystemTime(new Date('2026-10-07T15:18:59Z')); await page.reload({waitUntil:'networkidle'}); assert.equal(await page.locator('html').getAttribute('data-seasonal-theme'),null); await page.clock.fastForward(122000); assert.equal(await page.locator('html').getAttribute('data-seasonal-theme'),'halloween'); checks++;
    await context.close();
  }
  console.log(`Anonymous whole-site visual checks passed: ${checks}. Viewports 1440/1024/768/360/320. Revised posters, retired-asset exclusion, all images, catalog search/dialog, navigation, and overflow checked. No live account or preview server.`);
} finally { await browser.close(); }