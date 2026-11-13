# Releasing

How to publish a new version of whoispk to npm and GitHub. It takes about five minutes.

A release is made of three things that should always match:

| Where | What | Example |
| --- | --- | --- |
| `package.json` | the `version` field | `2.1.0` |
| git | a tag on the release commit | `v2.1.0` |
| npm | the published package | `whoispk@2.1.0` |

A GitHub Release with notes is optional, but it's nice to have.

## One-time setup

Do this once on each computer you release from.

1. **Log in to npm** with the account that owns `whoispk`:
   ```sh
   npm login          # opens the browser
   npm whoami         # should print: abbassiddiqi
   ```
2. **Turn on two-factor authentication** at npmjs.com → Account → Two-Factor Authentication, if it isn't on yet. npm requires it for publishing, and it asks you to confirm each publish.
3. **Optional: install the GitHub CLI** to create GitHub Releases from the terminal:
   ```sh
   brew install gh
   gh auth login
   ```

## Choosing the version number

Versions follow [semantic versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

| Change | Bump | Example |
| --- | --- | --- |
| Bug fix, e.g. a parser fix after PKNIC changes their page | `patch` | 2.0.0 → 2.0.1 |
| New feature that doesn't break anyone, e.g. a new CLI option | `minor` | 2.0.1 → 2.1.0 |
| Breaking change: a removed or renamed option or field, or a higher minimum Node version | `major` | 2.1.0 → 3.0.0 |

## Release steps

Start from an up-to-date `master` with nothing uncommitted:

```sh
git checkout master
git pull
git status         # should say "nothing to commit, working tree clean"
```

### 1. Update the changelog

In [CHANGELOG.md](../CHANGELOG.md), add a heading for the new version above the previous one, with today's date and what changed:

```md
## 2.1.0 (2026-12-01)

- Added `--quiet` option.
- Fixed expiry dates for domains registered in September.
```

Commit it:

```sh
git commit -am "Update changelog for 2.1.0"
```

### 2. Run the tests

```sh
npm test
npm run test:live    # checks the real PKNIC site still parses
```

`npm publish` also runs `npm test` on its own, through the `prepublishOnly` script, but it's better to find out now.

### 3. Bump the version

```sh
npm version minor    # or: patch / major
```

This does three things at once:
- updates `version` in `package.json` and `package-lock.json`
- commits the change with the version as the message, e.g. `2.1.0`
- creates the git tag `v2.1.0`

### 4. Check what will be published

```sh
npm publish --dry-run
```

You should see only `LICENSE`, `README.md`, `package.json`, `bin/` and `src/`, about 8 files. If you see `test/`, `docs/` or anything secret, stop and fix the `files` list in `package.json`.

### 5. Publish and push

```sh
npm publish          # asks for your 2FA code or a browser confirmation
git push --follow-tags
```

`--follow-tags` pushes the commits and the new `v2.1.0` tag together.

### 6. Create a GitHub Release (optional)

With the GitHub CLI:

```sh
gh release create v2.1.0 --title "v2.1.0" --notes "Copy the changelog entry here"
```

Or in the browser: go to **Releases → Draft a new release**, pick the `v2.1.0` tag, and paste the changelog entry as the description.

### 7. Check it worked

```sh
npm view whoispk version     # should print the new version
npx whoispk@latest daraz     # runs the published package
```

The README on npmjs.com updates within a few minutes.

## First release of 2.0.0

`package.json` already says `2.0.0`, because the version was set in the rewrite commit. So for this release **skip step 3** and create the tag by hand:

```sh
git checkout master
git pull
npm test && npm run test:live

# In CHANGELOG.md, change "## 2.0.0" to "## 2.0.0 (<today's date>)", then:
git commit -am "Update changelog for 2.0.0"

git tag v2.0.0
npm publish --dry-run
npm publish
git push --follow-tags
```

After that, every later release follows the normal steps above.

**Also worth doing once:** the repository's description on GitHub still says *"A robust WHOIS client (command-line tool) for PKNIC (.pk) domains"*. To update it, click the ⚙ next to **About** on the repository page. Something like *"Check if a .pk domain is taken, from your terminal or Node.js"* matches the README.

## If something goes wrong

| Problem | What to do |
| --- | --- |
| `npm publish` fails with `E401` / `ENEEDAUTH` | You're not logged in. Run `npm login`. |
| `npm publish` fails with `E403` "cannot publish over previously published version" | That version is already on npm, and versions can't be reused. Bump again with `npm version patch`. |
| `npm version` says "Git working directory not clean" | Commit or stash your changes first. |
| You published a version with a bug | Fix it and release a `patch`. Then warn people off the bad version: `npm deprecate whoispk@2.1.0 "Broken, use 2.1.1"`. Don't unpublish it; npm only allows that within 72 hours, and it breaks anyone who already installed that version. |
| You tagged the wrong commit and haven't pushed yet | `git tag -d v2.1.0`, then fix things and tag again. |
| You want to test a version before calling it `latest` | `npm version prerelease --preid beta` gives you e.g. `2.1.0-beta.0`. Then `npm publish --tag beta`. People install it with `npm i whoispk@beta`, and `latest` stays unchanged. |
