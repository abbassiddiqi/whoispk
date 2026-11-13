import { readFileSync } from 'node:fs';
import { WhoisPkError } from './errors.js';
import { parse } from './parse.js';

export { parse, WhoisPkError };

export const ENDPOINT = 'https://pk6.pknic.net.pk/pk5/lookup.PK';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export const USER_AGENT = `whoispk/${version} (+https://github.com/abbassiddiqi/whoispk)`;

/**
 * Normalise user input into a bare .pk domain name.
 *
 *   "https://www.Daraz.pk/some/path" -> "daraz.pk"
 *   "magic"                          -> "magic.pk"
 *   "example.com.pk."                -> "example.com.pk"
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizeDomain(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new WhoisPkError('A domain name is required', { code: 'INVALID_INPUT' });
  }

  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // scheme
  domain = domain.replace(/^[^@/]*@/, ''); // userinfo
  domain = domain.replace(/[/?#].*$/, ''); // path, query, fragment
  domain = domain.replace(/:\d+$/, ''); // port
  domain = domain.replace(/\.+$/, ''); // trailing dot(s)
  domain = domain.replace(/^www\./, '');

  if (!domain) {
    throw new WhoisPkError(`"${input}" is not a valid domain name`, { code: 'INVALID_INPUT' });
  }
  if (!domain.endsWith('.pk') && domain !== 'pk') domain += '.pk';

  return domain;
}

/**
 * The .pk extensions anyone can register. PKNIC also has restricted ones
 * (edu.pk, gov.pk, gok.pk, gob.pk, gop.pk, gos.pk) for institutions only.
 */
export const EXTENSIONS = Object.freeze(['pk', 'com.pk', 'net.pk', 'org.pk', 'biz.pk', 'web.pk', 'fam.pk']);

const SECOND_LEVEL = /\.(?:com|net|org|biz|web|fam|edu|gov|gok|gob|gop|gos)$/;

/**
 * Expand a name into one domain per public .pk extension.
 *
 *   "magic" or "magic.com.pk" -> ["magic.pk", "magic.com.pk", "magic.net.pk", …]
 *
 * @param {string} input
 * @returns {string[]}
 */
export function expandExtensions(input) {
  const base = normalizeDomain(input).replace(/\.pk$/, '').replace(SECOND_LEVEL, '');
  if (!base) {
    throw new WhoisPkError(`"${input}" has no name to check`, { code: 'INVALID_INPUT' });
  }
  return EXTENSIONS.map((ext) => `${base}.${ext}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(domain, { endpoint, timeout, signal, fetch: fetchImpl }) {
  // A regular (ref'd) timer rather than AbortSignal.timeout(): the latter doesn't keep the
  // process alive, so a stalled request could let Node exit before the timeout ever fires.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException(`Timed out after ${timeout} ms`, 'TimeoutError'));
  }, timeout);
  const forwardAbort = () => controller.abort(signal.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'text/html',
        'user-agent': USER_AGENT,
      },
      body: new URLSearchParams({ name: domain }).toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new WhoisPkError(`PKNIC responded with HTTP ${response.status}`, {
        code: 'HTTP_ERROR',
        status: response.status,
      });
    }

    return await response.text();
  } catch (err) {
    if (err instanceof WhoisPkError) throw err;
    if (timedOut) {
      throw new WhoisPkError(`PKNIC did not respond within ${timeout} ms`, { code: 'TIMEOUT', cause: err });
    }
    if (signal?.aborted) {
      throw new WhoisPkError('Lookup aborted', { code: 'ABORTED', cause: err });
    }
    throw new WhoisPkError(`Could not reach PKNIC: ${err?.cause?.message ?? err?.message ?? err}`, {
      code: 'NETWORK_ERROR',
      cause: err,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

/**
 * Look up a .pk domain on PKNIC.
 *
 * @param {string} input  Domain name, e.g. "daraz.pk" (".pk" is appended if missing).
 * @param {import('./index.js').LookupOptions} [options]
 * @returns {Promise<import('./index.js').LookupResult>}
 */
export async function lookup(input, options = {}) {
  const {
    timeout = 15_000,
    retries = 1,
    signal,
    endpoint = ENDPOINT,
    fetch: fetchImpl = globalThis.fetch,
  } = options;

  const domain = normalizeDomain(input);

  for (let attempt = 0; ; attempt++) {
    try {
      const html = await request(domain, { endpoint, timeout, signal, fetch: fetchImpl });
      const result = parse(html);
      return { ...result, domain: result.domain ?? domain };
    } catch (err) {
      const retryable =
        err.code === 'NETWORK_ERROR' ||
        err.code === 'TIMEOUT' ||
        (err.code === 'HTTP_ERROR' && (err.status >= 500 || err.status === 429));
      if (!retryable || attempt >= retries) throw err;
      await sleep(500 * 2 ** attempt);
    }
  }
}

export default { lookup, parse, normalizeDomain, expandExtensions, EXTENSIONS, WhoisPkError, ENDPOINT };
