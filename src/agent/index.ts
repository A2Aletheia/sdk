// Main class
export { AletheiaAgent } from "./aletheia-agent.js";

// Response helper
export { AgentResponse } from "./agent-response.js";

// Context implementation
export { AgentContextImpl } from "./agent-context.js";

// Redis task store
export { RedisTaskStore } from "./redis-task-store.js";
export type {
  RedisTaskStoreOptions,
  RedisLike,
} from "./redis-task-store.js";

// Types
export type {
  AletheiaAgentConfig,
  AletheiaExtensions,
  AgentHandler,
  CancelHandler,
  AgentContext,
  // Re-exported A2A types for convenience
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
  ExecutionEventBus,
  TaskStore,
  AgentExecutionEvent,
  AgentExecutor,
} from "./types.js";

// Re-export useful classes from @a2a-js/sdk/server
export {
  InMemoryTaskStore,
  A2AError,
  RequestContext,
  DefaultExecutionEventBus,
} from "@a2a-js/sdk/server";
