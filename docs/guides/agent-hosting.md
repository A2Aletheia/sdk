---
layout: default
title: Agent Hosting
---

# Agent Hosting

Learn how to build, configure, and deploy A2A-compliant agents using the `@a2aletheia/sdk/agent` module.

---

## Overview

`AletheiaAgent` is a high-level framework for hosting agents that:

- Serve an A2A-compliant manifest at `/.well-known/agent.json`
- Automatically generate and serve a DID Document at `/.well-known/did.json`
- Expose a `/health` liveness endpoint
- Handle incoming A2A messages with a simple handler API
- Support streaming responses (working, artifact, done, fail)
- Emit lifecycle events for observability

> **Note:** Agent hosting requires Node.js and Express. Import from `@a2aletheia/sdk/agent`.

---

## Quick Start

```typescript
import { AletheiaAgent } from "@a2aletheia/sdk/agent";

const agent = new AletheiaAgent({
  name: "EchoAgent",
  version: "1.0.0",
  url: "https://my-agent.example.com",
  description: "Echoes back whatever you send",
  skills: [
    {
      id: "echo",
      name: "Echo",
      description: "Echoes input text back",
      tags: ["utility"],
    },
  ],
});

agent.handle(async (context, response) => {
  response.text(`Echo: ${context.textContent}`);
});

await agent.start(4000);
// Server running on port 4000
// Manifest at: http://localhost:4000/.well-known/agent.json
// DID Doc at:  http://localhost:4000/.well-known/did.json
// Health at:   http://localhost:4000/health
```

---

## Configuration

### AletheiaAgentConfig

```typescript
const agent = new AletheiaAgent({
  // Required
  name: "MyAgent",
  version: "1.0.0",
  url: "https://my-agent.example.com",
  description: "What this agent does",
  skills: [
    {
      id: "skill-id",
      name: "Skill Name",
      description: "What this skill does",
      tags: ["category"],
    },
  ],

  // Optional
  aletheiaExtensions: {
    owner: "0x1234...",              // Owner wallet address
    livenessPingUrl: "/custom-health", // Custom liveness endpoint
  },
  taskStore: redisTaskStore,          // Persistent task storage
  logger: customLogger,              // Custom logger implementation
});
```

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Agent display name |
| `version` | `string` | Yes | Agent version (semver) |
| `url` | `string` | Yes | Agent's public base URL |
| `description` | `string` | Yes | Human-readable description |
| `skills` | `Skill[]` | Yes | Array of capabilities |
| `aletheiaExtensions` | `object` | No | Aletheia-specific metadata |
| `taskStore` | `TaskStore` | No | Persistent task storage backend |
| `logger` | `AletheiaLogger` | No | Custom logger |

---

## DID Configuration

The agent supports two DID methods for identity:

| Method | Use Case | Setup |
|--------|----------|-------|
| `did:key` | Development, testing | Auto-generated, no configuration needed |
| `did:web` | Production | Requires hosting `did.json` at your domain |

### Auto-generated did:key (Default)

When no `aletheiaExtensions.did` is provided, the agent will:
1. Generate Ed25519 key pair on startup
2. Create a `did:key` from the public key
3. Serve `/.well-known/did.json` automatically

```typescript
// No DID configuration needed - auto-generates did:key
const agent = new AletheiaAgent({
  name: "DevAgent",
  version: "1.0.0",
  url: "http://localhost:4000",
  description: "Development agent",
  skills: [...],
});
```

### did:web for Production

For production deployments, use `did:web` to establish a stable, verifiable identity:

```typescript
import { generateAgentKeyPair } from "@a2aletheia/sdk";

// 1. Generate keys (run once, store securely!)
const keys = await generateAgentKeyPair();
console.log("Private Key:", keys.privateKey);           // Store in secure vault!
console.log("Public Key Multibase:", keys.publicKeyMultibase);
console.log("DID:", keys.didKey);

// 2. Configure agent with did:web
const agent = new AletheiaAgent({
  name: "ProductionAgent",
  version: "1.0.0",
  url: "https://my-agent.example.com",
  description: "Production agent with stable identity",
  skills: [...],
  aletheiaExtensions: {
    did: "did:web:my-agent.example.com",
    publicKeyMultibase: keys.publicKeyMultibase,
    owner: "0x1234...",  // Optional: Ethereum address for SIWE auth
  },
});
```

The SDK automatically serves `/.well-known/did.json` containing:
- Verification method with your Ed25519 public key
- Authentication and assertion method references
- Agent service endpoint pointing to your URL

### Migration Path

To migrate from `did:key` to `did:web` without code changes:

1. **Generate keys**: `await generateAgentKeyPair()`
2. **Update config**: Set `did: "did:web:yourdomain.com"` and `publicKeyMultibase`
3. **No other changes needed** - SDK handles everything

