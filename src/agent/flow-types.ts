/**
 * Minimal flow types for AgentResponse.flow().
 * Full implementation (builders, guards) in @a2aletheia/a2a.
 *
 * A flow is a request from an agent to the orchestrator to execute
 * a user interaction (delegation, payment, confirmation) before
 * continuing the conversation.
 */

export type FlowType = "delegation" | "payment" | "confirmation";

export interface FlowRequest {
  type: `urn:a2a:flow:${FlowType}`;
  payload: Record<string, unknown>;
  message: string;
}
