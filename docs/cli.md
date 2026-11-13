# CLI reference

```
whoispk [options] <domain...>
```

## Options

| Option                  | Default | Description                                               |
| ----------------------- | ------- | --------------------------------------------------------- |
| `-j`, `--json`          | off     | Print results as JSON instead of text                     |
| `-t`, `--timeout <ms>`  | `15000` | Timeout for each request to PKNIC                         |
| `-c`, `--concurrency <n>` | `3`   | How many lookups run at once when you pass several domains |
| `--no-color`            | off     | Turn off colours                                          |
| `-v`, `--version`       |         | Print the version and exit                                |
| `-h`, `--help`          |         | Print usage and exit                                      |

## Giving it domains

Pass one or more domains as arguments:

```sh
whoispk daraz.pk google.com.pk magic
```

Each one is cleaned up before the lookup:

| You type                          | It looks up      |
| --------------------------------- | ---------------- |
| `magic`                           | `magic.pk`       |
| `Daraz.PK`                        | `daraz.pk`       |
| `https://www.daraz.pk/some/page`  | `daraz.pk`       |
| `example.com.pk:8080`             | `example.com.pk` |

If you pass no arguments and pipe something in, domains are read from stdin. They can be separated by new lines, spaces or commas. Anything after a `#` on a line is ignored.

```sh
cat > ideas.txt <<'EOF'
# shortlist
chaiwala
kitaabghar, rickshaw.com.pk
EOF

whoispk < ideas.txt
```

Results are printed in the order you gave the domains, even though lookups run in parallel.

## Text output

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

| Status               | Meaning                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| **Registered**       | Someone holds the domain. Its dates and nameservers are shown.                   |
| **Available**        | PKNIC has no record of it. PKNIC only checks whether the name is allowed when you actually register it. |
| **Not registrable**  | PKNIC rejected the name, e.g. it is too short or has invalid characters. Its reason is shown. |
| **Lookup failed**    | PKNIC couldn't be reached or returned an error. The cause is shown.              |

While lookups are running, a spinner is shown on stderr. It only appears when stderr is a terminal and `--json` is off, so it never ends up in piped output.

## JSON output

With `--json`, one domain gives an object and several give an array.

```console
$ whoispk --json google.com.pk
{
  "domain": "google.com.pk",
  "status": "registered",
  "registered": true,
  "available": false,
  "createDate": "2003-03-05",
  "expireDate": "2027-03-05",
  "nameservers": ["ns1.google.com", "ns2.google.com", "ns3.google.com", "ns4.google.com"],
  "reasons": [],
  "fields": {
    "Domain Name": "google.com.pk",
    "Create Date": "Mar 5, 2003",
    "Expire Date": "Mar 5, 2027"
  }
}
```

The fields are described in the [API reference](api.md#lookupresult).

A lookup that fails still produces an entry, so one bad domain doesn't hide the others:

```json
{
  "domain": "daraz.pk",
  "status": "error",
  "error": { "code": "TIMEOUT", "message": "PKNIC did not respond within 15000 ms" }
}
```

Some `jq` recipes:

```sh
# Only the available names
whoispk --json < ideas.txt | jq -r '.[] | select(.available) | .domain'

# Registered names that expire in 2026
whoispk --json < ideas.txt | jq -r '.[] | select(.expireDate // "" | startswith("2026")) | "\(.domain) \(.expireDate)"'
```

When you might pass only one domain, wrap the output so it's always an array: `jq 'if type == "array" then . else [.] end'`.

## Exit codes

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| `0`  | Every lookup finished. This includes domains that are registered or not registrable. |
| `1`  | At least one lookup failed. Results for the other domains are still printed. |
| `2`  | Bad usage, such as an unknown option, a bad `--timeout`, or no domains. |

The exit code tells you whether the lookups worked, not whether a domain is free. Use `status` or `available` in the JSON for that:

```sh
if whoispk --json chaiwala | jq -e '.available' > /dev/null; then
  echo "chaiwala.pk is free"
fi
```

## Colours

Colours are on when stdout is a terminal. To change that:

- `--no-color`, or set the `NO_COLOR` environment variable to any value, to turn them off
- `FORCE_COLOR=1` to turn them on even when piped. `FORCE_COLOR=0` turns them off.
