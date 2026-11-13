# Contributing to whoispk

Thanks for helping out. Bug reports, fixes and ideas are all welcome.

## Reporting a problem

[Open an issue](https://github.com/abbassiddiqi/whoispk/issues) and include:

- the command you ran or the code you called, and the domain
- what you expected and what you got, with the full error if there was one
- the output of `whoispk --version` and `node --version`

**If you see `PARSE_ERROR`,** PKNIC has probably changed its page. Please attach the HTML so the fix can be tested against it:

```sh
curl -s -X POST --data-urlencode 'name=example.pk' https://pk6.pknic.net.pk/pk5/lookup.PK > page.html
```

For new features, please open an issue first so we can agree on the approach before you write the code.

## Getting set up

You need Node.js 20.19 or later. There are no dependencies to install.

```sh
git clone https://github.com/abbassiddiqi/whoispk.git
cd whoispk
npm link            # optional: puts your local copy on your PATH as `whoispk`

node bin/whoispk.js daraz.pk
```

## Project layout

```
bin/whoispk.js        the CLI: options, output, spinner, exit codes
src/index.js          lookup(), normalizeDomain(), sending the request, retries
src/parse.js          turns PKNIC's HTML into a result
src/errors.js         WhoisPkError
src/index.d.ts        TypeScript types; keep in step with the code
scripts/              maintenance scripts
test/fixtures/        saved PKNIC pages used by the offline tests
docs/                 user and maintainer docs
```

[docs/how-it-works.md](docs/how-it-works.md) explains how PKNIC's page is read. Please read it before changing `src/parse.js`.

## Tests

```sh
npm test             # offline: saved pages and a local fake server; no internet needed
npm run test:live    # also runs against the real pknic.net.pk
npm run fixtures     # re-downloads test/fixtures/ from PKNIC
```

Tests use Node's built-in `node:test` and `node:assert`.

- **Parser changes** need a fixture showing the new case, and a test in `test/parse.test.js`.
- **Request, retry or error changes** go in `test/lookup.test.js`. Pass a fake `fetch` there rather than calling the network.
- **CLI changes** go in `test/cli.test.js`. That file starts a local HTTP server that stands in for PKNIC. It points the CLI at the server with the `WHOISPK_ENDPOINT` environment variable, which exists only for tests.
- **Live tests** (`test/live.test.js`) should only check things that won't change, such as status values and date formats. Domains get renewed and change nameservers.

Please be gentle with PKNIC's servers. Use fixtures in tests, and don't add loops that send lots of lookups.

## Code guidelines

- **No runtime dependencies.** If something seems to need one, raise it in an issue first.
- Plain JavaScript ESM, with no build step. Add JSDoc where it helps, and update `src/index.d.ts` when the public API changes.
- Keep the CLI usable in scripts: output for people goes to stdout, the spinner only goes to stderr, `--json` output stays parseable, and exit codes keep their meaning.
- If a change affects users, update the README, `docs/` and `CHANGELOG.md`.

## Commits and pull requests

- Write commit subjects as short commands, e.g. `Add --concurrency option` or `Fix expiry date parsing for September`.
- Keep each pull request to one change, and make sure `npm test` passes. CI runs it on Node 20.19, 22 and 24.
- Don't change the version number in your pull request. That happens at release time.

## Releasing (maintainers)

1. Move the changes under a new heading in `CHANGELOG.md` and commit.
2. Run `npm test && npm run test:live`.
3. Run `npm version <patch|minor|major>`. This creates the version commit and tag.
4. Run `git push --follow-tags && npm publish`.
