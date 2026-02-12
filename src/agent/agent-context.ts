import type { Part } from "@a2a-js/sdk";
import { RequestContext } from "@a2a-js/sdk/server";
import type { AgentContext } from "./types.js";

/**
 * Extended RequestContext with helper methods for accessing message content.
 */
export class AgentContextImpl
  extends RequestContext
  implements AgentContext
{
  /**
   * Access the raw message parts.
   */
  get parts(): Part[] {
    return this.userMessage.parts;
  }

  /**
   * Extracts all text from message parts, joined with newlines.
   */
  get textContent(): string {
    return this.userMessage.parts
      .filter((part): part is Part & { kind: "text" } => part.kind === "text")
      .map((part) => part.text)
      .join("\n");
  }

  /**
   * Extracts the first data part's data, or null if none.
   */
  get dataContent(): Record<string, unknown> | null {
    const dataPart = this.userMessage.parts.find(
      (part): part is Part & { kind: "data" } => part.kind === "data",
    );
    return dataPart?.data ?? null;
  }

  /**
   * Create an AgentContext from a RequestContext.
   */
  static from(context: RequestContext): AgentContextImpl {
    return new AgentContextImpl(
      context.userMessage,
      context.taskId,
      context.contextId,
      context.task,
      context.referenceTasks,
    );
  }
}
