import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validPass, framedCookie, sessionCookie, isSignedIn } from '../src/auth.js';

const SECRET = 'test-password';
const NOW = Date.parse('2026-10-17T19:00:00Z');
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
// The pass as Roy OS mints it (src/work.js adminCookie there), expiring in `ttl` seconds.
async function pass(ttl, secret = SECRET) {
  const expires = Math.floor(NOW / 1000) + ttl;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `${expires}.${hex(await crypto.subtle.sign('HMAC', key, enc.encode('admin:' + expires)))}`;
}

test('a Roy OS pass is good for two minutes and only with the password', async () => {
  assert.equal(await validPass(await pass(60), SECRET, NOW), true);
  assert.equal(await validPass(await pass(-1), SECRET, NOW), false);
  assert.equal(await validPass(await pass(30 * 86400), SECRET, NOW), false);
  assert.equal(await validPass(await pass(60, 'other'), SECRET, NOW), false);
  assert.equal(await validPass('', SECRET, NOW), false);
});

test('the framed cookie is partitioned and signs in; the normal one stays Lax', async () => {
  const framed = await framedCookie(SECRET, NOW);
  assert.match(framed, /; Secure; SameSite=None; Partitioned$/);
  const req = new Request('https://x/', { headers: { Cookie: framed.split(';')[0] } });
  assert.equal(await isSignedIn(req, SECRET, NOW), true);
  assert.match(await sessionCookie(SECRET, NOW), /SameSite=Lax$/);
});
