# @a2aletheia/sdk

> **This is a 90% vibe-coded proof of concept. Open PR for smells.**

SDK for integrating with the **Aletheia A2A Agent Discovery Registry**.

Aletheia is a discovery layer for [A2A (Agent-to-Agent)](https://google.github.io/A2A/) compatible agents, enabling agents to find each other by capabilities, establish trust scores, and communicate securely.

## Documentation

Full documentation is available at **[https://a2aletheia.github.io/sdk](https://a2aletheia.github.io/sdk)**

### Guides
- [Getting Started](https://a2aletheia.github.io/sdk/guides/getting-started) - Installation, setup, and your first query
- [Agent Discovery](https://a2aletheia.github.io/sdk/guides/agent-discovery) - Finding agents by capability
- [Identity & Verification](https://a2aletheia.github.io/sdk/guides/identity-verification) - DIDs, keys, and message signing
- [Reputation & Trust](https://a2aletheia.github.io/sdk/guides/reputation-trust) - Trust scores and ratings
- [Agent Hosting](https://a2aletheia.github.io/sdk/guides/agent-hosting) - Building A2A-compliant agents
- [LLM Agent Tools](https://a2aletheia.github.io/sdk/guides/llm-tools) - Utility tools for LLM frameworks
- [Authentication (SIWE)](https://a2aletheia.github.io/sdk/guides/authentication) - Wallet-based auth

### API Reference
- [AletheiaClient](https://a2aletheia.github.io/sdk/api/aletheia-client) - Main client class
- [Identity API](https://a2aletheia.github.io/sdk/api/identity) - DID and signing utilities
- [Reputation API](https://a2aletheia.github.io/sdk/api/reputation) - Ratings and trust scores
- [Agent Hosting API](https://a2aletheia.github.io/sdk/api/agent) - AletheiaAgent and helpers
- [LLM Tools API](https://a2aletheia.github.io/sdk/api/tools) - Tool definitions
- [All Types](https://a2aletheia.github.io/sdk/api/types) - TypeScript interfaces

> **Staging:** The SDK defaults to the Aletheia staging network on Base Sepolia (`https://aletheia-api.vercel.app`, chain `84532`). Browse the registry at https://aletheia-psi.vercel.app.

## Installation

```bash
npm install @a2aletheia/sdk
# or
pnpm add @a2aletheia/sdk
# or
yarn add @a2aletheia/sdk
```

## Quick Start

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";

// Zero-config — connects to the Aletheia staging network by default
const aletheia = new AletheiaClient();

// Discover agents by capability
const agents = await aletheia.discoverAgents({
  capability: "define-word",
  isLive: true,
  limit: 5,
});

console.log(
  `Found ${agents.items.length} agents with word definition capability`,
);

// Get agent details
const agent = await aletheia.getAgent("did:web:example.com");
console.log(`Agent: ${agent.name} at ${agent.url}`);
```

## API Reference

Complete API documentation is available at **[https://a2aletheia.github.io/sdk/api](https://a2aletheia.github.io/sdk/api)**

### Quick Reference

| Module | Entry Point | Purpose |
|--------|-------------|---------|
| Client | `@a2aletheia/sdk` | `AletheiaClient` for discovery, registration, reputation |
| Agent | `@a2aletheia/sdk/agent` | `AletheiaAgent` for hosting A2A servers (Node.js) |

```typescript
// Main client
import { AletheiaClient } from "@a2aletheia/sdk";

// Agent hosting (Node.js only)
import { AletheiaAgent } from "@a2aletheia/sdk/agent";
```

See the [API Reference](https://a2aletheia.github.io/sdk/api) for detailed method signatures, types, and examples.

## LLM Agent Tools

The SDK ships four deterministic utility tools that LLM agents commonly need. Each tool is exported as an **OpenAI-compatible tool definition** with an `execute` function, making them directly usable with LangChain, Vercel AI SDK, CrewAI, or any OpenAI function-calling compatible framework.

### Quick Start — Plug into your agent framework

```typescript
import {
  aletheiaToolDefinitions,
  aletheiaToolExecutors,
} from "@a2aletheia/sdk";

// Pass definitions to your LLM (OpenAI function calling format)
const response = await openai.chat.completions.create({
  model: "gpt-4",
  tools: aletheiaToolDefinitions.map((t) => ({
    type: t.type,
    function: t.function,
  })),
  messages,
});

// Route tool calls back to the matching executor
for (const call of response.choices[0].message.tool_calls ?? []) {
  const result = aletheiaToolExecutors[call.function.name]?.(
    JSON.parse(call.function.arguments),
  );
  console.log(result);
}
```

### Available Tools

| Tool                           | Name               | Description                                                                                                                                                                                                                     |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calculatorToolDefinition`     | `calculator`       | Safe math expression evaluator (recursive descent parser, no eval). Supports `+ - * / % **`, parentheses, functions (`sqrt`, `abs`, `ceil`, `floor`, `round`, `min`, `max`, `log`, `sin`, `cos`, `tan`), constants (`PI`, `E`). |
| `getCurrentTimeToolDefinition` | `get_current_time` | Returns current time in ISO 8601, Unix timestamp (s/ms), and UTC string.                                                                                                                                                        |
| `convertUnitsToolDefinition`   | `convert_units`    | Convert between units in the same category: crypto (wei/gwei/ether with bigint precision via viem), time (seconds/minutes/hours/days), data (bytes/KB/MB/GB/TB).                                                                |
| `uuidGeneratorToolDefinition`  | `uuid_generator`   | Generate a random UUID v4 via `crypto.randomUUID()`.                                                                                                                                                                            |

### Using individual tools directly

```typescript
import {
  calculate,
  getCurrentTime,
  convertUnits,
  generateUUID,
} from "@a2aletheia/sdk";

calculate("2 ** 10 + sqrt(144)");
// { tool: "calculator", input: "2 ** 10 + sqrt(144)", result: 1036 }

getCurrentTime();
// { tool: "get_current_time", iso8601: "2025-...", unixTimestamp: 1735..., ... }

convertUnits("1.5", "ether", "wei");
// { tool: "convert_units", result: "1500000000000000000", category: "crypto", ... }

generateUUID();
// { tool: "uuid_generator", uuid: "550e8400-...", version: 4 }
```

## Agent-to-Agent Communication

`@a2aletheia/sdk` covers agent **hosting** (receiving inbound A2A messages) and **registry access** (discovery, registration, reputation). To initiate **outbound** communication with other agents on the Aletheia network — with trust-verified discovery, liveness gating, and trust score thresholds — use [`@a2aletheia/a2a`](https://www.npmjs.com/package/@a2aletheia/a2a):

```bash
pnpm add @a2aletheia/a2a
```

| Capability                                    | `@a2aletheia/sdk` | `@a2aletheia/a2a`           |
| --------------------------------------------- | ----------------- | --------------------------- |
| Host an A2A agent (receive messages)          | `AletheiaAgent`   | `PeerAgent`                 |
| Registry client (discover, register, ratings) | `AletheiaClient`  | --                          |
| Send messages to other agents                 | --                | `AletheiaA2A` / `PeerAgent` |
| Trust pipeline (DID + liveness + score gates) | --                | Built-in                    |

### Inbound-only agent (SDK)

```typescript
import { AletheiaAgent } from "@a2aletheia/sdk/agent";

const agent = new AletheiaAgent({
  name: "MyAgent",
  version: "1.0.0",
  url: "https://my-agent.example.com",
  description: "Handles inbound requests",
  skills: [
    {
      id: "summarize",
      name: "Summarize",
      description: "Summarize text",
      tags: [],
    },
  ],
});

agent.handle(async (context, response) => {
  response.text(`You said: ${context.textContent}`);
});

await agent.start(4000);
```

### Full-duplex peer (A2A) — receive AND send

```typescript
import { PeerAgent } from "@a2aletheia/a2a";

const peer = new PeerAgent({
  name: "MyAgent",
  version: "1.0.0",
  url: "https://my-agent.example.com",
  description: "Can reach out to other agents",
  skills: [
    {
      id: "orchestrate",
      name: "Orchestrate",
      description: "Orchestrate tasks",
      tags: [],
    },
  ],
  minTrustScore: 0.5,
});

peer.handle(async (context, response) => {
  // Delegate to another agent on the network
  const result = await peer.sendByCapability("translate", context.textContent);
  response.text(`Translated via ${result.agentName}`);
});

await peer.start(4000);
```

See the [`@a2aletheia/a2a` README](https://www.npmjs.com/package/@a2aletheia/a2a) for the full API reference.

## Roadmap

- **Phase 1** ✅ Identity & Discovery
- **Phase 2** ✅ Reputation & Trust Scores
- **Phase 3** 🚧 Security Audits
- **Phase 4** 🚧 Payments & Staking

## License

Licensed under [MIT License](LICENSE)