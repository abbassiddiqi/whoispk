import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lookup, normalizeDomain, expandExtensions, EXTENSIONS, WhoisPkError, USER_AGENT } from '../src/index.js';

const execFileAsync = promisify(execFile);
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('normalizeDomain', () => {
  assert.equal(normalizeDomain('daraz.pk'), 'daraz.pk');
  assert.equal(normalizeDomain('  Daraz.PK  '), 'daraz.pk');
  assert.equal(normalizeDomain('magic'), 'magic.pk');
  assert.equal(normalizeDomain('https://www.daraz.pk/path?q=1#x'), 'daraz.pk');
  assert.equal(normalizeDomain('http://example.com.pk:8080'), 'example.com.pk');
  assert.equal(normalizeDomain('example.com.pk.'), 'example.com.pk');
  for (const bad of ['', '   ', undefined, null, 'https://']) {
    assert.throws(() => normalizeDomain(bad), { code: 'INVALID_INPUT' });
  }
});

test('expandExtensions', () => {
  const all = ['magic.pk', 'magic.com.pk', 'magic.net.pk', 'magic.org.pk', 'magic.biz.pk', 'magic.web.pk', 'magic.fam.pk'];
  assert.deepEqual(expandExtensions('magic'), all);
  assert.deepEqual(expandExtensions('Magic.PK'), all);
  assert.deepEqual(expandExtensions('https://www.magic.com.pk/shop'), all);
  assert.deepEqual(expandExtensions('magic.edu.pk'), all);
  assert.equal(EXTENSIONS.length, all.length);
  assert.throws(() => expandExtensions('.pk'), { code: 'INVALID_INPUT' });
  assert.throws(() => expandExtensions(''), { code: 'INVALID_INPUT' });
});

test('lookup posts the normalised domain and parses the response', async () => {
  let request;
  const fetch = async (url, init) => {
    request = { url, ...init };
    return new Response(fixture('registered.html'), { status: 200 });
  };

  const r = await lookup('https://www.MAGIC.pk/', { fetch, endpoint: 'https://example.test/lookup' });

  assert.equal(request.url, 'https://example.test/lookup');
  assert.equal(request.method, 'POST');
  assert.equal(request.body, 'name=magic.pk');
  assert.equal(request.headers['user-agent'], USER_AGENT);
  assert.equal(r.status, 'registered');
  assert.equal(r.domain, 'magic.pk');
});

test('lookup retries on 5xx, then succeeds', async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    return calls === 1
      ? new Response('oops', { status: 503 })
      : new Response(fixture('available.html'), { status: 200 });
  };
  const r = await lookup('magicnotatall.pk', { fetch });
  assert.equal(calls, 2);
  assert.equal(r.status, 'available');
});

test('lookup does not retry 4xx and reports HTTP_ERROR', async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    return new Response('forbidden', { status: 403 });
  };
  await assert.rejects(lookup('daraz.pk', { fetch }), (err) => {
    assert.ok(err instanceof WhoisPkError);
    assert.equal(err.code, 'HTTP_ERROR');
    assert.equal(err.status, 403);
    return true;
  });
  assert.equal(calls, 1);
});

test('lookup reports NETWORK_ERROR after retries are exhausted', async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    throw new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND') });
  };
  await assert.rejects(lookup('daraz.pk', { fetch, retries: 0 }), {
    code: 'NETWORK_ERROR',
    message: /ENOTFOUND/,
  });
  assert.equal(calls, 1);
});

test('lookup reports TIMEOUT', async () => {
  const fetch = (url, { signal }) =>
    new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  await assert.rejects(lookup('daraz.pk', { fetch, timeout: 20, retries: 0 }), { code: 'TIMEOUT' });
});

test('the timeout keeps the process alive until it fires', async () => {
  // Outside the test runner, nothing else holds the event loop open. With an unref'd
  // timer (AbortSignal.timeout) Node would exit with code 13 before the timeout fired.
  const script = `
    import { lookup } from ${JSON.stringify(new URL('../src/index.js', import.meta.url).href)};
    const fetch = (url, { signal }) =>
      new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    await lookup('daraz.pk', { fetch, timeout: 20, retries: 0 }).catch((err) => console.log(err.code));
  `;
  const { stdout } = await execFileAsync(process.execPath, ['--input-type=module', '-e', script]);
  assert.equal(stdout.trim(), 'TIMEOUT');
});

test('lookup honours an AbortSignal', async () => {
  const fetch = (url, { signal }) =>
    new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  const controller = new AbortController();
  const promise = lookup('daraz.pk', { fetch, signal: controller.signal });
  controller.abort();
  await assert.rejects(promise, { code: 'ABORTED' });
});
