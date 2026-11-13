# Releasing

Releases are automated. You update the changelog and push a version tag. GitHub Actions then tests the code, publishes to npm, and creates the GitHub Release. The workflow is [.github/workflows/release.yml](../.github/workflows/release.yml).

A release is made of four things that always match:

| Where | What | Example |
| --- | --- | --- |
| `package.json` | the `version` field | `2.1.0` |
| git | a tag on the release commit | `v2.1.0` |
| npm | the published package, with provenance | `whoispk@2.1.0` |
| GitHub | a Release whose notes come from `CHANGELOG.md` | `v2.1.0` |

## One-time setup: trusted publishing

The workflow publishes using npm's [trusted publishing](https://docs.npmjs.com/trusted-publishers). npm trusts this repository's release workflow directly, so there's no npm token to create, store or renew. Every version also gets a provenance badge on npm, showing it was built from this repository.

1. On npmjs.com, open the **whoispk** package → **Settings**.
2. Under **Trusted Publisher**, choose **GitHub Actions** and fill in:
   - Organization or user: `abbassiddiqi`
   - Repository: `whoispk`
   - Workflow filename: `release.yml`
   - Environment: leave empty
3. Save.
4. Recommended: on the same page, under **Publishing access**, choose **Require two-factor authentication and disallow tokens**. Publishing then only works through the workflow or from your own logged-in account with 2FA.

## Choosing the version number

Versions follow [semantic versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

| Change | Bump | Example |
| --- | --- | --- |
| Bug fix, e.g. a parser fix after PKNIC changes their page | `patch` | 2.0.1 → 2.0.2 |
| New feature that doesn't break anyone, e.g. a new CLI option | `minor` | 2.0.1 → 2.1.0 |
| Breaking change: a removed or renamed option or field, or a higher minimum Node version | `major` | 2.1.0 → 3.0.0 |

## Release steps

### 1. Update the changelog

During development, changes collect under `## Unreleased` at the top of [CHANGELOG.md](../CHANGELOG.md). At release time, rename that heading to the new version and today's date:

```md
## 2.1.0 (2026-12-01)
```

The workflow uses this section as the GitHub Release notes. It stops before publishing if the section is missing.

### 2. Commit, tag and push

```sh
git checkout master
git pull
git commit -am "Update changelog for 2.1.0"

npm version minor        # or: patch / major. Updates package.json, commits "2.1.0", tags v2.1.0
git push --follow-tags   # pushing the tag starts the release
```

### 3. Watch it finish

Open the repository's **Actions** tab and watch the **Release** run. It takes about a minute. When it's green:

- npmjs.com/package/whoispk shows the new version with a provenance badge
- **Releases** on GitHub shows the new release with the changelog notes

To check from the terminal:

```sh
npm view whoispk version
npx whoispk@latest --version
```

## Pre-releases

To let people try a version before it becomes `latest`:

```sh
npm version preminor --preid beta    # e.g. 2.1.0-beta.0; later: npm version prerelease
git push --follow-tags
```

The workflow publishes any version containing a `-` under npm's `next` tag, and marks its GitHub Release as a pre-release. People install it with `npm i whoispk@next`, and `latest` stays unchanged.

The changelog needs a matching heading, e.g. `## 2.1.0-beta.0`.

## If something goes wrong

| Problem | What to do |
| --- | --- |
| **"Tag doesn't match package.json version"** | The tag was created by hand rather than by `npm version`. Delete it (`git push origin :refs/tags/v2.1.0` and `git tag -d v2.1.0`), then use `npm version`. |
| **"CHANGELOG.md has no section"** | Add the `## 2.1.0` heading, commit, then move the tag to that commit: `git tag -fa v2.1.0 -m 2.1.0 && git push origin master && git push -f origin v2.1.0`. Nothing was published, so this is safe. |
| **Publishing fails with E404 or ENEEDAUTH** | Trusted publishing isn't set up, or its details don't match. Check the [one-time setup](#one-time-setup-trusted-publishing): the workflow filename must be exactly `release.yml`. Then re-run the failed job from the Actions tab. |
| **Tests fail in the workflow** | Nothing was published. Fix it on `master`, then release the next patch version. Don't reuse the tag. |
| **Published, but the GitHub Release step failed** | Re-run the failed job, or create the release by hand from the changelog section. |
| **You published a version with a bug** | Fix it and release a `patch`. Then warn people off the bad version: `npm deprecate whoispk@2.1.0 "Broken, use 2.1.1"`. Don't unpublish; npm only allows that within 72 hours, and it breaks anyone who already installed it. |
| **You published under 1.x and need to undo a deprecation** | `npm deprecate whoispk@1.1.1 ""` removes the message. |

## Publishing by hand (fallback)

If GitHub Actions is unavailable, you can still publish from your own machine. You need `npm login`, and npm asks you to confirm in the browser:

```sh
npm version patch
npm publish
git push --follow-tags
```

Pushing the tag still starts the workflow. Its publish step then fails because that version is already on npm, so create the GitHub Release by hand: `node scripts/release-notes.js v2.0.2` prints the notes to paste.
