---
layout: default
title: Agent Hosting
---

# Agent Hosting API

Complete API reference for the `@a2aletheia/sdk/agent` module.

> **Note:** This entry point requires Node.js and Express. It is not browser-compatible.

---

## Exports

```typescript
import {
  // Main classes
  AletheiaAgent,
  AgentResponse,

  // Task storage
  RedisTaskStore,

  // Re-exports from @a2a-js/sdk/server
  InMemoryTaskStore,
  A2AError,
  RequestContext,
  DefaultExecutionEventBus,

  // Types
  type AletheiaAgentConfig,
  type AletheiaExtensions,
  type AgentContext,
  type AgentHandler,
  type CancelHandler,
  type RedisLike,
  type RedisTaskStoreOptions,
  type Part,
  type TextPart,
  type DataPart,
  type FilePart,
  type Artifact,
  type AgentCard,
  type AgentSkill,
  type AgentCapabilities,
  type Message,
  type Task,
  type TaskState,
  type TaskStatus,
  type TaskStore,
  type ExecutionEventBus,
  type AgentExecutor,
} from "@a2aletheia/sdk/agent";
```

---

## AletheiaAgent Class

High-level API for building A2A-compliant agents with Aletheia trust layer integration.

### Constructor

```typescript
constructor(config: AletheiaAgentConfig)
```

Creates a new agent instance with the specified configuration.

---

### Methods

#### `handle(handler: AgentHandler): this`

Registers the message handler for incoming requests. Returns `this` for chaining.

```typescript
agent.handle(async (context, response) => {
  response.text(`Echo: ${context.textContent}`);
});
```

---

#### `onCancel(handler: CancelHandler): this`

Registers an optional cancel handler for task cancellation requests. Returns `this` for chaining.

```typescript
agent.onCancel(async (taskId, response) => {
  await cleanupResources(taskId);
  response.canceled();
});
```

---

#### `on(event: AletheiaEventType | "*", handler: AletheiaEventHandler): () => void`

Subscribes to lifecycle events. Returns an unsubscribe function.

```typescript
// Specific event
const unsub = agent.on("message.received", (event) => {
  console.log("Received:", event.data);
});

// Wildcard - receive all events
agent.on("*", (event) => {
  metrics.increment(`aletheia.${event.type}`);
});

// Later: unsub() to remove listener
```

---

#### `handleRequest(body: unknown): Promise<A2AResponse | AsyncGenerator<A2AResponse>>`

Framework-agnostic request handler. Use this for Hono, Fastify, or other frameworks instead of the built-in Express server.

```typescript
// Example with Hono
app.post("/", async (c) => {
  const body = await c.req.json();
  const result = await agent.handleRequest(body);

  if ("next" in result) {
    // Streaming response
    return stream(c, async (stream) => {
      for await (const chunk of result as AsyncGenerator<A2AResponse>) {
        await stream.write(JSON.stringify(chunk) + "\n");
      }
    });
  }

  return c.json(result);
});
```

---

#### `start(port: number): Promise<void>`

Starts a standalone Express server on the specified port. Resolves when the server is listening.

```typescript
await agent.start(4000);
console.log("Agent running on port 4000");
```

---

#### `stop(): void`

Stops the standalone server if running.

```typescript
agent.stop();
```

---

#### `getAgentCard(): AgentCard`

Returns the agent's AgentCard (manifest) object.

```typescript
const card = agent.getAgentCard();
console.log(card.name, card.version);
```

---

#### `getRequestHandler(): A2ARequestHandler`

Returns the underlying A2A request handler for custom integrations.

```typescript
const handler = agent.getRequestHandler();
// Use with custom routing or middleware
```

---

#### `getTaskStore(): TaskStore`

Returns the task store instance used by the agent.

```typescript
const store = agent.getTaskStore();
const task = await store.load("task-123");
```

---

#### `getAletheiaExtensions(): AletheiaExtensions | undefined`

Returns the Aletheia-specific extensions configured for this agent.

```typescript
const extensions = agent.getAletheiaExtensions();
if (extensions?.did) {
  console.log("Agent DID:", extensions.did);
}
```

---

### Properties

#### `logger: AletheiaLogger`

Logger instance for the agent. Use for custom logging within handlers.

```typescript
agent.logger.info("Custom log message", { taskId: "123" });
```

---

#### `events: EventEmitter`

Event emitter for lifecycle events. Prefer using `on()` method instead.

---

## AgentResponse Class

Response helper that wraps `ExecutionEventBus` with convenience methods for sending responses.

### Constructor

```typescript
constructor(context: RequestContext | null, eventBus: ExecutionEventBus)
```

Creates a new response instance. Typically created internally by the agent framework.

