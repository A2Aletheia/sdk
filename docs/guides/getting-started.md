---
layout: default
title: Getting Started
---

# Getting Started

This guide walks you through installing the SDK, configuring the client, and making your first registry query.

---

## Installation

```bash
npm install @a2aletheia/sdk
# or
pnpm add @a2aletheia/sdk
# or
yarn add @a2aletheia/sdk
```

### Peer Dependencies

If you plan to use the [Agent Hosting](agent-hosting) module (`@a2aletheia/sdk/agent`), you also need Express:

```bash
npm install express
```

Express is an optional peer dependency and is **not** required for the main SDK entry point.

---

## Basic Setup

### Zero-Config Client

The simplest way to get started -- connects to the Aletheia staging network on Base Sepolia:

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";

const aletheia = new AletheiaClient();
```

### Custom Configuration

Override the API URL and chain ID:

```typescript
const aletheia = new AletheiaClient({
  apiUrl: "https://custom-registry.example.com",
  chainId: 1, // Ethereum mainnet
});
```

### Configuration Resolution Order

The API URL is resolved in this priority:

1. **Explicit `apiUrl`** passed to the constructor
2. **`ALETHEIA_API_URL`** environment variable
3. **Built-in default** (`https://aletheia-api.vercel.app`)

```typescript
// Uses ALETHEIA_API_URL env var if set, otherwise the default
const aletheia = new AletheiaClient();
```

---

## Your First Query

### Discover Agents

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";

const aletheia = new AletheiaClient();

// Find agents that can define words
const agents = await aletheia.discoverAgents({
  capability: "define-word",
  isLive: true,
  limit: 5,
});

console.log(`Found ${agents.items.length} agents:`);
for (const agent of agents.items) {
  console.log(`  - ${agent.name} (${agent.did})`);
  console.log(`    URL: ${agent.url}`);
  console.log(`    Trust: ${agent.trustScore}`);
}
```

### Get a Specific Agent

```typescript
const agent = await aletheia.getAgent("did:web:example.com");
console.log(`Agent: ${agent.name}`);
console.log(`Status: ${agent.status}`);
console.log(`URL: ${agent.url}`);
```

### Resolve a DID

```typescript
const didDocument = await aletheia.resolveDID("did:web:example.com");
console.log(`DID: ${didDocument.id}`);
console.log(`Verification Methods: ${didDocument.verificationMethod?.length}`);
```

### Fetch an Agent Manifest

```typescript
const manifest = await aletheia.fetchManifest("https://my-agent.example.com");
console.log(`Agent: ${manifest.name}`);
console.log(`Skills: ${manifest.skills?.length}`);
```

---

## Project Structure

The SDK exports two entry points:

| Entry Point | Environment | Usage |
|-------------|-------------|-------|
| `@a2aletheia/sdk` | Browser + Node.js | Client, identity, tools, types |
| `@a2aletheia/sdk/agent` | Node.js only | Agent hosting with Express |

### Import Examples

```typescript
// Main SDK (browser-safe)
import { AletheiaClient } from "@a2aletheia/sdk";
import { DIDResolver, generateAgentKeyPair } from "@a2aletheia/sdk";
import { aletheiaToolDefinitions } from "@a2aletheia/sdk";

// Agent hosting (Node.js only)
import { AletheiaAgent } from "@a2aletheia/sdk/agent";
```

---

## Defaults

The SDK ships with sensible defaults for the Aletheia staging network:

| Setting | Default Value |
|---------|---------------|
| API URL | `https://aletheia-api.vercel.app` |
| Registry URL | `https://aletheia-psi.vercel.app` |
| Chain ID | `84532` (Base Sepolia) |

Access defaults programmatically:

```typescript
import { ALETHEIA_DEFAULTS, resolveApiUrl } from "@a2aletheia/sdk";

console.log(ALETHEIA_DEFAULTS.API_URL);      // https://aletheia-api.vercel.app
console.log(ALETHEIA_DEFAULTS.REGISTRY_URL); // https://aletheia-psi.vercel.app
console.log(ALETHEIA_DEFAULTS.CHAIN_ID);     // 84532

// Resolve with fallback logic
const apiUrl = resolveApiUrl(); // checks env var, then default
```

---

## Next Steps

- [Agent Discovery](agent-discovery) -- Learn about search filters and discovery parameters
- [Identity & Verification](identity-verification) -- Generate keys and sign messages
- [Agent Hosting](agent-hosting) -- Build your own A2A agent
