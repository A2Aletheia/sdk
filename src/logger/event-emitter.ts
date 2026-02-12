import type {
  AletheiaEventType,
  AletheiaEvent,
  AletheiaEventHandler,
} from "../types/index.js";

/**
 * Lightweight event emitter for Aletheia lifecycle events.
 *
 * Supports specific event types and a `"*"` wildcard that receives all events.
 *
 * @example
 * ```typescript
 * const emitter = new EventEmitter();
 *
 * // Listen to specific event
 * const unsub = emitter.on("agent.start", (event) => {
 *   console.log("Agent started at", event.timestamp);
 * });
 *
 * // Listen to all events (wildcard)
 * emitter.on("*", (event) => {
 *   metrics.increment(`aletheia.${event.type}`);
 * });
 *
 * // Emit
 * emitter.emit("agent.start", { port: 4000 });
 *
 * // Unsubscribe
 * unsub();
 * ```
 */
export class EventEmitter {
  private readonly handlers = new Map<
    AletheiaEventType | "*",
    Set<AletheiaEventHandler>
  >();

  /**
   * Subscribe to an event type. Returns an unsubscribe function.
   */
  on(
    event: AletheiaEventType | "*",
    handler: AletheiaEventHandler,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  /**
   * Emit an event to all registered handlers (specific + wildcard).
   */
  emit(type: AletheiaEventType, data?: Record<string, unknown>): void {
    const event: AletheiaEvent = { type, timestamp: new Date(), data };
    this.handlers.get(type)?.forEach((h) => h(event));
    this.handlers.get("*")?.forEach((h) => h(event));
  }
}