---

### Properties

#### `isFinished: boolean`

Whether the response has been finalized. After calling a final method (`text`, `data`, `message`, `done`, `fail`, `canceled`), this becomes `true`.

---

### Quick Response Methods

These methods send a response and immediately finalize the request.

> **Note:** All response methods automatically include `contextId` and `taskId` from the request context. This enables orchestrators to preserve conversation state across multi-turn interactions.

#### `text(content: string): void`

Sends a text response and completes the request.

```typescript
response.text("Hello, world!");
// Response includes: { contextId: "...", taskId: "...", parts: [...] }
```

---

#### `data(data: Record<string, unknown>): void`

Sends a JSON data response and completes the request.

```typescript
response.data({ status: "success", result: 42 });
// Response includes: { contextId: "...", taskId: "...", parts: [...] }
```

---

#### `message(parts: Part[]): void`

Sends a message with custom parts and completes the request.

```typescript
response.message([
  { kind: "text", text: "Here's the analysis:" },
  { kind: "data", data: { score: 95 } },
]);
// Response includes: { contextId: "...", taskId: "...", parts: [...] }
```

---

### Streaming Methods

These methods publish intermediate updates. Use `done()`, `fail()`, or `canceled()` to finalize.

> **Note:** All streaming methods also automatically include `contextId` and `taskId`.

#### `working(message?: string): void`

Publishes a "working" status update (non-final). Call to indicate the agent is processing.

```typescript
response.working("Analyzing your request...");
```

---

#### `artifact(artifact: Artifact, options?: { append?: boolean; lastChunk?: boolean }): void`

Publishes an artifact update. Use for streaming intermediate results.

```typescript
response.artifact(
  {
    name: "partial-results",
    parts: [{ kind: "data", data: intermediateData }],
  },
  { append: false, lastChunk: false }
);
```

**Options:**
- `append` - Whether to append to existing artifact (default: `false`)
- `lastChunk` - Whether this is the last chunk (default: `false`)

---

#### `done(message?: string): void`

Publishes a "completed" status and finalizes the response.

```typescript
response.done("Task completed successfully!");
```

---

#### `fail(error: string): void`

Publishes a "failed" status and finalizes the response with an error message.

```typescript
response.fail("Unable to process the request");
```

---

#### `canceled(): void`

Publishes a "canceled" status and finalizes the response. Typically called from cancel handlers.

```typescript
response.canceled();
```

---

#### `inputRequired(message: string): void`

Publishes an "input-required" status. Use when the agent needs additional input from the user.

```typescript
response.inputRequired("Please provide your API key to continue.");
```

---

## RedisTaskStore Class

A `TaskStore` implementation backed by Redis for persistent task storage across server restarts.

### Constructor

```typescript
constructor(redis: RedisLike, options?: RedisTaskStoreOptions)
```

Creates a new Redis-backed task store.

---

### Methods

#### `save(task: Task): Promise<void>`

Saves a task to Redis.

```typescript
await taskStore.save({
  id: "task-123",
  status: { state: "working" },
  // ...
});
```

---

#### `load(taskId: string): Promise<Task | undefined>`

Loads a task from Redis by ID. Returns `undefined` if not found.

```typescript
const task = await taskStore.load("task-123");
if (task) {
  console.log("Task state:", task.status.state);
}
```

---

## Types

### AletheiaAgentConfig

Configuration interface for creating an `AletheiaAgent`.

```typescript
interface AletheiaAgentConfig {
  // Required
  name: string;                              // Agent display name
  version: string;                           // Agent version (semver)
  url: string;                               // Agent's public base URL
  description: string;                       // Human-readable description
  skills: AgentSkill[];                      // Array of capabilities

  // Optional AgentCard fields
  defaultInputModes?: string[];              // Default: ["text/plain", "application/json"]
  defaultOutputModes?: string[];             // Default: ["text/plain", "application/json"]
  capabilities?: Partial<AgentCapabilities>; // Streaming, pushNotifications, etc.
  iconUrl?: string;                          // URL to agent icon
  documentationUrl?: string;                 // URL to documentation
  provider?: {                               // Provider info
    organization: string;
    url: string;
  };

  // Aletheia-specific
  aletheiaExtensions?: AletheiaExtensions;   // Trust layer extensions
  registryUrl?: string;                      // Aletheia registry URL
  taskStore?: TaskStore;                     // Task persistence backend

  // Observability
  logger?: AletheiaLogger;                   // Custom logger
  logLevel?: AletheiaLogLevel;               // "debug" | "info" | "warn" | "error"
}
```

---

### AletheiaExtensions

Aletheia-specific extensions for AgentCard metadata.

