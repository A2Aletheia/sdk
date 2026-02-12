/**
 * Pluggable logger interface for the Aletheia SDK.
 *
 * Consumers can implement this interface with pino, winston, bunyan,
 * OpenTelemetry, or any custom logger.
 */
export interface AletheiaLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export type AletheiaLogLevel = "debug" | "info" | "warn" | "error";
