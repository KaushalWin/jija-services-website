// Brief live post-release smoke. Anonymous, no route fixtures, account profile, review writes, or challenge interaction.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const out='.review-qa/production';await mkdir(out,{recursive:true});
const resolverEvidence=Object.fromEntries(['static.cloudflareinsights.com','cloudflareinsights.com'].map(host=>[host,execFileSync('getent',['ahostsv4',host],{encoding:'utf8'}).trim().split(/\s+/)[0]]));
const report={started:new Date().toISOString(),reportedWorkerVersion:process.env.RELEASE_WORKER_VERSION||null,fixtures:false,viewports:[],reviews:null,publicSmokePassed:false,analyticsEndToEndVerified:false,analyticsResolverEvidence:resolverEvidence};
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true});
try{
 for(const width of [1440,360]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];const blocked=[];const analytics=[];const analyticsFailures=[];const reviewWrites=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>{if(request.url().includes('cloudflareinsights'))analyticsFailures.push({hostname:new URL(request.url()).hostname,error:request.failure()?.errorText});});
  page.on('console',message=>{if(message.type()==='error'&&/cloudflareinsights/.test(message.text())&&/Content Security Policy/.test(message.text()))blocked.push('Analytics CSP rejection');});
  page.on('response',response=>{const url=new URL(response.url());if(/(^|\.)cloudflareinsights\.com$/.test(url.hostname)||url.pathname==='/cdn-cgi/rum')analytics.push({hostname:url.hostname,pathname:url.pathname.split('/beacon.min.js')[0]+(url.pathname.includes('/beacon.min.js')?'/beacon.min.js':url.pathname.startsWith('/cdn-cgi/')?'':url.pathname),status:response.status()});});
  page.on('request',request=>{const url=new URL(request.url());if(url.origin==='https://jijaservices.com'&&url.pathname.startsWith('/api/reviews')&&request.method()!=='GET')reviewWrites.push(request.method());});
  const response=await page.goto('https://jijaservices.com/',{waitUntil:'networkidle'});assert.equal(response.status(),200);
  const policy=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');assert.match(policy,/script-src[^;]*https:\/\/static\.cloudflareinsights\.com/);assert.match(policy,/connect-src[^;]*https:\/\/cloudflareinsights\.com/);
  assert.equal(await page.locator('.product').count(),37);
  await page.waitForFunction(()=>performance.getEntriesByType('resource').some(resource=>resource.name.startsWith('https://static.cloudflareinsights.com/beacon.min.js')));
  const analyticsLoaded=analytics.some(item=>item.hostname==='static.cloudflareinsights.com'&&item.status===200);
  if(!analyticsLoaded)assert.ok(analyticsFailures.some(item=>item.hostname==='static.cloudflareinsights.com'&&item.error==='net::ERR_CONNECTION_REFUSED'),'Classify unexpected analytics failure');
  
  const api=await context.request.get('https://jijaservices.com/api/reviews?limit=20');assert.equal(api.status(),200);const json=await api.json();assert.deepEqual(json,{reviews:[],nextCursor:null,summary:{count:0,average:null}});report.reviews={status:200,...json};
  await page.locator('#review-summary').filter({hasText:'No reviews yet'}).waitFor();assert.equal(await page.locator('#review-list article').count(),0);assert.equal(await page.locator('script[src*="challenges.cloudflare.com"]').count(),0);
  if(width===360){await page.locator('.menu').click();await page.locator('#nav a[href="#seasonal-events"]').click();assert.equal(await page.locator('.menu').getAttribute('aria-expanded'),'false');assert.equal(new URL(page.url()).hash,'#seasonal-events');}
  for(const image of await page.locator('.festival-poster-image img').all())await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.festival-poster-image img')).every(image=>image.complete&&image.naturalWidth>0));assert.equal(await page.locator('.festival-card').count(),5);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(width===360){await page.locator('.site-header').evaluate(header=>header.remove());await page.locator('#seasonal-events').screenshot({path:out+'/final-festivals-360.png'});await page.locator('#reviews').screenshot({path:out+'/final-reviews-360.png'});}
  assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);assert.deepEqual(reviewWrites,[]);
  report.viewports.push({width,analyticsResponses:analytics,analyticsFailures,analyticsScriptLoaded:analyticsLoaded,analyticsCspErrors:blocked,pageErrors:errors,reviewWrites,products:37,festivalPosters:5,horizontalOverflow:false});await context.close();
 }
 report.publicSmokePassed=true;report.analyticsEndToEndVerified=report.viewports.every(item=>item.analyticsScriptLoaded);report.analyticsLimitation=report.analyticsEndToEndVerified?null:'Local resolver maps both analytics domains to0.0.0.0; beacon fetch refused. Deployed CSP origins verified and no analytics CSP errors. No DNS/filter changes made.';report.finished=new Date().toISOString();await writeFile(out+'/final-smoke.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(error){report.finished=new Date().toISOString();report.failure=error.message;await writeFile(out+'/final-smoke.json',JSON.stringify(report,null,2)+'\n');throw error;}
finally{await browser.close();}