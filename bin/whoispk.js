#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { lookup, normalizeDomain, expandExtensions, EXTENSIONS, ENDPOINT } from '../src/index.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const HELP = `
Usage: whoispk [options] <domain...>

Check whether .pk domains are registered, using PKNIC's public lookup.
".pk" is appended when missing, so "whoispk magic" looks up magic.pk.
Domains can also be piped in, one per line: cat domains.txt | whoispk

Options:
  -a, --all              Check every public extension: ${EXTENSIONS.map((e) => '.' + e).join(' ')}
  -s, --short            One line per domain (the default with --all; --no-short for details)
  -j, --json             Print results as JSON
  -t, --timeout <ms>     Per-request timeout in milliseconds (default: 15000)
  -c, --concurrency <n>  Parallel lookups when checking several domains (default: 3)
      --no-color         Disable colours (also respects NO_COLOR)
  -v, --version          Print the version
  -h, --help             Show this help

Examples:
  whoispk daraz.pk
  whoispk --all chaiwala
  whoispk --json daraz google.com.pk

Exit codes:
  0  all lookups completed
  1  one or more lookups failed (network error, PKNIC down, …)
  2  invalid usage
`;

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {
      all: { type: 'boolean', short: 'a' },
      short: { type: 'boolean', short: 's' },
      'no-short': { type: 'boolean' },
      json: { type: 'boolean', short: 'j' },
      timeout: { type: 'string', short: 't' },
      concurrency: { type: 'string', short: 'c' },
      'no-color': { type: 'boolean' },
      version: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
  });
} catch (err) {
  usageError(err.message);
}

const { values: opts, positionals } = args;

if (opts.help) {
  process.stdout.write(HELP.trimStart());
  process.exit(0);
}
if (opts.version) {
  console.log(pkg.version);
  process.exit(0);
}

const timeout = parsePositiveInt(opts.timeout, 15_000, '--timeout');
const concurrency = parsePositiveInt(opts.concurrency, 3, '--concurrency');

let inputs = positionals;
if (!inputs.length && !process.stdin.isTTY) {
  inputs = (await readStdin())
    .split(/\r?\n/)
    .flatMap((line) => line.replace(/#.*/, '').split(/[\s,]+/))
    .filter(Boolean);
}
if (!inputs.length) {
  process.stdout.write(HELP.trimStart());
  process.exit(2);
}

// Expand --all, normalise, and drop duplicates. Inputs that can't be normalised are kept
// as typed, so their lookup reports the problem in place.
const domains = [
  ...new Set(
    inputs
      .flatMap((input) => (opts.all ? attempt(() => expandExtensions(input), [input]) : [input]))
      .map((input) => attempt(() => normalizeDomain(input), input)),
  ),
];
const short = opts['no-short'] ? false : Boolean(opts.short || opts.all);
const nameWidth = Math.max(...domains.map((d) => d.length));

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------

const useColor =
  !opts['no-color'] &&
  !('NO_COLOR' in process.env) &&
  (process.env.FORCE_COLOR ? process.env.FORCE_COLOR !== '0' : Boolean(process.stdout.isTTY));

const ansi = (open, close) => (s) => (useColor ? `\x1b[${open}m${s}\x1b[${close}m` : String(s));
const c = {
  bold: ansi(1, 22),
  dim: ansi(2, 22),
  red: ansi(31, 39),
  green: ansi(32, 39),
  yellow: ansi(33, 39),
  cyan: ansi(36, 39),
};

// ---------------------------------------------------------------------------
// Run lookups (bounded concurrency, printed in input order)
// ---------------------------------------------------------------------------

const endpoint = process.env.WHOISPK_ENDPOINT || ENDPOINT;
const spinner = createSpinner(!opts.json && process.stderr.isTTY);
const limit = createLimiter(concurrency);

let done = 0;
spinner.update(progressText(done, domains.length));

const pending = domains.map((domain) =>
  limit(() => lookup(domain, { timeout, endpoint }))
    .then(
      (result) => ({ ok: true, input: domain, result }),
      (error) => ({ ok: false, input: domain, error }),
    )
    .finally(() => spinner.update(progressText(++done, domains.length))),
);

let failed = 0;
const jsonResults = [];

for (const [i, promise] of pending.entries()) {
  const outcome = await promise;
  if (!outcome.ok) failed++;

  if (opts.json) {
    jsonResults.push(
      outcome.ok
        ? outcome.result
        : { domain: outcome.input, status: 'error', error: { code: outcome.error.code ?? null, message: outcome.error.message } },
    );
    continue;
  }

  spinner.clear();
  if (short) {
    // Blank line between groups of names, e.g. between "magic.*" and "chaiwala.*" with --all.
    if (i > 0 && opts.all && baseName(domains[i]) !== baseName(domains[i - 1])) console.log('');
    console.log(formatShort(outcome));
  } else {
    if (i > 0) console.log('');
    console.log(outcome.ok ? formatResult(outcome.result) : formatError(outcome.input, outcome.error));
  }
}

spinner.stop();

if (opts.json) {
  console.log(JSON.stringify(jsonResults.length === 1 ? jsonResults[0] : jsonResults, null, 2));
}

process.exitCode = failed ? 1 : 0;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatResult(r) {
  const lines = [];
  const label = (s) => `  ${c.dim(s.padEnd(13))}`;

  if (r.status === 'registered') {
    lines.push(`${c.bold(r.domain)}  ${c.red('● Registered')}`);
    if (r.createDate) lines.push(`${label('Created')}${formatDate(r.createDate)}`);
    if (r.expireDate) lines.push(`${label('Expires')}${formatDate(r.expireDate)}  ${c.dim(`(${relative(r.expireDate)})`)}`);
    r.nameservers.forEach((ns, i) => lines.push(`${label(i === 0 ? 'Nameservers' : '')}${ns}`));
  } else if (r.status === 'available') {
    lines.push(`${c.bold(r.domain)}  ${c.green('● Available')}`);
    lines.push(`  ${c.dim('Not registered — may be available for registration.')}`);
  } else {
    lines.push(`${c.bold(r.domain)}  ${c.yellow('● Not registrable')}`);
    for (const reason of r.reasons) lines.push(`  ${c.dim(reason)}`);
  }

  return lines.join('\n');
}

function formatShort({ ok, input, result: r, error }) {
  const name = c.bold((ok ? r.domain : input).padEnd(nameWidth));
  const status = (text, colour) => colour(text.padEnd(18));
  if (!ok) return `${name}  ${status('✖ Lookup failed', c.red)} ${c.dim(error.message)}`;
  if (r.status === 'registered') {
    const expiry = r.expireDate ? c.dim(`expires ${formatDate(r.expireDate)}`) : '';
    return `${name}  ${status('● Registered', c.red)} ${expiry}`.trimEnd();
  }
  if (r.status === 'available') return `${name}  ${c.green('● Available')}`;
  return `${name}  ${status('● Not registrable', c.yellow)} ${c.dim(r.reasons.join('; '))}`.trimEnd();
}

function baseName(domain) {
  return domain.split('.')[0];
}

function formatError(domain, err) {
  return `${c.bold(domain)}  ${c.red('✖ Lookup failed')}\n  ${c.dim(err.message)}`;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function relative(iso) {
  const days = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.now()) / 86_400_000);
  if (days === 0) return 'expires today';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'always' });
  const abs = Math.abs(days);
  const [value, unit] =
    abs >= 330 ? [Math.round(days / 365), 'year'] : abs >= 45 ? [Math.round(days / 30), 'month'] : [days, 'day'];
  return `${days < 0 ? 'expired ' : 'expires '}${rtf.format(value, unit)}`;
}

function progressText(n, total) {
  return total === 1 ? `Looking up ${domains[0]} on PKNIC…` : `Looking up domains on PKNIC… ${n}/${total}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSpinner(enabled) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let text = '';
  let frame = 0;
  let timer = null;
  const render = () => process.stderr.write(`\r\x1b[K${c.cyan(frames[frame++ % frames.length])} ${text}`);
  return {
    update(t) {
      if (!enabled) return;
      text = t;
      if (!timer) {
        timer = setInterval(render, 80);
        timer.unref();
      }
      render();
    },
    clear() {
      if (enabled && timer) process.stderr.write('\r\x1b[K');
    },
    stop() {
      if (!enabled) return;
      clearInterval(timer);
      timer = null;
      process.stderr.write('\r\x1b[K');
    },
  };
}

function createLimiter(max) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= max || !queue.length) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

function attempt(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function parsePositiveInt(raw, fallback, name) {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) usageError(`${name} must be a positive integer`);
  return n;
}

function usageError(message) {
  console.error(`whoispk: ${message}\nRun "whoispk --help" for usage.`);
  process.exit(2);
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}
