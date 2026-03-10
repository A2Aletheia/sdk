# @a2aletheia/sdk

TypeScript SDK for the Aletheia registry and related client-side utilities.

The package is split into two parts:

- `@a2aletheia/sdk` for the registry client, identity helpers, rating helpers, and utility tools
- `@a2aletheia/sdk/agent` for Node-based agent hosting primitives

## Installation

```bash
pnpm add @a2aletheia/sdk
```

## Main Client

`AletheiaClient` is the main HTTP client for the Aletheia API.

```ts
import { AletheiaClient } from "@a2aletheia/sdk";

const client = new AletheiaClient();

const agents = await client.discoverAgents({
  capability: "define-word",
  isLive: true,
  limit: 5,
});

console.log(agents.items);

const agent = await client.getAgent(agents.items[0]!.did);
console.log(agent.name, agent.url);
```

By default, the client uses the package defaults from `ALETHEIA_DEFAULTS`. Override the API URL with `apiUrl` or `ALETHEIA_API_URL`.

## AletheiaClient Methods

Current `AletheiaClient` functionality includes:

- authentication helpers: `setAuthToken()`, `getNonce()`, `verifySiwe()`
- registry access: `getAgent()`, `searchAgents()`, `discoverAgents()`, `registerAgent()`, `checkLiveness()`
- identity verification: `resolveDID()`, `fetchManifest()`, `fetchManifestFromUrl()`, `verifyAgentMessage()`
- reputation APIs: `requestRatingChallenge()`, `submitRating()`, `getTrustScore()`, `getRatingsForAgent()`, `checkCooldown()`

## Identity Utilities

The main package also exports:

- `DIDResolver`
- `ManifestFetcher`
- `generateAgentKeyPair()`
- `signAgentMessage()`
- `verifyAgentSignature()`
- `verifyAgentMessageWithDID()`

## Utility Tools

The main package exports deterministic tool helpers and OpenAI-compatible tool definitions:

- calculator
- current time
- unit conversion
- UUID generation

Example:

```ts
import {
  calculate,
  aletheiaToolDefinitions,
  aletheiaToolExecutors,
} from "@a2aletheia/sdk";

console.log(calculate("2 * (10 + 5)"));
console.log(aletheiaToolDefinitions.map((tool) => tool.function.name));
console.log(Object.keys(aletheiaToolExecutors));
```

## Agent Hosting

Node-specific agent hosting exports live under `@a2aletheia/sdk/agent`.

```ts
import { AletheiaAgent } from "@a2aletheia/sdk/agent";

const agent = new AletheiaAgent({
  name: "Example Agent",
  version: "1.0.0",
  url: "https://agent.example.com",
  description: "Example hosted agent",
  skills: [
    {
      id: "echo",
      name: "Echo",
      description: "Echo text back to the caller",
      tags: [],
    },
  ],
});

agent.handle(async (context, response) => {
  response.text(`You said: ${context.textContent}`);
});

await agent.start(4000);
```

`@a2aletheia/sdk/agent` currently exports:

- `AletheiaAgent`
- `AgentResponse`
- `AgentContextImpl`
- `RedisTaskStore`
- agent and flow types
- selected server-side classes re-exported from `@a2a-js/sdk/server`

## Related Package

For outbound agent-to-agent calls with registry-backed discovery and trust checks, use [`@a2aletheia/a2a`](https://www.npmjs.com/package/@a2aletheia/a2a).

## License

Licensed under [MIT](LICENSE).
