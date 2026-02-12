import type {
  AgentExecutor,
  ExecutionEventBus,
  RequestContext,
} from "@a2a-js/sdk/server";
import type { AletheiaLogger } from "../types/index.js";
import type { AgentHandler, CancelHandler } from "./types.js";
import type { EventEmitter } from "../logger/event-emitter.js";
import { AgentContextImpl } from "./agent-context.js";
import { AgentResponse } from "./agent-response.js";

/**
 * Bridges the functional handler pattern to the @a2a-js AgentExecutor interface.
 */
export class DelegatingAgentExecutor implements AgentExecutor {
  constructor(
    private getHandler: () => AgentHandler | undefined,
    private getCancelHandler: () => CancelHandler | undefined,
    private readonly logger: AletheiaLogger,
    private readonly events: EventEmitter,
  ) {}

  async execute(
    context: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    const handler = this.getHandler();
    if (!handler) {
      throw new Error(
        "No message handler registered. Call agent.handle() first.",
      );
    }

    const agentContext = AgentContextImpl.from(context);
    const response = new AgentResponse(context, eventBus);

    this.logger.debug("Message received", {
      taskId: context.taskId,
      contextId: context.contextId,
    });
    this.events.emit("message.received", {
      taskId: context.taskId,
      contextId: context.contextId,
    });

    try {
      await handler(agentContext, response);

      // Ensure finished is called if handler didn't finalize
      if (!response.isFinished) {
        eventBus.finished();
      }

      this.logger.debug("Message handled", {
        taskId: context.taskId,
        contextId: context.contextId,
      });
      this.events.emit("message.sent", {
        taskId: context.taskId,
        contextId: context.contextId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error("Handler error", {
        taskId: context.taskId,
        error: errorMessage,
      });
      this.events.emit("message.failed", {
        taskId: context.taskId,
        error: errorMessage,
      });

      // Publish failure if not already finalized
      if (!response.isFinished) {
        response.fail(`Handler error: ${errorMessage}`);
      } else {
        // Re-throw if already finished (shouldn't happen normally)
        throw error;
      }
    }
  }

  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    const handler = this.getCancelHandler();
    const response = new AgentResponse(null, eventBus);

    if (handler) {
      try {
        await handler(taskId, response);

        // Ensure finished is called
        if (!response.isFinished) {
          response.canceled();
        }
      } catch (error) {
        if (!response.isFinished) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          response.fail(`Cancel handler error: ${errorMessage}`);
        }
      }
    } else {
      // Default: publish canceled status
      response.canceled();
    }
  }
}
