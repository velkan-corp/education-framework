export class RunnerError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "RunnerError";
    this.code = code;
    this.preserveLock = options.preserveLock === true;
  }
}

export function fail(code, message, options) {
  throw new RunnerError(code, message, options);
}

export function safeError(error) {
  if (error instanceof RunnerError) return error;
  return new RunnerError(
    "INTERNAL_FAILURE",
    "The credential runner failed without exposing external output.",
    { cause: error },
  );
}

export function renderFailure(error) {
  const safe = safeError(error);
  return `ERROR [${safe.code}] ${safe.message}`;
}