```typescript
interface AletheiaExtensions {
  owner?: string;              // Ethereum address of owner (for SIWE auth)
  livenessPingUrl?: string;    // URL for liveness health checks
  did?: string;                // DID identifier (did:web or did:key)
  publicKeyMultibase?: string; // Public key in multibase format (for did:web)
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `owner` | `string` | Ethereum address of the agent owner (for SIWE authentication) |
| `livenessPingUrl` | `string` | URL for Aletheia liveness health checks |
| `did` | `string` | DID identifier. Use `did:web:yourdomain.com` for production or leave unset for auto-generated `did:key` |
| `publicKeyMultibase` | `string` | Ed25519 public key in multibase format (e.g., `z6Mk...`). Required for `did:web`, auto-derived for `did:key` |

**DID Methods:**

| Method | When to Use | `publicKeyMultibase` |
|--------|-------------|---------------------|
| `did:key` (auto) | Development, testing | Optional - auto-derived |
| `did:web` | Production | Required - from `generateAgentKeyPair()` |

---

### AgentContext

Extended request context with helper methods for accessing message content.

```typescript
interface AgentContext extends RequestContext {
  readonly textContent: string;                        // All text parts joined with newlines
  readonly dataContent: Record<string, unknown> | null; // First data part's data
  readonly parts: Part[];                              // Raw message parts
  // Inherited from RequestContext:
  readonly contextId?: string;                         // Conversation identifier for multi-turn
  readonly taskId: string;                             // Task identifier
}
```

**Key Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `textContent` | `string` | All text parts joined with newlines |
| `dataContent` | `Record<string, unknown> \| null` | First data part's data |
| `parts` | `Part[]` | Raw message parts |
| `contextId` | `string \| undefined` | Conversation identifier — use for stateful agents |
| `taskId` | `string` | Unique task identifier |

**Usage for Stateful Agents:**

```typescript
agent.handle(async (context, response) => {
  // Use contextId as session key for conversation history
  const sessionId = context.contextId ?? "default";
  const history = conversationStore.get(sessionId) ?? [];
  
  // Process with history...
  
  response.text("Response"); // Automatically includes contextId
});
```

---

### AgentHandler

Handler function signature for processing incoming messages.

```typescript
type AgentHandler = (
  context: AgentContext,
  response: AgentResponse
) => Promise<void>;
```

---

### CancelHandler

Handler function signature for cancellation requests.

```typescript
type CancelHandler = (
  taskId: string,
  response: AgentResponse
) => Promise<void>;
```

---

### RedisLike

Minimal Redis client interface compatible with ioredis, node-redis v4, and similar libraries.

```typescript
interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  del(...args: unknown[]): Promise<unknown>;
}
```

---

### RedisTaskStoreOptions

Options for configuring `RedisTaskStore`.

```typescript
interface RedisTaskStoreOptions {
  prefix?: string;      // Key prefix. Default: "aletheia:task:"
  ttlSeconds?: number;  // TTL in seconds. Default: 86400 (24 hours). Set to 0 to disable.
}
```

---

## Re-exports from @a2a-js/sdk

The following are re-exported from `@a2a-js/sdk` and `@a2a-js/sdk/server` for convenience:

### Classes

| Export | Source | Description |
|--------|--------|-------------|
| `InMemoryTaskStore` | `@a2a-js/sdk/server` | In-memory task storage |
| `A2AError` | `@a2a-js/sdk/server` | A2A error class |
| `RequestContext` | `@a2a-js/sdk/server` | Incoming request context |
| `DefaultExecutionEventBus` | `@a2a-js/sdk/server` | Default event bus implementation |

### Types

| Export | Source | Description |
|--------|--------|-------------|
| `Part` | `@a2a-js/sdk` | Message part (union type) |
| `TextPart` | `@a2a-js/sdk` | Text message part |
| `DataPart` | `@a2a-js/sdk` | Data message part |
| `FilePart` | `@a2a-js/sdk` | File message part |
| `Artifact` | `@a2a-js/sdk` | Artifact structure |
| `AgentCard` | `@a2a-js/sdk` | Agent manifest |
| `AgentSkill` | `@a2a-js/sdk` | Skill definition |
| `AgentCapabilities` | `@a2a-js/sdk` | Agent capabilities |
| `Message` | `@a2a-js/sdk` | Message structure |
| `Task` | `@a2a-js/sdk` | Task structure |
| `TaskState` | `@a2a-js/sdk` | Task state enum |
| `TaskStatus` | `@a2a-js/sdk` | Task status structure |
| `TaskStore` | `@a2a-js/sdk/server` | Task store interface |
| `ExecutionEventBus` | `@a2a-js/sdk/server` | Event bus interface |
| `AgentExecutor` | `@a2a-js/sdk/server` | Agent executor interface |

---

## Examples

### Full Configuration

```typescript
import { AletheiaAgent, RedisTaskStore } from "@a2aletheia/sdk/agent";
import { ConsoleLogger } from "@a2aletheia/sdk";
import Redis from "ioredis";

