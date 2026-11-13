import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/whoispk.js', import.meta.url));
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

// A stand-in for PKNIC that serves fixtures based on the posted domain.
const responses = {
  'magic.pk': () => [200, fixture('registered.html')],
  'magicnotatall.pk': () => [200, fixture('available.html')],
  'x.pk': () => [200, fixture('invalid.html')],
  'broken.pk': () => [500, 'Internal Server Error'],
};

let server;
let endpoint;

before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const name = new URLSearchParams(body).get('name');
      // Unknown names get the "not found" page, rewritten to name the domain asked for, as PKNIC does.
      const [status, html] = responses[name]?.() ?? [200, fixture('available.html').replaceAll('magicnotatall.pk', name)];
      res.writeHead(status, { 'content-type': 'text/html' }).end(html);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  endpoint = `http://127.0.0.1:${server.address().port}/lookup.PK`;
});

after(() => server.close());

function run(args, { input } = {}) {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [bin, ...args],
      { env: { ...process.env, WHOISPK_ENDPOINT: endpoint, NO_COLOR: '1' } },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }),
    );
    child.stdin.end(input ?? '');
  });
}

test('prints a registered domain', async () => {
  const { code, stdout } = await run(['magic']);
  assert.equal(code, 0);
  assert.match(stdout, /^magic\.pk {2}● Registered$/m);
  assert.match(stdout, /Created\s+Nov 7, 2013/);
  assert.match(stdout, /Nameservers\s+23\.227\.38\.65/);
});

test('prints available and invalid domains', async () => {
  const { code, stdout } = await run(['magicnotatall.pk', 'x.pk']);
  assert.equal(code, 0);
  assert.match(stdout, /magicnotatall\.pk {2}● Available/);
  assert.match(stdout, /x\.pk {2}● Not registrable\n {2}Invalid Domain name/);
});

test('--json prints an object for one domain and an array for several', async () => {
  const one = JSON.parse((await run(['--json', 'magic.pk'])).stdout);
  assert.equal(one.status, 'registered');
  assert.equal(one.expireDate, '2027-11-07');

  const many = JSON.parse((await run(['-j', 'magic.pk', 'magicnotatall.pk'])).stdout);
  assert.deepEqual(many.map((r) => r.status), ['registered', 'available']);
});

test('reads domains from stdin, ignoring comments', async () => {
  const { stdout } = await run(['--json'], { input: '# my list\nmagic\nmagicnotatall.pk, x.pk\n' });
  assert.deepEqual(JSON.parse(stdout).map((r) => r.domain), ['magic.pk', 'magicnotatall.pk', 'x.pk']);
});

test('exits 1 when a lookup fails, still printing the others', async () => {
  const { code, stdout } = await run(['--json', 'broken.pk', 'magic.pk']);
  assert.equal(code, 1);
  const [failed, ok] = JSON.parse(stdout);
  assert.equal(failed.status, 'error');
  assert.equal(failed.error.code, 'HTTP_ERROR');
  assert.equal(ok.status, 'registered');
});

test('--all checks every public extension, one line each', async () => {
  const { code, stdout } = await run(['--all', 'magic']);
  assert.equal(code, 0);
  const lines = stdout.trimEnd().split('\n');
  assert.deepEqual(
    lines.map((l) => l.split(/\s+/)[0]),
    ['magic.pk', 'magic.com.pk', 'magic.net.pk', 'magic.org.pk', 'magic.biz.pk', 'magic.web.pk', 'magic.fam.pk'],
  );
  assert.match(lines[0], /^magic\.pk +● Registered +expires Nov 7, 2027$/);
  assert.match(lines[1], /^magic\.com\.pk +● Available$/);
});

test('--all separates groups, and --json returns every result', async () => {
  const { stdout } = await run(['--all', 'magic', 'chaiwala']);
  assert.match(stdout, /magic\.fam\.pk +● Available\n\nchaiwala\.pk /);

  const json = JSON.parse((await run(['--all', '--json', 'magic'])).stdout);
  assert.equal(json.length, 7);
  assert.equal(json[0].status, 'registered');
});

test('--short prints one line per domain and skips duplicates', async () => {
  const { stdout } = await run(['-s', 'magic', 'x.pk', 'MAGIC.pk']);
  const lines = stdout.trimEnd().split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[1], /^x\.pk +● Not registrable +Invalid Domain name/);
});

test('--no-short shows full details with --all', async () => {
  const { stdout } = await run(['--all', '--no-short', 'magic']);
  assert.match(stdout, /Nameservers +23\.227\.38\.65/);
});

test('exits 2 on bad usage', async () => {
  assert.equal((await run(['--timeout', 'abc', 'magic.pk'])).code, 2);
  assert.equal((await run(['--nope'])).code, 2);
});

test('--version and --help', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal((await run(['-v'])).stdout.trim(), pkg.version);
  const help = await run(['--help']);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /Usage: whoispk/);
});
