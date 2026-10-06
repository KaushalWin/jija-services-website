// Anonymous local CSP fixture, never contacts the real analytics or account endpoints.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const html=await readFile('dist/index.html','utf8');
const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
const directives=Object.fromEntries(csp.split(';').map(part=>part.trim().split(/\s+/)).filter(parts=>parts[0]).map(([name,...sources])=>[name,sources]));
assert.deepEqual(directives['script-src'],["'self'","'unsafe-inline'",'https://challenges.cloudflare.com','https://static.cloudflareinsights.com']);
assert.deepEqual(directives['connect-src'],["'self'",'https://challenges.cloudflare.com','https://cloudflareinsights.com']);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true});
try{
 const context=await browser.newContext();const page=await context.newPage();let beacon=0;let report=0;let unexpected=0;
 await page.route('https://static.cloudflareinsights.com/**',route=>{beacon++;return route.fulfill({contentType:'text/javascript',body:'window.__analyticsFixture=true;fetch("https://cloudflareinsights.com/cdn-cgi/rum",{method:"POST",body:"{}"}).then(()=>window.__analyticsReport=true);fetch("https://unexpected.invalid/report",{method:"POST",body:"{}"}).catch(()=>window.__blockedConnect=true);'});});
 await page.route('https://cloudflareinsights.com/**',route=>{report++;return route.fulfill({status:200,headers:{'access-control-allow-origin':'https://jijaservices.com'},body:''});});
 await page.route('https://unexpected.invalid/**',route=>{unexpected++;return route.fulfill({contentType:'text/javascript',body:'window.__unexpected=true'});});
 await page.route('https://jijaservices.com/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/reviews')return route.fulfill({json:{reviews:[],nextCursor:null,summary:{count:0,average:null}}});
  const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'}[path.extname(file)]||'text/plain';return route.fulfill({body:await readFile(file),contentType:mime});
 });
 await page.goto('https://jijaservices.com/',{waitUntil:'networkidle'});
 await page.addScriptTag({url:'https://static.cloudflareinsights.com/beacon.min.js'}).catch(error=>assert.match(error.message,/unexpected.invalid\/report.*Content Security Policy/s));
 await page.waitForFunction(()=>window.__analyticsFixture&&window.__analyticsReport&&window.__blockedConnect);
 await page.addScriptTag({url:'https://unexpected.invalid/script.js'}).catch(()=>{});
 assert.equal(beacon,1);assert.equal(report,1);assert.equal(unexpected,0);assert.equal(await page.evaluate(()=>window.__unexpected),undefined);
 assert.equal(await page.locator('script[src*="challenges.cloudflare.com"]').count(),0);
 console.log('Public analytics CSP fixture passed: exact script/connect origins allowed, beacon/report loaded, unrelated script/connect blocked, Turnstile still lazy. No external requests.');
 await context.close();
}finally{await browser.close();}