const redis = new Redis("redis://localhost:6379");
const taskStore = new RedisTaskStore(redis, {
  prefix: "myapp:task:",
  ttlSeconds: 3600,
});

const agent = new AletheiaAgent({
  name: "TranslatorAgent",
  version: "1.0.0",
  url: "https://translator.example.com",
  description: "Translates text between languages",
  skills: [
    {
      id: "translate",
      name: "Translate Text",
      description: "Translate text to another language",
      tags: ["translation", "nlp"],
    },
  ],
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain"],
  capabilities: {
    streaming: true,
    pushNotifications: false,
  },
  iconUrl: "https://translator.example.com/icon.png",
  documentationUrl: "https://translator.example.com/docs",
  provider: {
    organization: "Example Corp",
    url: "https://example.com",
  },
  aletheiaExtensions: {
    owner: "0x1234567890abcdef1234567890abcdef12345678",
    did: "did:web:translator.example.com",
    livenessPingUrl: "https://translator.example.com/health",
  },
  taskStore,
  logger: new ConsoleLogger("info"),
  logLevel: "info",
});
```

---

### Text Handler

```typescript
agent.handle(async (context, response) => {
  const input = context.textContent;
  response.text(`You said: ${input}`);
});
```

---

### Data Handler

```typescript
agent.handle(async (context, response) => {
  const data = context.dataContent ?? { query: context.textContent };

  const result = await processQuery(data);

  response.data({
    success: true,
    result,
    timestamp: new Date().toISOString(),
  });
});
```

---

### Streaming Handler

```typescript
agent.handle(async (context, response) => {
  response.working("Starting analysis...");

  const chunks = await analyzeInChunks(context.textContent);

  for (let i = 0; i < chunks.length; i++) {
    response.artifact(
      {
        name: "analysis-results",
        parts: [{ kind: "data", data: chunks[i] }],
      },
      { append: i > 0, lastChunk: i === chunks.length - 1 }
    );
  }

  response.done("Analysis complete!");
});
```

---

### Event Subscription

```typescript
// Track all messages
agent.on("message.received", (event) => {
  console.log("Incoming:", event.data);
});

agent.on("message.sent", (event) => {
  console.log("Outgoing:", event.data);
});

// Error tracking
agent.on("message.failed", (event) => {
  errorTracker.capture(event.data);
});

// Wildcard for metrics
const unsubscribe = agent.on("*", (event) => {
  metrics.increment(`agent.events.${event.type}`);
});

// Later: unsubscribe() to stop listening
```

---

### Redis Integration

```typescript
import { AletheiaAgent, RedisTaskStore } from "@a2aletheia/sdk/agent";
import IORedis from "ioredis";

// Using ioredis
const redis = new IORedis({
  host: "localhost",
  port: 6379,
  password: "secret",
  db: 0,
});

const taskStore = new RedisTaskStore(redis, {
  prefix: "aletheia:task:",
  ttlSeconds: 86400, // 24 hours
});

const agent = new AletheiaAgent({
  name: "MyAgent",
  version: "1.0.0",
  url: "https://my-agent.example.com",
  description: "An agent with persistent task storage",
  skills: [{ id: "process", name: "Process", description: "Process requests" }],
  taskStore,
});

await agent.start(4000);
```

---

### Framework-Agnostic Usage (Hono)

```typescript
import { AletheiaAgent } from "@a2aletheia/sdk/agent";
import { Hono } from "hono";
import { stream } from "hono/streaming";

const agent = new AletheiaAgent({
  name: "HonoAgent",
  version: "1.0.0",
  url: "https://my-agent.example.com",
  description: "Agent hosted on Hono",
  skills: [{ id: "echo", name: "Echo", description: "Echo" }],
});

agent.handle(async (context, response) => {
  response.text(`Echo: ${context.textContent}`);
});

const app = new Hono();

// Serve agent card
app.get("/.well-known/agent-card.json", (c) => {
  return c.json(agent.getAgentCard());
});

// Handle A2A requests
app.post("/", async (c) => {
  const body = await c.req.json();
  const result = await agent.handleRequest(body);

  if (Symbol.asyncIterator in result) {
    return stream(c, async (s) => {
      for await (const chunk of result) {
        await s.write(JSON.stringify(chunk) + "\n");
      }
    });
  }

  return c.json(result);
});

export default app;
```
