/**
 * Parser for the HTML returned by PKNIC's public lookup page
 * (https://pk6.pknic.net.pk/pk5/lookup.PK).
 *
 * PKNIC embeds machine-readable marker tags in the page, e.g.
 * `<XPC_DOMAIN_NOT_AVAILABLE/>` and `<XPC_RESULT_NOTFOUND/>`. Those are used to
 * decide the status; visible text is only used as a fallback and to extract
 * the record details.
 */

import { WhoisPkError } from './errors.js';

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decode the handful of HTML entities PKNIC uses. */
function decodeEntities(str) {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X'
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Strip tags, decode entities and collapse whitespace. */
function toText(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Nov 7, 2013" -> "2013-11-07"; returns null if it doesn't look like a date. */
export function toIsoDate(text) {
  const m = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i.exec(text.trim());
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

/** The main content cell of the page (left column), without HTML comments. */
function mainSection(html) {
  const body = html.replace(/<!--[\s\S]*?-->/g, '');
  const start = body.search(/id=["']?Tmain\b/i);
  const end = body.search(/id=["']?Tside\b/i);
  if (start !== -1 && end > start) return body.slice(start, end);
  return body;
}

/**
 * Parse the record table into labelled fields and nameservers.
 * Rows are laid out as [spacer, label, spacer, value]. A label with no value
 * (e.g. "DNS Nameservers") starts a list; following unlabelled rows belong to it.
 */
function parseRecordTable(section) {
  const fields = {};
  const lists = {};
  let currentList = null;

  // Split on <tr> rather than matching <tr>…</tr>: PKNIC's markup leaves some rows unclosed.
  for (const row of section.split(/<tr\b[^>]*>/i).slice(1)) {
    const cells = row
      .replace(/<\/table>[\s\S]*$/i, '')
      .split(/<t[dh]\b[^>]*>/i)
      .slice(1)
      .map(toText);
    if (cells.length < 4) continue;

    const label = cells[1].replace(/:$/, '').trim();
    const value = cells[3];

    if (label && value) {
      fields[label] = value;
      currentList = null;
    } else if (label) {
      currentList = label;
      lists[label] = [];
    } else if (value && currentList) {
      lists[currentList].push(value);
    }
  }

  return { fields, lists };
}

function findField(fields, pattern) {
  const key = Object.keys(fields).find((k) => pattern.test(k));
  return key === undefined ? undefined : fields[key];
}

/**
 * Parse a PKNIC lookup response.
 *
 * @param {string} html
 * @returns {import('./index.js').LookupResult}
 */
export function parse(html) {
  if (typeof html !== 'string') {
    throw new TypeError('parse() expects an HTML string');
  }

  const markers = new Set([...html.matchAll(/<XPC_([A-Z_]+)\s*\/?>/g)].map((m) => m[1]));
  const section = mainSection(html);

  const base = {
    domain: null,
    status: null,
    registered: false,
    available: false,
    createDate: null,
    expireDate: null,
    nameservers: [],
    reasons: [],
    fields: {},
  };

  // --- Available -----------------------------------------------------------
  const notFound = /Domain not found:\s*(?:<[^>]*>\s*)*([^<\s]+)/i.exec(section);
  if (markers.has('RESULT_NOTFOUND') || markers.has('DOMAIN_MAYBE_AVAILABLE') || notFound) {
    return {
      ...base,
      domain: notFound ? toText(notFound[1]).toLowerCase() : null,
      status: 'available',
      available: true,
    };
  }

  // --- Invalid / not registrable --------------------------------------------
  const errors = [...section.matchAll(/<li\b[^>]*class=["']?error["']?[^>]*>([\s\S]*?)(?=<\/li>|<li\b|<\/ul>|<br|<\/div>)/gi)]
    .map((m) => toText(m[1]))
    .filter(Boolean);
  if (errors.length || /has the following issues/i.test(section)) {
    const searched = /Your searched domain:\s*<b>([\s\S]*?)<\/b>/i.exec(section);
    const domain = searched ? toText(searched[1]).toLowerCase() : null;
    // Reasons are prefixed with the domain ("x.pk: Invalid Domain name …"); drop that prefix.
    const reasons = errors.map((e) =>
      domain && e.toLowerCase().startsWith(`${domain}:`) ? e.slice(domain.length + 1).trim() : e,
    );
    return { ...base, domain, status: 'invalid', reasons };
  }

  // --- Registered ------------------------------------------------------------
  const heading = /The Domain record for\s*([^<\s]+)/i.exec(section);
  if (heading || /Domain is Registered/i.test(section)) {
    const { fields, lists } = parseRecordTable(section);
    const created = findField(fields, /^create/i);
    const expires = findField(fields, /^expir/i);
    const nsKey = Object.keys(lists).find((k) => /name\s*servers?/i.test(k));
    const domain = findField(fields, /^domain name$/i) ?? (heading ? toText(heading[1]) : null);

    return {
      ...base,
      domain: domain ? domain.toLowerCase() : null,
      status: 'registered',
      registered: true,
      createDate: created ? toIsoDate(created) : null,
      expireDate: expires ? toIsoDate(expires) : null,
      nameservers: nsKey ? lists[nsKey] : [],
      fields,
    };
  }

  throw new WhoisPkError(
    'Unrecognised response from PKNIC. The lookup page layout may have changed; please open an issue at https://github.com/abbassiddiqi/whoispk/issues',
    { code: 'PARSE_ERROR' },
  );
}
