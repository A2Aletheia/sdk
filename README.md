# @a2aletheia/sdk

> **This is a 90% vibe-coded proof of concept. Open PR for smells.**

SDK for integrating with the **Aletheia A2A Agent Discovery Registry**.

Aletheia is a discovery layer for [A2A (Agent-to-Agent)](https://google.github.io/A2A/) compatible agents, enabling agents to find each other by capabilities, establish trust scores, and communicate securely.

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

### Initialization

```typescript
// Uses staging defaults (https://aletheia-api.vercel.app, chain 84532)
const aletheia = new AletheiaClient();

// Or override with a custom URL
const aletheia = new AletheiaClient({
  apiUrl: "https://custom-registry.example.com",
  chainId: 1,
});
```

The API URL is resolved in this order:

1. Explicit `apiUrl` constructor argument
2. `ALETHEIA_API_URL` environment variable
3. Built-in default (`https://aletheia-api.vercel.app`)

### Discovery

#### `discoverAgents(params)`

Find agents by capability, trust score, or other criteria.

```typescript
const result = await aletheia.discoverAgents({
  capability?: string;       // Filter by capability ID
  query?: string;            // Search by name/description
  minTrustScore?: number;    // Minimum trust score (0-100)
  isLive?: boolean;          // Only return live agents
  limit?: number;            // Max results to return
});

// Returns: { items: Agent[], total: number, page: number, limit: number }
```

#### `searchAgents(params)`

Search agents with more filtering options.

```typescript
const result = await aletheia.searchAgents({
  query?: string;
  status?: "active" | "inactive" | "suspended" | "pending";
  page?: number;
  limit?: number;
});
```

### Agent Registration

#### `registerAgent(manifestUrl, ownerAddress?)`

Register a new agent with the registry.

```typescript
const agent = await aletheia.registerAgent(
  "https://my-agent.example.com/.well-known/agent.json",
  "0x1234...", // Optional: owner wallet address
);
```

#### `getAgent(did)`

Get an agent by its DID.

```typescript
const agent = await aletheia.getAgent("did:web:my-agent.example.com");
```

### Liveness

#### `checkLiveness(did)`

Check if an agent is currently live/reachable.

```typescript
const isLive = await aletheia.checkLiveness("did:web:my-agent.example.com");
```

### Identity

#### `resolveDID(did)`

Resolve a DID to get its DID Document.

```typescript
const didDocument = await aletheia.resolveDID("did:web:example.com");
```

#### `fetchManifest(baseUrl)`

Fetch an agent's A2A manifest (Agent Card).

```typescript
const manifest = await aletheia.fetchManifest("https://my-agent.example.com");
```

### Agent Message Signing & Verification

The SDK provides Ed25519 cryptographic signing for secure agent-to-agent authentication. This allows agents to prove their identity when communicating with each other.

#### Generate a Key Pair

```typescript
import { generateAgentKeyPair } from "@a2aletheia/sdk";

const keys = await generateAgentKeyPair();
console.log(keys.didKey); // did:key:z6Mk...

// Store keys.privateKey securely! Never share it.
// Include keys.publicKeyMultibase in your DID document
```

#### Sign Messages

```typescript
import { signAgentMessage } from "@a2aletheia/sdk";

const signedMessage = await signAgentMessage(
  { action: "book", hotelId: "123" }, // Your payload
  keys.privateKey,
  keys.didKey, // or your did:web
);

// signedMessage contains: { payload, signature, signer, timestamp }
```

#### Verify Messages (with Public Key)

```typescript
import { verifyAgentSignature } from "@a2aletheia/sdk";

const isValid = await verifyAgentSignature(signedMessage, publicKeyHex);
```

#### Verify Messages (with DID Resolution)

The recommended way to verify agent messages - automatically resolves the signer's DID and verifies against their published public key:

```typescript
// Using the client (recommended)
const result = await aletheia.verifyAgentMessage(signedMessage);
if (!result.valid) {
  throw new Error(`Verification failed: ${result.error}`);
}
console.log(`Verified message from ${result.didDocument?.id}`);

// Or using the low-level function
import { verifyAgentMessageWithDID } from "@a2aletheia/sdk";

const didDocument = await aletheia.resolveDID(signedMessage.signer);
const isValid = await verifyAgentMessageWithDID(signedMessage, didDocument);
```

#### End-to-End Example: Agent Authentication

```typescript
// === AGENT SIDE (the one proving identity) ===

// 1. Generate keys (do this once, store securely)
const keys = await generateAgentKeyPair();

// 2. Publish public key in your DID document at:
//    https://your-agent.com/.well-known/did.json
const didDocument = {
  "@context": ["https://www.w3.org/ns/did/v1"],
  id: "did:web:your-agent.com",
  verificationMethod: [
    {
      id: "did:web:your-agent.com#key-1",
      type: "Ed25519VerificationKey2020",
      controller: "did:web:your-agent.com",
      publicKeyMultibase: keys.publicKeyMultibase,
    },
  ],
  authentication: ["did:web:your-agent.com#key-1"],
};

// 3. Sign outgoing messages
const signedResponse = await signAgentMessage(
  { result: "booking confirmed", confirmationId: "ABC123" },
  keys.privateKey,
  "did:web:your-agent.com",
);

// === CLIENT SIDE (the one verifying) ===

// 4. Receive and verify the signed message
const verification = await aletheia.verifyAgentMessage(signedResponse);
if (!verification.valid) {
  throw new Error("Message not from the claimed agent!");
}

// Now we know this message really came from did:web:your-agent.com
console.log("Verified response:", signedResponse.payload);
```

### Authentication (SIWE)

The SDK supports Sign-In with Ethereum (SIWE) for authenticated actions.

```typescript
// Get a nonce for signing
const nonce = await aletheia.getNonce();

// Sign the message with your wallet (using viem, ethers, etc.)
const message = createSiweMessage({ nonce, address, ... });
const signature = await wallet.signMessage(message);

// Verify and get session token
const { sessionToken } = await aletheia.verifySiwe(message, signature);

// Set auth token for subsequent requests
aletheia.setAuthToken(sessionToken);
```

## Types & Exports

The SDK exports types and utilities:

```typescript
// Main client
import { AletheiaClient } from "@a2aletheia/sdk";

// Identity utilities
import {
  DIDResolver,
  ManifestFetcher,
  generateAgentKeyPair,
  signAgentMessage,
  verifyAgentSignature,
  verifyAgentMessageWithDID,
} from "@a2aletheia/sdk";

// Types
import type {
  AletheiaClientConfig,
  AgentKeyPair,
  SignedMessage,
} from "@a2aletheia/sdk";

// Re-exported from @a2aletheia/base-types
import type {
  Agent,
  AgentManifest,
  DID,
  DIDDocument,
  TrustScore,
  // ... etc
} from "@a2aletheia/base-types";
```

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
