export type DomainStatus = 'registered' | 'available' | 'invalid';

export interface LookupResult {
  /** The normalised domain that was looked up, e.g. "daraz.pk". */
  domain: string;
  status: DomainStatus;
  registered: boolean;
  /** True when PKNIC reports the domain as not registered (it may be available to register). */
  available: boolean;
  /** Registration date as YYYY-MM-DD, when registered. */
  createDate: string | null;
  /** Expiry date as YYYY-MM-DD, when registered. */
  expireDate: string | null;
  /** DNS entries listed by PKNIC, in the order shown. */
  nameservers: string[];
  /** Why PKNIC rejected the name, when status is "invalid". */
  reasons: string[];
  /** All labelled fields from the record table, verbatim (e.g. { "Create Date": "Nov 7, 2013" }). */
  fields: Record<string, string>;
}

export interface LookupOptions {
  /** Per-request timeout in milliseconds. Default 15000. */
  timeout?: number;
  /** Retries on network errors, timeouts, 429 and 5xx. Default 1. */
  retries?: number;
  signal?: AbortSignal;
  /** Override the PKNIC lookup URL. */
  endpoint?: string;
  /** Custom fetch implementation. Defaults to the global fetch. */
  fetch?: typeof globalThis.fetch;
}

export type WhoisPkErrorCode =
  | 'INVALID_INPUT'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'PARSE_ERROR';

export class WhoisPkError extends Error {
  code: WhoisPkErrorCode;
  /** HTTP status, for HTTP_ERROR. */
  status?: number;
}

export const ENDPOINT: string;
export const USER_AGENT: string;

export function lookup(domain: string, options?: LookupOptions): Promise<LookupResult>;
export function parse(html: string): Omit<LookupResult, 'domain'> & { domain: string | null };
export function normalizeDomain(input: string): string;

declare const whoispk: {
  lookup: typeof lookup;
  parse: typeof parse;
  normalizeDomain: typeof normalizeDomain;
  WhoisPkError: typeof WhoisPkError;
  ENDPOINT: string;
};
export default whoispk;
