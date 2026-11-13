# API reference

```js
import { lookup, parse, normalizeDomain, expandExtensions, EXTENSIONS, WhoisPkError, ENDPOINT, USER_AGENT } from 'whoispk';
```

The package is ESM. On Node.js 20.19 or later you can also load it with `require('whoispk')`. Type definitions are included.

## `lookup(domain, options?)`

Looks up a domain on PKNIC and resolves to a [`LookupResult`](#lookupresult).

```js
const result = await lookup('daraz.pk');
```

`domain` is cleaned up with [`normalizeDomain`](#normalizedomaininput) first, so `'magic'` or `'https://www.magic.pk/'` work.

### Options

| Option     | Type          | Default        | Description |
| ---------- | ------------- | -------------- | ----------- |
| `timeout`  | `number`      | `15000`        | Timeout in ms for each attempt |
| `retries`  | `number`      | `1`            | Extra attempts after a network error, a timeout, HTTP 429, or HTTP 5xx. Waits 500 ms, then 1 s, 2 s, … between attempts. Other errors are not retried. |
| `signal`   | `AbortSignal` | none           | Cancels the lookup. It rejects with code `ABORTED`. |
| `endpoint` | `string`      | [`ENDPOINT`](#constants) | The URL to send the lookup to |
| `fetch`    | `typeof fetch`| global `fetch` | Your own fetch, e.g. to go through a proxy or to stub it in tests |

Several domains, run one after another to be polite to PKNIC:

```js
for (const name of ['chaiwala', 'kitaabghar', 'rickshaw']) {
  const r = await lookup(name);
  console.log(r.domain, r.status);
}
```

Cancelling:

```js
const controller = new AbortController();
setTimeout(() => controller.abort(), 2000);

await lookup('daraz.pk', { signal: controller.signal });
```

## `LookupResult`

```ts
interface LookupResult {
  domain: string;                 // normalised domain, e.g. "daraz.pk"
  status: 'registered' | 'available' | 'invalid';
  registered: boolean;            // status === 'registered'
  available: boolean;             // status === 'available'
  createDate: string | null;      // "YYYY-MM-DD", registered domains only
  expireDate: string | null;      // "YYYY-MM-DD", registered domains only
  nameservers: string[];          // as listed by PKNIC, in order
  reasons: string[];              // PKNIC's reasons, when status is 'invalid'
  fields: Record<string, string>; // every labelled row of the record, verbatim
}
```

What each `status` means:

- **`registered`**: someone holds the domain. `createDate`, `expireDate` and `nameservers` are filled in.
- **`available`**: PKNIC has no record of it. PKNIC only checks whether the name is allowed when you actually register it, so this isn't a promise you can register it.
- **`invalid`**: PKNIC rejected the name. For example, `x.pk` gets *"Invalid Domain name [Three or less characters without suffix e.g. COM.PK]"*. The reasons are in `reasons`.

Notes:

- **Nameservers are shown exactly as PKNIC lists them.** Some domains have entries that aren't hostnames, such as an IP address, `www`, or a `google-site-verification=…` string, because that's how the domain's records were set up.
- **`fields` keeps the raw text of every labelled row**, e.g. `{ "Create Date": "Nov 7, 2013" }`. If PKNIC adds a new field, you'll find it there before this library adds a property for it.
- **Registrant, address and contact details aren't available.** PKNIC stopped publishing them because of GDPR and ICANN WHOIS policy.

## `parse(html)`

Parses the HTML of a PKNIC lookup page into a `LookupResult`. `lookup()` uses this internally. You can use it on its own to parse a page you saved, or to test against your own copies.

```js
import { readFile } from 'node:fs/promises';
import { parse } from 'whoispk';

const result = parse(await readFile('page.html', 'utf8'));
```

`domain` is `null` if it can't be found in the page. `lookup()` fills it in from the domain you asked for.

It throws a `TypeError` if `html` isn't a string. It throws a `WhoisPkError` with code `PARSE_ERROR` if the page doesn't look like any known result.

## `normalizeDomain(input)`

Cleans up what someone typed into a bare `.pk` domain, without sending a request.

```js
normalizeDomain('https://www.Daraz.pk/path?q=1'); // 'daraz.pk'
normalizeDomain('magic');                         // 'magic.pk'
normalizeDomain('example.com.pk.');               // 'example.com.pk'
```

In order, it:

1. trims and lowercases the input
2. removes any scheme (`https://`), user info, path, query string, fragment and port
3. removes trailing dots and a leading `www.`
4. adds `.pk` if the name doesn't end with it

It throws `WhoisPkError` with code `INVALID_INPUT` when nothing is left. It doesn't check whether the name is allowed. PKNIC does that, and reports it as `status: 'invalid'`.

## `expandExtensions(input)`

Turns a name into one domain for each public `.pk` extension. This is what the CLI's `--all` uses.

```js
expandExtensions('chaiwala');
// ['chaiwala.pk', 'chaiwala.com.pk', 'chaiwala.net.pk', 'chaiwala.org.pk',
//  'chaiwala.biz.pk', 'chaiwala.web.pk', 'chaiwala.fam.pk']
```

The input is cleaned up with `normalizeDomain` first, and any `.pk` extension is replaced, so `'chaiwala.com.pk'` gives the same list. It throws `WhoisPkError` with code `INVALID_INPUT` when there's no name left, e.g. for `'.pk'`.

To check them all:

```js
for (const domain of expandExtensions('chaiwala')) {
  const r = await lookup(domain);
  console.log(domain, r.status);
}
```

## `WhoisPkError`

Every failure from `lookup()` rejects with a `WhoisPkError`, a subclass of `Error`.

| Property | Description |
| -------- | ----------- |
| `code`   | One of the codes below |
| `status` | The HTTP status, for `HTTP_ERROR` only |
| `cause`  | The underlying error, if there was one |

| Code            | When |
| --------------- | ---- |
| `INVALID_INPUT` | The domain was empty or couldn't be cleaned up. No request was sent. |
| `HTTP_ERROR`    | PKNIC replied with a status other than 2xx |
| `NETWORK_ERROR` | PKNIC couldn't be reached, e.g. because of DNS, a refused connection, or TLS |
| `TIMEOUT`       | PKNIC didn't reply within `timeout` |
| `ABORTED`       | Your `signal` cancelled the lookup |
| `PARSE_ERROR`   | PKNIC replied, but the page wasn't recognised. Its layout has probably changed; please [open an issue](https://github.com/abbassiddiqi/whoispk/issues). |

```js
import { lookup, WhoisPkError } from 'whoispk';

try {
  await lookup('daraz.pk');
} catch (err) {
  if (err instanceof WhoisPkError && err.code === 'TIMEOUT') {
    // try again later
  }
  throw err;
}
```

## Constants

- `ENDPOINT`: the PKNIC lookup URL, `https://pk6.pknic.net.pk/pk5/lookup.PK`
- `EXTENSIONS`: the extensions anyone can register: `['pk', 'com.pk', 'net.pk', 'org.pk', 'biz.pk', 'web.pk', 'fam.pk']`. PKNIC's restricted extensions (`edu.pk`, `gov.pk`, `gok.pk`, `gob.pk`, `gop.pk`, `gos.pk`) aren't included.
- `USER_AGENT`: the `User-Agent` sent with each request, e.g. `whoispk/2.0.0 (+https://github.com/abbassiddiqi/whoispk)`

## Default export

The default export is an object with `lookup`, `parse`, `normalizeDomain`, `expandExtensions`, `EXTENSIONS`, `WhoisPkError` and `ENDPOINT`, for code that does `import whoispk from 'whoispk'`.