```bash
# Generate keys via CLI
node -e "import('@a2aletheia/sdk').then(({generateAgentKeyPair}) => generateAgentKeyPair().then(k => console.log(JSON.stringify(k, null, 2))))"
```

---

## Handling Messages

### Simple Text Response

```typescript
agent.handle(async (context, response) => {
  const input = context.textContent; // All text parts joined
  response.text(`Processed: ${input}`);
});
```

### JSON Data Response

```typescript
agent.handle(async (context, response) => {
  const result = await processData(context.textContent);
  response.data({ status: "success", result });
});
```

### Custom Parts Response

```typescript
agent.handle(async (context, response) => {
  response.message([
    { type: "text", text: "Here is your analysis:" },
    { type: "data", data: { score: 95, grade: "A" } },
  ]);
});
```

---

## Conversation Context Preservation

For multi-turn conversations, the A2A protocol uses `contextId` to link related messages. This enables orchestrators to preserve conversation state across requests.

### Automatic contextId Inclusion

All `AgentResponse` methods automatically include `contextId` from the incoming request:

```typescript
agent.handle(async (context, response) => {
  // context.contextId is the conversation identifier
  // It's automatically included in the response
  response.text("Your request has been processed");
  // Response includes: { contextId: "...", taskId: "...", parts: [...] }
});
```

This automatic inclusion enables orchestrators (like `@a2aletheia/a2a`) to:
1. Track `contextId` from agent responses
2. Forward the same `contextId` on follow-up requests
3. Preserve conversation continuity across calls and restarts

### Agent-Side State Preservation

For stateful agents (chat assistants, multi-step workflows), use `contextId` to store conversation history:

```typescript
// In-memory conversation storage (use Redis/database for production)
const conversations = new Map<string, Message[]>();

agent.handle(async (context, response) => {
  const sessionId = context.contextId ?? "default";
  
  // Retrieve existing conversation history
  const history = conversations.get(sessionId) ?? [];
  
  // Process with history context
  const reply = await processWithHistory(history, context.textContent);
  
  // Update stored history
  history.push({ role: "user", content: context.textContent });
  history.push({ role: "assistant", content: reply });
  conversations.set(sessionId, history);
  
  // Response automatically includes contextId
  response.text(reply);
});
```

### Declaring Stateful Capability

Set `stateTransitionHistory` to signal multi-turn conversation support:

```typescript
const agent = new AletheiaAgent({
  // ...
  capabilities: {
    streaming: true,
    stateTransitionHistory: true,  // Signals conversation continuity support
  },
});
```

This signals to callers that the agent maintains state across messages.

### How Orchestrators Use This

When orchestrators (like `@a2aletheia/a2a`) connect to your agent:

1. **First call**: No `contextId` — agent receives fresh identifier
2. **Response**: Agent returns `contextId` in response (automatic via SDK)
3. **Subsequent calls**: Orchestrator forwards the same `contextId`
4. **Agent**: Uses `contextId` to retrieve stored conversation state

