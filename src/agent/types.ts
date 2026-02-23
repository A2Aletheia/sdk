import type {
  AgentCapabilities,
  AgentSkill,
  Part,
  TaskPushNotificationConfig,
  PushNotificationConfig,
} from "@a2a-js/sdk";
import type {
  RequestContext,
  TaskStore,
} from "@a2a-js/sdk/server";
import type { AletheiaLogger, AletheiaLogLevel } from "../types/index.js";
import type { AgentResponse } from "./agent-response.js";

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

/**
 * Aletheia-specific extensions for AgentCard metadata.
 */
export interface AletheiaExtensions {
  /** Ethereum address of the agent owner (for SIWE auth) */
  owner?: string;
  /** URL for liveness health checks */
  livenessPingUrl?: string;
  /** DID identifier (auto-generated if not provided) */
  did?: string;
  /** Public key in multibase format for DID document verification method */
  publicKeyMultibase?: string;
}

/**
 * Configuration for creating an AletheiaAgent.
 */
export interface AletheiaAgentConfig {
  // Required AgentCard fields
  name: string;
  version: string;
  url: string;
  description: string;
  skills: AgentSkill[];

  // Optional AgentCard fields
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  capabilities?: Partial<AgentCapabilities>;
  iconUrl?: string;
  documentationUrl?: string;
  provider?: {
    organization: string;
    url: string;
  };

  // Aletheia-specific
  aletheiaExtensions?: AletheiaExtensions;
  registryUrl?: string;
  taskStore?: TaskStore;

  // Observability (BYOL)
  logger?: AletheiaLogger;
  logLevel?: AletheiaLogLevel;
}

// ---------------------------------------------------------------------------
// Handler types
// ---------------------------------------------------------------------------

/**
 * Extended request context with helper methods.
 */
export interface AgentContext extends RequestContext {
  /** Extracts all text from message parts, joined with newlines */
  readonly textContent: string;

  /** Extracts the first data part's data, or null if none */
  readonly dataContent: Record<string, unknown> | null;

  /** Access the raw message parts */
  readonly parts: Part[];
}

/**
 * Handler function signature for processing incoming messages.
 */
export type AgentHandler = (
  context: AgentContext,
  response: AgentResponse,
) => Promise<void>;

/**
 * Handler function signature for cancellation requests.
 */
export type CancelHandler = (
  taskId: string,
  response: AgentResponse,
) => Promise<void>;

// ---------------------------------------------------------------------------
// Response event types (re-exported for convenience)
// ---------------------------------------------------------------------------

export type {
  Part,
  TextPart,
  DataPart,
  FilePart,
  Artifact,
  AgentCard,
  AgentSkill,
  AgentCapabilities,
  Message,
  Task,
  TaskState,
  TaskStatus,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  TaskPushNotificationConfig,
  PushNotificationConfig,
} from "@a2a-js/sdk";

export type {
  RequestContext,
  ExecutionEventBus,
  TaskStore,
  AgentExecutionEvent,
  AgentExecutor,
} from "@a2a-js/sdk/server";
