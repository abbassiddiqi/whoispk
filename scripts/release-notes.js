#!/usr/bin/env node
// Print the CHANGELOG.md section for a version, ready to use as GitHub Release notes.
// Usage: node scripts/release-notes.js v2.1.0
import { readFileSync } from 'node:fs';

const tag = process.argv[2];
if (!tag) {
  console.error('Usage: node scripts/release-notes.js <tag>');
  process.exit(2);
}
const version = tag.replace(/^v/, '');

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const changelog = read('CHANGELOG.md');
const repo = JSON.parse(read('package.json'))
  .repository.url.replace(/^git\+/, '')
  .replace(/\.git$/, '');

// Find "## 2.1.0" or "## 2.1.0 (2026-12-01)", and the version heading after it.
const headings = [...changelog.matchAll(/^## (\S+).*$/gm)];
const index = headings.findIndex((h) => h[1] === version);
if (index === -1) {
  console.error(`CHANGELOG.md has no "## ${version}" section. Add one before releasing.`);
  process.exit(1);
}
const start = headings[index].index + headings[index][0].length;
const end = headings[index + 1]?.index ?? changelog.length;
const previous = headings[index + 1]?.[1];

let notes = changelog.slice(start, end).trim();

// Relative links like (docs/api.md) don't resolve on the Releases page.
notes = notes.replace(/\]\((?!https?:|#|mailto:)([^)]+)\)/g, `](${repo}/blob/${tag}/$1)`);

if (previous && /^\d/.test(previous)) {
  notes += `\n\n**Full changelog:** ${repo}/compare/v${previous}...${tag}`;
}

console.log(notes);
