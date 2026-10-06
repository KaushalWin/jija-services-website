import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { SignJWT, generateKeyPair, exportJWK } from 'jose';

let mf, db, signingKey, secondKey;
let verificationCalls = 0; let assetCalls = 0;
const validatedTokens = new Set(); const validationRetries = new Map();
const TEAM = 'https://jija-test.cloudflareaccess.com';
const AUD = 'test-application-audience';
const PUBLIC = 'https://jijaservices.com';
const ADMIN = 'https://admin.jijaservices.com';
const basic = { name: 'Test Customer', stars: 1, comment: 'The order was disappointing. Please improve the service.', company: '', turnstileToken: 'valid' };

before(async () => {
  const signingPair = await generateKeyPair('RS256', { extractable: true }); signingKey = signingPair.privateKey;
  ({ privateKey: secondKey } = await generateKeyPair('RS256', { extractable: true }));
  const publicKey = await exportJWK(signingPair.publicKey); publicKey.kid = 'test-key'; publicKey.use = 'sig'; publicKey.alg = 'RS256';
  mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, scriptPath: '.worker-test/worker.mjs', compatibilityDate: '2026-10-01',
    d1Databases: ['REVIEWS_DB'], host: '127.0.0.1', port: 0,
    bindings: { TURNSTILE_SITEKEY: 'test-public-sitekey', TURNSTILE_SECRET: 'test-only-secret', RATE_LIMIT_SECRET: 'test-only-rate-secret-at-least-32-characters', ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD },
    serviceBindings: { ASSETS: async () => { assetCalls++; return new Response('<!doctype html><h1>Test asset</h1>', { headers: { 'content-type': 'text/html' } }); } },
    outboundService: async request => {
      const url = new URL(request.url);
      if (url.href === `${TEAM}/cdn-cgi/access/certs`) return Response.json({ keys: [publicKey] });
      if (url.href === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
        verificationCalls++; const input = await request.json();
        assert.equal(input.secret, 'test-only-secret');
        assert.match(input.idempotency_key, /^[0-9a-f-]{36}$/);
        if (validationRetries.has(input.idempotency_key)) return Response.json(validationRetries.get(input.idempotency_key));
        if (validatedTokens.has(input.response)) return Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] });
        const result = { success: input.response !== 'invalid', hostname: input.response === 'wrong-host' ? 'attacker.example' : 'jijaservices.com', action: input.response === 'wrong-action' ? 'other-form' : 'review' };
        validatedTokens.add(input.response); validationRetries.set(input.idempotency_key, result);
        if (input.response.startsWith('network-error:')) return new Response('temporary failure', { status: 502 });
        return Response.json(result);
      }
      throw new Error('Unexpected outbound request');
    }
  }));
  db = await mf.getD1Database('REVIEWS_DB');
  const schema = await readFile('migrations/0001_reviews.sql', 'utf8');
  let statement = '';
  for (const line of schema.split('\n')) {
    statement += line + '\n';
    const trigger = statement.trimStart().startsWith('CREATE TRIGGER');
    if ((trigger && /\bEND;\s*$/.test(statement)) || (!trigger && /;\s*$/.test(statement))) {
      await db.prepare(statement).run(); statement = '';
    }
  }
});
after(async () => { if (mf) await mf.dispose(); });

