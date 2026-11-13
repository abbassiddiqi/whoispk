# Changelog

## 2.0.1 (2026-11-14)

- Fixed: the `timeout` option now keeps Node running until it fires. Before, a stalled request could let the process exit early with no error. The timeout also covers reading the response body now.

## 2.0.0 (2026-11-14)

Rewritten for PKNIC's current lookup page and for modern Node.js.

- Fixed: lookups work again with PKNIC's current page layout. The tool now reads PKNIC's `XPC_*` marker tags, with visible text as a fallback.
- New: three outcomes. `registered`, `available`, and `invalid`, which includes PKNIC's reasons.
- New CLI features: several domains per run, input from stdin, `--json`, `--timeout`, `--concurrency`, and meaningful exit codes. `.pk` is added automatically, and URLs and `www.` are stripped.
- New: TypeScript types, `AbortSignal` support, retries on transient failures, and a `WhoisPkError` with a `code`.
- Changed: no runtime dependencies. Uses native `fetch` and `util.parseArgs`.
- Breaking: requires Node.js 20.19 or later. The package is ESM, though `require()` still works.
- Breaking: the callback API is removed, and the result shape has changed. See the [API reference](docs/api.md#lookupresult) for the new shape.
- Breaking: registrant and contact fields are gone, because PKNIC no longer publishes them.
- Tests now use `node:test` with offline fixtures. GitHub Actions replaces Travis CI.
