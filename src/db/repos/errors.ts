/** A write the shop's own rules refuse. Screens switch on `code`, never on `message`. */
export class RepoError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RepoError';
  }
}

export function isRepoError(error: unknown, code?: string): error is RepoError {
  return error instanceof RepoError && (code === undefined || error.code === code);
}
