import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, WhoisPkError } from '../src/index.js';
import { toIsoDate } from '../src/parse.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('parses a registered domain', () => {
  const r = parse(fixture('registered.html'));
  assert.equal(r.domain, 'magic.pk');
  assert.equal(r.status, 'registered');
  assert.equal(r.registered, true);
  assert.equal(r.available, false);
  assert.equal(r.createDate, '2013-11-07');
  assert.equal(r.expireDate, '2027-11-07');
  assert.deepEqual(r.nameservers, [
    '23.227.38.65',
    'www',
    'shops.myshopify.com',
    'google-site-verification=pOgwNBiUDLQspNChNaHt-oG6zJeBhEyPAv29_oIwl_Q',
  ]);
  assert.deepEqual(r.reasons, []);
  assert.deepEqual(r.fields, {
    'Domain Name': 'magic.pk',
    'Create Date': 'Nov 7, 2013',
    'Expire Date': 'Nov 7, 2027',
  });
});

test('parses an available domain', () => {
  const r = parse(fixture('available.html'));
  assert.equal(r.domain, 'magicnotatall.pk');
  assert.equal(r.status, 'available');
  assert.equal(r.available, true);
  assert.equal(r.registered, false);
  assert.equal(r.createDate, null);
  assert.deepEqual(r.nameservers, []);
});

test('parses a rejected (invalid) domain with reasons', () => {
  const r = parse(fixture('invalid.html'));
  assert.equal(r.domain, 'x.pk');
  assert.equal(r.status, 'invalid');
  assert.equal(r.available, false);
  assert.equal(r.registered, false);
  assert.deepEqual(r.reasons, ['Invalid Domain name [Three or less characters without suffix e.g. COM.PK]']);
});

test('strips the domain prefix from reasons', () => {
  const r = parse(fixture('invalid-chars.html'));
  assert.equal(r.status, 'invalid');
  assert.deepEqual(r.reasons, ['invalid character in domain name']);
});

test('falls back to visible text when marker tags are missing', () => {
  const html = fixture('available.html').replace(/<XPC_[A-Z_]+\/>/g, '');
  assert.equal(parse(html).status, 'available');

  const reg = parse(fixture('registered.html').replace(/<XPC_[A-Z_]+\/>/g, ''));
  assert.equal(reg.status, 'registered');
  assert.equal(reg.expireDate, '2027-11-07');
});

test('throws PARSE_ERROR on an unrecognised page', () => {
  assert.throws(() => parse('<html><body>Maintenance</body></html>'), (err) => {
    assert.ok(err instanceof WhoisPkError);
    assert.equal(err.code, 'PARSE_ERROR');
    return true;
  });
});

test('toIsoDate', () => {
  assert.equal(toIsoDate('Nov 7, 2013'), '2013-11-07');
  assert.equal(toIsoDate('May 14, 2028 '), '2028-05-14');
  assert.equal(toIsoDate('September 30 2024'), '2024-09-30');
  assert.equal(toIsoDate('soon'), null);
});
