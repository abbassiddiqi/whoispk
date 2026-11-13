# whoispk

[![npm version](https://img.shields.io/npm/v/whoispk.svg)](https://www.npmjs.com/package/whoispk)
[![npm downloads](https://img.shields.io/npm/dt/whoispk.svg)](https://www.npmjs.com/package/whoispk)
[![CI](https://github.com/abbassiddiqi/whoispk/actions/workflows/ci.yml/badge.svg)](https://github.com/abbassiddiqi/whoispk/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-9b59b6.svg)](LICENSE)

Check whether a **.pk** domain is registered, or available, from the command line or from Node.js.
Results come from PKNIC's public lookup at [pknic.net.pk](https://pknic.net.pk).

- No runtime dependencies
- Look up several domains at once, from arguments or stdin
- JSON output for scripts
- Typed, promise-based API

## CLI

```sh
npm install -g whoispk
# or run it without installing
npx whoispk daraz.pk
```

```console
$ whoispk daraz magicnotatall.pk x.pk
daraz.pk  ● Registered
  Created      May 14, 2012
  Expires      May 14, 2028  (expires in 1 year)
  Nameservers  ns1.alibabadns.cn
               ns1.alibabadns.com
               ns2.alibabadns.cn
               ns2.alibabadns.com

magicnotatall.pk  ● Available
  Not registered — may be available for registration.

x.pk  ● Not registrable
  Invalid Domain name [Three or less characters without suffix e.g. COM.PK]
```

`.pk` is added if you leave it off, and URLs are accepted too (`https://www.daraz.pk/foo` becomes `daraz.pk`).

```
Usage: whoispk [options] <domain...>

Options:
  -j, --json             Print results as JSON
  -t, --timeout <ms>     Per-request timeout in milliseconds (default: 15000)
  -c, --concurrency <n>  Parallel lookups when checking several domains (default: 3)
      --no-color         Disable colours (also respects NO_COLOR)
  -v, --version          Print the version
  -h, --help             Show this help

Exit codes:
  0  all lookups completed
  1  one or more lookups failed (network error, PKNIC down, …)
  2  invalid usage
```

Check a list of names (one per line; `#` starts a comment):

```sh
cat ideas.txt | whoispk --json | jq -r '.[] | select(.available) | .domain'
```

## Library

```sh
npm install whoispk
```

```js
import { lookup } from 'whoispk';

const result = await lookup('daraz.pk');

if (result.available) {
  console.log(`${result.domain} is available`);
} else if (result.registered) {
  console.log(`${result.domain} expires on ${result.expireDate}`);
}
```

CommonJS works too, on Node 20.19 or later: `const { lookup } = require('whoispk');`

### `lookup(domain, options?) → Promise<LookupResult>`

```js
{
  domain: 'daraz.pk',
  status: 'registered',          // 'registered' | 'available' | 'invalid'
  registered: true,
  available: false,
  createDate: '2012-05-14',      // YYYY-MM-DD, or null
  expireDate: '2028-05-14',      // YYYY-MM-DD, or null
  nameservers: ['ns1.alibabadns.cn', 'ns1.alibabadns.com', 'ns2.alibabadns.cn', 'ns2.alibabadns.com'],
  reasons: [],                   // why PKNIC rejected the name, when status is 'invalid'
  fields: {                      // every labelled field PKNIC showed, verbatim
    'Domain Name': 'daraz.pk',
    'Create Date': 'May 14, 2012',
    'Expire Date': 'May 14, 2028'
  }
}
```

PKNIC no longer publishes registrant, address or contact details, because of GDPR and ICANN WHOIS policy, so those fields are not returned.

| Option    | Default        | Description                                          |
| --------- | -------------- | ---------------------------------------------------- |
| `timeout` | `15000`        | Per-request timeout in ms                            |
| `retries` | `1`            | Retries on network errors, timeouts, 429 and 5xx     |
| `signal`  | none           | An `AbortSignal` to cancel the lookup                |
| `fetch`   | global `fetch` | A custom fetch implementation, for proxies or tests  |

Failures reject with a `WhoisPkError` that has a `code`. The codes are `INVALID_INPUT`, `HTTP_ERROR`, `NETWORK_ERROR`, `TIMEOUT`, `ABORTED` and `PARSE_ERROR`. `PARSE_ERROR` means PKNIC's page has changed; please [open an issue](https://github.com/abbassiddiqi/whoispk/issues).

Also exported: `parse(html)` to parse a saved PKNIC response, and `normalizeDomain(input)`.

## Upgrading from 1.x

- Requires Node.js 20.19 or later. The package is now ESM, but `require()` still works.
- `lookup()` returns a promise only; the callback form is gone.
- `isFound` and `data` are replaced by `status`, `registered`, `available` and the flat fields shown above.
- Dates are ISO `YYYY-MM-DD` strings.

## Development

```sh
npm test            # offline tests, using saved PKNIC pages in test/fixtures
npm run test:live   # also runs the tests against the real pknic.net.pk
```

## License

[MIT](LICENSE)
