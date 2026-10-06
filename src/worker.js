import { createRemoteJWKSet, jwtVerify } from 'jose';

const PUBLIC_HOSTS = new Set(['jijaservices.com', 'www.jijaservices.com']);
const ADMIN_HOST = 'admin.jijaservices.com';
const ADMIN_EMAILS = new Set(['jijaservices@gmail.com', 'kaushalkhamar96@gmail.com']);
const JWKS = new Map();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADMIN_PATH = /^\/(?:admin(?:\/|$|\.html$)|api\/admin(?:\/|$))/;
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const ADMIN_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } }); }
function fail(status, message) { throw new HttpError(status, message); }
function now() { return Math.floor(Date.now() / 1000); }
function requireDB(env) { if (!env.REVIEWS_DB) fail(503, 'Reviews are temporarily unavailable.'); return env.REVIEWS_DB; }
function originCheck(request) {
  const expected = new URL(request.url).origin;
  if (request.headers.get('origin') !== expected) fail(403, 'Please submit from this website.');
}
async function readJSON(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) fail(415, 'Send a JSON request.');
  if (Number(request.headers.get('content-length')) > 8192) fail(413, 'The request is too large.');
  if (!request.body) fail(400, 'A request body is required.');
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); fail(413, 'The request is too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail(400, 'The request is not valid JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'The request must be an object.');
  return body;
}
function text(value, min, max, label) {
  if (typeof value !== 'string') fail(400, `${label} is required.`);
  const result = value.normalize('NFC').trim();
  if ([...result].length < min || [...result].length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(result)) fail(400, `${label} must be ${min}–${max} characters.`);
  return result;
}
async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function ipHash(ip, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function reserveRate(request, env, db) {
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip || ip.length > 64 || typeof env.RATE_LIMIT_SECRET !== 'string' || env.RATE_LIMIT_SECRET.length < 32) fail(503, 'Reviews are temporarily unavailable.');
  const timestamp = now();
  const reserve = (bucket, limit, expiry) => db.prepare(
    'INSERT INTO review_rate_limits(bucket, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 WHERE attempts < ? RETURNING attempts'
  ).bind(bucket, expiry, limit).first();
  // Global budgets must fail before creating attacker-controlled per-IP buckets.
  // 2,000 attempts/day bounds counter, index, review, and cleanup writes below Free D1 limits.
  const day = await reserve(`day:${Math.floor(timestamp / 86400)}`, 2000, (Math.floor(timestamp / 86400) + 1) * 86400);
  if (!day) fail(429, 'The daily review limit has been reached. Please try again tomorrow.');
  const minute = await reserve(`g:${Math.floor(timestamp / 60)}`, 30, (Math.floor(timestamp / 60) + 1) * 60);
  if (!minute) fail(429, 'Too many attempts. Please try again later.');
  const hash = await ipHash(ip, env.RATE_LIMIT_SECRET);
  const windows = [
    [`ip:${hash}:${Math.floor(timestamp / 600)}`, 5, (Math.floor(timestamp / 600) + 1) * 600],
    [`hour:${hash}:${Math.floor(timestamp / 3600)}`, 10, (Math.floor(timestamp / 3600) + 1) * 3600]
  ];
  const results = await db.batch(windows.map(([bucket, limit, expiry]) => db.prepare(
    'INSERT INTO review_rate_limits(bucket, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 WHERE attempts < ? RETURNING attempts'
  ).bind(bucket, expiry, limit)));
  if (results.some(result => !result.results.length)) fail(429, 'Too many attempts. Please try again later.');
  if (minute.attempts === 1) {
    await db.prepare('DELETE FROM review_rate_limits WHERE bucket IN (SELECT bucket FROM review_rate_limits WHERE expires_at < ? ORDER BY expires_at LIMIT 5)').bind(timestamp - 86400).run();
  }
}
async function verificationUUID(submissionKey, requestHash, token) {
  // RFC 9562 UUIDv5: namespace plus submission, normalized payload, and challenge token.
  const namespace = Uint8Array.from('0c5c68c2ec464170a1252f14743f8795'.match(/../g), h => parseInt(h, 16));
  const name = new TextEncoder().encode(JSON.stringify([submissionKey, requestHash, token]));
  const input = new Uint8Array(namespace.length + name.length); input.set(namespace); input.set(name, namespace.length);
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-1', input)).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
async function verifyTurnstile(body, request, env, submissionKey, requestHash) {
  if (!env.TURNSTILE_SECRET) fail(503, 'Reviews are temporarily unavailable.');
  const token = body.turnstileToken;
  if (typeof token !== 'string' || !token || token.length > 2048) fail(400, 'Complete the verification and try again.');
  let result;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: request.headers.get('cf-connecting-ip'), idempotency_key: await verificationUUID(submissionKey, requestHash, token) }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) fail(503, 'Verification is temporarily unavailable.');
    result = await response.json();
  } catch { fail(503, 'Verification is temporarily unavailable.'); }
  if (result.success !== true || result.action !== 'review' || !PUBLIC_HOSTS.has(result.hostname)) fail(400, 'Verification expired or failed. Please try again.');
}
function cursor(value) {
  if (!value) return null;
  if (value.length > 200) fail(400, 'Invalid page cursor.');
  try {
    const parsed = JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/')));
    if (!Array.isArray(parsed) || parsed.length !== 2 || !Number.isSafeInteger(parsed[0]) || parsed[0] < 0 || !UUID.test(parsed[1])) throw new Error();
    return parsed;
  } catch { fail(400, 'Invalid page cursor.'); }
}
function encodeCursor(row) { return btoa(JSON.stringify([row.created_at, row.id])).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function listReviews(url, db, admin = false) {
  const filter = admin ? (url.searchParams.get('visibility') || 'all') : 'visible';
  if (!['all', 'visible', 'hidden', 'removed'].includes(filter)) fail(400, 'Invalid review filter.');
  const rawLimit = url.searchParams.get('limit') || '10';
  if (!/^\d{1,2}$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 20) fail(400, 'Page size must be 1–20.');
  const limit = Number(rawLimit); const after = cursor(url.searchParams.get('cursor'));
  const where = []; const params = [];
  if (filter !== 'all') { where.push('visibility = ?'); params.push(filter); }
  if (after) { where.push('(created_at, id) < (?, ?)'); params.push(...after); }
  const columns = 'id, display_name, stars, comment, created_at' + (admin ? ', visibility, version' : '');
  const statement = `SELECT ${columns} FROM reviews ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC, id DESC LIMIT ?`;
  params.push(limit + 1);
  const { results } = await db.prepare(statement).bind(...params).all();
  const more = results.length > limit; const reviews = results.slice(0, limit);
  const summary = await db.prepare('SELECT total, rating_sum FROM review_summary WHERE singleton = 1').first();
  return json({ reviews, nextCursor: more ? encodeCursor(reviews.at(-1)) : null, summary: { count: summary.total, average: summary.total ? summary.rating_sum / summary.total : null } });
}
async function submitReview(request, env) {
  originCheck(request);
  const db = requireDB(env); const body = await readJSON(request);
  const submissionKey = request.headers.get('idempotency-key');
  if (!UUID.test(submissionKey || '')) fail(400, 'A valid submission key is required.');
  const name = text(body.name, 1, 80, 'Name'); const comment = text(body.comment, 10, 2000, 'Comment');
  if (!Number.isInteger(body.stars) || body.stars < 1 || body.stars > 5) fail(400, 'Choose 1–5 stars.');
  if (body.company || (comment.match(/https?:\/\//gi) || []).length > 2) fail(400, 'Please submit a review of your experience.');
  const requestHash = await digest(JSON.stringify([name, body.stars, comment]));
  const existing = await db.prepare('SELECT id, request_hash, created_at FROM reviews WHERE submission_key = ?').bind(submissionKey).first();
  if (existing) {
    if (existing.request_hash !== requestHash) fail(409, 'This submission key was already used for a different review.');
    return json({ id: existing.id, createdAt: existing.created_at, replayed: true });
  }
  await reserveRate(request, env, db);
  await verifyTurnstile(body, request, env, submissionKey, requestHash);
  const id = crypto.randomUUID(); const createdAt = now();
  const row = await db.prepare('INSERT INTO reviews(id, submission_key, request_hash, display_name, stars, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(submission_key) DO NOTHING RETURNING id, request_hash, created_at')
    .bind(id, submissionKey, requestHash, name, body.stars, comment, createdAt).first();
  if (row) return json({ id: row.id, createdAt: row.created_at }, 201);
  const raced = await db.prepare('SELECT id, request_hash, created_at FROM reviews WHERE submission_key = ?').bind(submissionKey).first();
  if (!raced || raced.request_hash !== requestHash) fail(409, 'This submission key was already used for a different review.');
  return json({ id: raced.id, createdAt: raced.created_at, replayed: true });
}
async function adminIdentity(request, env) {
  const issuer = env.ACCESS_TEAM_DOMAIN;
  if (typeof issuer !== 'string' || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || typeof env.ACCESS_AUD !== 'string' || !env.ACCESS_AUD || env.ACCESS_AUD.includes('REPLACE')) fail(403, 'Administrator access is not configured.');
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || token.length > 16384) fail(403, 'Administrator sign-in is required.');
  try {
    if (!JWKS.has(issuer)) JWKS.set(issuer, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), { timeoutDuration: 5000 }));
    const { payload } = await jwtVerify(token, JWKS.get(issuer), { issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'], clockTolerance: 5 });
    if (!Number.isSafeInteger(payload.exp) || !Number.isSafeInteger(payload.iat) || payload.iat > now() + 5 || typeof payload.email !== 'string' || !ADMIN_EMAILS.has(payload.email.toLowerCase())) throw new Error();
    return payload.email.toLowerCase();
  } catch { fail(403, 'Administrator sign-in is required.'); }
}
async function moderate(request, env, id, email) {
  originCheck(request); const db = requireDB(env); const body = await readJSON(request);
  if (!UUID.test(id)) fail(404, 'Review not found.');
  const actions = { show: 'visible', hide: 'hidden', remove: 'removed' };
  const visibility = Object.hasOwn(actions, body.action) ? actions[body.action] : null;
  if (!visibility || !Number.isSafeInteger(body.version) || body.version < 1) fail(400, 'A valid action and current review version are required.');
  const reason = text(body.reason, 3, 500, 'Moderation reason');
  const row = await db.prepare('UPDATE reviews SET visibility = ?, version = version + 1, moderation_actor = ?, moderation_reason = ? WHERE id = ? AND version = ? AND visibility != ? RETURNING id, visibility, version')
    .bind(visibility, email, reason, id, body.version, visibility).first();
  if (row) return json(row);
  const current = await db.prepare('SELECT id, visibility, version FROM reviews WHERE id = ?').bind(id).first();
  if (!current) fail(404, 'Review not found.');
  if (current.version !== body.version) fail(409, 'This review changed. Refresh before moderating it.');
  return json(current);
}
async function serveAsset(request, env, path, admin = false) {
  if (!env.ASSETS) fail(503, 'The website is temporarily unavailable.');
  const url = new URL(request.url); if (path) url.pathname = path;
  const response = await env.ASSETS.fetch(new Request(url, { method: request.method, headers: request.headers }));
  if (!admin) return response;
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store'); headers.set('content-security-policy', ADMIN_CSP);
  headers.set('x-content-type-options', 'nosniff'); headers.set('x-frame-options', 'DENY'); headers.set('referrer-policy', 'same-origin');
  return new Response(response.body, { status: response.status, headers });
}
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.protocol !== 'https:' || (!PUBLIC_HOSTS.has(url.hostname) && url.hostname !== ADMIN_HOST)) fail(404, 'Not found.');
      if (/%(?:2f|5c)/i.test(url.pathname)) fail(404, 'Not found.');
      let decodedPath;
      try { decodedPath = decodeURIComponent(url.pathname); } catch { fail(400, 'Invalid path.'); }
      // Reject ambiguous double encodings and separators before asset lookup can normalize them.
      if (decodedPath.includes('\\') || decodedPath.includes('\0') || /%[0-9a-f]{2}/i.test(decodedPath)) fail(404, 'Not found.');
      url.pathname = decodedPath.replace(/\/{2,}/g, '/');
      if (url.hostname === ADMIN_HOST) {
        const email = await adminIdentity(request, env);
        if (url.pathname === '/api/admin/reviews' && request.method === 'GET') return await listReviews(url, requireDB(env), true);
        const match = /^\/api\/admin\/reviews\/([^/]+)$/.exec(url.pathname);
        if (match && request.method === 'PATCH') return await moderate(request, env, match[1], email);
        if (url.pathname === '/api/admin/audit' && request.method === 'GET') {
          const id = url.searchParams.get('reviewId'); if (!UUID.test(id || '')) fail(400, 'Choose a review.');
          const { results } = await requireDB(env).prepare('SELECT actor_email, reason, old_visibility, new_visibility, review_version, changed_at FROM moderation_audit WHERE review_id = ? ORDER BY id DESC LIMIT 50').bind(id).all();
          return json({ audit: results });
        }
        if (url.pathname.startsWith('/api/')) fail(405, 'Method or route not allowed.');
        if (!['GET', 'HEAD'].includes(request.method)) fail(405, 'Method not allowed.');
        if (url.pathname === '/' || url.pathname === '/admin/' || url.pathname === '/admin/index.html') return await serveAsset(request, env, '/admin/', true);
        if (url.pathname === '/admin/admin.js' || url.pathname === '/admin/admin.css') return await serveAsset(request, env, null, true);
        fail(404, 'Not found.');
      }
      if (ADMIN_PATH.test(url.pathname.toLowerCase())) fail(404, 'Not found.');
      if (url.pathname === '/api/reviews/config' && request.method === 'GET') {
        if (!env.TURNSTILE_SITEKEY) fail(503, 'Reviews are temporarily unavailable.');
        return json({ sitekey: env.TURNSTILE_SITEKEY });
      }
      if (url.pathname === '/api/reviews' && request.method === 'GET') return await listReviews(url, requireDB(env));
      if (url.pathname === '/api/reviews' && request.method === 'POST') return await submitReview(request, env);
      if (url.pathname.startsWith('/api/')) fail(405, 'Method or route not allowed.');
      if (!['GET', 'HEAD'].includes(request.method)) fail(405, 'Method not allowed.');
      return await serveAsset(request, env);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, error.status === 429 ? { 'retry-after': '600' } : {});
      return json({ error: 'Reviews are temporarily unavailable. Please try again later.' }, 503);
    }
  }
};
