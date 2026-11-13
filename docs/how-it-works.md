# How it works

PKNIC doesn't run a WHOIS server or an API for `.pk`. whoispk sends a request to PKNIC's public lookup page, the same one you get in a browser, and reads the HTML that comes back. When PKNIC changes that page, this is the part that needs updating.

## The request

```
POST https://pk6.pknic.net.pk/pk5/lookup.PK
Content-Type: application/x-www-form-urlencoded
User-Agent: whoispk/<version> (+https://github.com/abbassiddiqi/whoispk)

name=daraz.pk
```

You can do the same with curl:

```sh
curl -s -X POST --data-urlencode 'name=daraz.pk' https://pk6.pknic.net.pk/pk5/lookup.PK
```

The site sits behind Cloudflare, but a plain request like this gets the full page today. No JavaScript or cookies are needed.

## Telling the outcomes apart

PKNIC puts hidden marker tags in the page. Browsers ignore them, but they're the most reliable signal, so the parser checks them first:

| Outcome      | Markers in the page                                       | Visible text (fallback)                         |
| ------------ | --------------------------------------------------------- | ----------------------------------------------- |
| available    | `<XPC_RESULT_NOTFOUND/>` `<XPC_DOMAIN_MAYBE_AVAILABLE/>`  | `Domain not found: <name>`                      |
| invalid      | `<XPC_DOMAIN_NOT_AVAILABLE/>`                             | `Your searched domain: <name> has the following issues.` followed by `<li class="error">` items |
| registered   | `<XPC_DOMAIN_NOT_AVAILABLE/>`                             | `The Domain record for <name>` and a record table |

The parser in [`src/parse.js`](../src/parse.js) checks for each outcome in this order:

1. **Available**: if an "available" marker or "Domain not found" is present.
2. **Invalid**: if there are `<li class="error">` items or the "has the following issues" text. The domain name at the start of each reason (`x.pk: …`) is removed.
3. **Registered**: if the "Domain record for" heading or "Domain is Registered" is present. The record table is then read (see below).
4. Anything else throws `PARSE_ERROR`. Making a guess would risk telling someone a taken domain is free.

Only the main content cell, between `id="Tmain"` and `id="Tside"`, is searched. HTML comments are removed first, because PKNIC leaves old markup commented out in the page.

## Reading the record table

Each row of the record has four cells: a spacer, the label, a spacer, and the value.

```
| | Domain Name      | | magic.pk          |
| | Create Date:     | | Nov 7, 2013       |
| | Expire Date:     | | Nov 7, 2027       |
| | DNS Nameservers  | |                   |   <- label with no value starts a list
| |                  | | 23.227.38.65      |   <- rows with no label belong to that list
| |                  | | www               |
```

- A row with a label and a value goes into `fields`.
- A row with a label but no value starts a list, and the following rows with only a value are added to it. The list whose label contains "nameserver" becomes `nameservers`.
- Dates like `Nov 7, 2013` are turned into `2013-11-07`. The original text stays in `fields`.

The page's HTML isn't well formed; some rows are never closed with `</tr>`. So the parser splits on opening `<tr>` and `<td>`/`<th>` tags instead of matching pairs of tags. That's also why there's no HTML parser dependency.

## When PKNIC changes the page

1. Run `npm run test:live`. If it fails, compare the new page with the saved one:
   ```sh
   npm run fixtures   # downloads the current pages into test/fixtures/
   git diff test/fixtures/
   ```
2. Update [`src/parse.js`](../src/parse.js). Keep the old way of detecting each outcome as a fallback where you can, because PKNIC sometimes serves old and new pages side by side.
3. Run `npm test`. The offline tests use the fixtures you just downloaded.

CI runs the live tests every week, so a change should show up there before users report it.
