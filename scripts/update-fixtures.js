#!/usr/bin/env node
// Re-download the PKNIC pages used by the offline tests in test/fixtures/.
// Run with: npm run fixtures
import { writeFile } from 'node:fs/promises';
import { ENDPOINT, USER_AGENT } from '../src/index.js';

const fixtures = {
  'registered.html': 'magic.pk',
  'available.html': 'magicnotatall.pk',
  'invalid.html': 'x.pk',
  'invalid-chars.html': 'bad name',
};

for (const [file, name] of Object.entries(fixtures)) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': USER_AGENT },
    body: new URLSearchParams({ name }).toString(),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);

  // Drop Cloudflare's per-request tracking link so diffs only show real changes.
  const html = (await res.text())
    .split('\n')
    .filter((line) => !line.includes('cdn-cgi'))
    .join('\n');

  await writeFile(new URL(`../test/fixtures/${file}`, import.meta.url), html);
  console.log(`updated test/fixtures/${file}  (${name})`);
}
