/**
 * Minimal flow types for AgentResponse.flow().
 * Full implementation (builders, guards) in @a2aletheia/a2a.
 *
 * A flow is a request from an agent to the orchestrator to execute
 * a user interaction (delegation, payment, confirmation, oauth) before
 * continuing the conversation.
 */

export type FlowType = "delegation" | "payment" | "confirmation" | "oauth";

export interface FlowRequest {
  type: `urn:a2a:flow:${FlowType}`;
  payload: Record<string, unknown>;
  message: string;
}

interface FlowRequestBase<
  TType extends FlowType,
  TPayload extends Record<string, unknown>,
> extends FlowRequest {
  type: `urn:a2a:flow:${TType}`;
  payload: TPayload;
}

export type DelegationFlowRequest = FlowRequestBase<
  "delegation",
  {
    scope?: string;
    delegateDid?: string;
    amount?: {
      max: string;
      currency: string;
    };
    basis?: Record<string, unknown>;
    [key: string]: unknown;
  }
>;

export type PaymentFlowRequest = FlowRequestBase<
  "payment",
  {
    amount?: string;
    currency?: string;
    recipient?: string;
    [key: string]: unknown;
  }
>;

export type ConfirmationFlowRequest = FlowRequestBase<
  "confirmation",
  {
    options?: string[];
    [key: string]: unknown;
  }
>;

export type OAuthFlowRequest = FlowRequestBase<
  "oauth",
  {
    provider: string;
    authUrl: string;
    grantId: string;
    [key: string]: unknown;
  }
>;
