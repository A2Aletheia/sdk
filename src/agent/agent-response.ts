import type {
  ExecutionEventBus,
  RequestContext,
} from "@a2a-js/sdk/server";
import type { Part, Artifact, Message, TaskState } from "@a2a-js/sdk";
import type { FlowRequest } from "./flow-types.js";

const FLOW_REQUEST_EXTENSION = "urn:a2a:flow-request:v1";

/**
 * Response helper that wraps ExecutionEventBus with convenience methods.
 */
export class AgentResponse {
  private _isFinished = false;
  private _taskSeeded = false;

  constructor(
    readonly context: RequestContext | null,
    readonly eventBus: ExecutionEventBus,
  ) {}

  /**
   * Whether the response has been finalized.
   */
  get isFinished(): boolean {
    return this._isFinished;
  }

  // ---------------------------------------------------------------------------
  // Quick responses (publishes + finishes)
  // ---------------------------------------------------------------------------

  /**
   * Send a text response and complete the request.
   */
  text(content: string): void {
    this.eventBus.publish(
      this._createMessage([{ kind: "text", text: content }]),
    );
    this._finish();
  }

  /**
   * Send a data response and complete the request.
   */
  data(data: Record<string, unknown>): void {
    this.eventBus.publish(this._createMessage([{ kind: "data", data }]));
    this._finish();
  }

  /**
   * Send a message with custom parts and complete the request.
   */
  message(parts: Part[]): void {
    this.eventBus.publish(this._createMessage(parts));
    this._finish();
  }

  // ---------------------------------------------------------------------------
  // Streaming responses (call done() or fail() at end)
  // ---------------------------------------------------------------------------

  /**
   * Publish a "working" status update (non-final).
   */
  working(message?: string): void {
    // Seed a Task event first so the ResultManager can track subsequent
    // status-updates (avoids "unknown task" warnings from @a2a-js/sdk).
    this._seedTask();

    this.eventBus.publish({
      kind: "status-update",
      taskId: this.context?.taskId ?? "",
      contextId: this.context?.contextId ?? "",
      status: {
        state: "working",
        message: message
          ? {
              kind: "message",
              role: "agent",
              messageId: crypto.randomUUID(),
              parts: [{ kind: "text", text: message }],
            }
          : undefined,
      },
      final: false,
    });
  }

  /**
   * Publish an artifact update.
   */
  artifact(
    artifact: Artifact,
    options?: { append?: boolean; lastChunk?: boolean },
  ): void {
    this._seedTask();
    this.eventBus.publish({
      kind: "artifact-update",
      taskId: this.context?.taskId ?? "",
      contextId: this.context?.contextId ?? "",
      artifact,
      append: options?.append,
      lastChunk: options?.lastChunk,
    });
  }

  /**
   * Publish a "completed" status and finalize.
   */
  done(message?: string): void {
    this.eventBus.publish({
      kind: "status-update",
      taskId: this.context?.taskId ?? "",
      contextId: this.context?.contextId ?? "",
      status: {
        state: "completed",
        message: message
          ? {
              kind: "message",
              role: "agent",
              messageId: crypto.randomUUID(),
              parts: [{ kind: "text", text: message }],
            }
          : undefined,
      },
      final: true,
    });
    this._finish();
  }

  /**
   * Publish a "failed" status and finalize.
   */
  fail(error: string): void {
    this.eventBus.publish({
      kind: "status-update",
      taskId: this.context?.taskId ?? "",
      contextId: this.context?.contextId ?? "",
      status: {
        state: "failed",
        message: {
          kind: "message",
          role: "agent",
          messageId: crypto.randomUUID(),
          parts: [{ kind: "text", text: error }],
        },
      },
      final: true,
    });
    this._finish();
  }

  /**
   * Publish a "canceled" status and finalize.
   */
  canceled(): void {
    this.eventBus.publish({
      kind: "status-update",
      taskId: this.context?.taskId ?? "",
      contextId: this.context?.contextId ?? "",
      status: { state: "canceled" },
      final: true,
    });
    this._finish();
  }

/**
   * Publish an "input-required" status (non-final by default).
   */
  inputRequired(message: string): void {
    this._seedTask();
    this.eventBus.publish({
      kind: "status-update",
      taskId: this.context?.taskId ?? "",
      contextId: this.context?.contextId ?? "",
      status: {
        state: "input-required",
        message: {
          kind: "message",
          role: "agent",
          messageId: crypto.randomUUID(),
          parts: [{ kind: "text", text: message }],
        },
      },
      final: false,
    });
  }

  /**
   * Yield control to orchestrator for a flow (delegation, payment, etc).
   * The orchestrator executes the flow and resumes with the result.
   *
   * The response includes contextId so the agent can restore state when resumed.
   */
  flow(request: FlowRequest): void {
    this.eventBus.publish(
      this._createMessage([], {
        [FLOW_REQUEST_EXTENSION]: request,
      }),
    );
    this._finish();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Emit a Task event to initialize the ResultManager's state.
   * Called once before the first status-update/artifact-update so the
   * ResultManager can match subsequent events by taskId.
   */
  private _seedTask(state: Extract<TaskState, "working" | "input-required"> = "working"): void {
    if (this._taskSeeded || !this.context) return;
    this._taskSeeded = true;

    this.eventBus.publish({
      kind: "task",
      id: this.context.taskId,
      contextId: this.context.contextId,
      status: {
        state,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private _createMessage(
    parts: Part[],
    metadata?: Record<string, unknown>,
  ): Message {
    return {
      kind: "message",
      role: "agent",
      messageId: crypto.randomUUID(),
      parts,
      contextId: this.context?.contextId ?? "",
      taskId: this.context?.taskId,
      ...(metadata ? { metadata } : {}),
    };
  }

  private _finish(): void {
    this._isFinished = true;
    this.eventBus.finished();
  }
}
