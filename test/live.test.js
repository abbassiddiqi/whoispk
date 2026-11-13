// Hits the real PKNIC site. Run with: npm run test:live
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookup } from '../src/index.js';

const skip = !process.env.WHOISPK_LIVE && 'set WHOISPK_LIVE=1 to run against pknic.net.pk';

test('live: registered domain', { skip, timeout: 30_000 }, async () => {
  const r = await lookup('google.com.pk');
  assert.equal(r.status, 'registered');
  assert.match(r.createDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(r.expireDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(r.nameservers.length > 0);
});

test('live: available domain', { skip, timeout: 30_000 }, async () => {
  const r = await lookup(`whoispk-test-${Date.now().toString(36)}.pk`);
  assert.equal(r.status, 'available');
});

test('live: invalid domain', { skip, timeout: 30_000 }, async () => {
  const r = await lookup('x.pk');
  assert.equal(r.status, 'invalid');
  assert.ok(r.reasons.length > 0);
});
