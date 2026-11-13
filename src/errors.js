/**
 * Error thrown by whoispk. `code` is one of:
 * INVALID_INPUT, HTTP_ERROR, NETWORK_ERROR, TIMEOUT, ABORTED, PARSE_ERROR.
 */
export class WhoisPkError extends Error {
  constructor(message, { code, cause, status } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'WhoisPkError';
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}
