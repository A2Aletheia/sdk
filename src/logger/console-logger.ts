import type { AletheiaLogger, AletheiaLogLevel } from "../types/index.js";

const LEVEL_PRIORITY: Record<AletheiaLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Default logger that writes to the console with level filtering.
 *
 * @example
 * ```typescript
 * const logger = new ConsoleLogger("debug");
 * logger.info("Agent started", { port: 4000 });
 * // [aletheia:info] Agent started { port: 4000 }
 * ```
 */
export class ConsoleLogger implements AletheiaLogger {
  private readonly minLevel: number;

  constructor(level: AletheiaLogLevel = "info") {
    this.minLevel = LEVEL_PRIORITY[level];
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LEVEL_PRIORITY.debug) {
      console.debug(`[aletheia:debug] ${message}`, context ?? "");
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LEVEL_PRIORITY.info) {
      console.info(`[aletheia:info] ${message}`, context ?? "");
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LEVEL_PRIORITY.warn) {
      console.warn(`[aletheia:warn] ${message}`, context ?? "");
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LEVEL_PRIORITY.error) {
      console.error(`[aletheia:error] ${message}`, context ?? "");
    }
  }
}