See the [Context Persistence guide](https://a2aletheia.github.io/a2a/guides/context-persistence) in `@a2aletheia/a2a` for orchestrator-side configuration.

---

## Streaming Responses

For long-running tasks, use streaming to keep clients informed:

```typescript
agent.handle(async (context, response) => {
  // Signal that work is in progress
  response.working("Analyzing your request...");

  const analysis = await performAnalysis(context.textContent);

  // Send intermediate artifact
  response.artifact(
    { parts: [{ type: "data", data: analysis }] },
    { name: "Analysis Results" }
  );

  // Signal completion
  response.done("Analysis complete!");
});
```

### Streaming Methods

| Method | Description | Final? |
|--------|-------------|--------|
| `working(message?)` | Publish "working" status update | No |
| `artifact(artifact, options?)` | Publish intermediate artifact | No |
| `done(message?)` | Publish "completed" status | Yes |
| `fail(error)` | Publish "failed" status | Yes |
| `canceled()` | Publish "canceled" status | Yes |
| `inputRequired(message)` | Publish "input-required" status | Yes |

---

## AgentContext

The context object provides access to the incoming message:

```typescript
agent.handle(async (context, response) => {
  // Get all text content joined with newlines
  const text = context.textContent;

  // Get the first data part (or null)
  const data = context.dataContent;

  // Access raw message parts
  const parts = context.parts;

  // Access the full RequestContext from @a2a-js/sdk
  // (task, message, etc.)
});
```

---

## Cancellation Handler

Handle task cancellation requests:

```typescript
agent.onCancel(async (taskId, response) => {
  await cleanup(taskId);
  response.canceled();
});
```

---

## Events & Observability

Subscribe to lifecycle events for logging, monitoring, and debugging:

```typescript
// Specific events
agent.on("agent.start", (event) => {
  console.log("Agent started:", event.data);
});

agent.on("message.received", (event) => {
  console.log("Incoming message:", event.data);
});

agent.on("message.sent", (event) => {
  console.log("Response sent:", event.data);
});

agent.on("message.failed", (event) => {
  console.error("Processing failed:", event.data);
});

agent.on("trust.verified", (event) => {
  console.log("Trust verified:", event.data);
});

// Wildcard: subscribe to all events
agent.on("*", (event) => {
  metrics.record(event.type, event.data);
});
```

### Event Types

| Event | Emitted When |
|-------|-------------|
| `agent.start` | Agent server starts listening |
| `message.received` | Incoming A2A message arrives |
| `message.sent` | Response is sent back |
| `message.failed` | Message processing fails |
| `trust.verified` | Agent identity/trust verified |

---

## Custom Logging

Bring your own logger or use the built-in options:

```typescript
import { ConsoleLogger, NoopLogger } from "@a2aletheia/sdk";

// Console logger with level filtering
const agent = new AletheiaAgent({
  // ...config
  logger: new ConsoleLogger("debug"), // "debug" | "info" | "warn" | "error"
});

// Silent logger (suppress all output)
const agent = new AletheiaAgent({
  // ...config
  logger: new NoopLogger(),
});

// Custom logger (implement AletheiaLogger interface)
const agent = new AletheiaAgent({
  // ...config
  logger: {
    debug: (msg, ctx) => myLogger.debug(msg, ctx),
    info: (msg, ctx) => myLogger.info(msg, ctx),
    warn: (msg, ctx) => myLogger.warn(msg, ctx),
    error: (msg, ctx) => myLogger.error(msg, ctx),
  },
});
```

---

## Persistent Task Storage

Use `RedisTaskStore` for task persistence across restarts:

```typescript
import { AletheiaAgent, RedisTaskStore } from "@a2aletheia/sdk/agent";
import Redis from "ioredis";

const redis = new Redis("redis://localhost:6379");

const taskStore = new RedisTaskStore(redis, {
  prefix: "aletheia:task:",  // Key prefix (default)
  ttlSeconds: 86400,         // TTL per task (default: 24h)
});

const agent = new AletheiaAgent({
  // ...config
  taskStore,
});
```

---

## Auto-Served Endpoints

When `agent.start(port)` is called, these endpoints are automatically configured:

| Endpoint | Description |
|----------|-------------|
| `/.well-known/agent.json` | A2A-compliant agent manifest (Agent Card) |
| `/.well-known/did.json` | DID Document for `did:web` resolution |
| `/health` | Liveness check endpoint |
| `POST /` | A2A message handler (main endpoint) |

---

## Full Example

```typescript
import { AletheiaAgent } from "@a2aletheia/sdk/agent";
import { ConsoleLogger } from "@a2aletheia/sdk";

const agent = new AletheiaAgent({
  name: "SummaryAgent",
  version: "1.0.0",
  url: "https://summary.example.com",
  description: "Summarizes text content",
  skills: [
    {
      id: "summarize",
      name: "Summarize",
      description: "Provide a concise summary of input text",
      tags: ["nlp", "text"],
    },
  ],
  logger: new ConsoleLogger("info"),
});

// Handle incoming messages
agent.handle(async (context, response) => {
  const text = context.textContent;

  if (!text) {
    response.fail("No text content provided");
    return;
  }

  response.working("Summarizing...");

  const summary = await summarize(text); // your summarization logic

  response.text(summary);
});

// Handle cancellations
agent.onCancel(async (taskId, response) => {
  response.canceled();
});

// Observe events
agent.on("message.received", (event) => {
  console.log(`Received message for task: ${event.data?.taskId}`);
});

await agent.start(4000);
```

---

## SDK vs A2A Package

| Capability | `@a2aletheia/sdk` | `@a2aletheia/a2a` |
|------------|-------------------|-------------------|
| Host agent (receive messages) | `AletheiaAgent` | `PeerAgent` |
| Registry client (discover, register) | `AletheiaClient` | -- |
| Send messages to other agents | -- | `AletheiaA2A` / `PeerAgent` |
| Trust pipeline (DID + liveness + score) | -- | Built-in |

For **outbound** agent-to-agent communication with trust verification, see [`@a2aletheia/a2a`](https://www.npmjs.com/package/@a2aletheia/a2a).

---

## Next Steps

- [LLM Agent Tools](llm-tools) -- Add utility tools to your agent
- [Reputation & Trust](reputation-trust) -- Participate in the trust network
