import type { AletheiaLogger } from "../types/index.js";

/**
 * Silent logger that discards all output.
 * Use when you want to suppress SDK logging entirely.
 *
 * @example
 * ```typescript
 * const agent = new AletheiaAgent({
 *   logger: new NoopLogger(),
 *   // ...
 * });
 * ```
 */
export class NoopLogger implements AletheiaLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
