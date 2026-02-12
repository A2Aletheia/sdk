/**
 * Lifecycle event system for Aletheia SDK observability.
 *
 * Subscribe to events via `agent.on(type, handler)` to integrate
 * with any monitoring, logging, or analytics system.
 */

export type AletheiaEventType =
  | "agent.start"
  | "agent.stop"
  | "message.received"
  | "message.sent"
  | "message.failed"
  | "trust.verified"
  | "trust.failed"
  | "rating.submitted"
  | "rating.received"
  | "discovery.search"
  | "discovery.connect"
  | "liveness.check"
  | "liveness.result";

export interface AletheiaEvent {
  type: AletheiaEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type AletheiaEventHandler = (event: AletheiaEvent) => void;