async function token(email = 'jijaservices@gmail.com', options = {}) {
  let builder = new SignJWT({ email, ...options.claims }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' });
  builder = builder.setIssuer(options.issuer || TEAM).setAudience(options.audience || AUD).setIssuedAt();
  if (!options.noExpiry) builder = builder.setExpirationTime(options.expired ? Math.floor(Date.now() / 1000) - 60 : '5m');
  return builder.sign(options.key || signingKey);
}
function post(body = basic, options = {}) {
  const key = options.key || crypto.randomUUID();
  const sent = { ...body, turnstileToken: ['valid', 'network-error'].includes(body.turnstileToken) ? body.turnstileToken + ':' + (options.challenge || key) : body.turnstileToken };
  return mf.dispatchFetch((options.host || PUBLIC) + '/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json', origin: options.origin || options.host || PUBLIC, 'cf-connecting-ip': options.ip || '192.0.2.1', 'idempotency-key': key }, body: JSON.stringify(sent) });
}
async function admin(path, options = {}) {
  const authorization = options.token ?? await token();
  return mf.dispatchFetch((options.host || ADMIN) + path, { ...options, headers: { 'cf-access-jwt-assertion': authorization, ...options.headers } });
}
async function seed(count, prefix = 'Seed') {
  const ids = [];
  for (let i = 0; i < count; i++) {
    const id = crypto.randomUUID(); ids.push(id);
    await db.prepare('INSERT INTO reviews(id, submission_key, request_hash, display_name, stars, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, crypto.randomUUID(), 'hash', `${prefix} ${i}`, 3, 'A real test comment for pagination.', 1700000000 + i).run();
  }
  return ids;
}

test('static public website still serves without authentication; unknown hosts are denied', async () => {
  assert.equal((await mf.dispatchFetch(PUBLIC + '/')).status, 200);
  assert.equal((await mf.dispatchFetch('https://example.workers.dev/')).status, 404);
});
test('review listing is public and never requires Turnstile', async () => {
  const calls = verificationCalls;
  const response = await mf.dispatchFetch(PUBLIC + '/api/reviews');
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).summary, { count: 0, average: null });
  assert.equal(verificationCalls, calls);
});
test('negative review publishes immediately after valid Siteverify', async () => {
  const response = await post(); assert.equal(response.status, 201); const saved = await response.json();
  const listing = await (await mf.dispatchFetch(PUBLIC + '/api/reviews')).json();
  assert.equal(listing.reviews[0].id, saved.id); assert.equal(listing.reviews[0].stars, 1); assert.equal(listing.summary.average, 1);
});
test('exact idempotent retry uses one review and does not reuse Turnstile', async () => {
  const key = crypto.randomUUID(); const first = await post(basic, { key, ip: '192.0.2.2' }); assert.equal(first.status, 201);
  const firstBody = await first.json(); const calls = verificationCalls;
  const replay = await post({ ...basic, turnstileToken: 'invalid' }, { key, ip: '192.0.2.2' });
  assert.equal(replay.status, 200); assert.equal((await replay.json()).id, firstBody.id); assert.equal(verificationCalls, calls);
  assert.equal((await post({ ...basic, stars: 5 }, { key, ip: '192.0.2.2' })).status, 409);
});
test('concurrent same-key submission inserts once', async () => {
  const key = crypto.randomUUID(); const responses = await Promise.all([post(basic, { key, ip: '192.0.2.3' }), post(basic, { key, ip: '192.0.2.3' })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 201]);
  const bodies = await Promise.all(responses.map(r => r.json())); assert.equal(bodies[0].id, bodies[1].id);
  assert.equal((await db.prepare('SELECT count(*) AS count FROM reviews WHERE submission_key = ?').bind(key).first()).count, 1);
});
test('Turnstile failure, hostname/action mismatch, and outage never insert', async () => {
  const before = await db.prepare('SELECT count(*) AS count FROM reviews').first();
  for (const [index, responseToken] of ['invalid', 'wrong-host', 'wrong-action', 'network-error'].entries()) {
    assert.equal((await post({ ...basic, turnstileToken: responseToken }, { ip: `192.0.2.${10 + index}` })).status, responseToken === 'network-error' ? 503 : 400);
  }
  assert.equal((await db.prepare('SELECT count(*) AS count FROM reviews').first()).count, before.count);
});
test('same-token verification retry after uncertain outage succeeds once; cross-payload replay is denied', async () => {
  const key = crypto.randomUUID(); const outageBody = { ...basic, turnstileToken: 'network-error' };
  assert.equal((await post(outageBody, { key, ip: '192.0.2.15' })).status, 503);
  assert.equal((await post(outageBody, { key, ip: '192.0.2.15' })).status, 201);
  assert.equal((await post(outageBody, { key, ip: '192.0.2.15' })).status, 200);
  const challenge = crypto.randomUUID(); const replayKey = crypto.randomUUID();
  assert.equal((await post(basic, { key: replayKey, ip: '192.0.2.16', challenge })).status, 201);
  assert.equal((await post({ ...basic, comment: 'Different payload must not reuse the successful challenge.' }, { ip: '192.0.2.17', challenge })).status, 400);
});
test('atomic IP limit accepts at most five concurrent attempts', async () => {
  const responses = await Promise.all(Array.from({ length: 8 }, () => post(basic, { ip: '192.0.2.20' })));
  assert.equal(responses.filter(r => r.status === 201).length, 5); assert.equal(responses.filter(r => r.status === 429).length, 3);
  const stored = await db.prepare("SELECT bucket FROM review_rate_limits WHERE bucket LIKE 'ip:%'").all();
  assert.ok(stored.results.every(row => !row.bucket.includes('192.0.2.20')));
});
test('malformed fields, honeypot spam, and cross-origin requests are rejected', async () => {
  assert.equal((await post({ ...basic, stars: 6 })).status, 400);
  assert.equal((await post({ ...basic, comment: 'short' })).status, 400);
  assert.equal((await post({ ...basic, company: 'spam' })).status, 400);
  assert.equal((await post({ ...basic, name: 'bad\u202ename' })).status, 400);
  assert.equal((await post(basic, { origin: 'https://attacker.example' })).status, 403);
  assert.equal((await post(basic, { key: 'bad' })).status, 400);
  assert.equal((await post({ ...basic, comment: 'x'.repeat(9000) })).status, 413);
});
test('HTML and SQL-looking user text remains literal data', async () => {
  const comment = "<img src=x onerror=alert(1)>'); DROP TABLE reviews; --";
  const response = await post({ ...basic, name: '<script>name</script>', comment }, { ip: '192.0.2.21' }); assert.equal(response.status, 201);
  const saved = await response.json(); const row = await db.prepare('SELECT comment FROM reviews WHERE id = ?').bind(saved.id).first(); assert.equal(row.comment, comment);
});
test('indexed keyset pagination has no duplicated or missing reviews', async () => {
  await seed(25); const ids = []; let cursor = null;
  do {
    const response = await mf.dispatchFetch(PUBLIC + '/api/reviews?limit=7' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    assert.equal(response.status, 200); const body = await response.json(); ids.push(...body.reviews.map(r => r.id)); cursor = body.nextCursor;
  } while (cursor);
  const count = (await db.prepare("SELECT count(*) AS count FROM reviews WHERE visibility = 'visible'").first()).count;
  assert.equal(ids.length, count); assert.equal(new Set(ids).size, count);
  const plan = await db.prepare("EXPLAIN QUERY PLAN SELECT id FROM reviews WHERE visibility = 'visible' AND (created_at,id) < (1700000020,'z') ORDER BY created_at DESC,id DESC LIMIT 11").all();
  assert.ok(plan.results.some(row => row.detail.includes('reviews_public_page')));
  assert.equal((await mf.dispatchFetch(PUBLIC + '/api/reviews?cursor=bad')).status, 400);
  assert.equal((await mf.dispatchFetch(PUBLIC + '/api/reviews?limit=99')).status, 400);
});
test('admin HTML, JS, CSS, and API all deny missing/forged authentication', async () => {
  const calls = assetCalls;
  for (const path of ['/', '/admin/', '/admin/index.html', '/admin/admin.js', '/admin/admin.css', '/api/admin/reviews', '/api/admin/audit']) {
    assert.equal((await mf.dispatchFetch(ADMIN + path)).status, 403);
    assert.equal((await admin(path, { token: 'forged' })).status, 403);
  }
  assert.equal(assetCalls, calls);
});
test('both allowlisted moderators can access admin page and API', async () => {
  for (const email of ['jijaservices@gmail.com', 'kaushalkhamar96@gmail.com']) {
    const signed = await token(email);
    const html = await admin('/', { token: signed }); assert.equal(html.status, 200); assert.equal(html.headers.get('cache-control'), 'no-store');
    assert.match(html.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal((await admin('/api/admin/reviews', { token: signed })).status, 200);
  }
});
test('unapproved email, wrong issuer/audience/signature, expired or missing expiry fail closed', async () => {
  const tokens = [await token('outsider@example.com'), await token(undefined, { issuer: 'https://other.cloudflareaccess.com' }), await token(undefined, { audience: 'different-app' }), await token(undefined, { key: secondKey }), await token(undefined, { expired: true }), await token(undefined, { noExpiry: true })];
  for (const signed of tokens) assert.equal((await admin('/api/admin/reviews', { token: signed })).status, 403);
  assert.equal((await mf.dispatchFetch(ADMIN + '/api/admin/reviews', { headers: { 'cf-access-authenticated-user-email': 'jijaservices@gmail.com' } })).status, 403);
});
test('main/www/workers.dev cannot bypass admin authentication even with valid JWT', async () => {
  const signed = await token();
  for (const host of [PUBLIC, 'https://www.jijaservices.com', 'https://jija-services-website.example.workers.dev']) {
    for (const path of ['/admin/index.html', '/admin/admin.js', '/api/admin/reviews', '/ADMIN/index.html', '/%61dmin/index.html', '/api/%61dmin/reviews', '/%2561dmin/index.html', '/%5cadmin/index.html', '/%2fadmin/index.html', '/admin%2findex.html', '//admin/index.html', '/safe/../admin/index.html']) assert.equal((await admin(path, { host, token: signed })).status, 404);
  }
});
test('moderation is atomic, audited, restores summary, and rejects stale writes', async () => {
  const [id] = await seed(1, 'Moderate');
  const before = await db.prepare('SELECT total, rating_sum FROM review_summary').first();
  const signed = await token();
  const patch = (action, version, reason = 'Spam moderation test', origin = ADMIN) => admin(`/api/admin/reviews/${id}`, { token: signed, method: 'PATCH', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ action, version, reason }) });
  assert.equal((await patch('hide', 1, 'Spam', 'https://attacker.example')).status, 403);
  assert.equal((await patch('hide', 1)).status, 200);
  let summary = await db.prepare('SELECT total, rating_sum FROM review_summary').first(); assert.equal(summary.total, before.total - 1); assert.equal(summary.rating_sum, before.rating_sum - 3);
  assert.equal((await patch('remove', 1)).status, 409);
  assert.equal((await patch('show', 2, 'Restore ordinary negative feedback')).status, 200);
  summary = await db.prepare('SELECT total, rating_sum FROM review_summary').first(); assert.deepEqual(summary, before);
  assert.equal((await patch('remove', 3)).status, 200);
  const audit = await (await admin('/api/admin/audit?reviewId=' + id, { token: signed })).json();
  assert.equal(audit.audit.length, 3); assert.ok(audit.audit.every(row => row.actor_email === 'jijaservices@gmail.com'));
  const listed = await (await mf.dispatchFetch(PUBLIC + '/api/reviews?limit=20')).json(); assert.ok(!listed.reviews.some(row => row.id === id));
  const retained = await db.prepare('SELECT visibility, comment FROM reviews WHERE id = ?').bind(id).first(); assert.equal(retained.visibility, 'removed'); assert.ok(retained.comment);
});
test('global cap limits attempts across IPs without a paid service', async () => {
  const responses = await Promise.all(Array.from({ length: 40 }, (_, i) => post({ ...basic, turnstileToken: 'invalid' }, { ip: `198.51.100.${i + 1}` })));
  assert.ok(responses.some(response => response.status === 429));
  assert.ok(responses.every(response => [400, 429].includes(response.status)));
});
test('exhausted global minute budget creates no additional IP buckets or verification calls', async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO review_rate_limits(bucket,attempts,expires_at) VALUES (?,30,?) ON CONFLICT(bucket) DO UPDATE SET attempts=30').bind(`g:${Math.floor(timestamp / 60)}`, timestamp + 60).run();
  const before = (await db.prepare("SELECT count(*) AS count FROM review_rate_limits WHERE bucket LIKE 'ip:%' OR bucket LIKE 'hour:%'").first()).count;
  const calls = verificationCalls;
  for (let i = 0; i < 5; i++) assert.equal((await post(basic, { ip: `203.0.113.${i}` })).status, 429);
  const after = (await db.prepare("SELECT count(*) AS count FROM review_rate_limits WHERE bucket LIKE 'ip:%' OR bucket LIKE 'hour:%'").first()).count;
  assert.equal(after, before); assert.equal(verificationCalls, calls);
});
test('daily exhaustion performs no rate-counter mutation or external verification', async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO review_rate_limits(bucket,attempts,expires_at) VALUES (?,2000,?) ON CONFLICT(bucket) DO UPDATE SET attempts=2000').bind(`day:${Math.floor(timestamp / 86400)}`, timestamp + 86400).run();
  const before = await db.prepare('SELECT bucket,attempts FROM review_rate_limits ORDER BY bucket').all(); const calls = verificationCalls;
  assert.equal((await post(basic, { ip: '203.0.113.200' })).status, 429);
  const after = await db.prepare('SELECT bucket,attempts FROM review_rate_limits ORDER BY bucket').all();
  assert.deepEqual(after.results, before.results); assert.equal(verificationCalls, calls);
});
test('missing deployment configuration fails closed while public static page remains available', async () => {
  const incomplete = new Miniflare(convertV4MiniflareOptions({ modules: true, scriptPath: '.worker-test/worker.mjs', compatibilityDate: '2026-10-01', host: '127.0.0.1', port: 0, bindings: {}, serviceBindings: { ASSETS: async () => new Response('Public website') } }));
  try {
    assert.equal((await incomplete.dispatchFetch(PUBLIC + '/')).status, 200);
    assert.equal((await incomplete.dispatchFetch(ADMIN + '/')).status, 403);
    assert.equal((await incomplete.dispatchFetch(PUBLIC + '/api/reviews')).status, 503);
    assert.equal((await incomplete.dispatchFetch(PUBLIC + '/api/reviews/config')).status, 503);
  } finally { await incomplete.dispose(); }
});
