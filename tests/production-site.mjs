// Live anonymous public-site verification. No interception, account profile, writes, or challenges.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const output='.review-qa/production'; await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true});
const report={started:new Date().toISOString(),origin:'https://jijaservices.com',fixture:false,viewports:[],downloads:[],reviewRead:null,analytics:{blocked:false,scriptPresent:false},checks:0};
try {
 for(const width of [1440,360]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];const failed=[];const writes=[];let analyticsBlocked=false;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&message.text().includes('Content Security Policy')&&message.text().includes('cloudflareinsights.com'))analyticsBlocked=true;});
  page.on('requestfailed',request=>{if(!request.url().includes('cloudflareinsights.com'))failed.push({pathname:new URL(request.url()).pathname,error:request.failure()?.errorText});});
  page.on('request',request=>{if(new URL(request.url()).origin==='https://jijaservices.com'&&request.method()!=='GET'&&request.method()!=='HEAD')writes.push({pathname:new URL(request.url()).pathname,method:request.method()});});
  const response=await page.goto(report.origin+'/',{waitUntil:'networkidle'}); assert.equal(response.status(),200);report.checks++;
  await page.locator('.product').last().waitFor();assert.equal(await page.locator('.product').count(),37);report.checks++;
  const apiResponse=await context.request.get(report.origin+'/api/reviews?limit=20');assert.equal(apiResponse.status(),200);const reviews=await apiResponse.json();assert.ok(Array.isArray(reviews.reviews));assert.ok(Number.isInteger(reviews.summary.count));assert.ok(reviews.reviews.length<=20);report.checks++;
  report.reviewRead={status:200,count:reviews.summary.count,returned:reviews.reviews.length,average:reviews.summary.average};
  await page.locator('#review-summary').filter({hasText:/No reviews yet|customer review/}).waitFor();assert.equal(await page.locator('script[src*="challenges.cloudflare.com"]').count(),0);report.checks++;
  for(const image of await page.locator('main img').all())await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('main img')).every(image=>image.complete&&image.naturalWidth>0));report.checks++;
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);report.checks++;
  assert.deepEqual(await page.locator('main section').evaluateAll(sections=>sections.filter(section=>section.getBoundingClientRect().right>innerWidth+1||section.getBoundingClientRect().left< -1).map(section=>section.id||section.className)),[]);report.checks++;
  if(width<900){await page.locator('.menu').click();assert.equal(await page.locator('.menu').getAttribute('aria-expanded'),'true');await page.locator('#nav a[href="#seasonal-events"]').click();assert.equal(await page.locator('.menu').getAttribute('aria-expanded'),'false');assert.equal(new URL(page.url()).hash,'#seasonal-events');report.checks++;}
  else{await page.locator('#nav a[href="#seasonal-events"]').click();assert.equal(new URL(page.url()).hash,'#seasonal-events');report.checks++;}
  const cards=page.locator('.product-open');const count=await cards.count();
  for(let index=0;index<count;index++){
   const card=cards.nth(index);const expected=await card.locator('h3').textContent();await card.click();await page.locator('#product-dialog').waitFor({state:'visible'});
   assert.equal(await page.locator('#dialog-title').textContent(),expected);await page.waitForFunction(()=>{const image=document.querySelector('.dialog-visuals>img');return image.complete&&image.naturalWidth>0;});
   assert.equal(await page.locator('#product-dialog').evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth),true);
   if(index===0)await page.locator('#product-dialog').screenshot({path:`${output}/product-modal-${width}.png`});
   await page.keyboard.press('Escape');assert.equal(await page.locator('#product-dialog').isVisible(),false);report.checks++;
  }
  await page.locator('#search').fill('J2667');assert.equal(await page.locator('.product').count(),1);report.checks++;await page.locator('#search').fill('');
  await page.locator('.filters button[data-category="PPE & Cleanroom"]').click();assert.ok(await page.locator('.product').count()>0);assert.equal(await page.locator('.filters button[data-category="PPE & Cleanroom"]').getAttribute('aria-pressed'),'true');report.checks++;await page.locator('.filters button[data-category="All"]').click();assert.equal(await page.locator('.product').count(),37);report.checks++;
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/site-top-${width}.png`});
  await page.locator('.site-header').evaluate(header=>{window.__header=header;window.__headerNext=header.nextSibling;header.remove();});
  await page.locator('#seasonal-events').screenshot({path:`${output}/festivals-${width}.png`});await page.locator('#reviews').screenshot({path:`${output}/reviews-${width}.png`});
  await page.screenshot({path:`${output}/site-full-${width}.png`,fullPage:true});
  await page.evaluate(()=>{document.body.insertBefore(window.__header,window.__headerNext);delete window.__header;delete window.__headerNext;});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(writes,[]);report.checks++;
  report.analytics.blocked ||= analyticsBlocked;report.analytics.scriptPresent ||= await page.locator('script[src*="static.cloudflareinsights.com"]').count()>0;
  report.viewports.push({width,products:37,modalsOpened:count,imagesLoaded:true,horizontalOverflow:false,pageErrors:errors,unexpectedFailures:failed,siteWrites:writes});
  if(width===1440){
   const links=await page.locator('.festival-poster-grid a[download],.catalog-actions a[download],.dialog-contact-card').evaluateAll(anchors=>anchors.map(anchor=>anchor.href));
   const paths=[...new Set([...links,report.origin+'/assets/brand/jija-business-card.pdf'])];
   for(const url of paths){const result=await context.request.get(url);assert.equal(result.status(),200);const body=await result.body();const pathname=new URL(url).pathname;const expected=await readFile('.'+pathname);const digest=createHash('sha256').update(body).digest('hex');assert.equal(digest,createHash('sha256').update(expected).digest('hex'));const mime=result.headers()['content-type'];assert.match(mime,pathname.endsWith('.pdf')?/application\/pdf/:/image\/jpeg/);assert.ok(body.length>1000);report.downloads.push({pathname,status:200,mime,bytes:body.length,sha256:digest,originalMatches:true});report.checks++;}
  }
  await context.close();
 }
 report.finished=new Date().toISOString();report.passed=true;await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} catch(error){report.finished=new Date().toISOString();report.passed=false;report.failure=error.message;await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');throw error;}
finally{await browser.close();}